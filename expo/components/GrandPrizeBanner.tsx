import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Trophy, Sparkles } from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { WEEKLY_GRAND_PRIZE } from "@/providers/AppProvider";

function getTimeToSundayMidnight(): { d: number; h: number; m: number; s: number } {
  const now = new Date();
  const end = new Date(now);
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
  end.setDate(now.getDate() + daysUntilSunday);
  end.setHours(23, 59, 59, 999);
  const diff = Math.max(0, end.getTime() - now.getTime());
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { d, h, m, s };
}

export default function GrandPrizeBanner(): React.ReactElement {
  const [now, setNow] = useState<number>(Date.now());
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const t = useMemo(() => getTimeToSundayMidnight(), [now]);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  return (
    <View style={styles.outer} testID="grand-prize-banner">
      <LinearGradient
        colors={["#0B1220", "#1E293B", "#7C3AED"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.wrap}
      >
        <View style={styles.headerRow}>
          <View style={styles.badge}>
            <Sparkles size={10} color={Colors.yellow} />
            <Text style={styles.badgeText}>BETA · WEEK 1</Text>
          </View>
          <Animated.View style={[styles.liveDot, { transform: [{ scale }] }]}>
            <View style={styles.dot} />
            <Text style={styles.liveText}>LIVE</Text>
          </Animated.View>
        </View>

        <View style={styles.mainRow}>
          <View style={styles.trophy}>
            <Trophy size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Weekly Grand Prize</Text>
            <Text style={styles.amount}>{WEEKLY_GRAND_PRIZE.toLocaleString()} pts</Text>
            <Text style={styles.sub}>Top forecaster this week · earns sponsor recognition tier · no purchase necessary</Text>
          </View>
        </View>

        <View style={styles.timerRow}>
          <TimerBox value={t.d} label="DAYS" />
          <Text style={styles.colon}>:</Text>
          <TimerBox value={t.h} label="HRS" />
          <Text style={styles.colon}>:</Text>
          <TimerBox value={t.m} label="MIN" />
          <Text style={styles.colon}>:</Text>
          <TimerBox value={t.s} label="SEC" />
        </View>
      </LinearGradient>
    </View>
  );
}

function TimerBox({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.tBox}>
      <Text style={styles.tValue}>{String(value).padStart(2, "0")}</Text>
      <Text style={styles.tLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { paddingHorizontal: 16, marginTop: 12 },
  wrap: {
    borderRadius: 20,
    padding: 16,
    overflow: "hidden",
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(245,158,11,0.18)",
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.5)",
  },
  badgeText: { color: Colors.yellow, fontSize: 10, fontWeight: "900", letterSpacing: 0.6 },
  liveDot: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(239,68,68,0.2)",
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.red },
  liveText: { color: "#fff", fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },

  mainRow: { flexDirection: "row", gap: 14, marginTop: 14, alignItems: "center" },
  trophy: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
  },
  label: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" },
  amount: { color: "#fff", fontSize: 28, fontWeight: "900", letterSpacing: -0.5, marginTop: 2 },
  sub: { color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: "600", marginTop: 2 },

  timerRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
    marginTop: 14,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 12,
    paddingVertical: 10,
  },
  tBox: { alignItems: "center", minWidth: 44 },
  tValue: { color: "#fff", fontSize: 20, fontWeight: "900", fontVariant: ["tabular-nums"] },
  tLabel: { color: "rgba(255,255,255,0.6)", fontSize: 9, fontWeight: "800", letterSpacing: 0.8, marginTop: 1 },
  colon: { color: "rgba(255,255,255,0.4)", fontSize: 18, fontWeight: "900", marginTop: -10 },
});
