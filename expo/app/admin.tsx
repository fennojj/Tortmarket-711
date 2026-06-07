import React, { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  Save,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  Send,
  Pin,
  Star,
  X,
  Megaphone,
  Share2,
  Copy,
  Zap,
  Link2,
  CheckCircle2,
  Rocket,
  TrendingUp,
  Download,
  Users,
  SlidersHorizontal,
} from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { Colors } from "@/constants/colors";
import { useSponsorConfig, type SponsorMap } from "@/providers/SponsorConfigProvider";
import { useSponsorMap } from "@/providers/SponsorMapProvider";
import { useSponsorUpdates } from "@/providers/SponsorUpdatesProvider";
import { useAdminConfig } from "@/providers/AdminConfigProvider";
import { useApp } from "@/providers/AppProvider";
import {
  fetchRecentSignups,
  fetchSignupStats,
  fetchTopInviters,
  supabaseEnabled,
  type SignupRow,
} from "@/lib/supabase";
import { getInviteUrl } from "@/utils/referrals";
import SponsorSlot from "@/components/SponsorSlot";
import type { SponsorSlotTier } from "@/constants/sponsors";

type AdminTab = "sponsors" | "growth" | "updates" | "pitch" | "integrations";

const TIERS: SponsorSlotTier[] = [
  "banner",
  "presenting",
  "title",
  "coach",
  "leaderboard",
  "native",
  "tier",
  "sticky",
  "ribbon",
  "bounty",
];

const TIER_PRICES: Record<SponsorSlotTier, string> = {
  title: "$25,000 / 4-day",
  presenting: "$10,000 / 4-day",
  coach: "$8,000 / 4-day",
  leaderboard: "$6,000 / 4-day",
  bounty: "$1,500 / case",
  banner: "$2,000 / 4-day",
  native: "$3,000 / 4-day",
  tier: "$1,500 / tier",
  sticky: "$5,000 / 4-day",
  ribbon: "$1,000 / 4-day",
};

const SAMPLE: SponsorMap = {
  banner: {
    name: "Smith & Jones LLP",
    tagline: "Fighting for victims since 1998 — Free consultation",
    backgroundColor: "#0B1F4B",
    textColor: "#FFFFFF",
    accentColor: "#F59E0B",
    url: "https://example.com",
    active: true,
  },
};

export default function AdminScreen(): React.ReactElement {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const initialTab: AdminTab =
    params.tab === "updates" ||
    params.tab === "growth" ||
    params.tab === "pitch" ||
    params.tab === "integrations"
      ? params.tab
      : "sponsors";
  const [tab, setTab] = useState<AdminTab>(initialTab);

  return (
    <>
      <Stack.Screen options={{ title: "Sponsor Admin" }} />
      <View style={styles.wrap}>
        <View style={styles.tabBar}>
          <TabPill label="Sponsors" active={tab === "sponsors"} onPress={() => setTab("sponsors")} />
          <TabPill label="Growth" active={tab === "growth"} onPress={() => setTab("growth")} />
          <TabPill label="Updates" active={tab === "updates"} onPress={() => setTab("updates")} />
          <TabPill label="Pitch" active={tab === "pitch"} onPress={() => setTab("pitch")} />
          <TabPill label="Integrations" active={tab === "integrations"} onPress={() => setTab("integrations")} />
        </View>
        {tab === "sponsors" && <SponsorsTab onDone={() => router.back()} />}
        {tab === "growth" && <GrowthRulesTab />}
        {tab === "updates" && <UpdatesTab />}
        {tab === "pitch" && <PitchTab />}
        {tab === "integrations" && <IntegrationsTab />}
      </View>
    </>
  );
}

function TabPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tabPill, active && styles.tabPillActive]}
      testID={`tab-${label.toLowerCase()}`}
    >
      <Text style={[styles.tabPillText, active && styles.tabPillTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── CAMPAIGN TAB ───────────────────────────────────────────────────────────
function CampaignTab() {
  const { user } = useApp();
  const { config } = useAdminConfig();
  const [shareBusy, setShareBusy] = useState<boolean>(false);

  const statsQuery = useQuery({
    queryKey: ["signup-stats", "launch-5k"],
    queryFn: () => fetchSignupStats("launch-5k"),
    enabled: supabaseEnabled,
    refetchInterval: 15_000,
  });

  const recentQuery = useQuery({
    queryKey: ["signup-recent", "launch-5k"],
    queryFn: () => fetchRecentSignups(50, "launch-5k"),
    enabled: supabaseEnabled,
    refetchInterval: 20_000,
  });

  const topQuery = useQuery({
    queryKey: ["signup-top", "launch-5k"],
    queryFn: () => fetchTopInviters(10, "launch-5k"),
    enabled: supabaseEnabled,
    refetchInterval: 30_000,
  });

  const stats = statsQuery.data ?? { total: 0, last24h: 0, last7d: 0, today: 0 };
  const recent = recentQuery.data ?? [];
  const top = topQuery.data ?? [];

  const goal = config.recruiting.goalMembers;
  const pct = Math.min(1, stats.total / goal);
  const remaining = Math.max(0, goal - stats.total);
  const ratePerHour = stats.last24h / 24;
  const hoursToGoal = ratePerHour > 0 ? remaining / ratePerHour : null;

  const inviteUrl = user.referralCode ? getInviteUrl(user.referralCode) : "";

  const onShareInvite = async () => {
    if (!inviteUrl) return;
    setShareBusy(true);
    try {
      await Share.share({
        message: `Join Tort Market — +${config.recruiting.inviteeBonusPoints.toLocaleString()} bonus points: ${inviteUrl}`,
      });
    } catch (_) {
    } finally {
      setShareBusy(false);
    }
  };

  const onCopyInvite = async () => {
    if (!inviteUrl) return;
    try {
      await Clipboard.setStringAsync(inviteUrl);
      Alert.alert("Copied", "Invite link on clipboard.");
    } catch (_) {}
  };

  const onExportCsv = async () => {
    if (recent.length === 0) {
      Alert.alert("Nothing to export", "No signups yet.");
      return;
    }
    const header = "created_at,handle,email,referral_code,referred_by,source,platform";
    const lines = recent.map((r: SignupRow) =>
      [
        r.created_at,
        csv(r.handle),
        csv(r.email ?? ""),
        csv(r.referral_code ?? ""),
        csv(r.referred_by ?? ""),
        csv(r.source ?? ""),
        csv(r.platform ?? ""),
      ].join(","),
    );
    const out = [header, ...lines].join("\n");
    try {
      await Clipboard.setStringAsync(out);
      Alert.alert("Copied CSV", `${recent.length} rows copied. Paste into Sheets.`);
    } catch (_) {}
  };

  if (!supabaseEnabled) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Campaign not connected</Text>
          <Text style={styles.sectionHint}>
            Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to enable live
            signup tracking, leaderboard, and CSV export.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.statusCard}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Rocket size={16} color={Colors.orange} />
          <Text style={styles.statusTitle}>Launch · 5,000 signups</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 6 }}>
          <Text style={styles.bigCount}>{stats.total.toLocaleString()}</Text>
          <Text style={styles.bigCountSuffix}>/ {goal.toLocaleString()}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(pct * 100)}%` }]} />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 2 }}>
          <Text style={styles.progressMeta}>{(pct * 100).toFixed(1)}% of goal</Text>
          <Text style={styles.progressMeta}>{remaining.toLocaleString()} to go</Text>
        </View>

        <View style={styles.statGrid}>
          <StatTile label="Today" value={stats.today.toLocaleString()} />
          <StatTile label="24h" value={stats.last24h.toLocaleString()} />
          <StatTile label="7d" value={stats.last7d.toLocaleString()} />
          <StatTile
            label="ETA"
            value={
              hoursToGoal === null
                ? "—"
                : hoursToGoal < 48
                ? `${Math.ceil(hoursToGoal)}h`
                : `${Math.ceil(hoursToGoal / 24)}d`
            }
          />
        </View>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>Your invite link</Text>
        <Text style={styles.inviteUrl} numberOfLines={1}>
          {inviteUrl || "—"}
        </Text>
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.btn, styles.btnPrimary, shareBusy && { opacity: 0.6 }]}
            onPress={onShareInvite}
            disabled={shareBusy || !inviteUrl}
          >
            <Share2 size={14} color="#fff" />
            <Text style={styles.btnText}>Share</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.btnGhost]}
            onPress={onCopyInvite}
            disabled={!inviteUrl}
          >
            <Copy size={14} color={Colors.text} />
            <Text style={[styles.btnText, { color: Colors.text }]}>Copy</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <TrendingUp size={14} color={Colors.text} />
        <Text style={styles.sectionTitle}>Top inviters</Text>
      </View>
      {top.length === 0 ? (
        <Text style={styles.sectionHint}>
          No referrals yet — share your link to start the flywheel.
        </Text>
      ) : (
        top.map((t, i) => (
          <View key={t.code} style={styles.rateRow}>
            <Text style={styles.rateName}>
              {i + 1}. {t.code}
            </Text>
            <Text style={styles.ratePrice}>{t.count} signups</Text>
          </View>
        ))
      )}

      <View style={[styles.sectionHeader, { marginTop: 8 }]}>
        <Users size={14} color={Colors.text} />
        <Text style={styles.sectionTitle}>Recent signups</Text>
        <Pressable onPress={onExportCsv} style={styles.csvBtn} hitSlop={8}>
          <Download size={12} color={Colors.text} />
          <Text style={styles.csvText}>CSV</Text>
        </Pressable>
      </View>
      {recent.length === 0 ? (
        <Text style={styles.sectionHint}>
          Once people complete the join flow, they show up here in real time.
        </Text>
      ) : (
        recent.slice(0, 25).map((r) => (
          <View key={r.id} style={styles.signupRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.signupHandle} numberOfLines={1}>
                {r.handle}
                {r.referred_by ? (
                  <Text style={styles.signupRef}>  · via {r.referred_by}</Text>
                ) : null}
              </Text>
              <Text style={styles.signupMeta} numberOfLines={1}>
                {r.email ?? "no email"} · {r.platform ?? "—"} ·{" "}
                {new Date(r.created_at).toLocaleTimeString()}
              </Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statTileValue}>{value}</Text>
      <Text style={styles.statTileLabel}>{label}</Text>
    </View>
  );
}

function csv(v: string): string {
  if (v.includes(",") || v.includes("\"") || v.includes("\n")) {
    return `"${v.replace(/"/g, "\"\"")}"`;
  }
  return v;
}

// ─── GROWTH RULES TAB ───────────────────────────────────────────────────────
function GrowthRulesTab(): React.ReactElement {
  const { config, updateSection, resetConfig } = useAdminConfig();

  const updateSms = <K extends keyof typeof config.sms>(key: K, value: (typeof config.sms)[K]) => {
    updateSection("sms", { ...config.sms, [key]: value });
  };
  const updateRecruiting = <K extends keyof typeof config.recruiting>(key: K, value: (typeof config.recruiting)[K]) => {
    updateSection("recruiting", { ...config.recruiting, [key]: value });
  };
  const updateRewards = <K extends keyof typeof config.rewards>(key: K, value: (typeof config.rewards)[K]) => {
    updateSection("rewards", { ...config.rewards, [key]: value });
  };
  const updateCampaigns = <K extends keyof typeof config.campaigns>(key: K, value: (typeof config.campaigns)[K]) => {
    updateSection("campaigns", { ...config.campaigns, [key]: value });
  };
  const updateSponsorLevel = <K extends keyof typeof config.sponsorLevel>(key: K, value: (typeof config.sponsorLevel)[K]) => {
    updateSection("sponsorLevel", { ...config.sponsorLevel, [key]: value });
  };
  const updateEngagement = <K extends keyof typeof config.engagement>(key: K, value: (typeof config.engagement)[K]) => {
    updateSection("engagement", { ...config.engagement, [key]: value });
  };

  const updateSponsorMarketIds = (raw: string) => {
    const ids = raw
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
    updateRewards("sponsorTradeBonusMarketIds", ids);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.statusCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <SlidersHorizontal size={15} color={Colors.blue} />
            <Text style={styles.statusTitle}>Growth control center</Text>
          </View>
          <Text style={styles.sectionHint}>
            Tune SMS alerts, the recruiting goal, trade rewards, sponsor boosts, and the responsible engagement score without changing code.
          </Text>
          <View style={styles.actionRow}>
            <Pressable style={[styles.btn, styles.btnGhost]} onPress={resetConfig}>
              <RefreshCw size={14} color={Colors.text} />
              <Text style={[styles.btnText, { color: Colors.text }]}>Reset defaults</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Responsible engagement formula</Text>
        <View style={styles.statusCard}>
          <Text style={styles.sectionHint}>
            Score = motivation + timing + reward + social pull + urgency + sponsor fit, minus fatigue, intrusion, and repetition risk.
          </Text>
        </View>
        <ToggleRule label="Enable formula gate" value={config.engagement.enabled} onChange={(v) => updateEngagement("enabled", v)} />
        <NumberField label="Minimum in-app score" value={config.engagement.minInAppTriggerScore} onChange={(v) => updateEngagement("minInAppTriggerScore", v)} />
        <NumberField label="Minimum SMS score" value={config.engagement.minSmsTriggerScore} onChange={(v) => updateEngagement("minSmsTriggerScore", v)} />
        <NumberField label="Max daily triggers" value={config.engagement.maxDailyTriggers} onChange={(v) => updateEngagement("maxDailyTriggers", v)} />
        <NumberField label="Cooldown minutes" value={config.engagement.cooldownMinutes} onChange={(v) => updateEngagement("cooldownMinutes", v)} />
        <ToggleRule label="Quiet hours enabled" value={config.engagement.quietHoursEnabled} onChange={(v) => updateEngagement("quietHoursEnabled", v)} />
        <NumberField label="Quiet hours start (0-23)" value={config.engagement.quietHoursStart} onChange={(v) => updateEngagement("quietHoursStart", v)} />
        <NumberField label="Quiet hours end (0-23)" value={config.engagement.quietHoursEnd} onChange={(v) => updateEngagement("quietHoursEnd", v)} />
        <NumberField label="Motivation weight" value={config.engagement.motivationWeight} onChange={(v) => updateEngagement("motivationWeight", v)} />
        <NumberField label="Timing weight" value={config.engagement.timingWeight} onChange={(v) => updateEngagement("timingWeight", v)} />
        <NumberField label="Reward weight" value={config.engagement.rewardWeight} onChange={(v) => updateEngagement("rewardWeight", v)} />
        <NumberField label="Social pull weight" value={config.engagement.socialWeight} onChange={(v) => updateEngagement("socialWeight", v)} />
        <NumberField label="Urgency weight" value={config.engagement.urgencyWeight} onChange={(v) => updateEngagement("urgencyWeight", v)} />
        <NumberField label="Sponsor fit weight" value={config.engagement.sponsorFitWeight} onChange={(v) => updateEngagement("sponsorFitWeight", v)} />
        <NumberField label="Fatigue penalty per trigger" value={config.engagement.fatiguePenaltyPerTrigger} onChange={(v) => updateEngagement("fatiguePenaltyPerTrigger", v)} />

        <Text style={styles.sectionTitle}>SMS triggers</Text>
        <ToggleRule label="Enable SMS relay" value={config.sms.enabled} onChange={(v) => updateSms("enabled", v)} />
        <ToggleRule label="Breaking news alerts" value={config.sms.sendBreaking} onChange={(v) => updateSms("sendBreaking", v)} />
        <ToggleRule label="Urgent alerts" value={config.sms.sendUrgent} onChange={(v) => updateSms("sendUrgent", v)} />
        <ToggleRule label="Price move alerts" value={config.sms.sendPriceMoves} onChange={(v) => updateSms("sendPriceMoves", v)} />
        <NumberField label="Price move threshold (¢)" value={config.sms.priceMoveThresholdCents} onChange={(v) => updateSms("priceMoveThresholdCents", v)} />
        <NumberField label="Max texts per session" value={config.sms.maxPerSession} onChange={(v) => updateSms("maxPerSession", v)} />
        <NumberField label="First alert delay (seconds)" value={config.sms.firstDelaySeconds} onChange={(v) => updateSms("firstDelaySeconds", v)} />
        <NumberField label="Repeat min (seconds)" value={config.sms.repeatMinSeconds} onChange={(v) => updateSms("repeatMinSeconds", v)} />
        <NumberField label="Repeat max (seconds)" value={config.sms.repeatMaxSeconds} onChange={(v) => updateSms("repeatMaxSeconds", v)} />

        <Text style={styles.sectionTitle}>Recruiting 5,000 members</Text>
        <NumberField label="Recruiting goal" value={config.recruiting.goalMembers} onChange={(v) => updateRecruiting("goalMembers", v)} />
        <NumberField label="Inviter bonus points" value={config.recruiting.inviterBonusPoints} onChange={(v) => updateRecruiting("inviterBonusPoints", v)} />
        <NumberField label="Invitee bonus points" value={config.recruiting.inviteeBonusPoints} onChange={(v) => updateRecruiting("inviteeBonusPoints", v)} />
        <ToggleRule label="Zero-invite nudges" value={config.recruiting.zeroInviteNudgeEnabled} onChange={(v) => updateRecruiting("zeroInviteNudgeEnabled", v)} />
        <ToggleRule label="Near-tier nudges" value={config.recruiting.nearTierNudgeEnabled} onChange={(v) => updateRecruiting("nearTierNudgeEnabled", v)} />
        <ToggleRule label="Rival-passed nudges" value={config.recruiting.rivalPassedNudgeEnabled} onChange={(v) => updateRecruiting("rivalPassedNudgeEnabled", v)} />

        <Text style={styles.sectionTitle}>Player rewards</Text>
        <NumberField label="Daily base points" value={config.rewards.dailyBasePoints} onChange={(v) => updateRewards("dailyBasePoints", v)} />
        <NumberField label="Daily streak step points" value={config.rewards.dailyStreakStepPoints} onChange={(v) => updateRewards("dailyStreakStepPoints", v)} />
        <NumberField label="Daily streak cap days" value={config.rewards.dailyStreakCapDays} onChange={(v) => updateRewards("dailyStreakCapDays", v)} />
        <NumberField label="Welcome bonus points" value={config.rewards.welcomeBonusPoints} onChange={(v) => updateRewards("welcomeBonusPoints", v)} />
        <NumberField label="Share bonus points" value={config.rewards.shareBonusPoints} onChange={(v) => updateRewards("shareBonusPoints", v)} />
        <NumberField label="Mission bonus points" value={config.rewards.missionsBonusPoints} onChange={(v) => updateRewards("missionsBonusPoints", v)} />
        <ToggleRule label="Trade XP enabled" value={config.rewards.tradeXpEnabled} onChange={(v) => updateRewards("tradeXpEnabled", v)} />
        <NumberField label="Trade XP per 1,000 pts spent" value={config.rewards.tradeXpPerThousandPoints} onChange={(v) => updateRewards("tradeXpPerThousandPoints", v)} />
        <NumberField label="First trade bonus points" value={config.rewards.firstTradeBonusPoints} onChange={(v) => updateRewards("firstTradeBonusPoints", v)} />

        <Text style={styles.sectionTitle}>Sponsor-funded trade boosts</Text>
        <ToggleRule label="Enable special sponsor level" value={config.sponsorLevel.enabled} onChange={(v) => updateSponsorLevel("enabled", v)} />
        <Field label="Sponsor name" value={config.sponsorLevel.sponsorName} onChange={(v) => updateSponsorLevel("sponsorName", v)} placeholder="Smith & Jones LLP" />
        <Field label="Level name" value={config.sponsorLevel.levelName} onChange={(v) => updateSponsorLevel("levelName", v)} placeholder="Founding 5K Sponsor" />
        <Field label="Minimum spend label" value={config.sponsorLevel.minimumSpendLabel} onChange={(v) => updateSponsorLevel("minimumSpendLabel", v)} placeholder="$25,000+" />
        <NumberField label="Reward multiplier" value={config.sponsorLevel.rewardMultiplier} onChange={(v) => updateSponsorLevel("rewardMultiplier", v)} />
        <ToggleRule label="Sponsor trade bonus" value={config.rewards.sponsorTradeBonusEnabled} onChange={(v) => updateRewards("sponsorTradeBonusEnabled", v)} />
        <NumberField label="Sponsor trade bonus points" value={config.rewards.sponsorTradeBonusPoints} onChange={(v) => updateRewards("sponsorTradeBonusPoints", v)} />
        <Field
          label="Eligible market IDs (comma separated, blank = all)"
          value={config.rewards.sponsorTradeBonusMarketIds.join(", ")}
          onChange={updateSponsorMarketIds}
          placeholder="pfas, talc, camp-lejeune"
        />
        <Field
          label="Sponsor trigger copy"
          value={config.sponsorLevel.tradeTriggerCopy}
          onChange={(v) => updateSponsorLevel("tradeTriggerCopy", v)}
          multiline
        />

        <Text style={styles.sectionTitle}>Campaign automation</Text>
        <ToggleRule label="Enable automation" value={config.campaigns.enabled} onChange={(v) => updateCampaigns("enabled", v)} />
        <ToggleRule label="Auto-launch default" value={config.campaigns.autoLaunchDefault} onChange={(v) => updateCampaigns("autoLaunchDefault", v)} />
        <NumberField label="Whale play threshold" value={config.campaigns.whalePlayThresholdPoints} onChange={(v) => updateCampaigns("whalePlayThresholdPoints", v)} />
        <NumberField label="Market mover threshold (¢)" value={config.campaigns.marketMoverThresholdCents} onChange={(v) => updateCampaigns("marketMoverThresholdCents", v)} />
        <NumberField label="FOMO play count threshold" value={config.campaigns.fomoPlayCountThreshold} onChange={(v) => updateCampaigns("fomoPlayCountThreshold", v)} />
        <NumberField label="Daily recap cadence (hours)" value={config.campaigns.dailyRecapHours} onChange={(v) => updateCampaigns("dailyRecapHours", v)} />
        <NumberField label="Resolution move threshold (¢)" value={config.campaigns.resolutionMoveThresholdCents} onChange={(v) => updateCampaigns("resolutionMoveThresholdCents", v)} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }): React.ReactElement {
  const [text, setText] = useState<string>(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={text}
        onChangeText={(raw) => {
          const cleaned = raw.replace(/[^0-9.]/g, "");
          setText(cleaned);
          const parsed = Number(cleaned);
          if (Number.isFinite(parsed)) onChange(parsed);
        }}
        keyboardType="numeric"
        style={styles.input}
      />
    </View>
  );
}

function ToggleRule({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }): React.ReactElement {
  return (
    <View style={styles.toggleRowCard}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

// ─── SPONSORS TAB ───────────────────────────────────────────────────────────
function SponsorsTab({ onDone }: { onDone: () => void }) {
  const {
    creatives,
    setLocalOverride,
    clearLocalOverride,
    refreshRemote,
    remoteUrl,
    remoteEnabled,
    remoteUpdatedAt,
    remoteFetching,
    localActive,
  } = useSponsorConfig();
  const { visible: mapVisible, setVisible: setMapVisible } = useSponsorMap();

  const initialJson = useMemo(() => JSON.stringify(creatives, null, 2), []);
  const [text, setText] = useState<string>(initialJson);
  const [error, setError] = useState<string | null>(null);

  const onSave = async () => {
    try {
      const parsed = JSON.parse(text) as SponsorMap;
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        setError("Top-level JSON must be an object keyed by tier.");
        return;
      }
      setError(null);
      await setLocalOverride(parsed);
      Alert.alert("Saved", "Sponsor creatives updated. Slots will refresh instantly.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid JSON";
      setError(msg);
    }
  };

  const onClear = () => {
    Alert.alert("Clear local override?", "Falls back to remote feed + defaults.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          await clearLocalOverride();
          setText("{}");
          Alert.alert("Cleared", "Local override removed.");
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Live status</Text>
          <Row
            label="Local override"
            value={localActive ? "ACTIVE" : "off"}
            accent={localActive ? Colors.emerald : Colors.textMuted}
          />
          <Row
            label="Remote feed"
            value={remoteEnabled ? (remoteFetching ? "fetching…" : "enabled") : "not configured"}
            accent={remoteEnabled ? Colors.blue : Colors.textMuted}
          />
          {remoteEnabled && (
            <>
              <Row label="Feed URL" value={remoteUrl} small />
              <Row
                label="Last fetch"
                value={remoteUpdatedAt ? new Date(remoteUpdatedAt).toLocaleTimeString() : "—"}
                small
              />
            </>
          )}
          <View style={styles.toggleRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {mapVisible ? (
                <Eye size={14} color={Colors.text} />
              ) : (
                <EyeOff size={14} color={Colors.textMuted} />
              )}
              <Text style={styles.toggleLabel}>Slot map (placeholders)</Text>
            </View>
            <Switch value={mapVisible} onValueChange={setMapVisible} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Active creatives</Text>
        <Text style={styles.sectionHint}>
          Tap a slot to preview it inline. Set active:true in JSON to render real creative.
        </Text>
        {TIERS.map((t) => {
          const c = creatives[t];
          return (
            <View key={t} style={styles.tierRow}>
              <View style={styles.tierHead}>
                <Text style={styles.tierName}>{t.toUpperCase()}</Text>
                <Text
                  style={[
                    styles.tierState,
                    { color: c?.active ? Colors.emerald : Colors.textMuted },
                  ]}
                >
                  {c?.active ? "LIVE" : c ? "INACTIVE" : "EMPTY"}
                </Text>
              </View>
              {c ? (
                <Text style={styles.tierMeta} numberOfLines={1}>
                  {c.name} {c.tagline ? `· ${c.tagline}` : ""}
                </Text>
              ) : null}
              <SponsorSlot tier={t} label={`${t} preview`} />
            </View>
          );
        })}

        <Text style={[styles.sectionTitle, { marginTop: 12 }]}>JSON editor</Text>
        <Text style={styles.sectionHint}>
          Paste a sponsor map keyed by tier. Saving stores it locally and updates every slot
          immediately. To distribute, host the same JSON at EXPO_PUBLIC_SPONSOR_FEED_URL.
        </Text>

        <View style={styles.editorRow}>
          <Pressable
            style={[styles.smallBtn, styles.smallBtnGhost]}
            onPress={() => setText(JSON.stringify(creatives, null, 2))}
          >
            <Text style={styles.smallBtnText}>Load current</Text>
          </Pressable>
          <Pressable
            style={[styles.smallBtn, styles.smallBtnGhost]}
            onPress={() => setText(JSON.stringify(SAMPLE, null, 2))}
          >
            <Text style={styles.smallBtnText}>Sample</Text>
          </Pressable>
          <Pressable style={[styles.smallBtn, styles.smallBtnGhost]} onPress={refreshRemote}>
            <RefreshCw size={12} color={Colors.text} />
            <Text style={styles.smallBtnText}>Refresh feed</Text>
          </Pressable>
        </View>

        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.editor}
          placeholder='{ "banner": { "name": "...", "active": true } }'
          placeholderTextColor={Colors.textMuted}
          testID="sponsor-json"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actionRow}>
          <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onSave} testID="sponsor-save">
            <Save size={14} color="#fff" />
            <Text style={styles.btnText}>Save & apply</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnDanger]} onPress={onClear} testID="sponsor-clear">
            <Trash2 size={14} color="#fff" />
            <Text style={styles.btnText}>Clear local</Text>
          </Pressable>
        </View>

        <Pressable onPress={onDone} style={styles.doneBtn}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── UPDATES TAB ────────────────────────────────────────────────────────────
function UpdatesTab() {
  const router = useRouter();
  const { updates, addUpdate, removeUpdate, togglePinned, toggleFeatured } =
    useSponsorUpdates();

  const [sponsorName, setSponsorName] = useState<string>("");
  const [tier, setTier] = useState<SponsorSlotTier | undefined>(undefined);
  const [title, setTitle] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [url, setUrl] = useState<string>("");
  const [pinned, setPinned] = useState<boolean>(false);
  const [featured, setFeatured] = useState<boolean>(false);
  const [posting, setPosting] = useState<boolean>(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const reset = () => {
    setSponsorName("");
    setTier(undefined);
    setTitle("");
    setBody("");
    setImageUrl("");
    setUrl("");
    setPinned(false);
    setFeatured(false);
  };

  const onPost = async () => {
    const missing: string[] = [];
    if (!sponsorName.trim()) missing.push("Sponsor name");
    if (!title.trim()) missing.push("Title");
    if (!body.trim()) missing.push("Body");
    if (missing.length > 0) {
      setStatus({ kind: "err", msg: `Missing: ${missing.join(", ")}` });
      return;
    }
    try {
      setPosting(true);
      setStatus(null);
      const created = await addUpdate({
        sponsorName,
        tier,
        title,
        body,
        imageUrl: imageUrl || undefined,
        url: url || undefined,
        pinned,
        featured,
      });
      reset();
      setStatus({
        kind: "ok",
        msg: `Posted \u201C${created.title}\u201D \u2014 opening feed\u2026`,
      });
      setTimeout(() => router.push("/sponsor-updates"), 350);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not post update";
      console.log("[admin] post update failed", msg);
      setStatus({ kind: "err", msg });
    } finally {
      setPosting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Compose update</Text>
        <Text style={styles.sectionHint}>
          Post sponsor announcements, CLE invites, booth giveaways, or limited offers.
          They appear in the public Sponsor Updates feed.
        </Text>

        <Field label="Sponsor name *" value={sponsorName} onChange={setSponsorName} placeholder="Smith & Jones LLP" />
        <Field label="Title *" value={title} onChange={setTitle} placeholder="Visit our booth #214 — free CLE credit" />
        <Field
          label="Body *"
          value={body}
          onChange={setBody}
          placeholder="What sponsors want attendees to know…"
          multiline
        />
        <Field
          label="Image URL"
          value={imageUrl}
          onChange={setImageUrl}
          placeholder="https://your-cdn.com/announcement.jpg"
        />
        <Field
          label="Click-through URL"
          value={url}
          onChange={setUrl}
          placeholder="https://sponsor.com/landing"
        />

        <Text style={styles.fieldLabel}>Tier (optional)</Text>
        <View style={styles.tierWrap}>
          <Pressable
            onPress={() => setTier(undefined)}
            style={[styles.tierChip, tier === undefined && styles.tierChipActive]}
          >
            <Text
              style={[styles.tierChipText, tier === undefined && styles.tierChipTextActive]}
            >
              none
            </Text>
          </Pressable>
          {TIERS.map((t) => (
            <Pressable
              key={t}
              onPress={() => setTier(t)}
              style={[styles.tierChip, tier === t && styles.tierChipActive]}
            >
              <Text
                style={[styles.tierChipText, tier === t && styles.tierChipTextActive]}
              >
                {t}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.flagsRow}>
          <View style={styles.flagToggle}>
            <Pin size={14} color={pinned ? Colors.blue : Colors.textMuted} />
            <Text style={styles.toggleLabel}>Pin</Text>
            <Switch value={pinned} onValueChange={setPinned} />
          </View>
          <View style={styles.flagToggle}>
            <Star size={14} color={featured ? Colors.yellow : Colors.textMuted} />
            <Text style={styles.toggleLabel}>Feature on home</Text>
            <Switch value={featured} onValueChange={setFeatured} />
          </View>
        </View>

        {status ? (
          <View
            style={[
              styles.statusBanner,
              status.kind === "ok" ? styles.statusOk : styles.statusErr,
            ]}
          >
            <Text style={styles.statusText}>{status.msg}</Text>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.btn, styles.btnPrimary, posting && { opacity: 0.6 }]}
            onPress={onPost}
            disabled={posting}
            testID="post-update"
          >
            <Send size={14} color="#fff" />
            <Text style={styles.btnText}>{posting ? "Posting\u2026" : "Post update"}</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.btnGhost]}
            onPress={() => router.push("/sponsor-updates")}
          >
            <Megaphone size={14} color={Colors.text} />
            <Text style={[styles.btnText, { color: Colors.text }]}>View feed</Text>
          </Pressable>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
          Posted updates ({updates.length})
        </Text>
        {updates.length === 0 ? (
          <Text style={styles.sectionHint}>No updates yet. Post one above.</Text>
        ) : (
          updates.map((u) => (
            <View key={u.id} style={styles.updateRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.updateTitle} numberOfLines={1}>
                  {u.title}
                </Text>
                <Text style={styles.updateMeta} numberOfLines={1}>
                  {u.sponsorName}
                  {u.tier ? ` · ${u.tier}` : ""}
                  {u.pinned ? " · pinned" : ""}
                  {u.featured ? " · featured" : ""}
                </Text>
              </View>
              <Pressable
                onPress={() => togglePinned(u.id)}
                style={styles.iconBtn}
                hitSlop={8}
              >
                <Pin size={14} color={u.pinned ? Colors.blue : Colors.textMuted} />
              </Pressable>
              <Pressable
                onPress={() => toggleFeatured(u.id)}
                style={styles.iconBtn}
                hitSlop={8}
              >
                <Star size={14} color={u.featured ? Colors.yellow : Colors.textMuted} />
              </Pressable>
              <Pressable
                onPress={() =>
                  Alert.alert("Delete update?", u.title, [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => removeUpdate(u.id),
                    },
                  ])
                }
                style={styles.iconBtn}
                hitSlop={8}
              >
                <X size={14} color={Colors.red} />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── PITCH TAB ──────────────────────────────────────────────────────────────
function PitchTab() {
  const pitchText = useMemo(() => {
    const lines = [
      "Tort Market — Sponsorship Opportunities",
      "",
      "Reach mass-tort attorneys where they make decisions. Tort Market is a daily-use",
      "intelligence + prediction-market app for plaintiff lawyers, conference attendees,",
      "and case investors. Sponsors get persistent placement, native cards, and",
      "dedicated announcements in the Sponsor Updates feed.",
      "",
      "TIERS",
      ...TIERS.map((t) => `  · ${t.toUpperCase().padEnd(12)} ${TIER_PRICES[t]}`),
      "",
      "WHAT YOU GET",
      "  · Logo + tagline rendered in your tier across the app",
      "  · Click-through to your landing page",
      "  · Unlimited posts in the Sponsor Updates feed during the engagement",
      "  · Optional featured placement on the home screen",
      "  · Performance recap (impressions, taps) at the end of the run",
      "",
      "Contact: sponsorships@tortsite.app",
    ];
    return lines.join("\n");
  }, []);

  const onCopy = async () => {
    try {
      await Clipboard.setStringAsync(pitchText);
      Alert.alert("Copied", "Pitch copied to clipboard.");
    } catch (e) {
      Alert.alert("Error", "Could not copy.");
    }
  };

  const onShare = async () => {
    try {
      await Share.share({ message: pitchText });
    } catch (_) {}
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Sponsorship pitch</Text>
      <Text style={styles.sectionHint}>
        Share this with prospective sponsors. Edit prices in admin.tsx (TIER_PRICES) to match
        your current rate card.
      </Text>

      <View style={styles.pitchCard}>
        <Text style={styles.pitchText}>{pitchText}</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onShare}>
          <Share2 size={14} color="#fff" />
          <Text style={styles.btnText}>Share</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.btnGhost]} onPress={onCopy}>
          <Copy size={14} color={Colors.text} />
          <Text style={[styles.btnText, { color: Colors.text }]}>Copy</Text>
        </Pressable>
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Tier rate card</Text>
      {TIERS.map((t) => (
        <View key={t} style={styles.rateRow}>
          <Text style={styles.rateName}>{t.toUpperCase()}</Text>
          <Text style={styles.ratePrice}>{TIER_PRICES[t]}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── INTEGRATIONS TAB ───────────────────────────────────────────────────────
const GHL_KEY = "tortmarket.integrations.ghl.v1";

type GhlConfig = {
  enabled: boolean;
  webhookUrl: string;
  apiKey: string;
  locationId: string;
  contactTag: string;
  lastSyncedAt?: string;
};

const DEFAULT_GHL: GhlConfig = {
  enabled: false,
  webhookUrl: "",
  apiKey: "",
  locationId: "",
  contactTag: "tort-market-sponsor",
};

function IntegrationsTab() {
  const [cfg, setCfg] = useState<GhlConfig>(DEFAULT_GHL);
  const [hydrated, setHydrated] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);

  useEffect(() => {
    AsyncStorage.getItem(GHL_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as GhlConfig;
            setCfg({ ...DEFAULT_GHL, ...parsed });
          } catch (e) {
            console.log("[GHL] parse error", e);
          }
        }
        setHydrated(true);
      })
      .catch(() => setHydrated(true));
  }, []);

  const persist = async (next: GhlConfig) => {
    setCfg(next);
    try {
      await AsyncStorage.setItem(GHL_KEY, JSON.stringify(next));
    } catch (e) {
      console.log("[GHL] save error", e);
    }
  };

  const update = <K extends keyof GhlConfig>(key: K, value: GhlConfig[K]) => {
    persist({ ...cfg, [key]: value });
  };

  const onTest = async () => {
    if (!cfg.webhookUrl.trim()) {
      Alert.alert("Add webhook URL", "Paste your Go High Level inbound webhook URL first.");
      return;
    }
    setTesting(true);
    try {
      const res = await fetch(cfg.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "tort-market",
          event: "integration.test",
          tag: cfg.contactTag || undefined,
          locationId: cfg.locationId || undefined,
          sentAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        Alert.alert("Test failed", `Webhook responded ${res.status}`);
      } else {
        await persist({ ...cfg, lastSyncedAt: new Date().toISOString() });
        Alert.alert("Test sent", "Check your GHL workflow for the test payload.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      Alert.alert("Test failed", msg);
    } finally {
      setTesting(false);
    }
  };

  const onReset = () => {
    Alert.alert("Reset integration?", "Clears webhook + API key locally.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: () => persist(DEFAULT_GHL),
      },
    ]);
  };

  if (!hydrated) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionHint}>Loading…</Text>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.statusCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Zap size={14} color={Colors.orange} />
            <Text style={styles.statusTitle}>Go High Level</Text>
          </View>
          <Text style={styles.sectionHint}>
            Pipe sponsor leads, invites, and engagement events into your GHL workflows.
            Configure here, automate over there.
          </Text>
          <Row
            label="Status"
            value={cfg.enabled && cfg.webhookUrl ? "CONNECTED" : "not connected"}
            accent={cfg.enabled && cfg.webhookUrl ? Colors.emerald : Colors.textMuted}
          />
          {cfg.lastSyncedAt ? (
            <Row
              label="Last test"
              value={new Date(cfg.lastSyncedAt).toLocaleString()}
              small
            />
          ) : null}
          <View style={styles.toggleRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <CheckCircle2
                size={14}
                color={cfg.enabled ? Colors.emerald : Colors.textMuted}
              />
              <Text style={styles.toggleLabel}>Enable GHL sync</Text>
            </View>
            <Switch
              value={cfg.enabled}
              onValueChange={(v) => update("enabled", v)}
              testID="ghl-enabled"
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Connection</Text>
        <Text style={styles.sectionHint}>
          In GHL → Automation → Workflows, create an Inbound Webhook trigger and paste the URL
          here. API key + Location ID are optional for v1 (used later for contact lookups).
        </Text>

        <Field
          label="Inbound webhook URL *"
          value={cfg.webhookUrl}
          onChange={(v) => update("webhookUrl", v)}
          placeholder="https://services.leadconnectorhq.com/hooks/..."
        />
        <Field
          label="Location ID"
          value={cfg.locationId}
          onChange={(v) => update("locationId", v)}
          placeholder="loc_abc123"
        />
        <Field
          label="API key (private)"
          value={cfg.apiKey}
          onChange={(v) => update("apiKey", v)}
          placeholder="eyJhbGciOi... (stored locally only)"
        />
        <Field
          label="Default contact tag"
          value={cfg.contactTag}
          onChange={(v) => update("contactTag", v)}
          placeholder="tort-market-sponsor"
        />

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.btn, styles.btnPrimary, testing && { opacity: 0.6 }]}
            onPress={onTest}
            disabled={testing}
            testID="ghl-test"
          >
            <Link2 size={14} color="#fff" />
            <Text style={styles.btnText}>{testing ? "Sending…" : "Send test event"}</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnDanger]} onPress={onReset}>
            <Trash2 size={14} color="#fff" />
            <Text style={styles.btnText}>Reset</Text>
          </Pressable>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>What gets synced</Text>
        <Text style={styles.sectionHint}>
          Once connected, Tort Market will POST these events to your webhook so GHL can route
          them to pipelines, SMS, or email sequences.
        </Text>
        {[
          "sponsor.lead — pitch shared / sponsor inquiry",
          "sponsor.update.posted — new announcement in feed",
          "invite.sent — user shares referral link",
          "invite.accepted — referral signs up",
          "reward.redeemed — points cashed for a perk",
        ].map((e) => (
          <View key={e} style={styles.rateRow}>
            <Text style={styles.rateName} numberOfLines={1}>
              {e}
            </Text>
          </View>
        ))}

        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Roadmap</Text>
        <Text style={styles.sectionHint}>
          v2 will add two-way sync (pull contact lists, push sponsor proposals), plus Zapier
          and Make fallbacks. Want it sooner? Ping the agent and we will prioritize.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── helpers ────────────────────────────────────────────────────────────────
function Row({
  label,
  value,
  accent,
  small,
}: {
  label: string;
  value: string;
  accent?: string;
  small?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          accent ? { color: accent } : null,
          small ? { fontSize: 11 } : null,
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        multiline={multiline}
        style={[styles.input, multiline && styles.inputMultiline]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 16, gap: 12, paddingBottom: 64 },

  tabBar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: Colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabPillActive: { backgroundColor: Colors.text, borderColor: Colors.text },
  tabPillText: { color: Colors.text, fontSize: 12, fontWeight: "800" },
  tabPillTextActive: { color: "#fff" },

  statusCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  statusTitle: { color: Colors.text, fontSize: 14, fontWeight: "900", marginBottom: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  rowLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: "700" },
  rowValue: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: "800",
    flexShrink: 1,
    textAlign: "right",
  },
  toggleRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  toggleLabel: { color: Colors.text, fontSize: 13, fontWeight: "700" },

  sectionTitle: { color: Colors.text, fontSize: 16, fontWeight: "900", marginTop: 4 },
  sectionHint: { color: Colors.textMuted, fontSize: 12, fontWeight: "600", marginBottom: 4 },

  tierRow: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 10,
    gap: 6,
  },
  tierHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tierName: { color: Colors.text, fontSize: 11, fontWeight: "900", letterSpacing: 0.6 },
  tierState: { fontSize: 10, fontWeight: "900", letterSpacing: 0.6 },
  tierMeta: { color: Colors.textSecondary, fontSize: 11, fontWeight: "600" },

  editorRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  smallBtnGhost: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  smallBtnText: { color: Colors.text, fontSize: 11, fontWeight: "800" },

  editor: {
    minHeight: 220,
    backgroundColor: "#0B1220",
    color: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
    textAlignVertical: "top",
  },
  error: { color: Colors.red, fontSize: 12, fontWeight: "700" },

  actionRow: { flexDirection: "row", gap: 10 },
  statusBanner: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  statusOk: {
    backgroundColor: "rgba(34,197,94,0.12)",
    borderColor: "rgba(34,197,94,0.45)",
  },
  statusErr: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderColor: "rgba(239,68,68,0.45)",
  },
  statusText: { color: Colors.text, fontSize: 12, fontWeight: "800" },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 46,
    borderRadius: 12,
  },
  btnPrimary: { backgroundColor: Colors.blue },
  btnDanger: { backgroundColor: Colors.red },
  btnGhost: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnText: { color: "#fff", fontSize: 13, fontWeight: "800" },

  doneBtn: { alignSelf: "center", padding: 12, marginTop: 4 },
  doneText: { color: Colors.textMuted, fontSize: 13, fontWeight: "700" },

  fieldLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginTop: 4,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  inputMultiline: { minHeight: 100, textAlignVertical: "top" },

  tierWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tierChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tierChipActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  tierChipText: { color: Colors.text, fontSize: 11, fontWeight: "800" },
  tierChipTextActive: { color: "#fff" },

  flagsRow: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  flagToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flex: 1,
  },

  updateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 10,
  },
  updateTitle: { color: Colors.text, fontSize: 13, fontWeight: "800" },
  updateMeta: { color: Colors.textMuted, fontSize: 11, fontWeight: "600", marginTop: 2 },
  iconBtn: { padding: 6 },

  pitchCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
  },
  pitchText: {
    color: Colors.text,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  rateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rateName: { color: Colors.text, fontSize: 12, fontWeight: "900", letterSpacing: 0.6 },
  ratePrice: { color: Colors.blue, fontSize: 12, fontWeight: "900" },
  bigCount: { color: Colors.text, fontSize: 34, fontWeight: "900", letterSpacing: -1 },
  bigCountSuffix: { color: Colors.textMuted, fontSize: 15, fontWeight: "800" },
  progressTrack: {
    height: 9,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    overflow: "hidden",
    marginTop: 8,
  },
  progressFill: { height: "100%" as const, borderRadius: 999, backgroundColor: Colors.emerald },
  progressMeta: { color: Colors.textMuted, fontSize: 11, fontWeight: "700" },
  statGrid: { flexDirection: "row", gap: 8, marginTop: 10 },
  statTile: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  statTileValue: { color: Colors.text, fontSize: 14, fontWeight: "900" },
  statTileLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: "800", marginTop: 2 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  csvBtn: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  csvText: { color: Colors.text, fontSize: 11, fontWeight: "800" },
  inviteUrl: { color: Colors.blue, fontSize: 12, fontWeight: "800" },
  signupRow: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  signupHandle: { color: Colors.text, fontSize: 13, fontWeight: "900" },
  signupRef: { color: Colors.blue, fontSize: 11, fontWeight: "800" },
  signupMeta: { color: Colors.textMuted, fontSize: 11, fontWeight: "600", marginTop: 2 },
  toggleRowCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
