import type { ConnectionQuality } from "@/utils/realtime";

export interface PlayCapacitySummary {
  currentBalance: number;
  suggestedPlaySize: number;
  maxPlays: number;
  whalePlays: number;
}

export interface PlayPlanSummary {
  currentBalance: number;
  wagerAmount: number;
  remainingBalance: number;
  additionalEqualPlays: number;
  minimumEntryPlays: number;
}

export interface ConcurrentCapacity {
  /** How many players are currently connected via realtime */
  connectedPlayers: number;
  /** Current connection quality tier */
  connectionQuality: ConnectionQuality;
  /** Whether the realtime layer is healthy enough for live features */
  liveFeaturesAvailable: boolean;
  /** Estimated max concurrent the current tier supports */
  tierCap: number;
}

export const DEFAULT_PLAY_SIZE = 1000;
export const MIN_PLAY_SIZE = 500;
export const WHALE_PLAY_SIZE = 10000;

// ── Tier caps (Supabase Realtime) ─────────────────────────────────

export const FREE_TIER_CAP = 200;
export const PRO_TIER_CAP = 500;
export const ENTERPRISE_TIER_CAP = 10_000;

export function getTierCap(connectedCount: number | null): number {
  if (connectedCount === null || connectedCount === 0) return FREE_TIER_CAP;
  if (connectedCount <= FREE_TIER_CAP) return FREE_TIER_CAP;
  if (connectedCount <= PRO_TIER_CAP) return PRO_TIER_CAP;
  return ENTERPRISE_TIER_CAP;
}

export function getConcurrentCapacity(args: {
  connectedPlayers: number;
  connectionQuality: ConnectionQuality;
}): ConcurrentCapacity {
  const connected = Math.max(0, args.connectedPlayers);
  const liveAvailable =
    args.connectionQuality === "connected" || args.connectionQuality === "degraded";

  return {
    connectedPlayers: connected,
    connectionQuality: args.connectionQuality,
    liveFeaturesAvailable: liveAvailable,
    tierCap: getTierCap(connected),
  };
}

export function getPlayCapacitySummary(balance: number): PlayCapacitySummary {
  const safeBalance = Math.max(0, Math.floor(balance));

  return {
    currentBalance: safeBalance,
    suggestedPlaySize: DEFAULT_PLAY_SIZE,
    maxPlays: Math.floor(safeBalance / DEFAULT_PLAY_SIZE),
    whalePlays: Math.floor(safeBalance / WHALE_PLAY_SIZE),
  };
}

export function getPlayPlanSummary(balance: number, wagerAmount: number): PlayPlanSummary {
  const safeBalance = Math.max(0, Math.floor(balance));
  const safeWager = Math.max(0, Math.floor(wagerAmount));
  const remainingBalance = Math.max(0, safeBalance - safeWager);
  const divisor = Math.max(safeWager, 1);

  return {
    currentBalance: safeBalance,
    wagerAmount: safeWager,
    remainingBalance,
    additionalEqualPlays: safeWager > 0 ? Math.floor(remainingBalance / divisor) : 0,
    minimumEntryPlays: Math.floor(remainingBalance / MIN_PLAY_SIZE),
  };
}
