import React, { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Stack } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Bot, Eye, MousePointerClick, Radio, Users, Zap } from "lucide-react-native";
import { Colors } from "@/constants/colors";
import CampaignCard from "@/components/CampaignCard";
import { useCampaigns } from "@/providers/CampaignProvider";
import { kindLabel, type Campaign, type CampaignKind } from "@/utils/campaigns";

type StatusFilter = "all" | "live" | "completed" | "drafting";

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "completed", label: "Completed" },
  { key: "drafting", label: "Drafts" },
];

function fmtN(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

export default function CampaignsScreen(): React.ReactElement {
  const {
    campaigns,
    autoLaunch,
    totals,
    byKind,
    launchCampaign,
    pauseCampaign,
    setAutoLaunch,
  } = useCampaigns();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [kindFilter, setKindFilter] = useState<"all" | CampaignKind>("all");

  const kinds = useMemo(() => Object.keys(byKind) as CampaignKind[], [byKind]);

  const filtered: Campaign[] = useMemo(() => {
    return campaigns.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (kindFilter !== "all" && c.kind !== kindFilter) return false;
      return true;
    });
  }, [campaigns, statusFilter, kindFilter]);

  return (
    <View style={styles.wrap}>
      <Stack.Screen
        options={{
          title: "Campaign Agent",
          headerStyle: { backgroundColor: Colors.bg },
          headerTitleStyle: { color: Colors.text, fontWeight: "800" },
        }}
      />

      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <LinearGradient
              colors={["#0B1220", "#1E3A8A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <View style={styles.heroTop}>
                <View style={styles.heroBadge}>
                  <Bot size={11} color={Colors.yellow} />
                  <Text style={styles.heroBadgeText}>AUTONOMOUS AGENT</Text>
                </View>
                <View style={styles.livePill}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>{totals.live} LIVE</Text>
                </View>
              </View>

              <Text style={styles.heroTitle}>Promo engine for every play & winner</Text>
              <Text style={styles.heroSub}>
                Auto-drafts cross-channel campaigns the moment a play prints, a whale moves, a throne
                flips, or the tape rips. Tune auto-launch below.
              </Text>

              <View style={styles.autoRow}>
                <View style={styles.autoLeft}>
                  <Radio size={13} color={autoLaunch ? Colors.emerald : "rgba(255,255,255,0.6)"} />
                  <View>
                    <Text style={styles.autoTitle}>Auto-launch</Text>
                    <Text style={styles.autoSub}>
                      {autoLaunch
                        ? "Campaigns ship instantly to X · Reddit · Discord · Push"
                        : "New campaigns stay in draft until you launch"}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={autoLaunch}
                  onValueChange={setAutoLaunch}
                  trackColor={{ false: "#334155", true: Colors.emerald }}
                  thumbColor="#fff"
                  testID="auto-launch-toggle"
                />
              </View>

              <View style={styles.kpiRow}>
                <Kpi icon="eye" label="Impressions" value={fmtN(totals.impressions)} />
                <Kpi icon="click" label="Clicks" value={fmtN(totals.clicks)} />
                <Kpi icon="users" label="Signups" value={fmtN(totals.signups)} />
                <Kpi icon="zap" label="Plays" value={fmtN(totals.plays)} />
              </View>
            </LinearGradient>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillRow}
            >
              {STATUS_FILTERS.map((f) => {
                const active = statusFilter === f.key;
                return (
                  <Pressable
                    key={f.key}
                    onPress={() => setStatusFilter(f.key)}
                    style={[styles.pill, active && styles.pillActive]}
                    testID={`status-${f.key}`}
                  >
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {kinds.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.kindRow}
              >
                <Pressable
                  onPress={() => setKindFilter("all")}
                  style={[
                    styles.kindPill,
                    kindFilter === "all" && styles.kindPillActive,
                  ]}
                  testID="kind-all"
                >
                  <Text
                    style={[
                      styles.kindPillText,
                      kindFilter === "all" && styles.kindPillTextActive,
                    ]}
                  >
                    All kinds · {campaigns.length}
                  </Text>
                </Pressable>
                {kinds.map((k) => (
                  <Pressable
                    key={k}
                    onPress={() => setKindFilter(k)}
                    style={[
                      styles.kindPill,
                      kindFilter === k && styles.kindPillActive,
                    ]}
                    testID={`kind-${k}`}
                  >
                    <Text
                      style={[
                        styles.kindPillText,
                        kindFilter === k && styles.kindPillTextActive,
                      ]}
                    >
                      {kindLabel(k)} · {byKind[k]}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}

            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>Campaign feed</Text>
              <Text style={styles.listHint}>{filtered.length} shown</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <CampaignCard
            campaign={item}
            onLaunch={launchCampaign}
            onPause={pauseCampaign}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Bot size={28} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Agent warming up</Text>
            <Text style={styles.emptyText}>
              Place a play or wait a few seconds — the engine seeds whale alerts, winner spotlights,
              and market-mover campaigns automatically.
            </Text>
          </View>
        }
      />
    </View>
  );
}

function Kpi({
  icon,
  label,
  value,
}: {
  icon: "eye" | "click" | "users" | "zap";
  label: string;
  value: string;
}) {
  const Icon =
    icon === "eye" ? Eye : icon === "click" ? MousePointerClick : icon === "users" ? Users : Zap;
  return (
    <View style={styles.kpi}>
      <Icon size={12} color="rgba(255,255,255,0.85)" />
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.bg },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },

  hero: { borderRadius: 22, padding: 18, marginTop: 10, gap: 10 },
  heroTop: { flexDirection: "row", alignItems: "center" },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  heroBadgeText: { color: "#fff", fontSize: 10, fontWeight: "900", letterSpacing: 0.6 },
  livePill: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(16,185,129,0.22)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.emerald },
  liveText: { color: Colors.emerald, fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },

  heroTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginTop: 4,
  },
  heroSub: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12.5,
    fontWeight: "500",
    lineHeight: 18,
  },

  autoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: 12,
    marginTop: 4,
  },
  autoLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  autoTitle: { color: "#fff", fontSize: 13, fontWeight: "900" },
  autoSub: { color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: "500", marginTop: 2 },

  kpiRow: { flexDirection: "row", gap: 6, marginTop: 4 },
  kpi: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    paddingHorizontal: 8,
    paddingVertical: 9,
    borderRadius: 12,
    gap: 2,
  },
  kpiValue: { color: "#fff", fontSize: 15, fontWeight: "900", marginTop: 2 },
  kpiLabel: { color: "rgba(255,255,255,0.75)", fontSize: 9.5, fontWeight: "700", letterSpacing: 0.3 },

  pillRow: { paddingTop: 14, paddingBottom: 4, gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillActive: { backgroundColor: Colors.text, borderColor: Colors.text },
  pillText: { color: Colors.textSecondary, fontSize: 12, fontWeight: "700" },
  pillTextActive: { color: "#fff" },

  kindRow: { paddingTop: 8, paddingBottom: 4, gap: 6 },
  kindPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  kindPillActive: { backgroundColor: Colors.blueSoft, borderColor: Colors.blue },
  kindPillText: { color: Colors.textSecondary, fontSize: 11, fontWeight: "800" },
  kindPillTextActive: { color: Colors.blue },

  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 10,
  },
  listTitle: { color: Colors.text, fontSize: 16, fontWeight: "900", flex: 1 },
  listHint: { color: Colors.textMuted, fontSize: 11, fontWeight: "700" },

  empty: {
    alignItems: "center",
    padding: 40,
    gap: 8,
  },
  emptyTitle: { color: Colors.text, fontSize: 15, fontWeight: "800", marginTop: 6 },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 18,
  },
});
