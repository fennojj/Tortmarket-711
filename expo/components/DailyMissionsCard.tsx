import React, { useCallback, useMemo } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { CheckCircle2, TrendingUp, MessageSquare, Gift, Users, Zap } from "lucide-react-native";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { useEngagement } from "@/providers/EngagementProvider";
import { useApp } from "@/providers/AppProvider";

interface Mission {
  id: string;
  label: string;
  sub: string;
  pts: number;
  icon: React.ReactElement;
  done: boolean;
  route?: string;
}

export default function DailyMissionsCard(): React.ReactElement | null {
  const { todayStats } = useEngagement();
  const { user, canClaimDaily, claimMissionsBonus, rewardConfig } = useApp();

  const missionsBonusClaimedToday = useMemo(() => {
    if (!user.lastMissionsBonusAt) return false;
    const d = new Date(user.lastMissionsBonusAt);
    const n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
  }, [user.lastMissionsBonusAt]);

  const missions: Mission[] = useMemo(() => [
    {
      id: "view",
      label: "Explore 3 markets",
      sub: `${Math.min(todayStats.viewedMarketsToday, 3)}/3 viewed today`,
      pts: 200,
      icon: <TrendingUp size={16} color={Colors.blue} />,
      done: todayStats.viewedMarketsToday >= 3,
      route: "/(tabs)/",
    },
    {
      id: "trade",
      label: "Place a trade",
      sub: todayStats.playsToday > 0 ? "Trade placed ✓" : "Buy YES or NO on any market",
      pts: 500,
      icon: <Zap size={16} color={Colors.orange} />,
      done: todayStats.playsToday > 0,
      route: "/(tabs)/",
    },
    {
      id: "coach",
      label: "Ask TortCoach",
      sub: todayStats.coachMessagesToday > 0 ? "Coach consulted ✓" : "Send 1 message to your AI analyst",
      pts: 150,
      icon: <MessageSquare size={16} color={Colors.purpleAccent} />,
      done: todayStats.coachMessagesToday > 0,
      route: "/(tabs)/coach",
    },
    {
      id: "claim",
      label: "Claim daily drop",
      sub: !canClaimDaily ? "Drop claimed ✓" : "Tap your daily reward",
      pts: 150,
      icon: <Gift size={16} color={Colors.emerald} />,
      done: !canClaimDaily || todayStats.claimedToday,
    },
  ], [todayStats, canClaimDaily]);

  const completedCount = missions.filter((m) => m.done).length;
  const allDone = completedCount === missions.length;
  const progressPct = completedCount / missions.length;

  const onClaimBonus = useCallback(() => {
    if (!allDone || missionsBonusClaimedToday) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    claimMissionsBonus();
  }, [allDone, missionsBonusClaimedToday, claimMissionsBonus]);

  return (
    <View style={styles.wrap} testID="daily-missions-card">
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Users size={15} color={Colors.blue} />
          <Text style={styles.title}>Daily Missions</Text>
          <View style={styles.bonusPill}>
            <Text style={styles.bonusPillText}>+{rewardConfig.missionsBonusPoints.toLocaleString()} pts bonus</Text>
          </View>
        </View>
        <Text style={styles.progressLabel}>
          {completedCount}/{missions.length} complete
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${progressPct * 100}%` as `${number}%` }]} />
      </View>

      {missions.map((m) => (
        <Pressable
          key={m.id}
          onPress={() => {
            if (m.route) router.push(m.route as never);
          }}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
          testID={`mission-${m.id}`}
        >
          <View style={[styles.iconBox, m.done && styles.iconBoxDone]}>
            {m.done ? <CheckCircle2 size={16} color={Colors.emerald} /> : m.icon}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.missionLabel, m.done && styles.missionLabelDone]}>
              {m.label}
            </Text>
            <Text style={styles.missionSub}>{m.sub}</Text>
          </View>
          <Text style={[styles.pts, m.done && styles.ptsDone]}>+{m.pts}</Text>
        </Pressable>
      ))}

      {allDone ? (
        <Pressable
          onPress={onClaimBonus}
          disabled={missionsBonusClaimedToday}
          style={[styles.claimBtn, missionsBonusClaimedToday && styles.claimBtnDone]}
          testID="missions-claim-btn"
        >
          {missionsBonusClaimedToday ? (
            <>
              <CheckCircle2 size={15} color={Colors.emerald} />
              <Text style={styles.claimBtnTextDone}>Bonus claimed — come back tomorrow</Text>
            </>
          ) : (
            <>
              <Zap size={15} color="#fff" />
              <Text style={styles.claimBtnText}>Claim {rewardConfig.missionsBonusPoints.toLocaleString()} bonus pts</Text>
            </>
          )}
        </Pressable>
      ) : (
        <View style={styles.nudge}>
          <Text style={styles.nudgeText}>
            {missions.length - completedCount} mission{missions.length - completedCount === 1 ? "" : "s"} left — finish all 4 for the bonus
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  title: { color: Colors.text, fontSize: 14, fontWeight: "900" },
  bonusPill: {
    backgroundColor: Colors.blueSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  bonusPillText: { color: Colors.blue, fontSize: 10, fontWeight: "800" },
  progressLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: "700" },
  barTrack: {
    height: 5,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 12,
  },
  barFill: {
    height: "100%" as const,
    backgroundColor: Colors.blue,
    borderRadius: 3,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconBoxDone: {
    backgroundColor: Colors.emeraldSoft,
    borderColor: Colors.emerald,
  },
  missionLabel: { color: Colors.text, fontSize: 13, fontWeight: "800" },
  missionLabelDone: { color: Colors.textMuted, textDecorationLine: "line-through" },
  missionSub: { color: Colors.textMuted, fontSize: 11, fontWeight: "600", marginTop: 1 },
  pts: { color: Colors.blue, fontSize: 12, fontWeight: "900" },
  ptsDone: { color: Colors.textMuted },
  claimBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 12,
    backgroundColor: Colors.blue,
    borderRadius: 12,
    paddingVertical: 13,
  },
  claimBtnDone: {
    backgroundColor: Colors.emeraldSoft,
  },
  claimBtnText: { color: "#fff", fontSize: 14, fontWeight: "900" },
  claimBtnTextDone: { color: Colors.emerald, fontSize: 13, fontWeight: "800" },
  nudge: {
    marginTop: 10,
    alignItems: "center",
  },
  nudgeText: { color: Colors.textMuted, fontSize: 11.5, fontWeight: "600" },
});
