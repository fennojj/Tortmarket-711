import createContextHook from "@nkzw/create-context-hook";
import { useEffect, useMemo, useRef, useState } from "react";
import { SEED_ALERTS, MOCK_PREDICTIONS } from "@/mocks/alerts";
import type { AlertItem, AlertKind, Market } from "@/types";
import { useApp } from "@/providers/AppProvider";
import { useMarkets } from "@/providers/MarketsProvider";

const SIM_NAMES = [
  "@hedge_lord", "@mdl_scout", "@paralegal_pete", "@discovery_diva",
  "@whale_22", "@bellwether_bro", "@tortking", "@settle_sam",
  "@daubert_dan", "@appellate_ally", "@rule23trader", "@verdict_v",
];

const SIM_X_AUTHORS = [
  "@masstortdaily", "@LTLwatch", "@plaintiffside", "@mdl_tracker",
  "@torts_wire", "@classaction_hq", "@daubert_digest",
];

const X_BODIES: { marketId: string; body: string }[] = [
  { marketId: "roundup", body: "Bayer Roundup appeal dismissed by 9th Circuit. Plaintiff bar reading this as green light for remaining bellwethers. YES holders hold tight." },
  { marketId: "camp-lejeune", body: "CLJA claims velocity up 18% MoM per DoJ tracker. Administrative backlog clearing faster than projected. 74¢ YES still looks cheap." },
  { marketId: "pfas-afff", body: "3M PFAS settlement disbursements starting for Wave 1 utilities. Wave 2 claims now open. Market should price this in — it's bullish." },
  { marketId: "talc", body: "J&J LTL 3.0 denied standing. Back to federal MDL. Plaintiff coordination committee says trial ready for 2026. This is real." },
  { marketId: "depo-provera", body: "Pfizer 10-Q discloses $800M reserve increase for Depo-Provera litigation. Market at 57¢. Fair value closer to 68¢ if you run the reserves model." },
  { marketId: "ozempic", body: "Novo Nordisk internal docs show company knew about gastroparesis risk in 2021. Discovery is going to be brutal for the defense." },
  { marketId: "social-media", body: "Utah AG joins coalition of 41 states targeting Meta, TikTok. MDL judge denies motion to dismiss on addiction theory. First in-person hearings set." },
  { marketId: "hair-relaxer", body: "L'Oréal hair relaxer MDL: IARC confirms uterine cancer link in epidemiology study. Plaintiff bar calling this a Daubert game-changer." },
];

const REDDIT_BODIES: { marketId: string; title: string; body: string }[] = [
  { marketId: "roundup", title: "r/masstorts • Roundup trial preview — key Daubert arguments", body: "Defense will argue Bradford Hill criteria not met. Plaintiff response is the WHO IARC classification. Jury sympathy factor is high. What's your price target?" },
  { marketId: "pfas-water", title: "r/environment • PFAS drinking water standard finalized", body: "4 ppt MCL enforceable. Every utility over that limit is now a potential defendant. Municipal PFAS market at 79¢ still has room to run." },
  { marketId: "asbestos", title: "r/legaladvice • Asbestos trusts vs tort claims — which is faster?", body: "Trust claims averaging 18 months to payout. Active tort cases much slower but higher damages. The 84¢ YES price reflects trust stability, not tort upside." },
  { marketId: "hernia-mesh", title: "r/masstorts • Bard hernia mesh bellwether preview", body: "Judge set 3 bellwether trials for Q4. Plaintiff bar confident on design defect theory. 55¢ feels light given the trial schedule." },
];

function simulatedPlay(markets: Market[]): AlertItem {
  const market = markets[Math.floor(Math.random() * markets.length)];
  const side: "YES" | "NO" = Math.random() > 0.48 ? "YES" : "NO";
  const shares = Math.floor(500 + Math.random() * 14500);
  const price = side === "YES" ? market.yesPrice : market.noPrice;
  const cost = shares * price;
  const name = SIM_NAMES[Math.floor(Math.random() * SIM_NAMES.length)];
  return {
    id: `sim-play-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kind: "play",
    marketId: market.id,
    title: `${name} went ${side} on ${market.caseName}`,
    body: `${shares.toLocaleString()} shares @ ${price}¢ · ${cost.toLocaleString()} pts`,
    author: name,
    side,
    shares,
    cost,
    createdAt: Date.now(),
    upvotes: Math.floor(Math.random() * 60),
  };
}

function simulatedXPost(): AlertItem {
  const item = X_BODIES[Math.floor(Math.random() * X_BODIES.length)];
  const author = SIM_X_AUTHORS[Math.floor(Math.random() * SIM_X_AUTHORS.length)];
  return {
    id: `sim-x-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kind: "x",
    marketId: item.marketId,
    title: author,
    body: item.body,
    author,
    createdAt: Date.now(),
    reposts: Math.floor(Math.random() * 200 + 20),
    upvotes: Math.floor(Math.random() * 600 + 50),
  };
}

function simulatedRedditPost(): AlertItem {
  const item = REDDIT_BODIES[Math.floor(Math.random() * REDDIT_BODIES.length)];
  return {
    id: `sim-reddit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kind: "reddit",
    marketId: item.marketId,
    title: item.title,
    body: item.body,
    author: `u/${["torts_throwaway", "hedge_desk", "mdl_watcher", "legal_eagle_9", "plaintiff_bar"][Math.floor(Math.random() * 5)]}`,
    createdAt: Date.now(),
    upvotes: Math.floor(Math.random() * 400 + 30),
  };
}

function simulatedPrediction(markets: Market[]): AlertItem {
  const opts = [
    { id: "roundup", direction: "up", confidence: 74, rationale: "Daubert motion denied — plaintiff experts survive." },
    { id: "camp-lejeune", direction: "up", confidence: 81, rationale: "CLJA claim velocity accelerating." },
    { id: "social-media", direction: "up", confidence: 62, rationale: "Multi-state AG coordination strengthens pre-trial posture." },
    { id: "paraquat", direction: "down", confidence: 59, rationale: "General causation still contested post-Syngenta motion." },
    { id: "ozempic", direction: "up", confidence: 68, rationale: "Internal safety memos expand discovery scope." },
  ] as const;
  const item = opts[Math.floor(Math.random() * opts.length)];
  const market = markets.find((m) => m.id === item.id);
  return {
    id: `sim-pred-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kind: "prediction",
    marketId: item.id,
    title: `TortCast forecast: ${market?.caseName ?? item.id} ${item.direction === "up" ? "bullish" : "bearish"} signal`,
    body: `${item.rationale} Confidence ${item.confidence}%.`,
    author: "TortCast Engine",
    confidence: item.confidence,
    createdAt: Date.now(),
    upvotes: Math.floor(Math.random() * 250 + 40),
  };
}

export const [AlertsProvider, useAlerts] = createContextHook(() => {
  const { lastPlay } = useApp();
  const { markets, applyTrade } = useMarkets();
  const marketsRef = useRef<Market[]>(markets);
  useEffect(() => { marketsRef.current = markets; }, [markets]);
  const [alerts, setAlerts] = useState<AlertItem[]>(SEED_ALERTS);
  const [filter, setFilter] = useState<"all" | AlertKind>("all");
  const tickRef = useRef<number>(0);

  useEffect(() => {
    if (!lastPlay) return;
    setAlerts((prev) => {
      if (prev.some((a) => a.id === lastPlay.id)) return prev;
      return [lastPlay, ...prev];
    });
  }, [lastPlay]);

  useEffect(() => {
    const id = setInterval(() => {
      tickRef.current += 1;
      const tick = tickRef.current;
      let item: AlertItem;
      const liveMarkets = marketsRef.current;
      if (tick % 5 === 0) {
        item = simulatedPrediction(liveMarkets);
      } else if (tick % 4 === 0) {
        item = simulatedXPost();
      } else if (tick % 7 === 0) {
        item = simulatedRedditPost();
      } else {
        item = simulatedPlay(liveMarkets);
        // simulated plays move the market too — keeps activity feeling real
        if (item.marketId && item.shares && item.side) {
          const m = liveMarkets.find((mm) => mm.id === item.marketId);
          if (m) {
            applyTrade({
              marketId: item.marketId,
              side: item.side,
              shares: item.shares,
              priceCents: item.side === "YES" ? m.yesPrice : m.noPrice,
            });
          }
        }
      }
      setAlerts((prev) => [item, ...prev].slice(0, 100));
    }, 11000);
    return () => clearInterval(id);
  }, [applyTrade]);

  const filtered = useMemo(() => {
    const list = filter === "all" ? alerts : alerts.filter((a) => a.kind === filter);
    return [...list].sort((a, b) => b.createdAt - a.createdAt);
  }, [alerts, filter]);

  const unreadCount = useMemo(
    () => alerts.filter((a) => Date.now() - a.createdAt < 90_000).length,
    [alerts],
  );

  const recentPlayCount = useMemo(
    () => alerts.filter((a) => a.kind === "play" && Date.now() - a.createdAt < 10 * 60_000).length,
    [alerts],
  );

  const upvote = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, upvotes: (a.upvotes ?? 0) + 1 } : a)),
    );
  };

  const pushAlert = (item: AlertItem) => {
    setAlerts((prev) => {
      if (prev.some((a) => a.id === item.id)) return prev;
      return [item, ...prev].slice(0, 200);
    });
  };

  const latestLiveSignal = useMemo(
    () => alerts.find((a) => a.kind === "announcement" || a.kind === "x") ?? null,
    [alerts],
  );

  return {
    alerts: filtered,
    allAlerts: alerts,
    filter,
    setFilter,
    unreadCount,
    recentPlayCount,
    upvote,
    pushAlert,
    latestLiveSignal,
    predictions: MOCK_PREDICTIONS,
  };
});
