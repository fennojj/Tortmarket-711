import type { AppStateStatus, ScaledSize } from "react-native";
import type { User } from "@/types";
import type { EngagementEvent } from "@/providers/EngagementProvider";
import type { EngagementFormulaConfig } from "@/providers/AdminConfigProvider";
import type { UserSignals } from "@/utils/signals";

export type EngagementChannel = "in_app" | "sms";

export type EngagementTriggerKind =
  | "breaking"
  | "coach"
  | "trade"
  | "social"
  | "intel"
  | "reward"
  | "recruiting"
  | "sponsor";

export interface PassiveEngagementSensors {
  appState: AppStateStatus;
  platform: "ios" | "android" | "web" | "windows" | "macos" | "native";
  formFactor: "compact" | "regular";
  localHour: number;
  timezoneOffsetMinutes: number;
}

export interface EngagementTriggerInput {
  id: string;
  kind: EngagementTriggerKind;
  channel: EngagementChannel;
  urgent?: boolean;
  rewardValue?: number;
  socialPull?: number;
  marketUrgency?: number;
  sponsorFit?: number;
}

export interface EngagementFormulaContext {
  config: EngagementFormulaConfig;
  user: User;
  signals: UserSignals;
  eventLog: EngagementEvent[];
  sensors: PassiveEngagementSensors;
  now: number;
}

export interface EngagementDecision {
  allowed: boolean;
  score: number;
  threshold: number;
  factors: {
    motivationFit: number;
    timingFit: number;
    rewardValue: number;
    socialPull: number;
    marketUrgency: number;
    sponsorFit: number;
    notificationFatigue: number;
    intrusionRisk: number;
    repetitionRisk: number;
  };
  reason: string;
}

const HOUR_MS = 60 * 60 * 1000;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sameLocalDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

function isQuietHour(hour: number, start: number, end: number): boolean {
  const normalizedStart = clamp(Math.round(start), 0, 23);
  const normalizedEnd = clamp(Math.round(end), 0, 23);
  if (normalizedStart === normalizedEnd) return false;
  if (normalizedStart < normalizedEnd) return hour >= normalizedStart && hour < normalizedEnd;
  return hour >= normalizedStart || hour < normalizedEnd;
}

function notificationEvents(events: EngagementEvent[]): Extract<EngagementEvent, { kind: "notification_shown" }>[] {
  return events.filter(
    (event): event is Extract<EngagementEvent, { kind: "notification_shown" }> =>
      event.kind === "notification_shown",
  );
}

function computeMotivationFit(input: EngagementTriggerInput, ctx: EngagementFormulaContext): number {
  const { signals, user } = ctx;
  const hasReferrals = (user.referralCount ?? 0) > 0;

  if (input.kind === "trade") {
    return clamp(
      40 +
        (signals.hasPositions ? 18 : 0) +
        (signals.lossAversionTrigger ? 24 : 0) +
        (input.urgent ? 12 : 0) +
        Math.min(16, signals.fomoIndex * 0.16),
      0,
      100,
    );
  }

  if (input.kind === "social" || input.kind === "recruiting") {
    return clamp(
      35 +
        (hasReferrals ? 18 : 0) +
        Math.min(20, (user.referralCount ?? 0) * 5) +
        (signals.state === "new" ? 12 : 0) +
        (input.socialPull ?? 0) * 0.2,
      0,
      100,
    );
  }

  if (input.kind === "reward" || input.kind === "sponsor") {
    return clamp(
      38 +
        (signals.balanceBand === "low" ? 16 : 0) +
        ((user.streakDays ?? 0) >= 3 ? 12 : 0) +
        (input.rewardValue ?? 0) * 0.18 +
        (input.sponsorFit ?? 0) * 0.12,
      0,
      100,
    );
  }

  if (input.kind === "breaking" || input.kind === "intel" || input.kind === "coach") {
    return clamp(
      42 +
        (signals.hasPositions ? 12 : 0) +
        (signals.nudgeWindowOpen ? 10 : 0) +
        (input.urgent ? 18 : 0) +
        (input.marketUrgency ?? 0) * 0.18,
      0,
      100,
    );
  }

  return 45;
}

function computeTimingFit(input: EngagementTriggerInput, ctx: EngagementFormulaContext): number {
  const { config, signals, sensors } = ctx;
  const quiet = config.quietHoursEnabled && isQuietHour(sensors.localHour, config.quietHoursStart, config.quietHoursEnd);
  if (input.channel === "sms" && quiet) return 0;

  const activeAppBoost = sensors.appState === "active" ? 14 : input.channel === "sms" ? 6 : -12;
  const nudgeBoost = signals.nudgeWindowOpen ? 20 : 0;
  const businessHourBoost = sensors.localHour >= 8 && sensors.localHour <= 20 ? 12 : -8;
  const compactPenalty = sensors.formFactor === "compact" && input.channel === "in_app" ? -2 : 0;

  return clamp(52 + activeAppBoost + nudgeBoost + businessHourBoost + compactPenalty, 0, 100);
}

function computeRepetitionRisk(input: EngagementTriggerInput, ctx: EngagementFormulaContext): number {
  const recent = notificationEvents(ctx.eventLog).filter((event) => ctx.now - event.at <= 6 * HOUR_MS);
  const sameId = recent.some((event) => event.triggerId === input.id);
  const sameKind = recent.filter((event) => event.triggerKind === input.kind).length;
  return clamp((sameId ? 55 : 0) + sameKind * 14, 0, 100);
}

function computeFatigue(ctx: EngagementFormulaContext): number {
  const todayCount = notificationEvents(ctx.eventLog).filter((event) => sameLocalDay(event.at, ctx.now)).length;
  const sessionCount = notificationEvents(ctx.eventLog).filter((event) => ctx.now - event.at <= 90 * 60_000).length;
  return clamp(todayCount * ctx.config.fatiguePenaltyPerTrigger + sessionCount * 8, 0, 100);
}

function computeIntrusionRisk(input: EngagementTriggerInput, ctx: EngagementFormulaContext): number {
  const { config, sensors, user } = ctx;
  const quiet = config.quietHoursEnabled && isQuietHour(sensors.localHour, config.quietHoursStart, config.quietHoursEnd);
  const smsNoOptInRisk = input.channel === "sms" && !user.smsOptedIn ? 100 : 0;
  const smsBaseRisk = input.channel === "sms" ? 18 : 4;
  const quietRisk = quiet ? (input.channel === "sms" ? 70 : 18) : 0;
  const backgroundInAppRisk = input.channel === "in_app" && sensors.appState !== "active" ? 25 : 0;
  return clamp(smsNoOptInRisk + smsBaseRisk + quietRisk + backgroundInAppRisk, 0, 100);
}

export function buildPassiveEngagementSensors(args: {
  appState: AppStateStatus;
  platform: PassiveEngagementSensors["platform"];
  window: ScaledSize;
  now?: number;
}): PassiveEngagementSensors {
  const now = args.now ?? Date.now();
  const localHour = new Date(now).getHours();
  const shortestSide = Math.min(args.window.width, args.window.height);
  return {
    appState: args.appState,
    platform: args.platform,
    formFactor: shortestSide < 600 ? "compact" : "regular",
    localHour,
    timezoneOffsetMinutes: new Date(now).getTimezoneOffset(),
  };
}

export function evaluateEngagementTrigger(
  input: EngagementTriggerInput,
  ctx: EngagementFormulaContext,
): EngagementDecision {
  const config = ctx.config;
  const threshold = input.channel === "sms" ? config.minSmsTriggerScore : config.minInAppTriggerScore;

  if (!config.enabled) {
    return {
      allowed: true,
      score: 100,
      threshold,
      factors: {
        motivationFit: 100,
        timingFit: 100,
        rewardValue: input.rewardValue ?? 0,
        socialPull: input.socialPull ?? 0,
        marketUrgency: input.marketUrgency ?? 0,
        sponsorFit: input.sponsorFit ?? 0,
        notificationFatigue: 0,
        intrusionRisk: 0,
        repetitionRisk: 0,
      },
      reason: "gate disabled",
    };
  }

  const shown = notificationEvents(ctx.eventLog);
  const channelShown = shown.filter((event) => event.channel === input.channel);
  const lastShown = channelShown[channelShown.length - 1];
  const minutesSinceLast = lastShown ? (ctx.now - lastShown.at) / 60_000 : Number.POSITIVE_INFINITY;
  const dailyCount = shown.filter((event) => sameLocalDay(event.at, ctx.now)).length;

  const factors = {
    motivationFit: computeMotivationFit(input, ctx),
    timingFit: computeTimingFit(input, ctx),
    rewardValue: clamp(input.rewardValue ?? 0, 0, 100),
    socialPull: clamp(input.socialPull ?? 0, 0, 100),
    marketUrgency: clamp(input.marketUrgency ?? (input.urgent ? 85 : 35), 0, 100),
    sponsorFit: clamp(input.sponsorFit ?? 0, 0, 100),
    notificationFatigue: computeFatigue(ctx),
    intrusionRisk: computeIntrusionRisk(input, ctx),
    repetitionRisk: computeRepetitionRisk(input, ctx),
  };

  const positiveWeight =
    config.motivationWeight +
    config.timingWeight +
    config.rewardWeight +
    config.socialWeight +
    config.urgencyWeight +
    config.sponsorFitWeight;

  const positiveScore =
    (factors.motivationFit * config.motivationWeight +
      factors.timingFit * config.timingWeight +
      factors.rewardValue * config.rewardWeight +
      factors.socialPull * config.socialWeight +
      factors.marketUrgency * config.urgencyWeight +
      factors.sponsorFit * config.sponsorFitWeight) /
    Math.max(1, positiveWeight);

  const penalty =
    factors.notificationFatigue * 0.35 +
    factors.intrusionRisk * 0.42 +
    factors.repetitionRisk * 0.28;

  const score = clamp(positiveScore - penalty, 0, 100);

  if (dailyCount >= config.maxDailyTriggers) {
    return { allowed: false, score, threshold, factors, reason: "daily trigger cap reached" };
  }

  if (minutesSinceLast < config.cooldownMinutes) {
    return { allowed: false, score, threshold, factors, reason: "cooldown active" };
  }

  if (input.channel === "sms" && factors.intrusionRisk >= 90) {
    return { allowed: false, score, threshold, factors, reason: "sms would be too intrusive" };
  }

  return {
    allowed: score >= threshold,
    score,
    threshold,
    factors,
    reason: score >= threshold ? "score passed" : "score below threshold",
  };
}
