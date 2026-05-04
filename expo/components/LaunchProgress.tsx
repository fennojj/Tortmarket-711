import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Rocket, Trophy, Users } from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { getLaunchProgress } from "@/utils/referrals";
import { useApp } from "@/providers/AppProvider";

export default function LaunchProgress(): React.ReactElement {
  const router = useRouter();
  const { user } = useApp();
  const [tick, setTick] = useState<number>(0);
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const progress = useMemo(
    () => getLaunchProgress(user.referralCount ?? 0),
    [user.referralCount, tick],
  );

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: progress.pct,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [progress.pct, widthAnim]);

  const widthInterp = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Pressable
      onPress={() => router.push("/invite")}
      style={styles.wrap}
      testID="launch-progress"
    >
      <LinearGradient
        colors={["#0B1220", "#1E3A8A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.headerRow}>
          <View style={styles.iconWrap}>
            <Rocket size={14} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>FOUNDING MEMBER PUSH</Text>
            <Text style={styles.title}>Race to 5,000 members</Text>
          </View>
          <View style={styles.cta}>
            <Text style={styles.ctaText}>Invite →</Text>
          </View>
        </View>

        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, { width: widthInterp }]} />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Users size={11} color="rgba(255,255,255,0.85)" />
            <Text style={styles.statValue}>{progress.total.toLocaleString()}</Text>
            <Text style={styles.statLabel}>joined</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{progress.remaining.toLocaleString()}</Text>
            <Text style={styles.statLabel}>spots left</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{Math.round(progress.pct * 100)}%</Text>
            <Text style={styles.statLabel}>to launch</Text>
          </View>
        </View>

        <View style={styles.prizeRow} testID="trader-5000-prize">
          <View style={styles.prizeIcon}>
            <Trophy size={13} color="#0B1220" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.prizeTitle}>Member #5,000 Earns the Founder Recognition Tier</Text>
            <Text style={styles.prizeBody}>
              The 5,000th member receives 1,000,000 pts + a lifetime Founder badge. No purchase necessary. Void where prohibited.
            </Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginTop: 12 },
  card: { borderRadius: 18, padding: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: Colors.orange,
    alignItems: "center", justifyContent: "center",
  },
  eyebrow: { color: "rgba(255,255,255,0.7)", fontSize: 9.5, fontWeight: "900", letterSpacing: 0.7 },
  title: { color: "#fff", fontSize: 16, fontWeight: "900", marginTop: 1, letterSpacing: -0.3 },
  cta: {
    backgroundColor: Colors.orange,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
  },
  ctaText: { color: "#fff", fontSize: 12, fontWeight: "900" },

  barTrack: {
    height: 8, borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    marginTop: 14, overflow: "hidden",
  },
  barFill: {
    height: 8,
    backgroundColor: Colors.emerald,
    borderRadius: 999,
  },

  statsRow: {
    flexDirection: "row", alignItems: "center",
    marginTop: 12,
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 12, paddingVertical: 10,
  },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statDivider: { width: 1, height: 26, backgroundColor: "rgba(255,255,255,0.12)" },
  statValue: { color: "#fff", fontSize: 15, fontWeight: "900" },
  statLabel: { color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: "700" },

  prizeRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginTop: 10,
    backgroundColor: "rgba(250, 204, 21, 0.14)",
    borderWidth: 1, borderColor: "rgba(250, 204, 21, 0.45)",
    borderRadius: 12, padding: 10,
  },
  prizeIcon: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: Colors.yellow,
    alignItems: "center", justifyContent: "center",
  },
  prizeTitle: { color: "#FDE68A", fontSize: 12.5, fontWeight: "900", letterSpacing: -0.1 },
  prizeBody: { color: "rgba(255,255,255,0.78)", fontSize: 11, fontWeight: "600", marginTop: 2, lineHeight: 15 },
});
