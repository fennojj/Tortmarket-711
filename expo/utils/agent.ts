import type { Market, User } from "@/types";
import type { MarketEdge, PortfolioInsights, UserSignals } from "@/utils/signals";

export type AgentActionKind =
  | "welcome"
  | "claim_daily"
  | "first_play"
  | "rebalance"
  | "hot_pick"
  | "reduce_risk"
  | "streak_save"
  | "diversify"
  | "whale_vip"
  | "resolution_peek"
  | "return_reward"
  | "fomo_alert"
  | "position_at_risk"
  | "price_alert"
  | "mystery_bonus"
  | "social_proof"
  | "near_resolution";

export interface AgentAction {
  id: string;
  kind: AgentActionKind;
  priority: number;
  title: string;
  body: string;
  cta: string;
  route?: string;
  marketId?: string;
  tone: "celebrate" | "nudge" | "urgent" | "info" | "fomo";
  urgencyMs?: number;
}

export interface AgentContext {
  user: User;
  signals: UserSignals;
  portfolio: PortfolioInsights;
  edges: MarketEdge[];
  markets: Market[];
  canClaimDaily: boolean;
}

const WHALE_NAMES = [
  "@whale_22", "@hedge_lord", "@mdl_scout", "@tortking", "@bellwether",
];

function randWhale(): string {
  return WHALE_NAMES[Math.floor(Math.random() * WHALE_NAMES.length)];
}

export function planAgentActions(ctx: AgentContext): AgentAction[] {
  const { user, signals, portfolio, edges, markets, canClaimDaily } = ctx;
  const actions: AgentAction[] = [];
  const topEdge = edges[0];
  const topMarket = topEdge ? markets.find((m) => m.id === topEdge.marketId) : undefined;
  const streak = user.streakDays ?? 0;

  if (!user.onboarded) {
    actions.push({
      id: "welcome",
      kind: "welcome",
      priority: 100,
      title: "Claim your seat at the table",
      body: "Pick a handle + email and we'll drop 25,000 starter points into your wallet.",
      cta: "Join the POC",
      tone: "celebrate",
    });
    return actions;
  }

  if (!user.welcomeBonusClaimed) {
    actions.push({
      id: "welcome-bonus",
      kind: "welcome",
      priority: 95,
      title: "25,000 welcome bonus waiting",
      body: "One tap to load your wallet. Let's get you into your first MDL position.",
      cta: "Claim bonus",
      tone: "celebrate",
    });
  }

  if (canClaimDaily) {
    actions.push({
      id: "daily",
      kind: "claim_daily",
      priority: streak >= 5 ? 92 : streak >= 3 ? 88 : 70,
      title:
        streak >= 5
          ? `🔥 ${streak}-day streak — don't break it now`
          : streak >= 3
          ? `Keep the ${streak}-day streak alive`
          : "Daily drop ready",
      body:
        streak >= 5
          ? `Miss today and ${streak} days of compounding bonus resets to zero. Streaks this long are rare — protect yours.`
          : streak >= 3
          ? `Miss today and your streak resets. Bonus scales up through day 7.`
          : "Grab today's points and start stacking your streak bonus. Day 3 unlocks a multiplier.",
      cta: "Claim daily",
      tone: streak >= 5 ? "urgent" : "nudge",
    });
  }

  if (signals.state === "dormant" || signals.state === "at_risk") {
    const movingMarkets = markets.filter((m) => Math.abs(m.change24h) >= 5).length;
    const whaleName = randWhale();
    actions.push({
      id: "return-reward",
      kind: "return_reward",
      priority: 91,
      title: signals.state === "dormant" ? "The docket moved without you" : "We missed you",
      body:
        signals.state === "dormant"
          ? `${Math.round(signals.hoursSinceLastPlay)}h of inactivity. ${movingMarkets} markets shifted${topMarket ? `, including ${topMarket.caseName}` : ""}. Your book needs attention.`
          : `It's been ${Math.round(signals.hoursSinceLastPlay)}h. ${whaleName} and others locked in fresh forecasts on ${topMarket?.caseName ?? "your top market"}.`,
      cta: "See what moved",
      route: "/(tabs)/alerts",
      tone: signals.state === "dormant" ? "urgent" : "nudge",
    });
  }

  if (signals.lossAversionTrigger && portfolio.positionsAtRisk.length > 0) {
    const risky = portfolio.positionsAtRisk[0];
    actions.push({
      id: `risk-${risky.slice(0, 8)}`,
      kind: "position_at_risk",
      priority: 90,
      title: `${risky} is moving against you`,
      body: `Your position is down >8% from entry. Cut risk by hedging the other side, or double down if your Daubert thesis still holds. Acting now beats reacting later.`,
      cta: "Review portfolio",
      route: "/(tabs)/portfolio",
      tone: "urgent",
    });
  }

  if (signals.fomoIndex >= 55 && !signals.hasPositions) {
    const mover = [...markets].sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h))[0];
    actions.push({
      id: `fomo-${mover.id}`,
      kind: "fomo_alert",
      priority: 89,
      title: `${mover.caseName} moved ${mover.change24h >= 0 ? "+" : ""}${mover.change24h.toFixed(1)}% while you were out`,
      body: `You have no position. ${randWhale()} and others loaded up at ${mover.yesPrice}¢. The window may still be open — check the model.`,
      cta: "See the market",
      route: `/market/${mover.id}`,
      marketId: mover.id,
      tone: "fomo",
    });
  }

  if (!signals.hasPositions && user.onboarded && topEdge && topMarket) {
    actions.push({
      id: "first-play",
      kind: "first_play",
      priority: 85,
      title: "Your first play is teed up",
      body: `${topMarket.caseName} trades at ${topMarket.yesPrice}¢ YES. Model fair value: ${topEdge.fairYes.toFixed(0)}¢. Edge: ${topEdge.edge >= 0 ? "+" : ""}${topEdge.edge.toFixed(1)}¢. ${topEdge.reasons[0] ?? ""}`,
      cta: `Go ${topEdge.recommendedSide} on ${topMarket.defendant.split(" ")[0]}`,
      marketId: topMarket.id,
      route: `/market/${topMarket.id}`,
      tone: "celebrate",
    });
  }

  if (signals.hasPositions && topEdge && topMarket && Math.abs(topEdge.edge) >= 8) {
    actions.push({
      id: `hot-${topMarket.id}`,
      kind: "hot_pick",
      priority: 80,
      title: `${topEdge.recommendedSide} edge: ${topMarket.caseName}`,
      body: `Price ${topEdge.recommendedSide === "YES" ? topMarket.yesPrice : topMarket.noPrice}¢ vs fair ${topEdge.recommendedSide === "YES" ? topEdge.fairYes.toFixed(0) : (100 - topEdge.fairYes).toFixed(0)}¢ · confidence ${topEdge.confidence.toFixed(0)}%. ${topEdge.reasons.slice(0, 2).join(" · ")}.`,
      cta: `Forecast ${topEdge.recommendedSide}`,
      marketId: topMarket.id,
      route: `/market/${topMarket.id}`,
      tone: "nudge",
    });
  }

  const nearResolution = edges.find((e) => {
    const m = markets.find((mm) => mm.id === e.marketId);
    return m && Math.abs(m.change24h) >= 7;
  });
  if (nearResolution) {
    const m = markets.find((mm) => mm.id === nearResolution.marketId)!;
    actions.push({
      id: `resolve-${m.id}`,
      kind: "near_resolution",
      priority: 78,
      title: `Verdict signal: ${m.caseName}`,
      body: `+${Math.abs(m.change24h).toFixed(1)}% in 24h. Rapid price moves like this often precede bellwether rulings or settlement announcements. Position before the tape settles.`,
      cta: "Open market",
      route: `/market/${m.id}`,
      marketId: m.id,
      tone: "urgent",
      urgencyMs: 3 * 60 * 60 * 1000,
    });
  }

  if (portfolio.concentration >= 0.55 && user.positions.length >= 2) {
    actions.push({
      id: "rebalance",
      kind: "rebalance",
      priority: 75,
      title: "Your book is concentrated",
      body: `${Math.round(portfolio.concentration * 100)}% of your stake sits in one market. A single bad Daubert ruling wipes ${Math.round(portfolio.concentration * 100)}% of your P&L. Spread the risk.`,
      cta: "Rebalance",
      route: "/(tabs)/portfolio",
      tone: "nudge",
    });
  }

  if (
    user.positions.length >= 1 &&
    Object.keys(portfolio.categoryTilt).length <= 1 &&
    edges.length > 1
  ) {
    const currentCat = markets.find((m) => m.id === user.positions[0]?.marketId)?.category;
    const alt = edges.find((e) => markets.find((m) => m.id === e.marketId)?.category !== currentCat);
    const altMarket = alt ? markets.find((m) => m.id === alt.marketId) : undefined;
    if (alt && altMarket) {
      actions.push({
        id: "diversify",
        kind: "diversify",
        priority: 60,
        title: "Uncorrelated edge available",
        body: `${altMarket.caseName} carries ${alt.confidence.toFixed(0)}% confidence ${alt.recommendedSide} — different docket risk than what you hold. One position doesn't win a season.`,
        cta: "Explore",
        route: `/market/${altMarket.id}`,
        tone: "info",
      });
    }
  }

  if (signals.state === "whale") {
    actions.push({
      id: "whale",
      kind: "whale_vip",
      priority: 55,
      title: "Whale desk — your plays go public",
      body: "You're in the top 5% of point holders. Your next play triggers a broadcast to all feeds and the #whale-tracker. Every eye will be on your thesis.",
      cta: "View leaderboard",
      route: "/(tabs)/leaderboard",
      tone: "celebrate",
    });
  }

  if (user.positions.length >= 5 && portfolio.diversificationScore < 40) {
    actions.push({
      id: "mystery-bonus",
      kind: "mystery_bonus",
      priority: 45,
      title: "Diversification bonus at 3 categories",
      body: "Trade across 3+ categories to unlock a surprise multiplier on your next daily claim. You're at " + Object.keys(portfolio.categoryTilt).length + " right now.",
      cta: "Browse categories",
      route: "/(tabs)",
      tone: "info",
    });
  }

  return actions.sort((a, b) => b.priority - a.priority);
}

export function buildCoachSystemPrompt(ctx: AgentContext): string {
  const { user, signals, portfolio, edges, markets, canClaimDaily } = ctx;
  const top3 = edges.slice(0, 3).map((e) => {
    const m = markets.find((mm) => mm.id === e.marketId);
    return `- ${m?.caseName}: ${e.recommendedSide} @ ${e.recommendedSide === "YES" ? m?.yesPrice : m?.noPrice}¢, fair ${e.fairYes.toFixed(0)}¢, edge ${e.edge.toFixed(1)}, conf ${e.confidence.toFixed(0)}% — ${e.reasons.join("; ")}`;
  }).join("\n");

  const posLines = user.positions.slice(0, 5).map((p) => {
    const m = markets.find((mm) => mm.id === p.marketId);
    const price = p.side === "YES" ? m?.yesPrice ?? p.avgPrice : m?.noPrice ?? p.avgPrice;
    const pnlPct = ((price - p.avgPrice) / Math.max(p.avgPrice, 1) * 100).toFixed(1);
    return `- ${m?.caseName}: ${p.side} ${p.shares.toLocaleString()} @ ${p.avgPrice.toFixed(0)}¢ (now ${price}¢, ${Number(pnlPct) >= 0 ? "+" : ""}${pnlPct}%)`;
  }).join("\n") || "none yet";

  const fomoCtx = signals.fomoIndex >= 50
    ? `FOMO index elevated at ${signals.fomoIndex.toFixed(0)}/100. ${signals.nudgeWindowOpen ? "Optimal nudge window is open." : ""}`
    : "";

  const riskCtx = portfolio.positionsAtRisk.length > 0
    ? `POSITIONS AT RISK: ${portfolio.positionsAtRisk.join(", ")} — down >8% from entry.`
    : "";

  return `You are TortCoach, the engagement AI agent inside Tort Site — a mass-tort prediction market app (POC, points only).
Your job: keep this user engaged, educated, and making smart plays. Be direct, crisp, mobile-friendly (1-3 short paragraphs max). Never promise real money. Always use the words "forecast" and "points" — never "bet", "wager", or "trade" in user-facing copy.

USER PROFILE
- Handle: ${user.handle}
- State: ${signals.state} | Engagement ${signals.engagementScore.toFixed(0)}/100 | Churn risk ${signals.churnRisk.toFixed(0)}/100
- Velocity: ${signals.velocityTrend} | FOMO index: ${signals.fomoIndex.toFixed(0)}/100 | Nudge window: ${signals.nudgeWindowOpen ? "OPEN" : "closed"}
- Balance: ${user.pointBalance.toLocaleString()} pts | Streak ${user.streakDays ?? 0}d | Last active ${signals.hoursSinceLastPlay < 1 ? "just now" : `${signals.hoursSinceLastPlay.toFixed(1)}h ago`}
- Portfolio: ${user.positions.length} positions | Concentration ${(portfolio.concentration * 100).toFixed(0)}% | Risk: ${portfolio.riskLevel} | P&L: ${portfolio.unrealizedPnlPct >= 0 ? "+" : ""}${portfolio.unrealizedPnlPct.toFixed(1)}%
${riskCtx ? `\n${riskCtx}` : ""}${fomoCtx ? `\n${fomoCtx}` : ""}

CURRENT POSITIONS
${posLines}

TOP MODEL EDGES (fair value = MDL sentiment × 0.40 + Daubert × 0.35 + corporate reserves × 0.25 + momentum bias)
${top3}

COACHING RULES
- Confident, analyst-voice. Zero emoji spam.
- Reference real Daubert / bellwether / MDL / CLJA / PACT concepts when relevant.
- If user asks for a pick, cite the edge, confidence, and one concrete reason.
- If churn risk > 50, open with a re-engagement hook tied to their specific book.
- If FOMO index > 60, reference what moved while they were away.
- Default to 1 clear action, not 5 options.
- Never frame as securities. These are points in a proof-of-concept.
- If the user's positions are at risk, lead with that — loss aversion is the strongest hook.
${canClaimDaily ? "- Remind user their daily claim is available if they haven't mentioned it." : ""}`;
}
