import { MARKETS } from "@/mocks/markets";

export interface LeaderboardSection {
  marketId: string;
  caseName: string;
  titleLabel: string;
  entries: { rank: number; handle: string; points: number; badge: string }[];
}

const TITLE_PREFIXES = ["Master of", "King of", "Queen of", "Sultan of", "Oracle of", "Baron of", "Legend of"];

function titleFor(i: number, name: string): string {
  const prefix = TITLE_PREFIXES[i % TITLE_PREFIXES.length];
  const short = name.split(" ")[0].replace(/[^A-Za-z]/g, "");
  return `${prefix} ${short}`;
}

const HANDLES = [
  "@tortking", "@hedge.queen", "@mdl_mike", "@daubert_dan", "@settle_sam",
  "@bellwether", "@pleadings", "@esi.eva", "@prop_65", "@appellate.ally",
  "@venue.shop", "@rule23", "@classaction", "@verdict.v", "@jury.jane",
];

export const LEADERBOARD: LeaderboardSection[] = MARKETS.slice(0, 10).map((m, i) => ({
  marketId: m.id,
  caseName: m.caseName,
  titleLabel: titleFor(i, m.caseName),
  entries: Array.from({ length: 5 }).map((_, r) => ({
    rank: r + 1,
    handle: HANDLES[(i * 3 + r) % HANDLES.length],
    points: Math.round((50000 - r * 7200) * (1 + (i % 4) * 0.15)),
    badge: r === 0 ? titleFor(i, m.caseName) : "",
  })),
}));
