import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Sparkles, X, ArrowRight } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { Colors } from "@/constants/colors";
import { useEngagement } from "@/providers/EngagementProvider";
import { useApp } from "@/providers/AppProvider";
import type { AgentAction } from "@/utils/agent";

function toneGradient(tone: AgentAction["tone"]): [string, string] {
  switch (tone) {
    case "celebrate":
      return ["#0B1220", "#1E3A8A"];
    case "urgent":
      return ["#7C2D12", "#B45309"];
    case "nudge":
      return ["#0F172A", "#312E81"];
    default:
      return ["#111827", "#374151"];
  }
}

export default function CoachCard(): React.ReactElement | null {
  const { topAction, signals, dismissAction } = useEngagement();
  const { claimDaily, claimWelcomeBonus } = useApp();

  if (!topAction) return null;

  const onPress = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => {});
    }
    console.log("[Coach] action pressed", topAction.id);
    if (topAction.kind === "claim_daily") {
      const r = claimDaily();
      console.log("[Coach] daily", r);
      return;
    }
    if (topAction.kind === "welcome" && topAction.id === "welcome-bonus") {
      const r = claimWelcomeBonus();
      console.log("[Coach] welcome bonus", r);
      return;
    }
    if (topAction.kind === "welcome") {
      router.push("/(tabs)/coach");
      return;
    }
    if (topAction.route) {
      router.push(topAction.route as never);
      return;
    }
    router.push("/(tabs)/coach");
  };

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={toneGradient(topAction.tone)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.topRow}>
          <View style={styles.agentChip}>
            <Sparkles size={11} color={Colors.yellow} />
            <Text style={styles.agentText}>TortCoach</Text>
          </View>
          <View style={styles.stateChip}>
            <Text style={styles.stateText}>
              {signals.state.toUpperCase()} · {signals.engagementScore.toFixed(0)}
            </Text>
          </View>
          <Pressable
            hitSlop={10}
            onPress={() => dismissAction(topAction.id)}
            style={styles.dismiss}
            testID={`coach-dismiss-${topAction.id}`}
          >
            <X size={14} color="rgba(255,255,255,0.7)" />
          </Pressable>
        </View>

        <Text style={styles.title}>{topAction.title}</Text>
        <Text style={styles.body}>{topAction.body}</Text>

        <Pressable onPress={onPress} style={styles.cta} testID={`coach-cta-${topAction.id}`}>
          <Text style={styles.ctaText}>{topAction.cta}</Text>
          <ArrowRight size={15} color={Colors.text} />
        </Pressable>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, marginTop: 12 },
  card: {
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  agentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  agentText: { color: "#fff", fontSize: 11, fontWeight: "800", letterSpacing: 0.4 },
  stateChip: {
    backgroundColor: "rgba(0,0,0,0.25)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stateText: { color: "rgba(255,255,255,0.85)", fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  dismiss: { marginLeft: "auto", padding: 4 },
  title: { color: "#fff", fontSize: 17, fontWeight: "900", letterSpacing: -0.3 },
  body: { color: "rgba(255,255,255,0.88)", fontSize: 13, lineHeight: 19, fontWeight: "500" },
  cta: {
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ctaText: { color: Colors.text, fontSize: 13, fontWeight: "800" },
});
