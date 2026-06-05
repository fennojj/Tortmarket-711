import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Flame, Gift, ShieldCheck, Crown, Gem } from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { DAILY_BASE_REWARD, useApp } from "@/providers/AppProvider";

function usePulse(active: boolean): Animated.Value {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!active) { anim.setValue(1); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1.08, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, anim]);
  return anim;
}

function useShake(trigger: boolean): Animated.Value {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!trigger) return;
    Animated.sequence([
      Animated.timing(anim, { toValue: -4, duration: 60, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 4, duration: 60, useNativeDriver: true }),
      Animated.timing(anim, { toValue: -3, duration: 60, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 3, duration: 60, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [trigger, anim]);
  return anim;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getStreakMilestone(streak: number): { label: string; icon: React.ReactElement } | null {
  if (streak >= 30) return { label: "30-Day Legend", icon: <Crown size={13} color={Colors.yellow} /> };
  if (streak >= 14) return { label: "14-Day Diamond", icon: <Gem size={13} color={Colors.blue} /> };
  if (streak >= 7) return { label: "7-Day Inferno", icon: <Flame size={13} color={Colors.orange} /> };
  if (streak >= 3) return { label: "On Fire", icon: <ShieldCheck size={13} color={Colors.emerald} /> };
  return null;
}

export default function DailyClaimCard(): React.ReactElement {
  const { user, canClaimDaily, claimDaily } = useApp();
  const streak = user.streakDays ?? 0;
  const [justClaimed, setJustClaimed] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<string>("");

  const isAtRisk = canClaimDaily && streak > 0;

  const nextReward = useMemo(() => {
    const nextStreak = canClaimDaily ? Math.min((streak ?? 0) + 1, 7) : streak;
    const bonus = Math.min(Math.max(nextStreak - 1, 0), 6) * 250;
    return DAILY_BASE_REWARD + bonus;
  }, [canClaimDaily, streak]);

  // Countdown to next day midnight when already claimed
  useEffect(() => {
    if (canClaimDaily) { setCountdown(""); return; }
    const tick = () => {
      const now = Date.now();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      setCountdown(formatCountdown(tomorrow.getTime() - now));
    };
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [canClaimDaily]);

  const pulseAnim = usePulse(isAtRisk && !justClaimed);
  const shakeAnim = useShake(justClaimed);

  const milestone = getStreakMilestone(streak);

  const onClaim = () => {
    const res = claimDaily();
    if (res.ok) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      setJustClaimed(true);
      setTimeout(() => setJustClaimed(false), 2_000);
    }
  };

  return (
    <View
      style={[styles.wrap, isAtRisk && styles.wrapAtRisk]}
      testID="daily-claim-card"
    >
      {isAtRisk && (
        <View style={styles.atRiskBanner}>
          <Flame size={12} color={Colors.orange} />
          <Text style={styles.atRiskText}>
            STREAK AT RISK — claim now to keep your {streak}-day streak!
          </Text>
        </View>
      )}

      <View style={styles.body}>
        <Animated.View
          style={[
            styles.streakCircle,
            isAtRisk && styles.streakCircleAtRisk,
            !canClaimDaily && styles.streakCircleClaimed,
            { transform: [{ scale: pulseAnim }, { translateX: shakeAnim }] },
          ]}
        >
          <Flame
            size={22}
            color={isAtRisk ? Colors.orange : !canClaimDaily ? Colors.emerald : Colors.textMuted}
          />
          <Text style={[
            styles.streakNum,
            isAtRisk && { color: Colors.orange },
            !canClaimDaily && streak > 0 && { color: Colors.emerald },
          ]}>
            {streak}
          </Text>
        </Animated.View>

        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Daily Drop</Text>
            {milestone && (
              <View style={styles.milestonePill}>
                {milestone.icon}
                <Text style={styles.milestoneText}>{milestone.label}</Text>
              </View>
            )}
          </View>

          {canClaimDaily ? (
            <Text style={styles.sub}>
              Claim <Text style={styles.subHighlight}>{nextReward.toLocaleString()} pts</Text>
              {streak > 0 ? ` · ${streak + 1 > 7 ? "max" : `day ${streak + 1}`} streak bonus` : " · start your streak"}
            </Text>
          ) : (
            <Text style={styles.sub}>
              Next drop in <Text style={styles.subHighlight}>{countdown || "..."}</Text>
              {streak > 0 ? ` · ${streak}d streak active 🔥` : ""}
            </Text>
          )}

          {justClaimed && (
            <Text style={styles.claimedFlash}>+{nextReward.toLocaleString()} pts added! 🎉</Text>
          )}
        </View>

        <Pressable
          onPress={onClaim}
          disabled={!canClaimDaily}
          style={[styles.btn, !canClaimDaily && styles.btnDisabled]}
          testID="daily-claim-btn"
        >
          <Gift size={14} color={canClaimDaily ? "#fff" : Colors.textMuted} />
          <Text style={[styles.btnText, !canClaimDaily && styles.btnTextDisabled]}>
            {canClaimDaily ? "Claim" : "Claimed"}
          </Text>
        </Pressable>
      </View>

      {streak >= 2 && (
        <View style={styles.streakRow}>
          {Array.from({ length: Math.min(streak, 7) }).map((_, i) => (
            <View key={i} style={[styles.streakDot, i < streak && styles.streakDotFilled]} />
          ))}
          {streak < 7 && Array.from({ length: 7 - streak }).map((_, i) => (
            <View key={`empty-${i}`} style={styles.streakDot} />
          ))}
          <Text style={styles.streakGoal}>{streak >= 7 ? "MAX STREAK" : `${7 - streak} more for max bonus`}</Text>
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
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  wrapAtRisk: {
    borderColor: Colors.orange,
    borderWidth: 1.5,
  },
  atRiskBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.orangeSoft,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#FFC89A",
  },
  atRiskText: {
    color: Colors.orange,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.2,
    flex: 1,
  },
  body: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  streakCircle: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  streakCircleAtRisk: {
    backgroundColor: Colors.orangeSoft,
    borderColor: Colors.orange,
  },
  streakCircleClaimed: {
    backgroundColor: Colors.emeraldSoft,
    borderColor: Colors.emerald,
  },
  streakNum: {
    color: Colors.textMuted,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 16,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 7, flexWrap: "wrap" },
  title: { color: Colors.text, fontSize: 14, fontWeight: "900" },
  milestonePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  milestoneText: { color: Colors.textSecondary, fontSize: 10, fontWeight: "800" },
  sub: { color: Colors.textSecondary, fontSize: 12, fontWeight: "600", marginTop: 3 },
  subHighlight: { color: Colors.text, fontWeight: "900" },
  claimedFlash: {
    color: Colors.emerald,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 3,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 11,
    backgroundColor: Colors.text,
  },
  btnDisabled: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  btnTextDisabled: { color: Colors.textMuted },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 2,
  },
  streakDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  streakDotFilled: {
    backgroundColor: Colors.orange,
    borderColor: Colors.orange,
  },
  streakGoal: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 4,
    flex: 1,
  },
});
