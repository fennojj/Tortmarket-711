import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "tortmarket.admin_config.v1";

export interface SmsTriggerConfig {
  enabled: boolean;
  sendBreaking: boolean;
  sendUrgent: boolean;
  sendPriceMoves: boolean;
  priceMoveThresholdCents: number;
  maxPerSession: number;
  firstDelaySeconds: number;
  repeatMinSeconds: number;
  repeatMaxSeconds: number;
}

export interface RecruitingConfig {
  goalMembers: number;
  inviterBonusPoints: number;
  inviteeBonusPoints: number;
  zeroInviteNudgeEnabled: boolean;
  nearTierNudgeEnabled: boolean;
  rivalPassedNudgeEnabled: boolean;
}

export interface RewardConfig {
  dailyBasePoints: number;
  dailyStreakStepPoints: number;
  dailyStreakCapDays: number;
  welcomeBonusPoints: number;
  shareBonusPoints: number;
  missionsBonusPoints: number;
  tradeXpEnabled: boolean;
  tradeXpPerThousandPoints: number;
  firstTradeBonusPoints: number;
  sponsorTradeBonusEnabled: boolean;
  sponsorTradeBonusPoints: number;
  sponsorTradeBonusMarketIds: string[];
}

export interface CampaignAutomationConfig {
  enabled: boolean;
  autoLaunchDefault: boolean;
  whalePlayThresholdPoints: number;
  marketMoverThresholdCents: number;
  fomoPlayCountThreshold: number;
  dailyRecapHours: number;
  resolutionMoveThresholdCents: number;
}

export interface SponsorLevelConfig {
  enabled: boolean;
  sponsorName: string;
  levelName: string;
  minimumSpendLabel: string;
  rewardMultiplier: number;
  tradeTriggerCopy: string;
}

export interface EngagementFormulaConfig {
  enabled: boolean;
  minInAppTriggerScore: number;
  minSmsTriggerScore: number;
  maxDailyTriggers: number;
  cooldownMinutes: number;
  quietHoursEnabled: boolean;
  quietHoursStart: number;
  quietHoursEnd: number;
  motivationWeight: number;
  timingWeight: number;
  rewardWeight: number;
  socialWeight: number;
  urgencyWeight: number;
  sponsorFitWeight: number;
  fatiguePenaltyPerTrigger: number;
}

export interface AdminConfig {
  sms: SmsTriggerConfig;
  recruiting: RecruitingConfig;
  rewards: RewardConfig;
  campaigns: CampaignAutomationConfig;
  sponsorLevel: SponsorLevelConfig;
  engagement: EngagementFormulaConfig;
}

export const DEFAULT_ADMIN_CONFIG: AdminConfig = {
  sms: {
    enabled: true,
    sendBreaking: true,
    sendUrgent: true,
    sendPriceMoves: true,
    priceMoveThresholdCents: 8,
    maxPerSession: 6,
    firstDelaySeconds: 35,
    repeatMinSeconds: 65,
    repeatMaxSeconds: 130,
  },
  recruiting: {
    goalMembers: 5000,
    inviterBonusPoints: 10000,
    inviteeBonusPoints: 5000,
    zeroInviteNudgeEnabled: true,
    nearTierNudgeEnabled: true,
    rivalPassedNudgeEnabled: true,
  },
  rewards: {
    dailyBasePoints: 500,
    dailyStreakStepPoints: 250,
    dailyStreakCapDays: 7,
    welcomeBonusPoints: 50000,
    shareBonusPoints: 7500,
    missionsBonusPoints: 1000,
    tradeXpEnabled: true,
    tradeXpPerThousandPoints: 25,
    firstTradeBonusPoints: 2500,
    sponsorTradeBonusEnabled: false,
    sponsorTradeBonusPoints: 1000,
    sponsorTradeBonusMarketIds: [],
  },
  campaigns: {
    enabled: true,
    autoLaunchDefault: true,
    whalePlayThresholdPoints: 10000,
    marketMoverThresholdCents: 7,
    fomoPlayCountThreshold: 4,
    dailyRecapHours: 6,
    resolutionMoveThresholdCents: 8,
  },
  sponsorLevel: {
    enabled: false,
    sponsorName: "",
    levelName: "Founding 5K Sponsor",
    minimumSpendLabel: "$25,000+",
    rewardMultiplier: 2,
    tradeTriggerCopy: "Sponsored bonus active: buy this market and both you + the sponsor leaderboard get boosted.",
  },
  engagement: {
    enabled: true,
    minInAppTriggerScore: 42,
    minSmsTriggerScore: 62,
    maxDailyTriggers: 8,
    cooldownMinutes: 12,
    quietHoursEnabled: true,
    quietHoursStart: 21,
    quietHoursEnd: 8,
    motivationWeight: 1.25,
    timingWeight: 1,
    rewardWeight: 0.75,
    socialWeight: 0.8,
    urgencyWeight: 1.1,
    sponsorFitWeight: 0.45,
    fatiguePenaltyPerTrigger: 7,
  },
};

function mergeAdminConfig(raw: Partial<AdminConfig> | null | undefined): AdminConfig {
  return {
    sms: { ...DEFAULT_ADMIN_CONFIG.sms, ...(raw?.sms ?? {}) },
    recruiting: { ...DEFAULT_ADMIN_CONFIG.recruiting, ...(raw?.recruiting ?? {}) },
    rewards: { ...DEFAULT_ADMIN_CONFIG.rewards, ...(raw?.rewards ?? {}) },
    campaigns: { ...DEFAULT_ADMIN_CONFIG.campaigns, ...(raw?.campaigns ?? {}) },
    sponsorLevel: { ...DEFAULT_ADMIN_CONFIG.sponsorLevel, ...(raw?.sponsorLevel ?? {}) },
    engagement: { ...DEFAULT_ADMIN_CONFIG.engagement, ...(raw?.engagement ?? {}) },
  };
}

async function loadAdminConfig(): Promise<AdminConfig> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ADMIN_CONFIG;
    return mergeAdminConfig(JSON.parse(raw) as Partial<AdminConfig>);
  } catch (e) {
    console.log("[AdminConfig] load error", e);
    return DEFAULT_ADMIN_CONFIG;
  }
}

async function saveAdminConfig(config: AdminConfig): Promise<AdminConfig> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  return config;
}

export const [AdminConfigProvider, useAdminConfig] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [config, setConfigState] = useState<AdminConfig>(DEFAULT_ADMIN_CONFIG);

  const configQuery = useQuery({ queryKey: ["admin-config"], queryFn: loadAdminConfig });
  const persistMutation = useMutation({
    mutationFn: saveAdminConfig,
    onSuccess: (saved: AdminConfig) => {
      queryClient.setQueryData(["admin-config"], saved);
    },
  });

  useEffect(() => {
    if (configQuery.data) setConfigState(configQuery.data);
  }, [configQuery.data]);

  const setConfig = useCallback(
    (next: AdminConfig) => {
      const merged = mergeAdminConfig(next);
      setConfigState(merged);
      persistMutation.mutate(merged);
    },
    [persistMutation],
  );

  const updateSection = useCallback(
    <K extends keyof AdminConfig>(section: K, value: AdminConfig[K]) => {
      const next: AdminConfig = { ...config, [section]: value };
      setConfig(next);
    },
    [config, setConfig],
  );

  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_ADMIN_CONFIG);
  }, [setConfig]);

  return {
    config,
    isLoading: configQuery.isLoading,
    setConfig,
    updateSection,
    resetConfig,
  };
});
