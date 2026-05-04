import React, { useMemo, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { useApp } from "@/providers/AppProvider";
import { useMarkets } from "@/providers/MarketsProvider";
import SponsorSlot from "@/components/SponsorSlot";

const QUICK = [500, 1000, 5000, 10000];

export default function ForecastScreen(): React.ReactElement {
  const { id, side: initialSide, price: initialPrice, amount: initialAmount } = useLocalSearchParams<{
    id: string; side?: "YES" | "NO"; price?: string; amount?: string;
  }>();
  const router = useRouter();
  const { user, buyShares } = useApp();
  const { markets } = useMarkets();

  const market = useMemo(() => markets.find((m) => m.id === id), [id, markets]);
  const [side, setSide] = useState<"YES" | "NO">((initialSide as "YES" | "NO") ?? "YES");
  const [amount, setAmount] = useState<string>(initialAmount ?? "1000");

  if (!market) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: Colors.text }}>Market not found</Text>
      </View>
    );
  }

  const price = side === "YES" ? market.yesPrice : market.noPrice;
  const parsed = Math.max(0, parseInt(amount || "0", 10) || 0);
  const shares = Math.floor(parsed / Math.max(1, price));
  const potential = shares * 100;
  const profit = potential - parsed;

  void initialPrice;

  const onConfirm = () => {
    if (parsed <= 0) return;
    if (parsed > user.pointBalance) {
      Alert.alert("Not enough points", "Lower your forecast size or earn more points.");
      return;
    }
    const res = buyShares({ marketId: market.id, side, shares, priceCents: price });
    if (res.ok) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Forecast confirmed", `Bought ${shares.toLocaleString()} ${side} shares at ${price}¢.`, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } else {
      Alert.alert("Error", res.reason ?? "Could not confirm forecast");
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: "Make Forecast" }} />
      <View style={styles.wrap}>
        <SponsorSlot tier="banner" label="Forecast screen — top banner" style={{ marginHorizontal: 0 }} />
        <View style={styles.card}>
          <Text style={styles.label}>Market</Text>
          <Text style={styles.marketName}>{market.caseName}</Text>

          <View style={styles.sideRow}>
            <Pressable
              onPress={() => setSide("YES")}
              style={[styles.sideBtn, { backgroundColor: side === "YES" ? Colors.emerald : Colors.surface, borderColor: side === "YES" ? Colors.emerald : Colors.border }]}
              testID="side-yes"
            >
              <Text style={[styles.sideLabel, { color: side === "YES" ? "rgba(255,255,255,0.85)" : Colors.textMuted }]}>YES · Plaintiff</Text>
              <Text style={[styles.sidePrice, { color: side === "YES" ? "#fff" : Colors.emerald }]}>{market.yesPrice}¢</Text>
            </Pressable>
            <Pressable
              onPress={() => setSide("NO")}
              style={[styles.sideBtn, { backgroundColor: side === "NO" ? Colors.red : Colors.surface, borderColor: side === "NO" ? Colors.red : Colors.border }]}
              testID="side-no"
            >
              <Text style={[styles.sideLabel, { color: side === "NO" ? "rgba(255,255,255,0.85)" : Colors.textMuted }]}>NO · Defense</Text>
              <Text style={[styles.sidePrice, { color: side === "NO" ? "#fff" : Colors.red }]}>{market.noPrice}¢</Text>
            </Pressable>
          </View>

          <Text style={[styles.label, { marginTop: 18 }]}>Amount</Text>
          <View style={styles.amountBox}>
            <TextInput
              testID="wager-amount-input"
              value={amount}
              onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ""))}
              keyboardType="numeric"
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
            />
            <Text style={styles.amountSuffix}>pts</Text>
          </View>

          <View style={styles.quickRow}>
            {QUICK.map((q) => (
              <Pressable key={q} onPress={() => setAmount(String(q))} style={styles.quickChip} testID={`quick-${q}`}>
                <Text style={styles.quickText}>{q.toLocaleString()}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setAmount(String(user.pointBalance))} style={[styles.quickChip, styles.quickMax]} testID="quick-max">
              <Text style={[styles.quickText, { color: "#fff" }]}>MAX</Text>
            </Pressable>
          </View>

          <View style={styles.summary}>
            <Row label="Shares" value={shares.toLocaleString()} />
            <Row label="Price per share" value={`${price}¢`} />
            <Row label="Points if correct" value={potential.toLocaleString()} accent={Colors.emerald} />
            <Row label="Net points gained" value={`${profit >= 0 ? "+" : ""}${profit.toLocaleString()}`} accent={profit >= 0 ? Colors.emerald : Colors.red} />
            <View style={styles.sep} />
            <Row label="Balance after" value={(user.pointBalance - parsed).toLocaleString()} />
          </View>

          <Pressable onPress={onConfirm} style={styles.confirmBtn} testID="confirm-forecast">
            <Text style={styles.confirmText}>Confirm · Buy {shares.toLocaleString()} {side}</Text>
          </Pressable>
        </View>
        <SponsorSlot tier="sticky" label="Below confirm — sticky banner" style={{ marginHorizontal: 0 }} />
        <SponsorSlot tier="native" label="Post-forecast sponsor card" style={{ marginHorizontal: 0 }} />
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>Play-money points only · No cash value · No purchases · Not legal advice</Text>
        </View>
      </View>
    </>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, accent ? { color: accent } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.bg, padding: 16 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bg },
  card: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: Colors.border,
  },
  label: { color: Colors.textMuted, fontSize: 11, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" },
  marketName: { color: Colors.text, fontSize: 17, fontWeight: "800", marginTop: 4, lineHeight: 22 },
  sideRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  sideBtn: {
    flex: 1, padding: 14, borderRadius: 14,
    borderWidth: 2,
  },
  sideLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },
  sidePrice: { fontSize: 22, fontWeight: "900", marginTop: 4 },

  amountBox: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.surface, borderRadius: 14,
    paddingHorizontal: 16, height: 56, marginTop: 6,
    borderWidth: 1, borderColor: Colors.border,
  },
  amountInput: { flex: 1, fontSize: 26, fontWeight: "800", color: Colors.text },
  amountSuffix: { color: Colors.textMuted, fontSize: 14, fontWeight: "800" },

  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  quickChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  quickMax: { backgroundColor: Colors.text, borderColor: Colors.text },
  quickText: { color: Colors.textSecondary, fontSize: 12, fontWeight: "800" },

  summary: { marginTop: 18, gap: 8 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  rowLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: "600" },
  rowValue: { color: Colors.text, fontSize: 14, fontWeight: "800" },
  sep: { height: 1, backgroundColor: Colors.border, marginVertical: 4 },

  confirmBtn: {
    marginTop: 18, height: 52, borderRadius: 14,
    backgroundColor: Colors.orange,
    alignItems: "center", justifyContent: "center",
  },
  confirmText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  disclaimer: { paddingHorizontal: 4, paddingVertical: 10, alignItems: "center" },
  disclaimerText: { color: Colors.textMuted, fontSize: 10, fontWeight: "600", textAlign: "center", lineHeight: 15 },
});
