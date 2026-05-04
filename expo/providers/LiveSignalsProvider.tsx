import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AlertItem } from "@/types";
import { fetchMarketHeadlines, NEWS_QUERIES, type LiveHeadline } from "@/utils/liveNews";
import { useMarkets } from "@/providers/MarketsProvider";
import { useAlerts } from "@/providers/AlertsProvider";

const SEEN_KEY = "tortsite.liveSignals.seen.v1";
const POLL_INTERVAL_MS = 22_000; // one market every ~22s; full cycle ~9 min for 25 markets
const SEEN_MAX = 600;

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
    console.log("[LiveSignals] loadSeen error", e);
    return [];
  }
}

async function saveSeen(ids: string[]): Promise<void> {
  try {
    const trimmed = ids.slice(-SEEN_MAX);
    await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.log("[LiveSignals] saveSeen error", e);
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
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  // hydrate dedupe set
  useEffect(() => {
    let mounted = true;
    loadSeen().then((ids) => {
      if (!mounted) return;
      seenRef.current = new Set(ids);
      console.log("[LiveSignals] hydrated", ids.length, "seen ids");
    });
    return () => { mounted = false; };
  }, []);

  // round-robin poller
  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      if (!enabledRef.current) return;
      const queries = NEWS_QUERIES;
      if (queries.length === 0) return;
      const idx = cursorRef.current % queries.length;
      cursorRef.current = idx + 1;
      const q = queries[idx];
      const market = marketById(q.marketId);
      if (!market) return;

      const headlines = await fetchMarketHeadlines(q.marketId, q.query, 6);
      if (cancelled) return;
      setLastFetchAt(Date.now());
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

    // first tick after a short delay so app boots cleanly
    const initialId = setTimeout(() => { tick().catch((e) => console.log("[LiveSignals] tick error", e)); }, 4000);
    const intervalId = setInterval(() => { tick().catch((e) => console.log("[LiveSignals] tick error", e)); }, POLL_INTERVAL_MS);
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
