import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
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
import { getOrAssignJoinVariant, type JoinVariant } from "@/utils/abTest";
import JoinSponsorReel from "@/components/JoinSponsorReel";
import NDAModal from "@/components/NDAModal";

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function autoHandleFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const clean = local.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 14);
  if (clean.length >= 2) return clean.toLowerCase();
  return `tort-${Math.floor(Math.random() * 9999)}`;
}

export default function JoinScreen(): React.ReactElement {
  const router = useRouter();
  const params = useLocalSearchParams<{ ref?: string; v?: string }>();
  const { user, pendingRef, applyPendingRef, registerUser } = useApp();

  const incomingCode = useMemo(
    () => normalizeRefCode(typeof params.ref === "string" ? params.ref : null),
    [params.ref],
  );

  const code = incomingCode ?? pendingRef ?? null;
  const isReturning = !!user.handle && user.onboarded === true;

  const [variant, setVariant] = useState<JoinVariant | null>(null);
  const [email, setEmail] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [ndaVisible, setNdaVisible] = useState<boolean>(false);

  const fade = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(28)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // ?v=A or ?v=B forces variant for QA, otherwise random 50/50 (persisted).
    const forced = typeof params.v === "string" ? params.v.toUpperCase() : "";
    if (forced === "A" || forced === "B") {
      setVariant(forced as JoinVariant);
      return;
    }
    getOrAssignJoinVariant().then(setVariant).catch(() => setVariant("A"));
  }, [params.v]);

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

  const proceedClaim = () => {
    if (isReturning) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      router.replace("/(tabs)");
      return;
    }

    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      setError("Enter a valid email to claim your bonus.");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      }
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      registerUser({
        handle: autoHandleFromEmail(trimmed),
        email: trimmed,
        source: code ? "referral" : "join-link",
        referredBy: code ?? undefined,
        variant: variant ?? undefined,
      });
      console.log("[Join] submitted", { variant, hasRef: !!code });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      router.replace("/(tabs)");
    } catch (e) {
      console.log("[Join] register error", e);
      setSubmitting(false);
      setError("Something went wrong. Tap again.");
    }
  };

  const onClaim = () => {
    if (!isReturning) {
      const trimmed = email.trim();
      if (!isValidEmail(trimmed)) {
        setError("Enter a valid email to claim your bonus.");
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        }
        return;
      }
      setError("");
    }
    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => {});
    }
    setNdaVisible(true);
  };

  const onAgree = () => {
    setNdaVisible(false);
    proceedClaim();
  };

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

  // ── Variant B: frictionless one-tap. Minimal copy, no stats grid, instant CTA.
  if (variant === "B") {
    return (
      <View style={styles.wrap} testID="join-screen-b">
        <Stack.Screen options={{ headerShown: false }} />
        <LinearGradient
          colors={["#020617", "#0F172A", "#1D4ED8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Animated.View
            style={[styles.contentB, { opacity: fade, transform: [{ translateY: lift }] }]}
          >
            <Animated.View style={[styles.giftBubbleB, { transform: [{ scale: pulseScale }] }]}>
              <Gift size={36} color="#FDE68A" />
            </Animated.View>

            <Text style={styles.titleB}>
              +{REFERRAL_BONUS_INVITEE.toLocaleString()} pts
            </Text>
            <Text style={styles.subtitleB}>
              Drop your email. Claim instantly.
            </Text>

            {!isReturning ? (
              <TextInput
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (error) setError("");
                }}
                placeholder="you@email.com"
                placeholderTextColor="rgba(255,255,255,0.55)"
                style={styles.emailInputB}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                returnKeyType="go"
                onSubmitEditing={onClaim}
                autoFocus
                testID="join-email"
              />
            ) : null}

            {error ? <Text style={styles.errText}>{error}</Text> : null}

            <Pressable
              onPress={onClaim}
              disabled={submitting}
              style={[styles.ctaB, submitting && styles.ctaDisabled]}
              testID="join-claim"
            >
              {submitting ? (
                <ActivityIndicator color="#0B1220" />
              ) : (
                <Text style={styles.ctaTextB}>
                  {isReturning ? "Open Tort Market" : "Claim instantly"}
                </Text>
              )}
            </Pressable>

            <JoinSponsorReel />

            <Text style={styles.legalB}>18+ · Simulated points · No real money</Text>
          </Animated.View>
        </KeyboardAvoidingView>
        <NDAModal visible={ndaVisible} onClose={() => setNdaVisible(false)} onAgree={onAgree} />
      </View>
    );
  }

  // ── Variant A (control): full hero with stats and social proof.
  return (
    <View style={styles.wrap} testID="join-screen-a">
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={["#0B1220", "#1E3A8A", "#2563EB"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
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
            A friend invited you to Tort Market — the prediction market for mass tort cases.
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

          {!isReturning ? (
            <TextInput
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (error) setError("");
              }}
              placeholder="you@email.com"
              placeholderTextColor="rgba(255,255,255,0.55)"
              style={styles.emailInput}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              returnKeyType="go"
              onSubmitEditing={onClaim}
              testID="join-email"
            />
          ) : null}

          {error ? <Text style={styles.errText}>{error}</Text> : null}

          <Pressable
            onPress={onClaim}
            disabled={submitting}
            style={[styles.cta, submitting && styles.ctaDisabled]}
            testID="join-claim"
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText}>
                {isReturning ? "Open Tort Market" : "Claim my bonus →"}
              </Text>
            )}
          </Pressable>

          <JoinSponsorReel />

          <Text style={styles.legal}>
            By continuing you confirm you&apos;re 18+ and accept the Terms & Privacy.
            Simulated points, no real money.
          </Text>
        </Animated.View>
      </KeyboardAvoidingView>
      <NDAModal visible={ndaVisible} onClose={() => setNdaVisible(false)} onAgree={onAgree} />
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
  contentB: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 140,
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
  giftBubbleB: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "rgba(250, 204, 21, 0.18)",
    borderWidth: 1.5,
    borderColor: "rgba(250, 204, 21, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
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
  titleB: {
    color: "#fff",
    fontSize: 56,
    fontWeight: "900",
    letterSpacing: -2,
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
  subtitleB: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 28,
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
    marginTop: 22,
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
  emailInput: {
    alignSelf: "stretch",
    marginTop: 20,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.28)",
    paddingHorizontal: 18,
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  emailInputB: {
    alignSelf: "stretch",
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.32)",
    paddingHorizontal: 22,
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  errText: {
    color: "#FCA5A5",
    fontSize: 12.5,
    fontWeight: "700",
    marginTop: 10,
    alignSelf: "flex-start",
  },
  cta: {
    marginTop: 14,
    alignSelf: "stretch",
    height: 56,
    borderRadius: 18,
    backgroundColor: Colors.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaB: {
    marginTop: 14,
    alignSelf: "stretch",
    height: 64,
    borderRadius: 20,
    backgroundColor: "#FDE68A",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FDE68A",
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "900", letterSpacing: 0.3 },
  ctaTextB: { color: "#0B1220", fontSize: 18, fontWeight: "900", letterSpacing: 0.3 },
  legal: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 14,
    textAlign: "center",
    paddingHorizontal: 6,
    lineHeight: 16,
  },
  legalB: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 18,
    textAlign: "center",
  },
});
