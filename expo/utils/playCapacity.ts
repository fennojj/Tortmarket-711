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

export const DEFAULT_PLAY_SIZE = 1000;
export const MIN_PLAY_SIZE = 500;
export const WHALE_PLAY_SIZE = 10000;

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
