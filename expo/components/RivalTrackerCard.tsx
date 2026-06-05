import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Trophy, ArrowRight, Swords, TrendingUp } from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { useApp } from "@/providers/AppProvider";
import { LEADERBOARD } from "@/mocks/leaderboard";

/** Flatten all leaderboard entries into a single ranked list sorted by points */
function buildGlobalBoard(): { rank: number; handle: string; points: number }[] {
  const all: { handle: string; points: number }[] = [];
  for (const section of LEADERBOARD) {
    for (const entry of section.entries) {
      if (!all.find((e) => e.handle === entry.handle)) {
        all.push({ handle: entry.handle, points: entry.points });
      }
    }
  }
  all.sort((a, b) => b.points - a.points);
  return all.map((e, i) => ({ rank: i + 1, ...e }));
}

const GLOBAL_BOARD = buildGlobalBoard();

export default function RivalTrackerCard(): React.ReactElement | null {
  const { user, portfolioValue } = useApp();

  const myScore = user.pointBalance + Math.round(portfolioValue);

  const rival = useMemo(() => {
    // Find first board entry with more points than the user
    const ahead = GLOBAL_BOARD.filter((e) => e.points > myScore);
    if (ahead.length === 0) {
      // User is already #1 — show they are top
      return null;
    }
    // Closest rival (smallest gap)
    return ahead.reduce((prev, curr) =>
      curr.points - myScore < prev.points - myScore ? curr : prev,
    );
  }, [myScore]);

  // Also pick a rival below to show user is being chased
  const chaser = useMemo(() => {
    const below = GLOBAL_BOARD.filter((e) => e.points < myScore);
    if (below.length === 0) return null;
    return below[0]; // closest one below
  }, [myScore]);

  if (!rival && !chaser) return null;

  const target = rival ?? chaser!;
  const isChasing = !!rival;
  const gap = Math.abs(target.points - myScore);
  const gapLabel = gap >= 1000 ? `${(gap / 1000).toFixed(1)}K` : gap.toLocaleString();

  // Progress toward the rival: how close are we?
  const progressPct = isChasing
    ? Math.max(0, Math.min(1, myScore / target.points))
    : Math.max(0, Math.min(1, target.points / myScore));

  return (
    <Pressable
      onPress={() => router.push("/(tabs)/leaderboard" as never)}
      style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.9 }]}
      testID="rival-tracker-card"
    >
      <View style={styles.topRow}>
        <View style={styles.labelRow}>
          <Swords size={14} color={isChasing ? Colors.orange : Colors.blue} />
          <Text style={styles.label}>
            {isChasing ? "Rival in range" : "Someone's gaining on you"}
          </Text>
        </View>
        <ArrowRight size={15} color={Colors.textMuted} />
      </View>

      <View style={styles.vsRow}>
        <View style={styles.player}>
          <View style={[styles.avatar, styles.avatarYou]}>
            <Text style={styles.avatarText}>{(user.handle ?? "@you").slice(1, 3).toUpperCase()}</Text>
          </View>
          <Text style={styles.handle} numberOfLines={1}>{user.handle}</Text>
          <Text style={styles.pts}>{(myScore / 1000).toFixed(1)}K</Text>
        </View>

        <View style={styles.gapBox}>
          <Text style={styles.gapAmt}>{gapLabel} pts</Text>
          <Text style={styles.gapSub}>{isChasing ? "behind" : "ahead"}</Text>
        </View>

        <View style={styles.player}>
          <View style={[styles.avatar, styles.avatarRival]}>
            <Trophy size={14} color={isChasing ? Colors.orange : Colors.blue} />
          </View>
          <Text style={styles.handle} numberOfLines={1}>{target.handle}</Text>
          <Text style={styles.pts}>{(target.points / 1000).toFixed(1)}K</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            { width: `${progressPct * 100}%` as `${number}%` },
            isChasing
              ? { backgroundColor: Colors.orange }
              : { backgroundColor: Colors.blue },
          ]}
        />
      </View>

      <View style={styles.ctaRow}>
        <TrendingUp size={12} color={isChasing ? Colors.orange : Colors.blue} />
        <Text style={[styles.ctaText, isChasing ? { color: Colors.orange } : { color: Colors.blue }]}>
          {isChasing
            ? `Make a trade to close the ${gapLabel} pt gap`
            : `Stay active — ${target.handle} is only ${gapLabel} pts back`}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { color: Colors.text, fontSize: 13, fontWeight: "900" },
  vsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  player: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarYou: { backgroundColor: Colors.blueSoft },
  avatarRival: { backgroundColor: Colors.orangeSoft },
  avatarText: { color: Colors.blue, fontSize: 13, fontWeight: "900" },
  handle: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  pts: { color: Colors.textMuted, fontSize: 10, fontWeight: "700" },
  gapBox: {
    alignItems: "center",
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 70,
  },
  gapAmt: { color: Colors.text, fontSize: 15, fontWeight: "900" },
  gapSub: { color: Colors.textMuted, fontSize: 10, fontWeight: "700" },
  barTrack: {
    height: 5,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: "100%" as const,
    borderRadius: 3,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: "800",
    flex: 1,
  },
});
