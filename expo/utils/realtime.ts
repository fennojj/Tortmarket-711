import { supabase, supabaseEnabled } from "@/lib/supabase";
import type { RealtimeChannel, RealtimePresenceState } from "@supabase/supabase-js";

// ── Connection quality ──────────────────────────────────────────────

export type ConnectionQuality = "disconnected" | "connecting" | "connected" | "degraded" | "throttled";

export interface ConnectionState {
  quality: ConnectionQuality;
  connectedAt: number | null;
  lastHeartbeatAt: number | null;
  latencyMs: number | null;
  reconnectAttempt: number;
  playerCount: number;
}

// ── Live player ─────────────────────────────────────────────────────

export interface LivePlayer {
  handle: string;
  joinedAt: number;
  lastSeenAt: number;
  viewingMarketId: string | null;
  isActive: boolean;
}

// ── Trade broadcast ─────────────────────────────────────────────────

export interface TradeBroadcast {
  marketId: string;
  side: "YES" | "NO";
  shares: number;
  priceCents: number;
  handle: string;
  at: number;
}

// ── Capacity limits ─────────────────────────────────────────────────

/** Supabase free-tier concurrent connection cap */
export const FREE_TIER_CONNECTION_CAP = 200;
/** Supabase free-tier messages/second cap (shared across all channels) */
export const FREE_TIER_MSG_PER_SEC_CAP = 500;
/** Supabase pro-tier concurrent connection cap */
export const PRO_TIER_CONNECTION_CAP = 500;

/** Messages/second we self-limit to (well below Supabase caps) */
const SELF_THROTTLE_MSG_PER_SEC = 20;

/** Heartbeat interval — presence key expires if not refreshed */
const HEARTBEAT_MS = 15_000;
/** How long before we consider a remote player stale */
const PLAYER_STALE_MS = 35_000;
/** Max reconnect backoff */
const MAX_BACKOFF_MS = 30_000;
/** Base reconnect delay */
const BASE_BACKOFF_MS = 1500;

// ── Subscriber types ────────────────────────────────────────────────

export type ConnectionListener = (state: ConnectionState) => void;
export type PlayersListener = (players: LivePlayer[]) => void;
export type TradeListener = (trade: TradeBroadcast) => void;

// ── Global broadcast bridge (avoids restructuring provider tree) ────

let _globalBroadcastFn: ((trade: TradeBroadcast) => void) | null = null;

export function setGlobalBroadcastFn(fn: ((trade: TradeBroadcast) => void) | null): void {
  _globalBroadcastFn = fn;
}

export function getGlobalBroadcastFn(): ((trade: TradeBroadcast) => void) | null {
  return _globalBroadcastFn;
}

// ── Manager ─────────────────────────────────────────────────────────

export class RealtimeManager {
  private channel: RealtimeChannel | null = null;
  private presenceKey: string;
  private handle: string;
  private currentMarketId: string | null = null;

  private connectionListeners = new Set<ConnectionListener>();
  private playersListeners = new Set<PlayersListener>();
  private tradeListeners = new Set<TradeListener>();

  private state: ConnectionState = {
    quality: "disconnected",
    connectedAt: null,
    lastHeartbeatAt: null,
    latencyMs: null,
    reconnectAttempt: 0,
    playerCount: 0,
  };

  private players = new Map<string, LivePlayer>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private latencyTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private msgBucket: number[] = []; // timestamps of recent sends for self-throttling

  private destroyed = false;

  constructor(handle: string, presenceKey: string) {
    this.handle = handle;
    this.presenceKey = presenceKey;
  }

  // ── Public API ──────────────────────────────────────────────────

  connect(): void {
    if (this.destroyed) return;
    if (this.state.quality === "connected" || this.state.quality === "connecting") return;
    if (!supabaseEnabled) {
      this.transition("disconnected");
      return;
    }

    this.transition("connecting");

    try {
      this.channel = supabase!.channel(`tort-market-v1`, {
        config: {
          presence: { key: this.presenceKey },
          broadcast: { self: false },
        },
      });

      this.channel
        .on("presence", { event: "sync" }, () => this.onPresenceSync())
        .on("presence", { event: "join" }, () => this.onPresenceSync())
        .on("presence", { event: "leave" }, () => this.onPresenceSync())
        .on("broadcast", { event: "trade" }, (payload) => this.onTradeReceived(payload))
        .subscribe((status, err) => {
          if (status === "SUBSCRIBED") {
            this.onConnected();
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.log("[Realtime] channel error", status, err);
            this.onDisconnected();
          } else if (status === "CLOSED") {
            this.onDisconnected();
          }
        });
    } catch (e) {
      console.log("[Realtime] connect error", e);
      this.transition("disconnected");
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.destroyed = true;
    this.clearTimers();
    if (this.channel) {
      this.channel.unsubscribe().catch(() => {});
      this.channel = null;
    }
    this.transition("disconnected");
  }

  setViewingMarket(marketId: string | null): void {
    this.currentMarketId = marketId;
    this.trackPresence();
  }

  broadcastTrade(trade: Omit<TradeBroadcast, "handle" | "at">): void {
    if (!this.canSend()) return;

    const msg: TradeBroadcast = {
      ...trade,
      handle: this.handle,
      at: Date.now(),
    };

    this.recordSend();
    this.channel
      ?.send({ type: "broadcast", event: "trade", payload: msg })
      .then(() => {
        // success — noop
      })
      .catch((e) => {
        console.log("[Realtime] broadcast error", e);
      });
  }

  onConnectionChange(fn: ConnectionListener): () => void {
    this.connectionListeners.add(fn);
    // immediate emit current state
    fn(this.state);
    return () => {
      this.connectionListeners.delete(fn);
    };
  }

  onPlayersChange(fn: PlayersListener): () => void {
    this.playersListeners.add(fn);
    fn(this.getLivePlayers());
    return () => {
      this.playersListeners.delete(fn);
    };
  }

  onTrade(fn: TradeListener): () => void {
    this.tradeListeners.add(fn);
    return () => {
      this.tradeListeners.delete(fn);
    };
  }

  getState(): ConnectionState {
    return { ...this.state };
  }

  getLivePlayers(): LivePlayer[] {
    const now = Date.now();
    return Array.from(this.players.values())
      .filter((p) => now - p.lastSeenAt < PLAYER_STALE_MS)
      .sort((a, b) => b.lastSeenAt - a.lastSeenAt);
  }

  // ── Internal ────────────────────────────────────────────────────

  private trackPresence(): void {
    if (!this.channel || this.state.quality !== "connected") return;
    this.channel.track({
      handle: this.handle,
      viewingMarketId: this.currentMarketId,
      joinedAt: this.state.connectedAt ?? Date.now(),
      lastSeenAt: Date.now(),
    });
  }

  private onPresenceSync(): void {
    if (!this.channel) return;
    const state = this.channel.presenceState() as RealtimePresenceState<{
      handle: string;
      viewingMarketId: string | null;
      joinedAt: number;
      lastSeenAt: number;
    }>;

    const now = Date.now();
    const seen = new Map<string, LivePlayer>();

    for (const key of Object.keys(state)) {
      const metadatas = state[key] as Array<{
        handle: string;
        viewingMarketId: string | null;
        joinedAt: number;
        lastSeenAt: number;
      }>;
      // Take the most recent presence_ref for each key
      const latest = metadatas.reduce((a, b) =>
        (b.lastSeenAt ?? 0) > (a.lastSeenAt ?? 0) ? b : a,
      );

      if (latest.handle && now - (latest.lastSeenAt ?? 0) < PLAYER_STALE_MS) {
        seen.set(latest.handle, {
          handle: latest.handle,
          joinedAt: latest.joinedAt ?? now,
          lastSeenAt: latest.lastSeenAt ?? now,
          viewingMarketId: latest.viewingMarketId ?? null,
          isActive: now - (latest.lastSeenAt ?? 0) < HEARTBEAT_MS * 2,
        });
      }
    }

    // Always keep self in the map
    seen.set(this.handle, {
      handle: this.handle,
      joinedAt: this.state.connectedAt ?? now,
      lastSeenAt: now,
      viewingMarketId: this.currentMarketId,
      isActive: true,
    });

    this.players = seen;
    this.state = { ...this.state, playerCount: seen.size };
    this.notifyPlayers();
    this.notifyConnection();
  }

  private onTradeReceived(payload: Record<string, unknown>): void {
    const trade = payload as unknown as TradeBroadcast;
    if (!trade.marketId || !trade.side || !trade.shares || !trade.handle) return;
    for (const fn of this.tradeListeners) {
      try {
        fn(trade);
      } catch (e) {
        console.log("[Realtime] trade listener error", e);
      }
    }
  }

  private onConnected(): void {
    const now = Date.now();
    this.state = {
      ...this.state,
      quality: "connected",
      connectedAt: now,
      lastHeartbeatAt: now,
      reconnectAttempt: 0,
    };
    this.trackPresence();
    this.startHeartbeat();
    this.startLatencyProbe();
    this.notifyConnection();

    console.log("[Realtime] connected", { handle: this.handle, playerCount: this.state.playerCount });
  }

  private onDisconnected(): void {
    this.clearTimers();
    if (this.destroyed) return;
    this.transition("disconnected");
    this.scheduleReconnect();
  }

  private transition(quality: ConnectionQuality): void {
    this.state = { ...this.state, quality };
    this.notifyConnection();
  }

  private scheduleReconnect(): void {
    if (this.destroyed || !supabaseEnabled) return;
    this.clearReconnectTimer();
    const attempt = this.state.reconnectAttempt + 1;
    this.state = { ...this.state, reconnectAttempt: attempt };
    const delay = Math.min(BASE_BACKOFF_MS * Math.pow(2, attempt - 1), MAX_BACKOFF_MS);
    const jitter = Math.random() * 1000;
    console.log("[Realtime] reconnecting in", Math.round(delay + jitter), "ms (attempt", attempt, ")");
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay + jitter);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.state = { ...this.state, lastHeartbeatAt: Date.now() };
      this.trackPresence();
      // Check if we've degraded — no presence sync in 3 heartbeat intervals
      if (this.state.lastHeartbeatAt && Date.now() - this.state.lastHeartbeatAt > HEARTBEAT_MS * 3) {
        if (this.state.quality === "connected") {
          console.log("[Realtime] connection degraded (stale heartbeat)");
          this.state = { ...this.state, quality: "degraded" };
          this.notifyConnection();
        }
      }
    }, HEARTBEAT_MS);
  }

  private startLatencyProbe(): void {
    this.latencyTimer = setInterval(() => {
      const start = Date.now();
      this.channel
        ?.send({ type: "broadcast", event: "ping", payload: { t: start } })
        .then(() => {
          const latency = Date.now() - start;
          this.state = {
            ...this.state,
            latencyMs: latency,
            quality: latency > 2000 ? "degraded" : "connected",
          };
          this.notifyConnection();
        })
        .catch(() => {
          // ignore — will be caught by heartbeat timeout
        });
    }, 60_000);
  }

  private clearTimers(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.latencyTimer) {
      clearInterval(this.latencyTimer);
      this.latencyTimer = null;
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private canSend(): boolean {
    if (this.state.quality !== "connected" && this.state.quality !== "degraded") return false;
    // Self-throttle: sliding window of 1 second
    const now = Date.now();
    const windowStart = now - 1000;
    this.msgBucket = this.msgBucket.filter((t) => t > windowStart);
    if (this.msgBucket.length >= SELF_THROTTLE_MSG_PER_SEC) {
      if (this.state.quality !== "throttled") {
        this.state = { ...this.state, quality: "throttled" };
        this.notifyConnection();
      }
      return false;
    }
    return true;
  }

  private recordSend(): void {
    this.msgBucket.push(Date.now());
    // Auto-recover from throttled after bucket drains
    if (this.state.quality === "throttled" && this.msgBucket.length < SELF_THROTTLE_MSG_PER_SEC) {
      this.state = { ...this.state, quality: this.state.latencyMs && this.state.latencyMs > 2000 ? "degraded" : "connected" };
      this.notifyConnection();
    }
  }

  private notifyConnection(): void {
    const snap = { ...this.state };
    for (const fn of this.connectionListeners) {
      try {
        fn(snap);
      } catch (e) {
        console.log("[Realtime] connection listener error", e);
      }
    }
  }

  private notifyPlayers(): void {
    const list = this.getLivePlayers();
    for (const fn of this.playersListeners) {
      try {
        fn(list);
      } catch (e) {
        console.log("[Realtime] players listener error", e);
      }
    }
  }
}
