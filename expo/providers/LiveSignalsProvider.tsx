import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AlertItem } from "@/types";
import { fetchMarketHeadlines, NEWS_QUERIES, type LiveHeadline } from "@/utils/liveNews";
import { useMarkets } from "@/providers/MarketsProvider";
import { useAlerts } from "@/providers/AlertsProvider";

const SEEN_KEY = "tortsite.liveSignals.seen.v1";

/**
 * Base poll interval — one market every 45s keeps us comfortably under
 * rss2json's free-tier limit (~10 req/min) across 25 markets (~9 min/cycle).
 */
const POLL_INTERVAL_MS = 45_000;
const SEEN_MAX = 600;

/**
 * Exponential backoff caps per consecutive failure count.
 * Index = failure count (capped at last entry).
 * Values are in milliseconds.
 */
const BACKOFF_SCHEDULE_MS = [
  5 * 60_000,   // 1st fail  → 5 min
  10 * 60_000,  // 2nd fail  → 10 min
  20 * 60_000,  // 3rd fail  → 20 min
  40 * 60_000,  // 4+ fails  → 40 min
];

function backoffMs(failCount: number): number {
  const idx = Math.min(failCount - 1, BACKOFF_SCHEDULE_MS.length - 1);
  return BACKOFF_SCHEDULE_MS[Math.max(0, idx)];
}

export interface LiveSignalsState {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  lastFetchAt: number | null;
  totalSignalsApplied: number;
  latestHeadline: LiveHeadline | null;
}

async function loadSeen(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(SEEN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch (e) {
    console.warn("[LiveSignals] loadSeen error", e);
    return [];
  }
}

async function saveSeen(ids: string[]): Promise<void> {
  try {
    const trimmed = ids.slice(-SEEN_MAX);
    await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn("[LiveSignals] saveSeen error", e);
  }
}

export const [LiveSignalsProvider, useLiveSignals] = createContextHook(() => {
  const { pushSignal, marketById } = useMarkets();
  const { pushAlert } = useAlerts();

  const [enabled, setEnabled] = useState<boolean>(true);
  const [lastFetchAt, setLastFetchAt] = useState<number | null>(null);
  const [totalSignalsApplied, setTotalSignalsApplied] = useState<number>(0);
  const [latestHeadline, setLatestHeadline] = useState<LiveHeadline | null>(null);

  const seenRef = useRef<Set<string>>(new Set());
  const cursorRef = useRef<number>(0);
  const enabledRef = useRef<boolean>(enabled);

  /**
   * Per-market failure tracking for exponential backoff.
   * failCounts: number of consecutive errors for each marketId
   * backoffUntil: timestamp (ms) before which we skip this market
   */
  const failCounts = useRef<Map<string, number>>(new Map());
  const backoffUntil = useRef<Map<string, number>>(new Map());

  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  // Hydrate dedupe set
  useEffect(() => {
    let mounted = true;
    loadSeen().then((ids) => {
      if (!mounted) return;
      seenRef.current = new Set(ids);
      console.log("[LiveSignals] hydrated", ids.length, "seen ids");
    });
    return () => { mounted = false; };
  }, []);

  // Round-robin poller with per-market exponential backoff
  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      if (!enabledRef.current) return;
      const queries = NEWS_QUERIES;
      if (queries.length === 0) return;

      // Advance cursor, skipping markets that are in backoff
      let attempts = 0;
      let q = queries[cursorRef.current % queries.length];
      while (attempts < queries.length) {
        const idx = cursorRef.current % queries.length;
        cursorRef.current = idx + 1;
        q = queries[idx];
        const until = backoffUntil.current.get(q.marketId) ?? 0;
        if (Date.now() >= until) break; // not in backoff, use this one
        attempts += 1;
      }
      // If all markets are in backoff, skip this tick silently
      if (attempts === queries.length) return;

      const market = marketById(q.marketId);
      if (!market) return;

      const result = await fetchMarketHeadlines(q.marketId, q.query, 6);
      if (cancelled) return;

      if (!result.ok) {
        if (result.retryable) {
          // Increment failure counter and schedule backoff
          const prev = failCounts.current.get(q.marketId) ?? 0;
          const next = prev + 1;
          failCounts.current.set(q.marketId, next);
          const delay = backoffMs(next);
          backoffUntil.current.set(q.marketId, Date.now() + delay);
          console.warn(
            `[LiveSignals] backoff ${q.marketId} for ${delay / 60_000} min (fail #${next})`,
          );
        }
        return;
      }

      // Successful fetch — reset failure counter
      failCounts.current.delete(q.marketId);
      backoffUntil.current.delete(q.marketId);

      setLastFetchAt(Date.now());
      const { headlines } = result;
      if (headlines.length === 0) return;

      const seen = seenRef.current;
      const fresh = headlines.filter((h) => !seen.has(h.id));
      if (fresh.length === 0) return;

      let applied = 0;
      for (const h of fresh) {
        seen.add(h.id);
        pushSignal({
          marketId: h.marketId,
          polarity: h.polarity,
          magnitude: h.magnitude,
          volumeBump: Math.round(60_000 * h.magnitude),
        });
        const alert: AlertItem = {
          id: h.id,
          kind: "x",
          marketId: h.marketId,
          title: `${h.source} — ${market.caseName}`,
          body: h.title,
          author: h.source,
          sourceUrl: h.link,
          createdAt: h.publishedAt,
          upvotes: Math.floor(40 + h.magnitude * 200),
          reposts: Math.floor(10 + h.magnitude * 80),
        };
        pushAlert(alert);
        applied += 1;
      }

      if (applied > 0) {
        setTotalSignalsApplied((n) => n + applied);
        setLatestHeadline(fresh[0]);
        saveSeen(Array.from(seen));
        console.log("[LiveSignals] applied", applied, "for", q.marketId);
      }
    };

    // First tick after a short delay so the app boots cleanly
    const initialId = setTimeout(
      () => { tick().catch((e) => console.warn("[LiveSignals] tick error", e)); },
      6_000,
    );
    const intervalId = setInterval(
      () => { tick().catch((e) => console.warn("[LiveSignals] tick error", e)); },
      POLL_INTERVAL_MS,
    );

    return () => {
      cancelled = true;
      clearTimeout(initialId);
      clearInterval(intervalId);
    };
  }, [pushSignal, pushAlert, marketById]);

  return useMemo<LiveSignalsState>(
    () => ({ enabled, setEnabled, lastFetchAt, totalSignalsApplied, latestHeadline }),
    [enabled, lastFetchAt, totalSignalsApplied, latestHeadline],
  );
});
