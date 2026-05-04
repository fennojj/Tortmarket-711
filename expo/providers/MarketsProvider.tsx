import createContextHook from "@nkzw/create-context-hook";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MARKETS as SEED_MARKETS } from "@/mocks/markets";
import type { Market } from "@/types";
import { computeFairYes } from "@/utils/signals";

/**
 * Live market state. Holds an in-memory copy of the seed markets and
 * mutates them in response to:
 *   - User trades (applyTrade) — immediate price impact + volume bump
 *   - Background tick — drift toward fair value with noise, history rotation
 *
 * Every consumer reads from `markets` so prices/volume update everywhere.
 */

const TICK_MS = 4000;
const HISTORY_EVERY_TICKS = 5; // push a new history point ~every 20s
const MAX_HISTORY = 30;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function cloneMarkets(src: Market[]): Market[] {
  return src.map((m) => ({ ...m, history: m.history.map((p) => ({ ...p })) }));
}

function priceImpactCents(shares: number, priceCents: number): number {
  // larger orders move price more; small orders barely register
  const notional = Math.max(0, shares * priceCents);
  const raw = notional / 200_000; // 200K notional = ~1¢
  return clamp(raw, 0.05, 6);
}

export interface ApplyTradeArgs {
  marketId: string;
  side: "YES" | "NO";
  shares: number;
  priceCents: number;
}

export interface PushSignalArgs {
  marketId: string;
  /** -10..+10. Positive = bullish for YES (plaintiff). */
  polarity: number;
  /** 0..1 — strength of conviction. */
  magnitude: number;
  /** Optional notional volume to add (in points). */
  volumeBump?: number;
}

export const [MarketsProvider, useMarkets] = createContextHook(() => {
  const [markets, setMarkets] = useState<Market[]>(() => cloneMarkets(SEED_MARKETS));
  const tickRef = useRef<number>(0);
  const lastTradeAtRef = useRef<number>(0);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  const applyTrade = useCallback(({ marketId, side, shares, priceCents }: ApplyTradeArgs) => {
    if (shares <= 0) return;
    const impact = priceImpactCents(shares, priceCents);
    lastTradeAtRef.current = Date.now();
    setMarkets((prev) =>
      prev.map((m) => {
        if (m.id !== marketId) return m;
        const yesShift = side === "YES" ? impact : -impact;
        const yes = clamp(Math.round(m.yesPrice + yesShift), 1, 99);
        const no = 100 - yes;
        const cost = shares * priceCents;
        return {
          ...m,
          yesPrice: yes,
          noPrice: no,
          volume: m.volume + cost,
        };
      }),
    );
    setLastUpdate(Date.now());
  }, []);

  // background tick: drift toward fair value + small random walk
  useEffect(() => {
    const id = setInterval(() => {
      tickRef.current += 1;
      const tick = tickRef.current;
      const rotateHistory = tick % HISTORY_EVERY_TICKS === 0;

      setMarkets((prev) =>
        prev.map((m) => {
          const fair = computeFairYes(m);
          const drift = (fair - m.yesPrice) * 0.06;
          const noise = (Math.random() - 0.5) * 1.6;
          const yes = clamp(Math.round(m.yesPrice + drift + noise), 1, 99);
          const no = 100 - yes;

          let history = m.history;
          let change24h = m.change24h;
          if (rotateHistory) {
            const next = [...m.history, { t: Date.now(), yes }];
            history = next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
            const first = history[0]?.yes ?? yes;
            change24h = first === 0 ? 0 : ((yes - first) / first) * 100;
          } else if (yes !== m.yesPrice) {
            // small live drift in 24h % between rotations
            const last = m.history[m.history.length - 1]?.yes ?? yes;
            const delta = yes - last;
            change24h = clamp(m.change24h + delta * 0.05, -25, 25);
          }

          // organic volume trickle
          const volBump = Math.round(2000 + Math.random() * 12000);

          return {
            ...m,
            yesPrice: yes,
            noPrice: no,
            change24h,
            history,
            volume: m.volume + volBump,
          };
        }),
      );
      setLastUpdate(Date.now());
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  const marketById = useCallback(
    (id: string | undefined): Market | undefined => {
      if (!id) return undefined;
      return markets.find((m) => m.id === id);
    },
    [markets],
  );

  const refresh = useCallback(() => {
    setMarkets(cloneMarkets(SEED_MARKETS));
    setLastUpdate(Date.now());
  }, []);

  /**
   * Apply an exogenous "signal" (real-world news, court filing, sentiment shift)
   * to a market. Adjusts the underlying fundamentals so the next ticks drift
   * the price toward the new fair value, plus an immediate small price nudge
   * so users feel the market reacting in real time.
   */
  const pushSignal = useCallback(({ marketId, polarity, magnitude, volumeBump }: PushSignalArgs) => {
    const p = clamp(polarity, -10, 10);
    const mag = clamp(magnitude, 0, 1);
    if (mag === 0 || p === 0) return;
    setMarkets((prev) =>
      prev.map((m) => {
        if (m.id !== marketId) return m;
        // sentiment shift up to +/- 8 points, scaled by magnitude
        const sentDelta = (p / 10) * mag * 8;
        const reservesDelta = (p / 10) * mag * 4;
        const daubertDelta = (p / 10) * mag * 3;
        const mdlSentiment = clamp(Math.round(m.mdlSentiment + sentDelta), 1, 99);
        const corporateReserves = clamp(Math.round(m.corporateReserves + reservesDelta), 1, 99);
        const daubertStrength = clamp(Math.round(m.daubertStrength + daubertDelta), 1, 99);
        // immediate price nudge in the direction of the signal
        const priceNudge = (p / 10) * mag * 4;
        const yes = clamp(Math.round(m.yesPrice + priceNudge), 1, 99);
        const no = 100 - yes;
        return {
          ...m,
          mdlSentiment,
          corporateReserves,
          daubertStrength,
          yesPrice: yes,
          noPrice: no,
          volume: m.volume + (volumeBump ?? Math.round(40_000 * mag)),
        };
      }),
    );
    setLastUpdate(Date.now());
  }, []);

  return useMemo(
    () => ({ markets, marketById, applyTrade, pushSignal, refresh, lastUpdate }),
    [markets, marketById, applyTrade, pushSignal, refresh, lastUpdate],
  );
});
