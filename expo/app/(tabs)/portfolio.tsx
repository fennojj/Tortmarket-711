import React, { useEffect, useMemo, useRef } from "react";
import { Animated, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Briefcase, TrendingUp, TrendingDown, ArrowRight, Zap } from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { useApp } from "@/providers/AppProvider";
import { useMarkets } from "@/providers/MarketsProvider";
import type { Market } from "@/types";
import BalanceHeader from "@/components/BalanceHeader";
import SponsorSlot from "@/components/SponsorSlot";

export default function PortfolioScreen(): React.ReactElement {
  const { user, portfolioValue, portfolioCost } = useApp();
  const { markets } = useMarkets();
  const router = useRouter();

  const pnl = portfolioValue - portfolioCost;
  const pnlPct = portfolioCost > 0 ? (pnl / portfolioCost) * 100 : 0;

  const cardScale = useRef(new Animated.Value(0.94)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        tension: 110,
        friction: 9,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardScale, cardOpacity]);

  const positions = useMemo(() => {
    return user.positions.map((p) => {
      const m = markets.find((mm) => mm.id === p.marketId);
      const currentPrice = m ? (p.side === "YES" ? m.yesPrice : m.noPrice) : p.avgPrice;
      const value = p.shares * currentPrice;
      const cost = p.shares * p.avgPrice;
      return { ...p, market: m, currentPrice, value, cost, pnl: value - cost };
    });
  }, [user.positions, markets]);

  const winPositions = positions.filter((p) => p.pnl > 0).length;
  const losePositions = positions.filter((p) => p.pnl < 0).length;

  return (
    <View style={styles.wrap}>
      <BalanceHeader />

      <Animated.View style={[{ transform: [{ scale: cardScale }], opacity: cardOpacity }]}>
        <View style={styles.pnlCard}>
          <View style={styles.pnlTop}>
            <View>
              <Text style={styles.pnlLabel}>Unrealized P&L</Text>
              <View style={styles.pnlRow}>
                <Text style={[styles.pnlValue, { color: pnl >= 0 ? Colors.emerald : Colors.red }]}>
                  {pnl >= 0 ? "+" : ""}
                  {Math.round(pnl).toLocaleString()}
                </Text>
                <View style={[styles.pnlPill, { backgroundColor: pnl >= 0 ? Colors.emeraldSoft : Colors.redSoft }]}>
                  {pnl >= 0 ? <TrendingUp size={12} color={Colors.emerald} /> : <TrendingDown size={12} color={Colors.red} />}
                  <Text style={[styles.pnlPct, { color: pnl >= 0 ? Colors.emerald : Colors.red }]}>
                    {pnl >= 0 ? "+" : ""}
                    {pnlPct.toFixed(1)}%
                  </Text>
                </View>
              </View>
            </View>
            <View style={[styles.pnlIcon, { backgroundColor: pnl >= 0 ? Colors.emeraldSoft : Colors.redSoft }]}>
              <Zap size={16} color={pnl >= 0 ? Colors.emerald : Colors.red} />
            </View>
          </View>

          {positions.length > 0 && (
            <View style={styles.pnlStats}>
              <View style={styles.pnlStat}>
                <Text style={styles.pnlStatVal}>{positions.length}</Text>
                <Text style={styles.pnlStatLabel}>Positions</Text>
              </View>
              <View style={styles.pnlDivider} />
              <View style={styles.pnlStat}>
                <Text style={[styles.pnlStatVal, { color: Colors.emerald }]}>{winPositions}</Text>
                <Text style={styles.pnlStatLabel}>Winning</Text>
              </View>
              <View style={styles.pnlDivider} />
              <View style={styles.pnlStat}>
                <Text style={[styles.pnlStatVal, { color: losePositions > 0 ? Colors.red : Colors.textMuted }]}>{losePositions}</Text>
                <Text style={styles.pnlStatLabel}>Losing</Text>
              </View>
              <View style={styles.pnlDivider} />
              <View style={styles.pnlStat}>
                <Text style={styles.pnlStatVal}>{Math.round(portfolioCost).toLocaleString()}</Text>
                <Text style={styles.pnlStatLabel}>Invested</Text>
              </View>
            </View>
          )}
        </View>
      </Animated.View>

      <SponsorSlot tier="banner" label="Portfolio banner — under P&L" />

      <FlatList
        data={positions}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={
          <View>
            <SponsorSlot tier="ribbon" compact label="Sponsored research strip" />
            <Text style={styles.header}>Open Positions</Text>
          </View>
        }
        ListFooterComponent={<SponsorSlot tier="sticky" label="Portfolio feed bottom" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Briefcase size={22} color={Colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No positions yet</Text>
            <Text style={styles.emptyText}>Browse the Markets tab and place your first wager on a mass tort outcome.</Text>
            <Pressable onPress={() => router.push("/")} style={styles.emptyBtn} testID="empty-browse-btn">
              <Text style={styles.emptyBtnText}>Browse Markets</Text>
            </Pressable>
            <SponsorSlot tier="presenting" label="Empty-state presenting sponsor" />
          </View>
        }
        renderItem={({ item, index }) => (
          <PositionCard
            item={item}
            index={index}
            onPress={() => item.market && router.push(`/market/${item.market.id}`)}
            onTrade={() => item.market && router.push({ pathname: "/wager", params: { id: item.market.id } })}
          />
        )}
        ItemSeparatorComponent={() => null}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

interface PositionCardProps {
  item: ReturnType<typeof buildPositionItem>;
  index: number;
  onPress: () => void;
  onTrade: () => void;
}

type PositionItem = {
  id: string;
  marketId: string;
  side: "YES" | "NO";
  shares: number;
  avgPrice: number;
  createdAt: number;
  market: Market | undefined;
  currentPrice: number;
  value: number;
  cost: number;
  pnl: number;
};

function buildPositionItem(_: never): PositionItem {
  return _ as unknown as PositionItem;
}

function PositionCard({
  item,
  index,
  onPress,
  onTrade,
}: {
  item: PositionItem;
  index: number;
  onPress: () => void;
  onTrade: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(20)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = index * 70;
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 320,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 320,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, opacityAnim, index]);

  const pnlPct = item.cost > 0 ? ((item.pnl / item.cost) * 100).toFixed(1) : "0.0";
  const isWinning = item.pnl >= 0;

  return (
    <Animated.View style={{ transform: [{ translateY: slideAnim }], opacity: opacityAnim }}>
      <Pressable
        onPress={onPress}
        style={[styles.positionCard, isWinning ? styles.posCardWin : styles.posCardLose]}
        testID={`position-${item.id}`}
      >
        <View style={styles.posHeader}>
          <View style={[styles.sideBadge, { backgroundColor: item.side === "YES" ? Colors.emeraldSoft : Colors.redSoft }]}>
            <Text style={[styles.sideText, { color: item.side === "YES" ? Colors.emerald : Colors.red }]}>
              {item.side}
            </Text>
          </View>
          <Text style={styles.posTitle} numberOfLines={1}>
            {item.market?.caseName ?? item.marketId}
          </Text>
          <View style={[styles.pnlBadge, { backgroundColor: isWinning ? Colors.emeraldSoft : Colors.redSoft }]}>
            <Text style={[styles.pnlBadgeText, { color: isWinning ? Colors.emerald : Colors.red }]}>
              {isWinning ? "+" : ""}{pnlPct}%
            </Text>
          </View>
        </View>

        <View style={styles.posGrid}>
          <Cell label="Shares" value={item.shares.toLocaleString()} />
          <Cell label="Avg" value={`${Math.round(item.avgPrice)}¢`} />
          <Cell label="Now" value={`${Math.round(item.currentPrice)}¢`} />
          <Cell
            label="P&L"
            value={`${item.pnl >= 0 ? "+" : ""}${Math.round(item.pnl).toLocaleString()}`}
            color={item.pnl >= 0 ? Colors.emerald : Colors.red}
          />
        </View>

        <Pressable onPress={onTrade} style={styles.tradeMoreBtn} testID={`trade-more-${item.id}`}>
          <Text style={styles.tradeMoreText}>Add to position</Text>
          <ArrowRight size={13} color={Colors.blue} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

function Cell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.cellLabel}>{label}</Text>
      <Text style={[styles.cellValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.bg },
  pnlCard: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 18, padding: 16,
  },
  pnlTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  pnlLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" },
  pnlRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  pnlValue: { fontSize: 28, fontWeight: "900", letterSpacing: -0.5 },
  pnlPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  pnlPct: { fontSize: 12, fontWeight: "800" },
  pnlIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },

  pnlStats: {
    flexDirection: "row",
    marginTop: 14,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pnlStat: { flex: 1, alignItems: "center" },
  pnlStatVal: { color: Colors.text, fontSize: 15, fontWeight: "900" },
  pnlStatLabel: { color: Colors.textMuted, fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3, marginTop: 2 },
  pnlDivider: { width: 1, backgroundColor: Colors.border },

  list: { padding: 16, paddingBottom: 48 },
  header: { color: Colors.text, fontSize: 16, fontWeight: "800", marginBottom: 10 },

  positionCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 10,
  },
  posCardWin: { borderLeftWidth: 3, borderLeftColor: Colors.emerald },
  posCardLose: { borderLeftWidth: 3, borderLeftColor: Colors.red },

  posHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  sideBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  sideText: { fontSize: 11, fontWeight: "800" },
  posTitle: { flex: 1, color: Colors.text, fontSize: 14, fontWeight: "700" },
  pnlBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pnlBadgeText: { fontSize: 11, fontWeight: "800" },

  posGrid: { flexDirection: "row" },
  cell: { flex: 1 },
  cellLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  cellValue: { color: Colors.text, fontSize: 15, fontWeight: "800", marginTop: 2 },

  tradeMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginTop: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  tradeMoreText: { color: Colors.blue, fontSize: 12, fontWeight: "800" },

  empty: { alignItems: "center", padding: 32, marginTop: 20 },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.border,
  },
  emptyTitle: { color: Colors.text, fontSize: 17, fontWeight: "800", marginTop: 14 },
  emptyText: { color: Colors.textSecondary, fontSize: 13, textAlign: "center", marginTop: 6, lineHeight: 18 },
  emptyBtn: {
    marginTop: 16, backgroundColor: Colors.blue,
    paddingHorizontal: 20, height: 44, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  emptyBtnText: { color: "#fff", fontWeight: "800" },
});
