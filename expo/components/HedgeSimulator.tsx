import React, { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Sparkles, Gauge, Scale, Building2 } from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { useApp } from "@/providers/AppProvider";
import { getPlayCapacitySummary, getPlayPlanSummary } from "@/utils/playCapacity";
import type { Market } from "@/types";
import { useRouter } from "expo-router";

interface Props {
  market: Market;
}

export default function HedgeSimulator({ market }: Props) {
  const [wager, setWager] = useState<string>("1000"); // internal var name kept; UI uses 'Forecast size'
  const { user } = useApp();
  const router = useRouter();

  const probability = useMemo(() => {
    const score = market.mdlSentiment * 0.45 + market.daubertStrength * 0.35 + market.corporateReserves * 0.2;
    return Math.round(score);
  }, [market]);

  const recommendedSide = probability >= 50 ? "YES" : "NO";
  const recommendedPrice = recommendedSide === "YES" ? market.yesPrice : market.noPrice;
  const wagerNum = Math.max(0, parseInt(wager || "0", 10) || 0);
  const shares = Math.floor(wagerNum / Math.max(1, recommendedPrice));
  const potential = shares * 100;
  const profit = potential - wagerNum;
  const playCapacity = getPlayCapacitySummary(user.pointBalance);
  const playPlan = getPlayPlanSummary(user.pointBalance, wagerNum);

  const handleSim = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const openWager = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push({ pathname: "/wager", params: { id: market.id, side: recommendedSide, price: String(recommendedPrice), amount: String(wagerNum) } });
  };

  return (
    <View style={styles.card} testID="hedge-simulator">
      <View style={styles.headerRow}>
        <View style={styles.iconWrap}>
          <Sparkles size={16} color={Colors.orange} />
        </View>
        <Text style={styles.title}>Hedge Simulator</Text>
        <View style={styles.betaPill}>
          <Text style={styles.betaText}>3-FACTOR</Text>
        </View>
      </View>

      <Text style={styles.subtitle}>
        Real-time probability engine weighting MDL sentiment, Daubert rulings, and corporate financials.
      </Text>

      <View style={styles.factorRow}>
        <FactorBar icon={<Scale size={12} color={Colors.blue} />} label="MDL Sentiment" value={market.mdlSentiment} color={Colors.blue} />
        <FactorBar icon={<Gauge size={12} color={Colors.orange} />} label="Daubert Strength" value={market.daubertStrength} color={Colors.orange} />
        <FactorBar icon={<Building2 size={12} color={Colors.emerald} />} label="Corp. Reserves" value={market.corporateReserves} color={Colors.emerald} />
      </View>

      <View style={styles.inputRow}>
        <Text style={styles.inputLabel}>Forecast</Text>
        <View style={styles.inputBox}>
          <TextInput
            testID="hedge-wager-input"
            value={wager}
            onChangeText={(t) => setWager(t.replace(/[^0-9]/g, ""))}
            keyboardType="numeric"
            placeholder="1000"
            placeholderTextColor={Colors.textMuted}
            style={styles.input}
          />
          <Text style={styles.inputSuffix}>pts</Text>
        </View>
        <Pressable onPress={handleSim} style={styles.simBtn} testID="hedge-simulate-btn">
          <Text style={styles.simBtnText}>Simulate</Text>
        </Pressable>
      </View>

      <View style={styles.capacityCard}>
        <Text style={styles.capacityTitle}>Play Capacity</Text>
        <Text style={styles.capacityText}>
          With {user.pointBalance.toLocaleString()} points, you can make {playCapacity.maxPlays.toLocaleString()} standard plays at {playCapacity.suggestedPlaySize.toLocaleString()} pts each.
        </Text>
        <View style={styles.capacityRow}>
          <View style={styles.capacityCell}>
            <Text style={styles.capacityLabel}>Std plays</Text>
            <Text style={styles.capacityValue}>{playCapacity.maxPlays.toLocaleString()}</Text>
          </View>
          <View style={styles.capacityCell}>
            <Text style={styles.capacityLabel}>Whale plays</Text>
            <Text style={styles.capacityValue}>{playCapacity.whalePlays.toLocaleString()}</Text>
          </View>
          <View style={styles.capacityCell}>
            <Text style={styles.capacityLabel}>After this play</Text>
            <Text style={styles.capacityValue}>{playPlan.additionalEqualPlays.toLocaleString()}</Text>
          </View>
        </View>
        <Text style={styles.capacityHint}>
          Remaining balance after this forecast: {playPlan.remainingBalance.toLocaleString()} pts · minimum-entry plays left: {playPlan.minimumEntryPlays.toLocaleString()}.
        </Text>
      </View>

      <View style={styles.resultCard}>
        <View style={styles.resultHeader}>
          <Text style={styles.resultLabel}>Predicted Outcome</Text>
          <View style={[styles.sideBadge, { backgroundColor: recommendedSide === "YES" ? Colors.emeraldSoft : Colors.redSoft }]}>
            <Text style={[styles.sideBadgeText, { color: recommendedSide === "YES" ? Colors.emerald : Colors.red }]}>
              FORECAST {recommendedSide}
            </Text>
          </View>
        </View>
        <Text style={styles.resultText}>
          Simulator predicts a{" "}
          <Text style={[styles.resultHighlight, { color: recommendedSide === "YES" ? Colors.emerald : Colors.red }]}>
            {recommendedSide === "YES" ? probability : 100 - probability}%
          </Text>{" "}
          chance of{" "}
          {recommendedSide === "YES" ? "plaintiff settlement / victory" : "defense win / dismissal"}.
        </Text>
        <Text style={styles.resultText}>
          Suggested hedge: Buy{" "}
          <Text style={styles.resultHighlight}>
            &apos;{recommendedSide}&apos; at {recommendedPrice}¢
          </Text>
          .
        </Text>

        <View style={styles.calcRow}>
          <View style={styles.calcCell}>
            <Text style={styles.calcLabel}>Shares</Text>
            <Text style={styles.calcValue}>{shares.toLocaleString()}</Text>
          </View>
          <View style={styles.calcCell}>
            <Text style={styles.calcLabel}>If win</Text>
            <Text style={[styles.calcValue, { color: Colors.emerald }]}>{potential.toLocaleString()}</Text>
          </View>
          <View style={styles.calcCell}>
            <Text style={styles.calcLabel}>Net profit</Text>
            <Text style={[styles.calcValue, { color: profit >= 0 ? Colors.emerald : Colors.red }]}>
              {profit >= 0 ? "+" : ""}
              {profit.toLocaleString()}
            </Text>
          </View>
        </View>

        <Pressable onPress={openWager} style={styles.placeBtn} testID="place-forecast-btn">
          <Text style={styles.placeBtnText}>Make Forecast →</Text>
        </Pressable>
      </View>
    </View>
  );
}

function FactorBar({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <View style={styles.factorItem}>
      <View style={styles.factorHeader}>
        {icon}
        <Text style={styles.factorLabel}>{label}</Text>
        <Text style={[styles.factorValue, { color }]}>{value}</Text>
      </View>
      <View style={styles.factorTrack}>
        <View style={[styles.factorFill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconWrap: {
    width: 28, height: 28, borderRadius: 10,
    backgroundColor: Colors.orangeSoft,
    alignItems: "center", justifyContent: "center",
  },
  title: { color: Colors.text, fontSize: 17, fontWeight: "800", flex: 1 },
  betaPill: { backgroundColor: Colors.text, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  betaText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  subtitle: { color: Colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 6, marginBottom: 14 },

  factorRow: { gap: 10, marginBottom: 14 },
  factorItem: {},
  factorHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  factorLabel: { flex: 1, color: Colors.textSecondary, fontSize: 12, fontWeight: "700" },
  factorValue: { fontSize: 12, fontWeight: "800" },
  factorTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.surface, overflow: "hidden" },
  factorFill: { height: "100%", borderRadius: 3 },

  inputRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  inputLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: "700", width: 50 },
  inputBox: {
    flex: 1, flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.surface, borderRadius: 12,
    paddingHorizontal: 12, height: 42,
    borderWidth: 1, borderColor: Colors.border,
  },
  input: { flex: 1, fontSize: 15, fontWeight: "700", color: Colors.text },
  inputSuffix: { color: Colors.textMuted, fontSize: 12, fontWeight: "700" },
  simBtn: {
    height: 42, paddingHorizontal: 16, borderRadius: 12,
    backgroundColor: Colors.text, alignItems: "center", justifyContent: "center",
  },
  simBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },

  capacityCard: {
    backgroundColor: Colors.blueSoft,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  capacityTitle: { color: Colors.text, fontSize: 13, fontWeight: "800", marginBottom: 6 },
  capacityText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 18 },
  capacityRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  capacityCell: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 12,
    padding: 10,
  },
  capacityLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  capacityValue: { color: Colors.text, fontSize: 16, fontWeight: "800", marginTop: 2 },
  capacityHint: { color: Colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 10 },
  resultCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resultHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  resultLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" },
  sideBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  sideBadgeText: { fontSize: 11, fontWeight: "800" },
  resultText: { color: Colors.text, fontSize: 14, lineHeight: 20, fontWeight: "500" },
  resultHighlight: { fontWeight: "800", color: Colors.text },

  calcRow: {
    flexDirection: "row",
    marginTop: 12,
    backgroundColor: Colors.bg,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  calcCell: { flex: 1 },
  calcLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  calcValue: { color: Colors.text, fontSize: 15, fontWeight: "800", marginTop: 2 },

  placeBtn: {
    marginTop: 12,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  placeBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
});
