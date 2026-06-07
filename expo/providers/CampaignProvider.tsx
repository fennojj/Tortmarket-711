import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/providers/AppProvider";
import { useAlerts } from "@/providers/AlertsProvider";
import { useMarkets } from "@/providers/MarketsProvider";
import { useAdminConfig } from "@/providers/AdminConfigProvider";
import { LEADERBOARD } from "@/mocks/leaderboard";
import { rankMarketsByEdge, blendWithPredictions } from "@/utils/signals";
import {
  type Campaign,
  type CampaignKind,
  buildPlayHypeCampaign,
  buildWinnerCampaign,
  buildMarketMoverCampaign,
  buildStreakCampaign,
  buildDailyRecapCampaign,
  buildOnboardingCampaign,
  buildFOMOCampaign,
  buildResolutionImminentCampaign,
  simulateReach,
} from "@/utils/campaigns";

const STORAGE_KEY = "tortsite.campaigns.v1";
const MAX_CAMPAIGNS = 80;

interface CampaignState {
  campaigns: Campaign[];
  autoLaunch: boolean;
  lastRecapAt: number | null;
  seenKeys: string[];
}

const DEFAULT_STATE: CampaignState = {
  campaigns: [],
  autoLaunch: true,
  lastRecapAt: null,
  seenKeys: [],
};

async function loadState(): Promise<CampaignState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as CampaignState;
    return { ...DEFAULT_STATE, ...parsed };
  } catch (e) {
    console.log("[Campaigns] load error", e);
    return DEFAULT_STATE;
  }
}

async function saveState(s: CampaignState): Promise<CampaignState> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  return s;
}

export const [CampaignProvider, useCampaigns] = createContextHook(() => {
  const qc = useQueryClient();
  const { user, lastPlay } = useApp();
  const { predictions, allAlerts, recentPlayCount } = useAlerts();
  const { markets } = useMarkets();
  const { config } = useAdminConfig();

  const [state, setState] = useState<CampaignState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState<boolean>(false);
  const tickRef = useRef<number>(0);

  const stateQuery = useQuery({ queryKey: ["campaigns"], queryFn: loadState });
  const persist = useMutation({
    mutationFn: saveState,
    onSuccess: (s) => qc.setQueryData(["campaigns"], s),
  });

  const persistRef = useRef(persist.mutate);
  useEffect(() => {
    persistRef.current = persist.mutate;
  }, [persist.mutate]);

  useEffect(() => {
    if (stateQuery.data && !hydrated) {
      setState(stateQuery.data);
      setHydrated(true);
    }
  }, [stateQuery.data, hydrated]);

  const edges = useMemo(
    () => blendWithPredictions(rankMarketsByEdge(markets), predictions),
    [predictions, markets],
  );

  const commit = useCallback((next: CampaignState) => {
    setState(next);
    persistRef.current(next);
  }, []);

  const addCampaign = useCallback((c: Campaign) => {
    if (!config.campaigns.enabled) return;
    setState((prev) => {
      if (prev.campaigns.some((x) => x.id === c.id) || prev.seenKeys.includes(c.id)) {
        return prev;
      }
      const ready: Campaign = prev.autoLaunch && config.campaigns.autoLaunchDefault
        ? { ...c, status: "live", launchedAt: Date.now() }
        : c;
      const next: CampaignState = {
        ...prev,
        campaigns: [ready, ...prev.campaigns].slice(0, MAX_CAMPAIGNS),
        seenKeys: [...prev.seenKeys, c.id].slice(-200),
      };
      persistRef.current(next);
      console.log("[Campaigns] queued", { id: ready.id, kind: ready.kind, status: ready.status });
      return next;
    });
  }, [config.campaigns.autoLaunchDefault, config.campaigns.enabled]);

  useEffect(() => {
    if (!lastPlay) return;
    const market = markets.find((m) => m.id === lastPlay.marketId);
    const edge = edges.find((e) => e.marketId === lastPlay.marketId);
    addCampaign(buildPlayHypeCampaign({ play: lastPlay, market, edge }));
  }, [lastPlay, edges, addCampaign]);

  useEffect(() => {
    if (!allAlerts || allAlerts.length === 0) return;
    const latest = allAlerts[0];
    if (!latest || latest.kind !== "play") return;
    if (!latest.cost || latest.cost < config.campaigns.whalePlayThresholdPoints) return;
    if (latest.author === user.handle) return;
    const market = markets.find((m) => m.id === latest.marketId);
    const edge = edges.find((e) => e.marketId === latest.marketId);
    addCampaign(buildPlayHypeCampaign({ play: latest, market, edge }));
  }, [allAlerts, edges, addCampaign, user.handle, config.campaigns.whalePlayThresholdPoints]);

  const onboardedRef = useRef(user.onboarded);
  const handleRef = useRef(user.handle);
  useEffect(() => {
    if (!user.onboarded) return;
    if (onboardedRef.current === user.onboarded && handleRef.current === user.handle) return;
    onboardedRef.current = user.onboarded;
    handleRef.current = user.handle;
    addCampaign(buildOnboardingCampaign(user.handle));
  }, [user.onboarded, user.handle, addCampaign]);

  const streakRef = useRef<number | null>(null);
  useEffect(() => {
    const streak = user.streakDays ?? 0;
    const milestones = [3, 7, 14, 30];
    if (!milestones.includes(streak)) return;
    if (streakRef.current === streak) return;
    streakRef.current = streak;
    addCampaign(buildStreakCampaign({ user, streak }));
  }, [user, addCampaign]);

  const moversKeyRef = useRef<string>("");
  useEffect(() => {
    const movers = markets.filter((m) => Math.abs(m.change24h) >= config.campaigns.marketMoverThresholdCents).slice(0, 3);
    const key = movers.map((m) => m.id).join(",");
    if (moversKeyRef.current === key) return;
    moversKeyRef.current = key;
    movers.forEach((m) => {
      const edge = edges.find((e) => e.marketId === m.id);
      addCampaign(buildMarketMoverCampaign({ market: m, edge }));
    });
  }, [edges, addCampaign, markets, config.campaigns.marketMoverThresholdCents]);

  useEffect(() => {
    LEADERBOARD.slice(0, 4).forEach((section) => {
      const top = section.entries[0];
      if (!top) return;
      addCampaign(
        buildWinnerCampaign({
          handle: top.handle,
          caseName: section.caseName,
          marketId: section.marketId,
          points: top.points,
          title: section.titleLabel,
        }),
      );
    });
  }, [addCampaign]);

  useEffect(() => {
    if (!hydrated) return;
    const now = Date.now();
    const last = state.lastRecapAt ?? 0;
    if (now - last < Math.max(1, config.campaigns.dailyRecapHours) * 60 * 60 * 1000) return;
    const topMarket = [...markets].sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h))[0];
    const topPlay = allAlerts.find((a) => a.kind === "play" && (a.cost ?? 0) > 5000);
    const totalPlays = allAlerts.filter((a) => a.kind === "play").length;
    const recap = buildDailyRecapCampaign({ topPlay, topMarket, totalPlays });
    setState((prev) => {
      if (prev.seenKeys.includes(recap.id)) return prev;
      const launched: Campaign = prev.autoLaunch
        ? { ...recap, status: "live", launchedAt: Date.now() }
        : recap;
      const next: CampaignState = {
        ...prev,
        campaigns: [launched, ...prev.campaigns].slice(0, MAX_CAMPAIGNS),
        seenKeys: [...prev.seenKeys, recap.id].slice(-200),
        lastRecapAt: now,
      };
      persistRef.current(next);
      return next;
    });
  }, [allAlerts, state.lastRecapAt, hydrated, markets, config.campaigns.dailyRecapHours]);

  const fomoKeyRef = useRef<string>("");
  useEffect(() => {
    if (recentPlayCount < config.campaigns.fomoPlayCountThreshold) return;
    const topMarket = [...markets].sort((a, b) => b.volume - a.volume)[0];
    const key = `${topMarket.id}-${Math.floor(recentPlayCount / 3)}`;
    if (fomoKeyRef.current === key) return;
    fomoKeyRef.current = key;
    const edge = edges.find((e) => e.marketId === topMarket.id);
    addCampaign(buildFOMOCampaign({ market: topMarket, edge, recentPlays: recentPlayCount }));
  }, [recentPlayCount, edges, addCampaign, markets, config.campaigns.fomoPlayCountThreshold]);

  const resolutionKeyRef = useRef<string>("");
  useEffect(() => {
    const fastMover = markets.filter((m) => Math.abs(m.change24h) >= config.campaigns.resolutionMoveThresholdCents)[0];
    if (!fastMover) return;
    const key = `${fastMover.id}-${Math.floor(Date.now() / (4 * 3_600_000))}`;
    if (resolutionKeyRef.current === key) return;
    resolutionKeyRef.current = key;
    const edge = edges.find((e) => e.marketId === fastMover.id);
    addCampaign(buildResolutionImminentCampaign({ market: fastMover, edge }));
  }, [edges, addCampaign, markets, config.campaigns.resolutionMoveThresholdCents]);

  useEffect(() => {
    const id = setInterval(() => {
      tickRef.current += 1;
      setState((prev) => {
        let changed = false;
        const campaigns = prev.campaigns.map((c) => {
          if (c.status !== "live") return c;
          const m = simulateReach(c, Date.now() - (c.launchedAt ?? c.createdAt));
          const merged = {
            impressions: Math.max(c.metrics.impressions, m.impressions),
            clicks: Math.max(c.metrics.clicks, m.clicks),
            signups: Math.max(c.metrics.signups, m.signups),
            plays: Math.max(c.metrics.plays, m.plays),
            ctr: m.ctr,
          };
          if (merged.impressions === c.metrics.impressions) return c;
          changed = true;
          const ageMs = Date.now() - (c.launchedAt ?? c.createdAt);
          const done = ageMs > 90 * 60 * 1000;
          return {
            ...c,
            metrics: merged,
            status: done ? ("completed" as const) : c.status,
            completedAt: done ? Date.now() : c.completedAt,
          };
        });
        if (!changed) return prev;
        const next: CampaignState = { ...prev, campaigns };
        persistRef.current(next);
        return next;
      });
    }, 8000);
    return () => clearInterval(id);
  }, []);

  const launchCampaign = useCallback((id: string) => {
    setState((prev) => {
      const campaigns = prev.campaigns.map((c) =>
        c.id === id ? { ...c, status: "live" as const, launchedAt: Date.now() } : c,
      );
      const next = { ...prev, campaigns };
      persistRef.current(next);
      return next;
    });
  }, []);

  const pauseCampaign = useCallback((id: string) => {
    setState((prev) => {
      const campaigns = prev.campaigns.map((c) =>
        c.id === id ? { ...c, status: "completed" as const, completedAt: Date.now() } : c,
      );
      const next = { ...prev, campaigns };
      persistRef.current(next);
      return next;
    });
  }, []);

  const setAutoLaunch = useCallback(
    (v: boolean) => {
      commit({ ...state, autoLaunch: v });
    },
    [state, commit],
  );

  const clearAll = useCallback(() => {
    commit({ ...DEFAULT_STATE });
  }, [commit]);

  const totals = useMemo(() => {
    return state.campaigns.reduce(
      (acc, c) => ({
        impressions: acc.impressions + c.metrics.impressions,
        clicks: acc.clicks + c.metrics.clicks,
        signups: acc.signups + c.metrics.signups,
        plays: acc.plays + c.metrics.plays,
        live: acc.live + (c.status === "live" ? 1 : 0),
      }),
      { impressions: 0, clicks: 0, signups: 0, plays: 0, live: 0 },
    );
  }, [state.campaigns]);

  const byKind = useMemo(() => {
    const map: Record<string, number> = {};
    state.campaigns.forEach((c) => {
      map[c.kind] = (map[c.kind] ?? 0) + 1;
    });
    return map as Record<CampaignKind, number>;
  }, [state.campaigns]);

  return {
    campaigns: state.campaigns,
    autoLaunch: state.autoLaunch,
    totals,
    byKind,
    launchCampaign,
    pauseCampaign,
    setAutoLaunch,
    clearAll,
  };
});
