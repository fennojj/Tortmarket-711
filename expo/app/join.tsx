import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Gift, Sparkles, Trophy, Users, Zap } from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { useApp } from "@/providers/AppProvider";
import {
  REFERRAL_BONUS_INVITEE,
  normalizeRefCode,
} from "@/utils/referrals";

export default function JoinScreen(): React.ReactElement {
  const router = useRouter();
  const params = useLocalSearchParams<{ ref?: string }>();
  const { user, pendingRef, applyPendingRef } = useApp();

  const incomingCode = useMemo(
    () => normalizeRefCode(typeof params.ref === "string" ? params.ref : null),
    [params.ref],
  );

  const code = incomingCode ?? pendingRef ?? null;

  const fade = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(28)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(lift, {
        toValue: 0,
        duration: 460,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, useNativeDriver: true }),
      ]),
    ).start();
  }, [fade, lift, pulse]);

  useEffect(() => {
    if (incomingCode) {
      applyPendingRef(incomingCode).catch((e) => console.log("[Join] apply ref error", e));
    }
  }, [incomingCode, applyPendingRef]);

  const onClaim = () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    router.replace("/(tabs)");
  };

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const isReturning = !!user.handle && user.handle.length > 0;

  return (
    <View style={styles.wrap} testID="join-screen">
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={["#0B1220", "#1E3A8A", "#2563EB"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={[styles.content, { opacity: fade, transform: [{ translateY: lift }] }]}
      >
        <Animated.View style={[styles.giftBubble, { transform: [{ scale: pulseScale }] }]}>
          <Gift size={42} color="#fff" />
        </Animated.View>

        <View style={styles.eyebrowPill}>
          <Sparkles size={11} color="#FDE68A" />
          <Text style={styles.eyebrowText}>YOU&apos;VE BEEN GIFTED</Text>
        </View>

        <Text style={styles.title}>
          +{REFERRAL_BONUS_INVITEE.toLocaleString()} bonus points
        </Text>
        <Text style={styles.subtitle}>
          A friend invited you to Tort Site — the prediction market for mass tort cases.
          Their gift stacks on top of your 25,000 welcome bonus.
        </Text>

        {code ? (
          <View style={styles.codeChip} testID="join-code-chip">
            <Text style={styles.codeChipLabel}>INVITE CODE</Text>
            <Text style={styles.codeChipValue}>{code}</Text>
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <Stat icon={<Zap size={14} color="#FDE68A" />} value="30,000" label="total points" />
          <View style={styles.statDivider} />
          <Stat icon={<Trophy size={14} color="#FDE68A" />} value="70+" label="live markets" />
          <View style={styles.statDivider} />
          <Stat icon={<Users size={14} color="#fff" />} value="1.2K+" label="traders" />
        </View>

        <Pressable onPress={onClaim} style={styles.cta} testID="join-claim">
          <Text style={styles.ctaText}>
            {isReturning ? "Open Tort Site" : "Claim my bonus →"}
          </Text>
        </Pressable>

        <Text style={styles.legal}>
          Proof of concept · simulated points, no real money.
        </Text>
      </Animated.View>
    </View>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.stat}>
      {icon}
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#0B1220" },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 96,
    paddingBottom: 40,
    alignItems: "center",
  },
  giftBubble: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: "rgba(250, 204, 21, 0.22)",
    borderWidth: 1.5,
    borderColor: "rgba(250, 204, 21, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  eyebrowPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(250, 204, 21, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(250, 204, 21, 0.45)",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
  },
  eyebrowText: {
    color: "#FDE68A",
    fontSize: 10.5,
    fontWeight: "900",
    letterSpacing: 1,
  },
  title: {
    color: "#fff",
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: -1,
    marginTop: 14,
    textAlign: "center",
  },
  subtitle: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 14.5,
    fontWeight: "600",
    lineHeight: 21,
    textAlign: "center",
    marginTop: 10,
    paddingHorizontal: 4,
  },
  codeChip: {
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 12,
    alignItems: "center",
  },
  codeChipLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  codeChipValue: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 3,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 26,
    backgroundColor: "rgba(0,0,0,0.28)",
    borderRadius: 16,
    padding: 14,
    alignSelf: "stretch",
  },
  stat: { flex: 1, alignItems: "center", gap: 4 },
  statDivider: { width: 1, height: 34, backgroundColor: "rgba(255,255,255,0.18)" },
  statValue: { color: "#fff", fontSize: 16, fontWeight: "900" },
  statLabel: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  cta: {
    marginTop: 28,
    alignSelf: "stretch",
    height: 56,
    borderRadius: 18,
    backgroundColor: Colors.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "900", letterSpacing: 0.3 },
  legal: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 14,
    textAlign: "center",
  },
});
