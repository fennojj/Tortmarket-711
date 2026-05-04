import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, Pressable, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { CATEGORY_LABEL } from "@/mocks/markets";
import { useMarkets } from "@/providers/MarketsProvider";
import Sparkline from "@/components/Sparkline";
import HedgeSimulator from "@/components/HedgeSimulator";
import { TrendingUp, TrendingDown, DollarSign, Users, Flame, Zap } from "lucide-react-native";
import { computeFairYes } from "@/utils/signals";
import SponsorSlot from "@/components/SponsorSlot";

export default function MarketDetailScreen(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { markets } = useMarkets();
  const market = useMemo(() => markets.find((m) => m.id === id), [id, markets]);

  if (!market) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFound}>Market not found</Text>
      </View>
    );
  }

  const positive = market.change24h >= 0;
  const data = market.history.map((p) => p.yes);
  const fairYes = Math.round(computeFairYes(market));
  const yesEdge = fairYes - market.yesPrice;
  const noEdge = (100 - fairYes) - market.noPrice;
  const bestSide: "YES" | "NO" = yesEdge >= noEdge ? "YES" : "NO";

  const openWager = (side: "YES" | "NO") => {
    const price = side === "YES" ? market.yesPrice : market.noPrice;
    router.push({
      pathname: "/wager",
      params: { id: market.id, side, price: String(price) },
    });
  };

  return (
    <>
      <Stack.Screen options={{ title: market.caseName.split("(")[0].trim() }} />
      <View style={{ flex: 1, backgroundColor: Colors.bg }}>
        <ScrollView
          style={styles.wrap}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 90 }]}
        >
          <SponsorSlot tier="banner" label="Market detail — above header" />
          <View style={styles.headerCard}>
            <View style={styles.headerTop}>
              <View style={styles.catPill}>
                <Text style={styles.catText}>{CATEGORY_LABEL[market.category]}</Text>
              </View>
              {Math.abs(yesEdge) >= 6 && (
                <View style={[styles.edgePill, { backgroundColor: yesEdge >= 0 ? Colors.emeraldSoft : Colors.redSoft }]}>
                  <Zap size={10} color={yesEdge >= 0 ? Colors.emerald : Colors.red} />
                  <Text style={[styles.edgePillText, { color: yesEdge >= 0 ? Colors.emerald : Colors.red }]}>
                    {Math.abs(yesEdge).toFixed(0)}¢ edge
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.title}>{market.caseName}</Text>
            <Text style={styles.defendant}>vs. {market.defendant}</Text>
            <Text style={styles.desc}>{market.description}</Text>
          </View>

          <View style={styles.priceCard}>
            <View style={styles.priceTop}>
              <View>
                <Text style={styles.priceMainLabel}>Plaintiff Wins</Text>
                <View style={styles.priceMainRow}>
                  <Text style={[styles.priceMain, { color: Colors.emerald }]}>{market.yesPrice}¢</Text>
                  <View style={[styles.changePill, { backgroundColor: positive ? Colors.emeraldSoft : Colors.redSoft }]}>
                    {positive ? <TrendingUp size={12} color={Colors.emerald} /> : <TrendingDown size={12} color={Colors.red} />}
                    <Text style={[styles.changeText, { color: positive ? Colors.emerald : Colors.red }]}>
                      {positive ? "+" : ""}
                      {market.change24h.toFixed(1)}%
                    </Text>
                  </View>
                </View>
                <Text style={styles.fairHint}>Fair value: {fairYes}¢</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.priceMainLabel}>Defense Wins</Text>
                <Text style={[styles.priceMain, { color: Colors.red }]}>{market.noPrice}¢</Text>
                <Text style={styles.fairHint}>Fair value: {100 - fairYes}¢</Text>
              </View>
            </View>

            <View style={styles.chartBox}>
              <Sparkline data={data} width={340} height={120} color={positive ? Colors.emerald : Colors.red} />
            </View>

            <View style={styles.statsRow}>
              <StatCell icon={<DollarSign size={14} color={Colors.blue} />} label="Volume" value={`$${(market.volume / 1_000_000).toFixed(2)}M`} />
              <StatCell icon={<Users size={14} color={Colors.orange} />} label="Traders" value={`${Math.round(market.volume / 12000).toLocaleString()}`} />
              <StatCell icon={<Flame size={14} color={Colors.emerald} />} label="Liquidity" value="High" />
            </View>
          </View>

          <SponsorSlot tier="native" label="Between price card & hedge sim" />
          <HedgeSimulator market={market} />
          <SponsorSlot tier="bounty" label="Case-specific bounty sponsor" />
        </ScrollView>

        <SponsorSlot tier="sticky" compact label="Sticky above trade bar" style={{ marginBottom: 0 }} />
        <View style={[styles.tradeBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <Pressable
            onPress={() => openWager("YES")}
            style={[styles.tradeBtn, styles.tradeBtnYes, bestSide === "YES" && styles.tradeBtnBest]}
            testID="trade-yes-btn"
          >
            {bestSide === "YES" && (
              <View style={styles.bestBadge}>
                <Text style={styles.bestBadgeText}>BEST</Text>
              </View>
            )}
            <Text style={styles.tradeBtnLabel}>Plaintiff Wins</Text>
            <Text style={styles.tradeBtnPrice}>{market.yesPrice}¢ YES</Text>
            {yesEdge !== 0 && (
              <Text style={styles.tradeBtnEdge}>
                {yesEdge >= 0 ? "+" : ""}{yesEdge.toFixed(0)}¢ edge
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => openWager("NO")}
            style={[styles.tradeBtn, styles.tradeBtnNo, bestSide === "NO" && styles.tradeBtnBestNo]}
            testID="trade-no-btn"
          >
            {bestSide === "NO" && (
              <View style={[styles.bestBadge, { backgroundColor: Colors.red }]}>
                <Text style={styles.bestBadgeText}>BEST</Text>
              </View>
            )}
            <Text style={styles.tradeBtnLabel}>Defense Wins</Text>
            <Text style={styles.tradeBtnPrice}>{market.noPrice}¢ NO</Text>
            {noEdge !== 0 && (
              <Text style={styles.tradeBtnEdge}>
                {noEdge >= 0 ? "+" : ""}{noEdge.toFixed(0)}¢ edge
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </>
  );
}

function StatCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.statCell}>
      <View style={styles.statIcon}>{icon}</View>
      <View>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 16, gap: 14 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bg },
  notFound: { color: Colors.textSecondary, fontSize: 16, fontWeight: "700" },

  headerCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: Colors.border,
    gap: 4,
  },
  headerTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  catPill: {
    alignSelf: "flex-start",
    backgroundColor: Colors.blueSoft,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
  },
  catText: { color: Colors.blue, fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },
  edgePill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
  },
  edgePillText: { fontSize: 11, fontWeight: "800" },
  title: { color: Colors.text, fontSize: 22, fontWeight: "900", letterSpacing: -0.3, lineHeight: 28 },
  defendant: { color: Colors.textSecondary, fontSize: 13, fontWeight: "700" },
  desc: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 8 },

  priceCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: Colors.border,
  },
  priceTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  priceMainLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: "800", letterSpacing: 0.3, textTransform: "uppercase" },
  priceMainRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  priceMain: { fontSize: 34, fontWeight: "900", letterSpacing: -1 },
  changePill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  changeText: { fontSize: 11, fontWeight: "800" },
  fairHint: { color: Colors.textMuted, fontSize: 11, fontWeight: "700", marginTop: 3 },

  chartBox: { marginTop: 14, alignItems: "center" },

  statsRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  statCell: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.surface, borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  statIcon: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: Colors.bg, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.border,
  },
  statLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 0.3, textTransform: "uppercase" },
  statValue: { color: Colors.text, fontSize: 13, fontWeight: "800", marginTop: 1 },

  tradeBar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  tradeBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  tradeBtnYes: {
    backgroundColor: Colors.emeraldSoft,
    borderWidth: 1.5,
    borderColor: Colors.emerald,
  },
  tradeBtnNo: {
    backgroundColor: Colors.redSoft,
    borderWidth: 1.5,
    borderColor: Colors.red,
  },
  tradeBtnBest: {
    backgroundColor: Colors.emerald,
    borderColor: Colors.emerald,
  },
  tradeBtnBestNo: {
    backgroundColor: Colors.red,
    borderColor: Colors.red,
  },
  tradeBtnLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: Colors.textMuted,
    marginBottom: 2,
  },
  tradeBtnPrice: {
    fontSize: 20,
    fontWeight: "900",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  tradeBtnEdge: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textMuted,
    marginTop: 2,
  },
  bestBadge: {
    position: "absolute",
    top: 6, right: 8,
    backgroundColor: Colors.emerald,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  bestBadgeText: { color: "#fff", fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
});
