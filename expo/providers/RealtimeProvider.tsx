import createContextHook from "@nkzw/create-context-hook";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useApp } from "@/providers/AppProvider";
import { useMarkets } from "@/providers/MarketsProvider";
import {
  RealtimeManager,
  setGlobalBroadcastFn,
  type ConnectionState,
  type ConnectionQuality,
  type LivePlayer,
  type TradeBroadcast,
} from "@/utils/realtime";

export type { ConnectionState, ConnectionQuality, LivePlayer, TradeBroadcast };

export interface CapacityInfo {
  estimate: number;
  tierCap: number;
  nearCapacity: boolean;
  queueLength: number;
}

const PRESENCE_KEY_BASE = "tort-player";

function buildPresenceKey(handle: string): string {
  const sanitized = handle.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
  return `${PRESENCE_KEY_BASE}:${sanitized || "anon"}`;
}

export const [RealtimeProvider, useRealtime] = createContextHook(() => {
  const { user, buyShares } = useApp();
  const { applyTrade } = useMarkets();

  const [connectionState, setConnectionState] = useState<ConnectionState>({
    quality: "disconnected",
    connectedAt: null,
    lastHeartbeatAt: null,
    latencyMs: null,
    reconnectAttempt: 0,
    playerCount: 0,
  });

  const [livePlayers, setLivePlayers] = useState<LivePlayer[]>([]);
  const [capacityInfo, setCapacityInfo] = useState<CapacityInfo>({
    estimate: 0,
    tierCap: 200,
    nearCapacity: false,
    queueLength: 0,
  });
  const managerRef = useRef<RealtimeManager | null>(null);
  const unsubRef = useRef<Array<() => void>>([]);
  const capacityIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Initialize manager ─────────────────────────────────────────

  const presenceKey = useMemo(() => buildPresenceKey(user.handle), [user.handle]);

  useEffect(() => {
    const manager = new RealtimeManager(user.handle, presenceKey);
    managerRef.current = manager;

    const u1 = manager.onConnectionChange((state) => {
      setConnectionState(state);
    });
    const u2 = manager.onPlayersChange((players) => {
      setLivePlayers(players);
    });
    unsubRef.current = [u1, u2];

    // Poll capacity info every 5s for UI awareness
    capacityIntervalRef.current = setInterval(() => {
      if (managerRef.current) {
        setCapacityInfo(managerRef.current.getCapacityInfo());
      }
    }, 5000);

    if (user.onboarded) {
      manager.connect();
    }

    return () => {
      unsubRef.current.forEach((fn) => fn());
      if (capacityIntervalRef.current) {
        clearInterval(capacityIntervalRef.current);
        capacityIntervalRef.current = null;
      }
      manager.disconnect();
      managerRef.current = null;
    };
  }, [user.handle, presenceKey, user.onboarded]);

  // ── App state → connect/disconnect ─────────────────────────────

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      const m = managerRef.current;
      if (!m) return;
      if (next === "active") {
        m.connect();
      } else if (next === "background") {
        m.disconnect();
      }
    });
    return () => sub.remove();
  }, []);

  // ── Receive trades from other players ──────────────────────────

  useEffect(() => {
    const m = managerRef.current;
    if (!m) return;
    const u3 = m.onTrade((trade) => {
      // Don't apply our own trades (self=false on broadcast config handles this, but double-check)
      if (trade.handle === user.handle) return;
      applyTrade({
        marketId: trade.marketId,
        side: trade.side,
        shares: trade.shares,
        priceCents: trade.priceCents,
      });
    });
    unsubRef.current.push(u3);
    return () => u3();
  }, [user.handle, applyTrade]);

  // ── Broadcast own trades ───────────────────────────────────────

  const broadcastTrade = useCallback(
    (args: { marketId: string; side: "YES" | "NO"; shares: number; priceCents: number }) => {
      managerRef.current?.broadcastTrade(args);
    },
    [],
  );

  // Register global bridge so AppProvider can broadcast without a circular dep
  useEffect(() => {
    setGlobalBroadcastFn((trade: TradeBroadcast) => {
      managerRef.current?.broadcastTrade({
        marketId: trade.marketId,
        side: trade.side,
        shares: trade.shares,
        priceCents: trade.priceCents,
      });
    });
    return () => setGlobalBroadcastFn(null);
  }, []);

  // ── Derived helpers ────────────────────────────────────────────

  /** Top 6 players to show in the live avatar row, excluding self */
  const featuredPlayers = useMemo(() => {
    return livePlayers
      .filter((p) => p.handle !== user.handle)
      .slice(0, 6);
  }, [livePlayers, user.handle]);

  /** Total count excluding self */
  const othersOnline = useMemo(() => {
    return Math.max(0, livePlayers.filter((p) => p.handle !== user.handle).length);
  }, [livePlayers, user.handle]);

  const isConnected = connectionState.quality === "connected";
  const isDegraded = connectionState.quality === "degraded" || connectionState.quality === "throttled";

  return {
    connectionState,
    livePlayers,
    featuredPlayers,
    othersOnline,
    isConnected,
    isDegraded,
    broadcastTrade,
    capacityInfo,
    queueLength: capacityInfo.queueLength,
    nearCapacity: capacityInfo.nearCapacity,
  };
});
