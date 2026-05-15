import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { useApp } from "@/providers/AppProvider";
import { Gavel, Sparkles, ShieldCheck, X, TrendingUp, Trophy, Zap, Users, Gift } from "lucide-react-native";
import { REFERRAL_BONUS_INVITEE } from "@/utils/referrals";

const PRIVACY_URL = "https://tort-market.com/privacy";
const TERMS_URL = "https://tort-market.com/terms";

function autoHandleFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const clean = local.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 14);
  if (clean.length >= 2) return clean.toLowerCase();
  return `tort-${Math.floor(Math.random() * 9999)}`;
}

const MEMBER_COUNT = 1247;
const ACTIVE_NOW = 94;

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function ValuePropStep({ onNext }: { onNext: () => void }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <View style={styles.pocPill}>
        <Sparkles size={11} color="#8A5A00" />
        <Text style={styles.pocText}>PROOF OF CONCEPT · NO REAL MONEY</Text>
      </View>

      <Text style={styles.title}>The prediction market for mass torts</Text>
      <Text style={styles.subtitle}>
        Trade on how 70+ active MDL cases will resolve. Sharpen your legal edge. Win points. Climb the board.
      </Text>

      <View style={styles.socialProofRow}>
        <View style={styles.socialProofItem}>
          <Users size={14} color={Colors.blue} />
          <Text style={styles.socialProofVal}>{MEMBER_COUNT.toLocaleString()}</Text>
          <Text style={styles.socialProofLabel}>beta members</Text>
        </View>
        <View style={styles.socialDivider} />
        <View style={styles.socialProofItem}>
          <View style={styles.activeDot} />
          <Text style={styles.socialProofVal}>{ACTIVE_NOW}</Text>
          <Text style={styles.socialProofLabel}>forecasting now</Text>
        </View>
        <View style={styles.socialDivider} />
        <View style={styles.socialProofItem}>
          <TrendingUp size={14} color={Colors.emerald} />
          <Text style={styles.socialProofVal}>70</Text>
          <Text style={styles.socialProofLabel}>live markets</Text>
        </View>
      </View>

      <View style={styles.featureList}>
        <FeatureRow
          icon={<Zap size={15} color={Colors.orange} />}
          title="25,000 starter points"
          body="Dropped instantly when you join. No purchase required."
        />
        <FeatureRow
          icon={<TrendingUp size={15} color={Colors.emerald} />}
          title="AI-powered edge model"
          body="TortCoach blends Daubert strength, MDL sentiment & corporate reserves into a real-time fair value."
        />
        <FeatureRow
          icon={<Trophy size={15} color={Colors.yellow} />}
          title="Leaderboard thrones"
          body="Earn titles for dominating each market. Throne holders get broadcast visibility."
        />
      </View>

      <Pressable onPress={onNext} style={styles.cta} testID="onboarding-next">
        <Text style={styles.ctaText}>Claim Your Seat →</Text>
      </Pressable>

      <Text style={styles.spotsHint}>⚡ Claiming spots now — {MEMBER_COUNT.toLocaleString()} members joined</Text>
    </Animated.View>
  );
}

function FeatureRow({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureBody}>{body}</Text>
      </View>
    </View>
  );
}

function RegisterStep({ onBack }: { onBack: () => void }) {
  const { registerUser, pendingRef } = useApp();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const onJoin = () => {
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) return setError("Enter a valid email.");
    setError("");
    registerUser({
      handle: autoHandleFromEmail(trimmed),
      email: trimmed,
      source: pendingRef ? "referral" : "onboarding",
      referredBy: pendingRef ?? undefined,
    });
  };

  const skip = () => {
    registerUser({
      handle: `guest-${Math.floor(Math.random() * 9999)}`,
      email: "guest@tortsite.app",
      source: "skipped",
      referredBy: pendingRef ?? undefined,
    });
  };

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <View style={styles.regHeader}>
        <Pressable onPress={onBack} style={styles.backBtn} testID="onboarding-back">
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Pressable onPress={skip} hitSlop={12} testID="onboarding-skip">
          <X size={20} color={Colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.pocPill}>
        <Gavel size={11} color="#8A5A00" />
        <Text style={styles.pocText}>STEP 2 OF 2 · REGISTER</Text>
      </View>

      <Text style={styles.title}>One last step</Text>
      <Text style={styles.subtitle}>
        Just your email. Your 25,000 welcome bonus drops instantly. No password, no credit card.
      </Text>

      {pendingRef ? (
        <View style={styles.refBanner} testID="onboarding-ref-banner">
          <View style={styles.refIcon}>
            <Gift size={14} color={Colors.emerald} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.refTitle}>Invite code applied: {pendingRef}</Text>
            <Text style={styles.refSub}>+{REFERRAL_BONUS_INVITEE.toLocaleString()} bonus points on top of your welcome bonus</Text>
          </View>
        </View>
      ) : null}

      <Text style={styles.label}>Email</Text>
      <TextInput
        value={email}
        onChangeText={(t) => { setEmail(t); if (error) setError(""); }}
        placeholder="you@email.com"
        placeholderTextColor={Colors.textMuted}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        returnKeyType="go"
        onSubmitEditing={onJoin}
        autoFocus
        testID="onboarding-email"
      />

      {error ? <Text style={styles.err}>{error}</Text> : null}

      <Pressable
        onPress={onJoin}
        style={styles.cta}
        testID="onboarding-submit"
      >
        <Sparkles size={15} color="#fff" />
        <Text style={styles.ctaText}>Join & Claim 25,000 pts</Text>
      </Pressable>

      <View style={styles.privacyRow}>
        <ShieldCheck size={12} color={Colors.textMuted} />
        <Text style={styles.privacy}>
          By continuing you confirm you&apos;re 18+ and accept the Terms & Privacy. Unsubscribe anytime.
        </Text>
      </View>

      <View style={styles.legalRow}>
        <Pressable onPress={() => Linking.openURL(TERMS_URL)} hitSlop={8}>
          <Text style={styles.legalLink}>Terms</Text>
        </Pressable>
        <Text style={styles.legalSep}>·</Text>
        <Pressable onPress={() => Linking.openURL(PRIVACY_URL)} hitSlop={8}>
          <Text style={styles.legalLink}>Privacy</Text>
        </Pressable>
        <Text style={styles.legalSep}>·</Text>
        <Text style={styles.legalNote}>Play-money only · No cash value</Text>
      </View>
    </Animated.View>
  );
}

export default function OnboardingModal(): React.ReactElement | null {
  const { user } = useApp();
  const visible = !user.onboarded;
  const [step, setStep] = useState<"value" | "register">("value");

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="auto" testID="onboarding-overlay">
      <SafeAreaView style={styles.backdrop} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.sheetWrap}
        >
          <ScrollView
            style={styles.sheet}
            contentContainerStyle={styles.sheetContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {step === "value" ? (
              <ValuePropStep onNext={() => setStep("register")} />
            ) : (
              <RegisterStep onBack={() => setStep("value")} />
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: Colors.bg,
    zIndex: 9999,
  },
  backdrop: { flex: 1, backgroundColor: Colors.bg },
  sheetWrap: { width: "100%", flex: 1 },
  sheet: {
    backgroundColor: Colors.bg,
    flex: 1,
  },
  sheetContent: { padding: 22, paddingBottom: 44 },

  pocPill: {
    alignSelf: "flex-start",
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#FFF5D6",
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
    marginTop: 16,
  },
  pocText: { color: "#8A5A00", fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },

  title: { color: Colors.text, fontSize: 26, fontWeight: "900", marginTop: 10, letterSpacing: -0.5, lineHeight: 32 },
  subtitle: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 8 },

  socialProofRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16, padding: 14,
    marginTop: 18,
    borderWidth: 1, borderColor: Colors.border,
  },
  socialProofItem: { flex: 1, alignItems: "center", gap: 3 },
  socialProofVal: { color: Colors.text, fontSize: 18, fontWeight: "900" },
  socialProofLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: "700" },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.emerald },
  socialDivider: { width: 1, height: 36, backgroundColor: Colors.border },

  featureList: { marginTop: 20, gap: 14 },
  featureRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  featureIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.border, flexShrink: 0,
  },
  featureTitle: { color: Colors.text, fontSize: 14, fontWeight: "800" },
  featureBody: { color: Colors.textSecondary, fontSize: 12.5, lineHeight: 17, marginTop: 2 },

  cta: {
    marginTop: 22, backgroundColor: Colors.text,
    height: 54, borderRadius: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: 0.3 },

  spotsHint: { color: Colors.textMuted, fontSize: 11.5, fontWeight: "600", textAlign: "center", marginTop: 12 },

  regHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  backBtn: { paddingVertical: 4 },
  backText: { color: Colors.blue, fontSize: 14, fontWeight: "700" },

  label: { color: Colors.text, fontSize: 12, fontWeight: "800", marginTop: 18, marginBottom: 8, letterSpacing: 0.3 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12, paddingHorizontal: 14, height: 48,
    borderWidth: 1, borderColor: Colors.border,
    color: Colors.text, fontSize: 15, fontWeight: "600",
  },
  sourceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sourcePill: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  sourcePillActive: { backgroundColor: Colors.text, borderColor: Colors.text },
  sourceText: { color: Colors.textSecondary, fontSize: 12, fontWeight: "700" },
  sourceTextActive: { color: "#fff" },
  err: { color: Colors.red, fontSize: 12, fontWeight: "700", marginTop: 12 },

  privacyRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14, justifyContent: "center" },
  privacy: { color: Colors.textMuted, fontSize: 11, fontWeight: "600", flex: 1 },

  refBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: Colors.emeraldSoft,
    borderRadius: 12, padding: 12,
    marginTop: 14,
    borderWidth: 1, borderColor: "#86EFAC",
  },
  refIcon: {
    width: 28, height: 28, borderRadius: 9,
    backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
  },
  refTitle: { color: Colors.text, fontSize: 13, fontWeight: "800" },
  refSub: { color: Colors.textSecondary, fontSize: 11.5, fontWeight: "600", marginTop: 2 },

  ageRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginTop: 18, padding: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  ageText: { color: Colors.text, fontSize: 13, fontWeight: "700", flex: 1 },

  ctaDisabled: { opacity: 0.45 },

  legalRow: {
    flexDirection: "row", alignItems: "center", flexWrap: "wrap",
    justifyContent: "center", gap: 4, marginTop: 10, paddingHorizontal: 4,
  },
  legalLink: { color: Colors.blue, fontSize: 11, fontWeight: "700" },
  legalSep: { color: Colors.textMuted, fontSize: 11 },
  legalNote: { color: Colors.textMuted, fontSize: 11, fontWeight: "600" },
});
