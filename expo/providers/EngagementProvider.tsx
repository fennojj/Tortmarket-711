import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Platform, useWindowDimensions, type AppStateStatus } from "react-native";
import { useApp } from "@/providers/AppProvider";
import { useAlerts } from "@/providers/AlertsProvider";
import { useMarkets } from "@/providers/MarketsProvider";
import { useAdminConfig } from "@/providers/AdminConfigProvider";
import {
  analyzePortfolio,
  blendWithPredictions,
  computeUserSignals,
  rankMarketsByEdge,
  type UserSignals,
  type PortfolioInsights,
  type MarketEdge,
} from "@/utils/signals";
import { planAgentActions, buildCoachSystemPrompt, type AgentAction } from "@/utils/agent";
import {
  buildPassiveEngagementSensors,
  evaluateEngagementTrigger,
  type EngagementDecision,
  type EngagementTriggerInput,
  type PassiveEngagementSensors,
} from "@/utils/engagementFormula";

const STORAGE_KEY = "tortsite.engagement.v1";

export type EngagementEvent =
  | { kind: "session_start"; at: number }
  | { kind: "app_state_change"; at: number; appState: AppStateStatus }
  | { kind: "view_market"; at: number; marketId: string }
  | { kind: "view_alert"; at: number; alertId: string }
  | { kind: "play"; at: number; marketId: string; side: "YES" | "NO"; cost: number }
  | { kind: "claim"; at: number; amount: number }
  | { kind: "redeem"; at: number; cost: number }
  | { kind: "coach_open"; at: number }
  | { kind: "coach_message"; at: number }
  | {
      kind: "notification_shown";
      at: number;
      triggerId: string;
      triggerKind: EngagementTriggerInput["kind"];
      channel: EngagementTriggerInput["channel"];
      score: number;
    }
  | {
      kind: "notification_blocked";
      at: number;
      triggerId: string;
      triggerKind: EngagementTriggerInput["kind"];
      channel: EngagementTriggerInput["channel"];
      score: number;
      reason: string;
    };

interface EngagementState {
  sessionCount: number;
  lastSessionAt: number | null;
  lastActivityAt: number | null;
  eventLog: EngagementEvent[];
  viewedMarketIds: string[];
  dismissedActionIds: string[];
}

const DEFAULT_STATE: EngagementState = {
  sessionCount: 0,
  lastSessionAt: null,
  lastActivityAt: null,
  eventLog: [],
  viewedMarketIds: [],
  dismissedActionIds: [],
};

async function loadState(): Promise<EngagementState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as EngagementState;
    return { ...DEFAULT_STATE, ...parsed };
  } catch (e) {
    console.log("[Engagement] load error", e);
    return DEFAULT_STATE;
  }
}

async function saveState(s: EngagementState): Promise<EngagementState> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  return s;
}

export const [EngagementProvider, useEngagement] = createContextHook(() => {
  const { user, canClaimDaily } = useApp();
  const { predictions } = useAlerts();
  const { markets } = useMarkets();
  const { config } = useAdminConfig();
  const window = useWindowDimensions();

  const [state, setState] = useState<EngagementState>(DEFAULT_STATE);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [hydrated, setHydrated] = useState<boolean>(false);
  const [sessionBumped, setSessionBumped] = useState<boolean>(false);

  const stateQuery = useQuery({ queryKey: ["engagement"], queryFn: loadState });
  const persist = useMutation({
    mutationFn: saveState,
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

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      setAppState(nextAppState);
      const event: EngagementEvent = { kind: "app_state_change", at: Date.now(), appState: nextAppState };
      setState((prev) => {
        const next: EngagementState = {
          ...prev,
          lastActivityAt: nextAppState === "active" ? event.at : prev.lastActivityAt,
          eventLog: [...prev.eventLog, event].slice(-100),
        };
        persistRef.current(next);
        return next;
      });
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!hydrated || sessionBumped) return;
    setSessionBumped(true);
    const now = Date.now();
    setState((prev) => {
      const last = prev.lastSessionAt ?? 0;
      if (now - last <= 30 * 60_000) return prev;
      const next: EngagementState = {
        ...prev,
        sessionCount: prev.sessionCount + 1,
        lastSessionAt: now,
        lastActivityAt: now,
        eventLog: ([...prev.eventLog, { kind: "session_start", at: now }] as EngagementEvent[]).slice(-60),
      };
      persistRef.current(next);
      console.log("[Engagement] new session", { count: next.sessionCount });
      return next;
    });
  }, [hydrated, sessionBumped]);

  const track = useCallback(
    (ev: EngagementEvent) => {
      setState((prev) => {
        const viewedMarketIds =
          ev.kind === "view_market" && !prev.viewedMarketIds.includes(ev.marketId)
            ? [...prev.viewedMarketIds, ev.marketId].slice(-40)
            : prev.viewedMarketIds;
        const next: EngagementState = {
          ...prev,
          lastActivityAt: ev.at,
          eventLog: [...prev.eventLog, ev].slice(-80),
          viewedMarketIds,
        };
        persistRef.current(next);
        return next;
      });
    },
    [],
  );

  const dismissAction = useCallback(
    (id: string) => {
      setState((prev) => {
        const next = {
          ...prev,
          dismissedActionIds: [...prev.dismissedActionIds, id].slice(-30),
        };
        persistRef.current(next);
        return next;
      });
    },
    [],
  );

  const signals: UserSignals = useMemo(
    () => computeUserSignals(user, state.lastActivityAt, state.sessionCount),
    [user, state.lastActivityAt, state.sessionCount],
  );

  const sensors: PassiveEngagementSensors = useMemo(
    () =>
      buildPassiveEngagementSensors({
        appState,
        platform: Platform.OS,
        window,
      }),
    [appState, window],
  );

  const portfolio: PortfolioInsights = useMemo(
    () => analyzePortfolio(user.positions, markets),
    [user.positions, markets],
  );

  const edges: MarketEdge[] = useMemo(() => {
    const ranked = rankMarketsByEdge(markets);
    return blendWithPredictions(ranked, predictions);
  }, [predictions, markets]);

  const actions: AgentAction[] = useMemo(() => {
    const all = planAgentActions({
      user,
      signals,
      portfolio,
      edges,
      markets,
      canClaimDaily,
    });
    return all.filter((a) => !state.dismissedActionIds.includes(a.id));
  }, [user, signals, portfolio, edges, canClaimDaily, state.dismissedActionIds, markets]);

  const todayStats = useMemo(() => {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayStartMs = dayStart.getTime();
    const todayEvents = state.eventLog.filter((e) => e.at >= dayStartMs);
    const viewedMarketsToday = new Set(
      todayEvents
        .filter((e): e is Extract<EngagementEvent, { kind: "view_market" }> => e.kind === "view_market")
        .map((e) => e.marketId),
    ).size;
    const playsToday = todayEvents.filter((e) => e.kind === "play").length;
    const coachMessagesToday = todayEvents.filter((e) => e.kind === "coach_message").length;
    const claimedToday = todayEvents.some((e) => e.kind === "claim");
    return { viewedMarketsToday, playsToday, coachMessagesToday, claimedToday };
  }, [state.eventLog]);

  const evaluateTrigger = useCallback(
    (input: EngagementTriggerInput): EngagementDecision =>
      evaluateEngagementTrigger(input, {
        config: config.engagement,
        user,
        signals,
        eventLog: state.eventLog,
        sensors,
        now: Date.now(),
      }),
    [config.engagement, user, signals, state.eventLog, sensors],
  );

  const recordNotificationDecision = useCallback(
    (input: EngagementTriggerInput, decision: EngagementDecision) => {
      const event: EngagementEvent = decision.allowed
        ? {
            kind: "notification_shown",
            at: Date.now(),
            triggerId: input.id,
            triggerKind: input.kind,
            channel: input.channel,
            score: decision.score,
          }
        : {
            kind: "notification_blocked",
            at: Date.now(),
            triggerId: input.id,
            triggerKind: input.kind,
            channel: input.channel,
            score: decision.score,
            reason: decision.reason,
          };
      setState((prev) => {
        const next: EngagementState = {
          ...prev,
          eventLog: [...prev.eventLog, event].slice(-100),
        };
        persistRef.current(next);
        return next;
      });
    },
    [],
  );

  const coachSystemPrompt = useMemo(
    () =>
      buildCoachSystemPrompt({
        user,
        signals,
        portfolio,
        edges,
        markets,
        canClaimDaily,
      }),
    [user, signals, portfolio, edges, canClaimDaily, markets],
  );

  return {
    sessionCount: state.sessionCount,
    eventLog: state.eventLog,
    viewedMarketIds: state.viewedMarketIds,
    signals,
    sensors,
    portfolio,
    edges,
    actions,
    topAction: actions[0] ?? null,
    coachSystemPrompt,
    todayStats,
    evaluateTrigger,
    recordNotificationDecision,
    track,
    dismissAction,
  };
});
