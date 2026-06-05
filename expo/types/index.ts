export type ResolutionStatus = "active" | "resolved_yes" | "resolved_no";

export type MarketCategory =
  | "pharmaceutical"
  | "product_liability"
  | "environmental"
  | "medical_device"
  | "toxic_exposure"
  | "consumer";

export interface PricePoint {
  t: number;
  yes: number;
}

export interface Market {
  id: string;
  caseName: string;
  defendant: string;
  category: MarketCategory;
  description: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  change24h: number;
  resolutionStatus: ResolutionStatus;
  mdlSentiment: number;
  daubertStrength: number;
  corporateReserves: number;
  history: PricePoint[];
}

export interface Position {
  id: string;
  marketId: string;
  side: "YES" | "NO";
  shares: number;
  avgPrice: number;
  createdAt: number;
}

export interface LeaderboardTitle {
  marketId: string;
  title: string;
  points: number;
}

export interface User {
  id: string;
  handle: string;
  pointBalance: number;
  positions: Position[];
  titles: LeaderboardTitle[];
  lastClaimAt?: number;
  streakDays?: number;
  welcomeBonusClaimed?: boolean;
  shareBonusClaimed?: boolean;
  email?: string;
  joinedAt?: number;
  source?: string;
  onboarded?: boolean;
  referralCode?: string;
  referredBy?: string;
  referralCount?: number;
  referralBonusEarned?: number;
  lastMissionsBonusAt?: number;
}

export type AlertKind = "play" | "prediction" | "reddit" | "x" | "announcement" | "resolution";

export interface AlertItem {
  id: string;
  kind: AlertKind;
  marketId?: string;
  title: string;
  body: string;
  author?: string;
  authorAvatar?: string;
  confidence?: number;
  side?: "YES" | "NO";
  shares?: number;
  cost?: number;
  sourceUrl?: string;
  createdAt: number;
  upvotes?: number;
  reposts?: number;
}

export interface MDLPrediction {
  id: string;
  marketId: string;
  direction: "up" | "down";
  confidence: number;
  rationale: string;
  forecastAt: number;
}

export interface RewardItem {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
  pointCost: number;
  sponsor: string;
  image: string;
  category: "tech" | "travel" | "vehicle";
}

export interface LeaderboardEntry {
  userId: string;
  handle: string;
  points: number;
  title: string;
}
