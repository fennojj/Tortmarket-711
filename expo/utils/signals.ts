import type { Market, Position, User, MDLPrediction } from "@/types";

export interface MarketEdge {
  marketId: string;
  edge: number;
  fairYes: number;
  confidence: number;
  momentum: number;
  reasons: string[];
  recommendedSide: "YES" | "NO";
  riskLabel: "low" | "medium" | "high";
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function computeMomentum(market: Market): number {
  const h = market.history;
  if (h.length < 6) return 0;
  const recent = h.slice(-5).map((p) => p.yes);
  const prior = h.slice(-12, -5).map((p) => p.yes);
  const diff = avg(recent) - avg(prior);
  return clamp(diff, -40, 40);
}

export function computeFairYes(market: Market): number {
  const fundamentals =
    market.mdlSentiment * 0.4 +
    market.daubertStrength * 0.35 +
    market.corporateReserves * 0.25;
  const momentumBias = computeMomentum(market) * 0.4;
  return clamp(fundamentals + momentumBias, 2, 98);
}

export function scoreMarketEdge(market: Market): MarketEdge {
  const fairYes = computeFairYes(market);
  const edgeYes = fairYes - market.yesPrice;
  const edge = edgeYes;
  const momentum = computeMomentum(market);
  const side: "YES" | "NO" = edge >= 0 ? "YES" : "NO";
  const absEdge = Math.abs(edge);
  const volumeBoost = clamp(market.volume / 7_500_000, 0, 1);
  const confidence = clamp(absEdge * 1.8 + volumeBoost * 10, 5, 95);

  const reasons: string[] = [];
  if (market.daubertStrength >= 70) reasons.push(`Daubert strength ${market.daubertStrength}/100`);
  else if (market.daubertStrength <= 35) reasons.push(`Weak Daubert (${market.daubertStrength})`);
  if (market.mdlSentiment >= 70) reasons.push(`MDL sentiment ${market.mdlSentiment}`);
  else if (market.mdlSentiment <= 35) reasons.push(`Bearish MDL sentiment (${market.mdlSentiment})`);
  if (market.corporateReserves >= 75) reasons.push(`Defendant reserves ${market.corporateReserves}`);
  if (momentum >= 8) reasons.push(`+${momentum.toFixed(0)}pt momentum 7d`);
  else if (momentum <= -8) reasons.push(`${momentum.toFixed(0)}pt slide 7d`);
  if (market.change24h >= 5) reasons.push(`+${market.change24h.toFixed(1)}% 24h`);
  else if (market.change24h <= -5) reasons.push(`${market.change24h.toFixed(1)}% 24h`);
  if (market.volume >= 5_000_000) reasons.push(`High liquidity ($${(market.volume / 1e6).toFixed(1)}M)`);

  const riskLabel: MarketEdge["riskLabel"] =
    confidence >= 65 ? "low" : confidence >= 40 ? "medium" : "high";

  return {
    marketId: market.id,
    edge,
    fairYes,
    confidence,
    momentum,
    reasons: reasons.slice(0, 4),
    recommendedSide: side,
    riskLabel,
  };
}

export function rankMarketsByEdge(markets: Market[]): MarketEdge[] {
  return markets
    .map(scoreMarketEdge)
    .sort((a, b) => Math.abs(b.edge) - Math.abs(a.edge));
}

export function blendWithPredictions(
  edges: MarketEdge[],
  predictions: MDLPrediction[],
): MarketEdge[] {
  const byId = new Map(predictions.map((p) => [p.marketId, p]));
  return edges.map((e) => {
    const p = byId.get(e.marketId);
    if (!p) return e;
    const aligned =
      (p.direction === "up" && e.recommendedSide === "YES") ||
      (p.direction === "down" && e.recommendedSide === "NO");
    const boost = aligned ? p.confidence * 0.25 : -p.confidence * 0.2;
    const reasons = aligned
      ? [...e.reasons, `TortCast aligned @ ${p.confidence}%`]
      : [...e.reasons, `TortCast diverges (${p.direction})`];
    return {
      ...e,
      confidence: clamp(e.confidence + boost, 5, 98),
      reasons: reasons.slice(0, 5),
    };
  });
}

export interface PortfolioInsights {
  concentration: number;
  categoryTilt: Record<string, number>;
  directionalBias: number;
  avgEdge: number;
  diversificationScore: number;
  riskLevel: "conservative" | "balanced" | "aggressive";
  unrealizedPnlPct: number;
  positionsAtRisk: string[];
}

export function analyzePortfolio(
  positions: Position[],
  markets: Market[],
): PortfolioInsights {
  if (positions.length === 0) {
    return {
      concentration: 0,
      categoryTilt: {},
      directionalBias: 0,
      avgEdge: 0,
      diversificationScore: 0,
      riskLevel: "balanced",
      unrealizedPnlPct: 0,
      positionsAtRisk: [],
    };
  }
  const totals = positions.map((p) => p.shares * p.avgPrice);
  const sum = totals.reduce((a, b) => a + b, 0);
  const max = Math.max(...totals);
  const concentration = sum > 0 ? max / sum : 0;

  const categoryTilt: Record<string, number> = {};
  let yesWeight = 0;
  let noWeight = 0;
  const edges: number[] = [];
  let totalCost = 0;
  let totalValue = 0;
  const positionsAtRisk: string[] = [];

  for (const p of positions) {
    const m = markets.find((mm) => mm.id === p.marketId);
    if (!m) continue;
    const w = p.shares * p.avgPrice;
    categoryTilt[m.category] = (categoryTilt[m.category] ?? 0) + w;
    if (p.side === "YES") yesWeight += w;
    else noWeight += w;
    const fair = computeFairYes(m);
    const e = p.side === "YES" ? fair - p.avgPrice : p.avgPrice - (100 - fair);
    edges.push(e);

    const currentPrice = p.side === "YES" ? m.yesPrice : m.noPrice;
    const cost = p.shares * p.avgPrice;
    const value = p.shares * currentPrice;
    totalCost += cost;
    totalValue += value;

    const pnlPct = cost > 0 ? ((value - cost) / cost) * 100 : 0;
    if (pnlPct <= -8) positionsAtRisk.push(m.caseName);
  }

  const totalWeight = yesWeight + noWeight;
  const directionalBias = totalWeight > 0 ? (yesWeight - noWeight) / totalWeight : 0;
  const avgEdge = avg(edges);
  const cats = Object.keys(categoryTilt).length;
  const diversificationScore = clamp(
    cats * 15 + (1 - concentration) * 40,
    0,
    100,
  );
  const absBias = Math.abs(directionalBias);
  const riskLevel: PortfolioInsights["riskLevel"] =
    concentration >= 0.6 || absBias >= 0.7
      ? "aggressive"
      : concentration >= 0.35 || absBias >= 0.4
      ? "balanced"
      : "conservative";

  const unrealizedPnlPct = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

  return {
    concentration,
    categoryTilt,
    directionalBias,
    avgEdge,
    diversificationScore,
    riskLevel,
    unrealizedPnlPct,
    positionsAtRisk,
  };
}

export interface FOMOIndex {
  whaleActivityScore: number;
  marketMovementScore: number;
  positionRiskScore: number;
  missedOpportunityScore: number;
  compositeIndex: number;
  topMissedMarket: string | null;
}

export function computeFOMOIndex(
  markets: Market[],
  positions: Position[],
  hoursSinceLastVisit: number,
): FOMOIndex {
  const movers = markets.filter((m) => Math.abs(m.change24h) >= 4);
  const marketMovementScore = clamp(movers.length * 12 + (hoursSinceLastVisit > 12 ? 20 : 0), 0, 100);

  const highVolumeMarkets = markets.filter((m) => m.volume >= 4_000_000);
  const whaleActivityScore = clamp(highVolumeMarkets.length * 8 + (hoursSinceLastVisit > 6 ? 15 : 0), 0, 100);

  const positionRiskScore = clamp(
    positions.filter((p) => {
      const m = markets.find((mm) => mm.id === p.marketId);
      if (!m) return false;
      const currentPrice = p.side === "YES" ? m.yesPrice : m.noPrice;
      return currentPrice < p.avgPrice * 0.92;
    }).length * 25,
    0,
    100,
  );

  const topMover = [...markets]
    .filter((m) => !positions.some((p) => p.marketId === m.id))
    .sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h))[0];

  const missedOpportunityScore = clamp(
    (topMover ? Math.abs(topMover.change24h) * 6 : 0) + (hoursSinceLastVisit > 24 ? 30 : 0),
    0,
    100,
  );

  const compositeIndex = clamp(
    whaleActivityScore * 0.25 +
    marketMovementScore * 0.35 +
    positionRiskScore * 0.25 +
    missedOpportunityScore * 0.15,
    0,
    100,
  );

  return {
    whaleActivityScore,
    marketMovementScore,
    positionRiskScore,
    missedOpportunityScore,
    compositeIndex,
    topMissedMarket: topMover?.caseName ?? null,
  };
}

export type BehavioralTrend = "accelerating" | "stable" | "decelerating" | "dormant";

export interface BehavioralVelocity {
  trend: BehavioralTrend;
  predictedChurnHours: number;
  optimalNudgeWindowOpen: boolean;
  engagementMomentum: number;
}

export function computeVelocity(
  sessionCount: number,
  hoursSinceLastActivity: number,
  streakDays: number,
  hasPositions: boolean,
): BehavioralVelocity {
  let trend: BehavioralTrend;
  if (hoursSinceLastActivity > 96) trend = "dormant";
  else if (hoursSinceLastActivity > 36) trend = "decelerating";
  else if (sessionCount >= 3 && hoursSinceLastActivity < 12) trend = "accelerating";
  else trend = "stable";

  const churnBase =
    trend === "dormant" ? 24 :
    trend === "decelerating" ? 48 :
    trend === "stable" ? 72 :
    120;
  const churnBonus = (streakDays * 6) + (hasPositions ? 24 : 0);
  const predictedChurnHours = clamp(churnBase + churnBonus, 12, 240);

  const optimalNudgeWindowOpen =
    (hoursSinceLastActivity > 16 && hoursSinceLastActivity < 28) ||
    (hoursSinceLastActivity > 40 && hoursSinceLastActivity < 52);

  const engagementMomentum = clamp(
    (trend === "accelerating" ? 80 : trend === "stable" ? 55 : trend === "decelerating" ? 30 : 10) +
    streakDays * 3 +
    (hasPositions ? 15 : 0),
    0,
    100,
  );

  return { trend, predictedChurnHours, optimalNudgeWindowOpen, engagementMomentum };
}

export interface UserSignals {
  state: "new" | "onboarding" | "active" | "at_risk" | "whale" | "streaker" | "dormant";
  engagementScore: number;
  churnRisk: number;
  hoursSinceLastPlay: number;
  hasPositions: boolean;
  balanceBand: "low" | "mid" | "high";
  streakMomentum: "cold" | "warm" | "hot";
  fomoIndex: number;
  velocityTrend: BehavioralTrend;
  nudgeWindowOpen: boolean;
  lossAversionTrigger: boolean;
}

export function computeUserSignals(
  user: User,
  lastActivityAt: number | null,
  sessionCount: number,
): UserSignals {
  const now = Date.now();
  const hoursSinceLastPlay = lastActivityAt
    ? (now - lastActivityAt) / 3_600_000
    : 9999;
  const hasPositions = user.positions.length > 0;
  const balanceBand: UserSignals["balanceBand"] =
    user.pointBalance >= 500_000 ? "high" : user.pointBalance >= 50_000 ? "mid" : "low";

  const streak = user.streakDays ?? 0;
  const streakMomentum: UserSignals["streakMomentum"] =
    streak >= 5 ? "hot" : streak >= 2 ? "warm" : "cold";

  const totalInvested = user.positions.reduce((a, p) => a + p.shares * p.avgPrice, 0);
  const isWhale = totalInvested >= 500_000 || user.pointBalance >= 1_500_000;

  const decayFactor = Math.exp(-hoursSinceLastPlay / 48);
  const sessionScore = clamp(sessionCount * 4 * decayFactor, 0, 40);

  const engagementScore = clamp(
    sessionScore +
      (hasPositions ? 20 : 0) +
      streak * 5 +
      (user.onboarded ? 10 : 0) +
      (isWhale ? 15 : 0) +
      clamp(24 - hoursSinceLastPlay, 0, 24) * 0.6,
    0,
    100,
  );

  const churnRisk = clamp(
    (hoursSinceLastPlay > 96 ? 55 : hoursSinceLastPlay > 48 ? 35 : hoursSinceLastPlay > 24 ? 20 : 0) +
      (hasPositions ? 0 : 25) +
      (sessionCount <= 1 ? 20 : 0) +
      (streak === 0 ? 15 : 0) +
      (balanceBand === "low" ? 10 : 0),
    0,
    100,
  );

  const velocity = computeVelocity(sessionCount, hoursSinceLastPlay, streak, hasPositions);

  const fomoIndex = computeFOMOIndex(
    [],
    user.positions,
    hoursSinceLastPlay,
  ).compositeIndex;

  const lossAversionTrigger = hasPositions && (
    churnRisk >= 40 || velocity.trend === "decelerating" || velocity.trend === "dormant"
  );

  let state: UserSignals["state"] = "active";
  if (!user.onboarded) state = "onboarding";
  else if (hoursSinceLastPlay > 96) state = "dormant";
  else if (sessionCount <= 1 && !hasPositions) state = "new";
  else if (churnRisk >= 50) state = "at_risk";
  else if (isWhale) state = "whale";
  else if (streak >= 3) state = "streaker";

  return {
    state,
    engagementScore,
    churnRisk,
    hoursSinceLastPlay,
    hasPositions,
    balanceBand,
    streakMomentum,
    fomoIndex,
    velocityTrend: velocity.trend,
    nudgeWindowOpen: velocity.optimalNudgeWindowOpen,
    lossAversionTrigger,
  };
}
