import createContextHook from "@nkzw/create-context-hook";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@/providers/AppProvider";
import { useMarkets } from "@/providers/MarketsProvider";
import { useAdminConfig } from "@/providers/AdminConfigProvider";
import { useEngagement } from "@/providers/EngagementProvider";
import { sendSms, formatSmsAlert } from "@/utils/sms";
import type { EngagementTriggerInput } from "@/utils/engagementFormula";

export interface InAppNotification {
  id: string;
  kind: "breaking" | "coach" | "trade" | "social" | "intel";
  icon: string;
  source: string;
  title: string;
  body: string;
  route?: string;
  urgent?: boolean;
  createdAt: number;
}

const STATIC_ALERTS: Omit<InAppNotification, "id" | "createdAt">[] = [
  // BREAKING MDL NEWS
  {
    kind: "breaking",
    icon: "🚨",
    source: "BREAKING NEWS",
    title: "J&J third bankruptcy rejected by 4th Circuit",
    body: "Talc YES prices surging — 3,700+ plaintiff firms celebrating ruling",
    route: "/(tabs)/alerts",
    urgent: true,
  },
  {
    kind: "breaking",
    icon: "🏛️",
    source: "MDL DOCKET",
    title: "JPML consolidates 4,200+ PFAS cases",
    body: "New N.D. SC MDL — plaintiffs estimate $40B+ in total exposure",
    route: "/(tabs)/alerts",
    urgent: true,
  },
  {
    kind: "breaking",
    icon: "⚖️",
    source: "DAUBERT RULING",
    title: "Hair relaxer experts survive Daubert challenge",
    body: "N.D. Ill. judge allows causation testimony — YES prices moving fast",
    route: "/(tabs)/alerts",
  },
  {
    kind: "breaking",
    icon: "🚨",
    source: "BREAKING NEWS",
    title: "Camp Lejeune: Navy finalizes elective-option rates",
    body: "$4.2B first-round settlements confirmed — 22,000 claims processed",
    route: "/(tabs)/alerts",
    urgent: true,
  },
  {
    kind: "breaking",
    icon: "📋",
    source: "MDL UPDATE",
    title: "Ozempic MDL: 1,200 new cases transferred to SDFL",
    body: "Bellwether pool selection set for Q3 — early-mover edge widening",
    route: "/(tabs)/alerts",
  },
  {
    kind: "breaking",
    icon: "🏛️",
    source: "MDL DOCKET",
    title: "3M Combat Arms: final opt-in deadline approaching",
    body: "$6B settlement — claims administrator confirms 98% participation",
    route: "/(tabs)/alerts",
  },
  {
    kind: "breaking",
    icon: "⚖️",
    source: "COURT FILING",
    title: "Paraquat MDL: Syngenta files new Daubert motion",
    body: "Challenges plaintiff neurologist testimony — NO signal strengthening",
    route: "/(tabs)/alerts",
  },
  {
    kind: "breaking",
    icon: "🚨",
    source: "BREAKING NEWS",
    title: "Social Media MDL: Meta appeals case management order",
    body: "Delay strategy flagged — judge warns sanctions. Market volatile.",
    route: "/(tabs)/alerts",
    urgent: true,
  },

  // TORTCOACH SIGNALS
  {
    kind: "coach",
    icon: "📊",
    source: "TORTCOACH",
    title: "PFAS/AFFF edge widened to +14¢ — model alert",
    body: "DuPont reserve filings hint at accelerated settlement timeline",
    route: "/(tabs)/coach",
  },
  {
    kind: "coach",
    icon: "💡",
    source: "TORTCOACH",
    title: "Exactech YES trading 11¢ below fair value",
    body: "Strong edge — Daubert 74/100, reserves 80/100, sentiment rising",
    route: "/(tabs)/coach",
  },
  {
    kind: "coach",
    icon: "🔍",
    source: "TORTCOACH",
    title: "Asbestos trust payouts accelerating Q2 2026",
    body: "Model confidence at 91% — one of the strongest signals this month",
    route: "/(tabs)/coach",
  },
  {
    kind: "coach",
    icon: "📊",
    source: "TORTCOACH",
    title: "Depo-Provera MDL: new bellwether picks today",
    body: "Court selects 8 trial-ready cases — YES edge at 67¢, fair value 78¢",
    route: "/(tabs)/coach",
  },
  {
    kind: "coach",
    icon: "⚡",
    source: "TORTCOACH",
    title: "Book risk update: hedge window open now",
    body: "3 of your markets have correlated downside — TortCoach has a plan",
    route: "/(tabs)/coach",
  },

  // MARKET INTELLIGENCE
  {
    kind: "intel",
    icon: "📈",
    source: "MARKET INTEL",
    title: "Mass Tort Weekly: 4 markets up >8¢ overnight",
    body: "Camp Lejeune, PFAS/AFFF, Exactech, Asbestos all posted gains",
    route: "/(tabs)/index",
  },
  {
    kind: "intel",
    icon: "💰",
    source: "MARKET INTEL",
    title: "Asbestos defendant reserves up 12% in Q1 filings",
    body: "Signal: corporate settlement funds being ringfenced now",
    route: "/(tabs)/index",
  },
  {
    kind: "intel",
    icon: "🔔",
    source: "MARKET WATCH",
    title: "NEC Formula: September trial date confirmed",
    body: "Abbvie MDL #1 bellwether — position sizing matters ahead of trial",
    route: "/(tabs)/index",
  },
  {
    kind: "intel",
    icon: "📉",
    source: "MARKET WATCH",
    title: "Zantac MDL: new GSK expert report filed",
    body: "NDMA causation weakened in new analysis — NO holds at 71¢",
    route: "/(tabs)/index",
  },
  {
    kind: "intel",
    icon: "⚠️",
    source: "RISK ALERT",
    title: "Tylenol Autism MDL: summary judgment motion set",
    body: "Daubert exclusion upheld — plaintiff experts facing renewed challenge",
    route: "/(tabs)/index",
  },

  // SOCIAL / GAMIFICATION
  {
    kind: "social",
    icon: "⚡",
    source: "TRADE ALERT",
    title: "@whalefirm_atl went 50,000 pts YES on Camp Lejeune",
    body: "Volume spike detected — 3 other top traders followed suit",
    route: "/(tabs)/leaderboard",
  },
  {
    kind: "social",
    icon: "🏆",
    source: "LEADERBOARD",
    title: "Top 10 spots are heating up — gap is closing",
    body: "Only 4,200 pts separate ranks #8 through #14 right now",
    route: "/(tabs)/leaderboard",
  },
  {
    kind: "social",
    icon: "🤝",
    source: "REFERRAL",
    title: "Invite a colleague, earn 5,000 pts instantly",
    body: "Your referral link works — tap to share with your network",
    route: "/invite",
  },
  {
    kind: "social",
    icon: "🔥",
    source: "STREAK ALERT",
    title: "Keep your daily streak alive!",
    body: "Claim today's points before midnight — streak bonuses stack",
    route: "/(tabs)/index",
  },
  {
    kind: "social",
    icon: "💎",
    source: "REWARDS",
    title: "New sponsor prize just added to the rewards pool",
    body: "Check the Rewards tab — top traders are redeeming now",
    route: "/(tabs)/rewards",
  },
];

function shownKeyFor(notif: InAppNotification): string {
  return notif.id.startsWith("dynamic") ? notif.id : `static-${notif.title.slice(0, 20)}`;
}

function toTriggerInput(notif: InAppNotification, channel: EngagementTriggerInput["channel"]): EngagementTriggerInput {
  const lowerTitle = notif.title.toLowerCase();
  const marketUrgency = notif.kind === "trade"
    ? notif.urgent ? 92 : 62
    : notif.urgent ? 88 : notif.kind === "breaking" ? 74 : 42;
  const socialPull = notif.kind === "social" ? 82 : 28;
  const rewardValue = notif.source === "REWARDS" || notif.source === "REFERRAL" || notif.source === "STREAK ALERT" ? 78 : 30;
  const sponsorFit = notif.source.includes("SPONSOR") || lowerTitle.includes("sponsor") ? 82 : 16;
  return {
    id: notif.id,
    kind: notif.kind,
    channel,
    urgent: notif.urgent,
    rewardValue,
    socialPull,
    marketUrgency,
    sponsorFit,
  };
}

function pickAlert(
  markets: { id: string; caseName: string; yesPrice: number; change24h: number }[],
  shown: Set<string>,
  priceMoveThresholdCents: number,
): InAppNotification | null {
  // First, try dynamic alert based on biggest market mover
  const bigMover = markets
    .filter((m) => Math.abs(m.change24h) >= Math.max(1, priceMoveThresholdCents - 3))
    .sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h))[0];

  const dynamicKey = bigMover ? `dynamic-${bigMover.id}` : null;

  if (bigMover && dynamicKey && !shown.has(dynamicKey)) {
    const up = bigMover.change24h > 0;
    return {
      id: dynamicKey,
      kind: "trade",
      icon: up ? "📈" : "📉",
      source: "PRICE ALERT",
      title: `${bigMover.caseName} ${up ? "surging" : "dropping"}`,
      body: `${up ? "+" : ""}${bigMover.change24h.toFixed(1)}¢ in 24h — YES now at ${bigMover.yesPrice}¢. Worth a look.`,
      route: "/(tabs)/index",
      urgent: Math.abs(bigMover.change24h) >= priceMoveThresholdCents,
      createdAt: Date.now(),
    };
  }

  // Otherwise pick from static pool
  const available = STATIC_ALERTS.filter((a) => {
    const key = `static-${a.title.slice(0, 20)}`;
    return !shown.has(key);
  });

  if (available.length === 0) return null;

  // Weight toward urgent/breaking
  const urgent = available.filter((a) => a.urgent);
  const pool = urgent.length > 0 && Math.random() < 0.45 ? urgent : available;
  const pick = pool[Math.floor(Math.random() * pool.length)];

  return {
    ...pick,
    id: `static-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: Date.now(),
  };
}

export const [NotificationProvider, useNotifications] = createContextHook(() => {
  const { user } = useApp();
  const { markets } = useMarkets();
  const { config } = useAdminConfig();
  const { evaluateTrigger, recordNotificationDecision } = useEngagement();

  const [current, setCurrent] = useState<InAppNotification | null>(null);
  const shownKeys = useRef<Set<string>>(new Set());
  const sentCount = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    setCurrent(null);
  }, []);

  const relaySms = useCallback(
    (notif: InAppNotification) => {
      if (!config.sms.enabled) return;
      if (!user.smsOptedIn || !user.ghlContactId) return;
      const qualifiesUrgent = config.sms.sendUrgent && !!notif.urgent;
      const qualifiesBreaking = config.sms.sendBreaking && notif.kind === "breaking";
      const qualifiesPriceMove = config.sms.sendPriceMoves && notif.kind === "trade" && !!notif.urgent;
      if (!qualifiesUrgent && !qualifiesBreaking && !qualifiesPriceMove) return;

      const trigger = toTriggerInput(notif, "sms");
      const decision = evaluateTrigger(trigger);
      recordNotificationDecision(trigger, decision);
      if (!decision.allowed) {
        console.log("[Engagement] SMS blocked", { reason: decision.reason, score: decision.score.toFixed(1) });
        return;
      }

      const msg = formatSmsAlert(notif.title, notif.body);
      sendSms(user.ghlContactId, msg).catch((e) =>
        console.log("[SMS] relay error", e),
      );
      console.log("[SMS] relayed alert", notif.title.slice(0, 40));
    },
    [user.smsOptedIn, user.ghlContactId, config.sms, evaluateTrigger, recordNotificationDecision],
  );

  const showNotification = useCallback(
    (notif: InAppNotification): boolean => {
      const trigger = toTriggerInput(notif, "in_app");
      const decision = evaluateTrigger(trigger);
      recordNotificationDecision(trigger, decision);
      if (!decision.allowed) {
        shownKeys.current.add(shownKeyFor(notif));
        console.log("[Engagement] notification blocked", {
          reason: decision.reason,
          score: decision.score.toFixed(1),
          threshold: decision.threshold,
        });
        return false;
      }
      shownKeys.current.add(shownKeyFor(notif));
      sentCount.current += 1;
      setCurrent(notif);
      relaySms(notif);
      return true;
    },
    [evaluateTrigger, recordNotificationDecision, relaySms],
  );

  const pushNotification = useCallback((notif: InAppNotification) => {
    showNotification(notif);
  }, [showNotification]);

  const scheduleNext = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const minMs = Math.max(5, config.sms.repeatMinSeconds) * 1000;
    const maxMs = Math.max(config.sms.repeatMinSeconds, config.sms.repeatMaxSeconds) * 1000;
    const delay = minMs + Math.random() * Math.max(0, maxMs - minMs);
    timerRef.current = setTimeout(() => {
      if (sentCount.current >= config.sms.maxPerSession) return;
      const notif = pickAlert(markets, shownKeys.current, config.sms.priceMoveThresholdCents);
      if (!notif) return;
      showNotification(notif);
      scheduleNext();
    }, delay);
  }, [markets, showNotification, config.sms]);

  // Boot: fire first notification ~35-45s after user is onboarded
  useEffect(() => {
    if (!user.onboarded) return;
    const boot = setTimeout(() => {
      if (sentCount.current >= config.sms.maxPerSession) return;
      const notif = pickAlert(markets, shownKeys.current, config.sms.priceMoveThresholdCents);
      if (!notif) return;
      showNotification(notif);
      scheduleNext();
    }, Math.max(5, config.sms.firstDelaySeconds) * 1000 + Math.random() * 10_000);

    return () => clearTimeout(boot);
  // Only run once after onboarding
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.onboarded, showNotification, config.sms.firstDelaySeconds, config.sms.maxPerSession, config.sms.priceMoveThresholdCents]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { current, dismiss, pushNotification };
});
