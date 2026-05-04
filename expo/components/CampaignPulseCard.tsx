import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowRight, Bot, Radio, Zap } from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { useCampaigns } from "@/providers/CampaignProvider";
import { kindLabel } from "@/utils/campaigns";

function fmtN(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

export default function CampaignPulseCard(): React.ReactElement | null {
  const { campaigns, totals, autoLaunch } = useCampaigns();

  const latestLive = useMemo(
    () => campaigns.find((c) => c.status === "live") ?? campaigns[0],
    [campaigns],
  );

  if (!latestLive) return null;

  return (
    <Pressable
      onPress={() => router.push("/campaigns" as never)}
      style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.9 }]}
      testID="campaign-pulse-card"
    >
      <LinearGradient
        colors={["#0B1220", "#1E3A8A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.top}>
          <View style={styles.badge}>
            <Bot size={10} color={Colors.yellow} />
            <Text style={styles.badgeText}>CAMPAIGN AGENT</Text>
          </View>
          <View style={styles.livePill}>
            <View style={[styles.dot, !autoLaunch && { backgroundColor: Colors.yellow }]} />
            <Radio size={10} color={autoLaunch ? Colors.emerald : Colors.yellow} />
            <Text style={[styles.liveText, !autoLaunch && { color: Colors.yellow }]}>
              {autoLaunch ? `${totals.live} LIVE` : "MANUAL"}
            </Text>
          </View>
        </View>

        <Text style={styles.headline} numberOfLines={2}>
          {latestLive.headline}
        </Text>
        <Text style={styles.kindHint}>{kindLabel(latestLive.kind)}</Text>

        <View style={styles.metricsRow}>
          <Stat value={fmtN(totals.impressions)} label="Impressions" />
          <Stat value={fmtN(totals.clicks)} label="Clicks" />
          <Stat value={fmtN(totals.signups)} label="Signups" />
        </View>

        <View style={styles.cta}>
          <Zap size={12} color={Colors.yellow} />
          <Text style={styles.ctaText}>Open campaign control room</Text>
          <ArrowRight size={14} color="#fff" />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, marginTop: 12 },
  card: { borderRadius: 20, padding: 16, gap: 10 },
  top: { flexDirection: "row", alignItems: "center" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { color: "#fff", fontSize: 9.5, fontWeight: "900", letterSpacing: 0.6 },
  livePill: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(16,185,129,0.22)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.emerald },
  liveText: { color: Colors.emerald, fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },

  headline: { color: "#fff", fontSize: 16, fontWeight: "900", letterSpacing: -0.2, marginTop: 2 },
  kindHint: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  metricsRow: { flexDirection: "row", gap: 6, marginTop: 4 },
  stat: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  statVal: { color: "#fff", fontSize: 15, fontWeight: "900" },
  statLabel: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
    letterSpacing: 0.3,
  },

  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  ctaText: { color: "#fff", fontSize: 12.5, fontWeight: "800", flex: 1 },
});
