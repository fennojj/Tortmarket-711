import React, { useMemo, useState } from "react";
import { Alert, FlatList, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Briefcase, Car, Gift, Laptop, Lock, Plane, Settings, Sparkles } from "lucide-react-native";
import { useRouter } from "expo-router";
import { Colors } from "@/constants/colors";
import { REWARDS } from "@/mocks/rewards";
import { useApp } from "@/providers/AppProvider";
import type { RewardItem } from "@/types";
import BalanceHeader from "@/components/BalanceHeader";
import SponsorSlot from "@/components/SponsorSlot";
import { CONFERENCE, type ConferenceCase } from "@/constants/sponsors";

type TierKey = "all" | 1 | 2 | 3;

const TIERS: { key: TierKey; label: string; icon: React.ReactNode }[] = [
  { key: "all", label: "All", icon: <Gift size={14} color={Colors.text} /> },
  { key: 1, label: "Tech", icon: <Laptop size={14} color={Colors.blue} /> },
  { key: 2, label: "Travel", icon: <Plane size={14} color={Colors.orange} /> },
  { key: 3, label: "Vehicles", icon: <Car size={14} color={Colors.emerald} /> },
];

export default function RewardsScreen(): React.ReactElement {
  const [tier, setTier] = useState<TierKey>("all");
  const { user, redeemReward } = useApp();
  const router = useRouter();

  const filtered = useMemo(() => {
    if (tier === "all") return REWARDS;
    return REWARDS.filter((r) => r.tier === tier);
  }, [tier]);

  const onClaimCase = (c: ConferenceCase) => {
    if (user.pointBalance < c.pointThreshold) {
      Alert.alert(
        "Keep climbing",
        `You need ${(c.pointThreshold - user.pointBalance).toLocaleString()} more pts to unlock the ${c.name}.`,
      );
      return;
    }
    Alert.alert(
      "Claim at the Booth",
      `Show this screen at the ${CONFERENCE.name} booth to claim your ${c.name}.\n\nSponsored by ${c.sponsor}.`,
      [{ text: "Got it", style: "default" }],
    );
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const onRedeem = (item: RewardItem) => {
    if (item.pointCost > user.pointBalance) {
      Alert.alert("Not enough points", `You need ${(item.pointCost - user.pointBalance).toLocaleString()} more points.`);
      return;
    }
    Alert.alert(
      "Confirm Redemption",
      `Redeem ${item.name} for ${item.pointCost.toLocaleString()} points?\n\nSponsored by ${item.sponsor}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Redeem",
          style: "default",
          onPress: () => {
            const res = redeemReward({ rewardId: item.id, cost: item.pointCost, name: item.name });
            if (res.ok) {
              if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Redeemed!", `${item.name} is on its way. Check your email for sponsor details.`);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.wrap}>
      <BalanceHeader subtitle="Sponsored perks from top mass-tort firms" />

      <Pressable
        onPress={() => router.push("/admin")}
        style={styles.adminLink}
        testID="open-sponsor-admin"
      >
        <Settings size={12} color={Colors.textSecondary} />
        <Text style={styles.adminLinkText}>Sponsor admin</Text>
      </Pressable>

      <SponsorSlot tier="banner" label="Rewards top banner" />

      {CONFERENCE.active && CONFERENCE.cases.length > 0 && (
        <View style={styles.confSection} testID="conference-cases">
          <View style={styles.confHeader}>
            <View style={styles.confBadge}>
              <Sparkles size={11} color={Colors.yellow} />
              <Text style={styles.confBadgeText}>{CONFERENCE.name.toUpperCase()}</Text>
            </View>
            <Text style={styles.confTitle}>Conference Cases</Text>
            <Text style={styles.confSub}>
              Hit the points · claim at the booth · while supplies last
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.confRow}
          >
            {CONFERENCE.cases.map((c) => {
              const unlocked = user.pointBalance >= c.pointThreshold;
              const pct = Math.min(100, (user.pointBalance / c.pointThreshold) * 100);
              return (
                <Pressable
                  key={c.id}
                  onPress={() => onClaimCase(c)}
                  style={[styles.confCard, unlocked && styles.confCardUnlocked]}
                  testID={`conference-case-${c.id}`}
                >
                  <View style={styles.confIconWrap}>
                    <Briefcase size={18} color={unlocked ? Colors.emerald : Colors.textSecondary} />
                  </View>
                  <Text style={styles.confCardName} numberOfLines={1}>{c.name}</Text>
                  <Text style={styles.confCardSponsor} numberOfLines={1}>by {c.sponsor}</Text>
                  <View style={styles.confProgressTrack}>
                    <View style={[styles.confProgressFill, { width: `${pct}%`, backgroundColor: unlocked ? Colors.emerald : Colors.blue }]} />
                  </View>
                  <View style={styles.confMetaRow}>
                    <Text style={styles.confThresh}>{c.pointThreshold.toLocaleString()} pts</Text>
                    <Text style={styles.confUnits}>{c.unitsAvailable} left</Text>
                  </View>
                  <View style={[styles.confCta, unlocked ? styles.confCtaUnlocked : styles.confCtaLocked]}>
                    {unlocked ? null : <Lock size={11} color={Colors.textMuted} />}
                    <Text style={[styles.confCtaText, unlocked && { color: "#fff" }]}>
                      {unlocked ? "Claim at booth" : `${(c.pointThreshold - user.pointBalance).toLocaleString()} to unlock`}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      <SponsorSlot tier="presenting" label="Conference cases presenting sponsor" />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tierRow}>
        <View style={{ marginRight: 8 }}>
          <SponsorSlot tier="tier" inline compact height={36} label="Tier sponsor" />
        </View>
        {TIERS.map((t) => {
          const active = tier === t.key;
          return (
            <Pressable
              key={String(t.key)}
              onPress={() => setTier(t.key)}
              style={[styles.tierPill, active && styles.tierPillActive]}
              testID={`tier-${t.key}`}
            >
              {t.icon}
              <Text style={[styles.tierText, active && styles.tierTextActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={<SponsorSlot tier="native" label="Sponsored reward — top of grid" />}
        ListFooterComponent={<SponsorSlot tier="sticky" label="Rewards bottom banner" />}
        numColumns={2}
        columnWrapperStyle={{ paddingHorizontal: 12, gap: 12 }}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => {
          const affordable = item.pointCost <= user.pointBalance;
          return (
            <View style={styles.item}>
              <Image source={{ uri: item.image }} style={styles.image} />
              <View style={styles.tierBadge}>
                <Text style={styles.tierBadgeText}>TIER {item.tier}</Text>
              </View>
              <View style={styles.itemBody}>
                <Text style={styles.sponsor} numberOfLines={1}>{item.sponsor}</Text>
                <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.price}>{item.pointCost.toLocaleString()} pts</Text>
                <Pressable
                  onPress={() => onRedeem(item)}
                  disabled={!affordable}
                  style={[styles.redeemBtn, !affordable && styles.redeemBtnDisabled]}
                  testID={`redeem-${item.id}`}
                >
                  <Text style={[styles.redeemText, !affordable && styles.redeemTextDisabled]}>
                    {affordable ? "Redeem Points" : "Locked"}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.bg },
  adminLink: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 12,
    marginTop: 4,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  adminLinkText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  tierRow: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  tierPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  tierPillActive: { backgroundColor: Colors.text, borderColor: Colors.text },
  tierText: { color: Colors.textSecondary, fontSize: 12, fontWeight: "700" },
  tierTextActive: { color: "#fff" },

  grid: { paddingTop: 4, paddingBottom: 48 },
  item: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 16, overflow: "hidden",
    borderWidth: 1, borderColor: Colors.border,
    marginBottom: 12,
  },
  image: { width: "100%", height: 120, backgroundColor: Colors.surface },
  tierBadge: {
    position: "absolute", top: 10, left: 10,
    backgroundColor: "rgba(11,18,32,0.85)",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  tierBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  itemBody: { padding: 12 },
  sponsor: { color: Colors.blue, fontSize: 10, fontWeight: "800", letterSpacing: 0.3, textTransform: "uppercase" },
  itemName: { color: Colors.text, fontSize: 13, fontWeight: "800", marginTop: 4, minHeight: 34 },
  price: { color: Colors.text, fontSize: 15, fontWeight: "900", marginTop: 8 },
  redeemBtn: {
    marginTop: 10, height: 36, borderRadius: 10,
    backgroundColor: Colors.orange,
    alignItems: "center", justifyContent: "center",
  },
  redeemBtnDisabled: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  redeemText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  redeemTextDisabled: { color: Colors.textMuted },

  confSection: { paddingTop: 8 },
  confHeader: { paddingHorizontal: 16, paddingTop: 8, gap: 4 },
  confBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: Colors.text,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  confBadgeText: { color: Colors.yellow, fontSize: 9, fontWeight: "900", letterSpacing: 0.7 },
  confTitle: { color: Colors.text, fontSize: 18, fontWeight: "900", letterSpacing: -0.3, marginTop: 6 },
  confSub: { color: Colors.textMuted, fontSize: 11.5, fontWeight: "600" },
  confRow: { paddingHorizontal: 12, paddingVertical: 12, gap: 10 },
  confCard: {
    width: 220,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 6,
  },
  confCardUnlocked: { borderColor: Colors.emerald, backgroundColor: Colors.emeraldSoft },
  confIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  confCardName: { color: Colors.text, fontSize: 14, fontWeight: "900", marginTop: 4 },
  confCardSponsor: { color: Colors.textMuted, fontSize: 10.5, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  confProgressTrack: {
    height: 6, borderRadius: 3, backgroundColor: Colors.surface,
    overflow: "hidden", marginTop: 6,
  },
  confProgressFill: { height: "100%", borderRadius: 3 },
  confMetaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  confThresh: { color: Colors.text, fontSize: 12, fontWeight: "800" },
  confUnits: { color: Colors.textMuted, fontSize: 11, fontWeight: "700" },
  confCta: {
    marginTop: 8,
    height: 34,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  confCtaLocked: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  confCtaUnlocked: { backgroundColor: Colors.emerald },
  confCtaText: { color: Colors.textSecondary, fontSize: 11.5, fontWeight: "800" },
});
