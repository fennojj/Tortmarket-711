import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { TrendingUp, TrendingDown } from "lucide-react-native";
import { Colors } from "@/constants/colors";
import Sparkline from "./Sparkline";
import type { Market } from "@/types";
import { CATEGORY_LABEL } from "@/mocks/markets";

interface Props {
  market: Market;
  compact?: boolean;
}

export default function MarketCard({ market, compact }: Props) {
  const router = useRouter();
  const positive = market.change24h >= 0;
  const data = market.history.map((p) => p.yes);

  return (
    <Pressable
      testID={`market-card-${market.id}`}
      onPress={() => router.push(`/market/${market.id}`)}
      style={({ pressed }) => [
        styles.card,
        compact && styles.cardCompact,
        pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.categoryPill}>
          <Text style={styles.categoryText}>{CATEGORY_LABEL[market.category]}</Text>
        </View>
        <View style={[styles.changePill, { backgroundColor: positive ? Colors.emeraldSoft : Colors.redSoft }]}>
          {positive ? (
            <TrendingUp size={12} color={Colors.emerald} />
          ) : (
            <TrendingDown size={12} color={Colors.red} />
          )}
          <Text style={[styles.changeText, { color: positive ? Colors.emerald : Colors.red }]}>
            {positive ? "+" : ""}
            {market.change24h.toFixed(1)}%
          </Text>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {market.caseName}
      </Text>
      <Text style={styles.defendant} numberOfLines={1}>
        vs. {market.defendant}
      </Text>

      <View style={styles.chartRow}>
        <Sparkline data={data} width={compact ? 130 : 170} height={44} color={positive ? Colors.emerald : Colors.red} />
        <View style={styles.priceCol}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>YES</Text>
            <Text style={[styles.price, { color: Colors.emerald }]}>{market.yesPrice}¢</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>NO</Text>
            <Text style={[styles.price, { color: Colors.red }]}>{market.noPrice}¢</Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.volume}>Vol ${(market.volume / 1_000_000).toFixed(2)}M</Text>
        <View style={styles.probBar}>
          <View style={[styles.probFill, { width: `${market.yesPrice}%` }]} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  cardCompact: {
    width: 280,
    marginRight: 12,
    marginBottom: 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  categoryPill: {
    backgroundColor: Colors.blueSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  categoryText: {
    color: Colors.blue,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  changePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  changeText: { fontSize: 11, fontWeight: "800" },
  title: { color: Colors.text, fontSize: 16, fontWeight: "800", lineHeight: 20 },
  defendant: { color: Colors.textSecondary, fontSize: 12, fontWeight: "600", marginTop: 2 },
  chartRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  priceCol: { gap: 4, alignItems: "flex-end" },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  priceLabel: { fontSize: 11, fontWeight: "700", color: Colors.textMuted },
  price: { fontSize: 16, fontWeight: "800" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  volume: { color: Colors.textMuted, fontSize: 12, fontWeight: "600" },
  probBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.redSoft,
    overflow: "hidden",
  },
  probFill: {
    height: "100%",
    backgroundColor: Colors.emerald,
    borderRadius: 3,
  },
});
