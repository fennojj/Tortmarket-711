import React, { useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Flame, Gift } from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { DAILY_BASE_REWARD, useApp } from "@/providers/AppProvider";

export default function DailyClaimCard(): React.ReactElement {
  const { user, canClaimDaily, claimDaily } = useApp();
  const streak = user.streakDays ?? 0;

  const nextReward = useMemo(() => {
    const nextStreak = canClaimDaily ? Math.min((streak ?? 0) + 1, 7) : streak;
    const bonus = Math.min(Math.max(nextStreak - 1, 0), 6) * 250;
    return DAILY_BASE_REWARD + bonus;
  }, [canClaimDaily, streak]);

  const onClaim = () => {
    const res = claimDaily();
    if (res.ok && Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return (
    <View style={styles.wrap} testID="daily-claim-card">
      <View style={styles.iconWrap}>
        <Gift size={20} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Daily Point Drop</Text>
          <View style={styles.streakPill}>
            <Flame size={11} color={Colors.orange} />
            <Text style={styles.streakText}>{streak}d</Text>
          </View>
        </View>
        <Text style={styles.sub}>
          {canClaimDaily
            ? `Claim ${nextReward.toLocaleString()} pts today · streak bonus +250/day`
            : `Next drop unlocks tomorrow · streak ${streak} day${streak === 1 ? "" : "s"}`}
        </Text>
      </View>
      <Pressable
        onPress={onClaim}
        disabled={!canClaimDaily}
        style={[styles.btn, !canClaimDaily && styles.btnDisabled]}
        testID="daily-claim-btn"
      >
        <Text style={[styles.btnText, !canClaimDaily && styles.btnTextDisabled]}>
          {canClaimDaily ? "Claim" : "Claimed"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.orange,
    alignItems: "center", justifyContent: "center",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { color: Colors.text, fontSize: 14, fontWeight: "800" },
  streakPill: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: Colors.orangeSoft,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999,
  },
  streakText: { color: Colors.orange, fontSize: 10, fontWeight: "800" },
  sub: { color: Colors.textSecondary, fontSize: 12, fontWeight: "600", marginTop: 3 },
  btn: {
    height: 36, paddingHorizontal: 14, borderRadius: 10,
    backgroundColor: Colors.text,
    alignItems: "center", justifyContent: "center",
  },
  btnDisabled: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  btnText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  btnTextDisabled: { color: Colors.textMuted },
});
