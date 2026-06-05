import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search, Flame, Zap, SlidersHorizontal, Share2 } from "lucide-react-native";
import { router } from "expo-router";
import { normalizeRefCode } from "@/utils/referrals";
import { Colors } from "@/constants/colors";
import { CATEGORY_LABEL } from "@/mocks/markets";
import { useMarkets } from "@/providers/MarketsProvider";
import MarketCard from "@/components/MarketCard";
import BalanceHeader from "@/components/BalanceHeader";
import GrandPrizeBanner from "@/components/GrandPrizeBanner";
import DailyClaimCard from "@/components/DailyClaimCard";
import WelcomeBonusCard from "@/components/WelcomeBonusCard";
import CoachCard from "@/components/CoachCard";
import CampaignPulseCard from "@/components/CampaignPulseCard";
import LaunchProgress from "@/components/LaunchProgress";
import LiveSignalTicker from "@/components/LiveSignalTicker";
import SponsorSlot from "@/components/SponsorSlot";
import DailyMissionsCard from "@/components/DailyMissionsCard";
import RivalTrackerCard from "@/components/RivalTrackerCard";
import { useAlerts } from "@/providers/AlertsProvider";
import type { Market, MarketCategory } from "@/types";

const CATEGORIES: { key: "all" | MarketCategory; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pharmaceutical", label: "Pharma" },
  { key: "product_liability", label: "Product" },
  { key: "environmental", label: "Environmental" },
  { key: "medical_device", label: "Medical Device" },
  { key: "toxic_exposure", label: "Toxic Exposure" },
  { key: "consumer", label: "Consumer" },
];

const RECENCY_THRESHOLD_MS = 3 * 60 * 60 * 1000;

const SORT_MODES = [
  { key: "relevance", label: "Relevance" },
  { key: "volume", label: "Volume" },
  { key: "movers", label: "Movers" },
  { key: "edge", label: "Edge" },
] as const;
type SortMode = typeof SORT_MODES[number]["key"];

const SEARCH_WEIGHTS = {
  exactName: 1000,
  exactDefendant: 800,
  exactCategory: 500,
  phraseDesc: 250,
  tokenNameStart: 220,
  tokenName: 150,
  tokenDef: 100,
  tokenCat: 80,
  tokenDesc: 40,
} as const;

function computeTortSearchScore(market: Market, q: string): number {
  if (!q) return market.volume;
  const tokens = q.split(/\s+/).filter((w) => w.length >= 2);
  if (tokens.length === 0 && q.length < 2) return 0;

  const name = market.caseName.toLowerCase();
  const def = market.defendant.toLowerCase();
  const cat = CATEGORY_LABEL[market.category].toLowerCase();
  const desc = market.description.toLowerCase();

  let s = 0;

  if (name.includes(q)) s += SEARCH_WEIGHTS.exactName;
  if (def.includes(q)) s += SEARCH_WEIGHTS.exactDefendant;
  if (cat.includes(q)) s += SEARCH_WEIGHTS.exactCategory;
  if (desc.includes(q)) s += SEARCH_WEIGHTS.phraseDesc;

  for (const t of tokens) {
    if (name.startsWith(t)) s += SEARCH_WEIGHTS.tokenNameStart;
    else if (name.includes(t)) s += SEARCH_WEIGHTS.tokenName;
    if (def.includes(t)) s += SEARCH_WEIGHTS.tokenDef;
    if (cat.includes(t)) s += SEARCH_WEIGHTS.tokenCat;
    if (desc.includes(t)) s += SEARCH_WEIGHTS.tokenDesc;
  }

  if (s === 0) return 0;

  const signalBoost =
    (market.volume / 1_000_000) * 18 +
    Math.abs(market.change24h) * 5 +
    (market.mdlSentiment + market.daubertStrength + market.corporateReserves) * 0.15;

  return s + signalBoost;
}

function sortMarkets(markets: Market[], mode: SortMode): Market[] {
  const copy = [...markets];
  switch (mode) {
    case "volume":
      return copy.sort((a, b) => b.volume - a.volume);
    case "movers":
      return copy.sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h));
    case "edge": {
      const fairYes = (m: Market) =>
        m.mdlSentiment * 0.4 + m.daubertStrength * 0.35 + m.corporateReserves * 0.25;
      return copy.sort((a, b) => Math.abs(fairYes(b) - b.yesPrice) - Math.abs(fairYes(a) - a.yesPrice));
    }
    default:
      return copy;
  }
}

function LivePulseDot() {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.3, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [anim]);
  return <Animated.View style={[styles.dot, { opacity: anim }]} />;
}

export default function MarketsScreen(): React.ReactElement {
  useEffect(() => {
    if (Platform.OS !== "web") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = normalizeRefCode(params.get("ref"));
      if (ref) {
        router.replace({ pathname: "/join", params: { ref } });
      }
    } catch (e) {
      console.log("[Home] ref redirect error", e);
    }
  }, []);

  const [query, setQuery] = useState<string>("");
  const [cat, setCat] = useState<typeof CATEGORIES[number]["key"]>("all");
  const [sortMode, setSortMode] = useState<SortMode>("relevance");
  const [showSort, setShowSort] = useState<boolean>(false);
  const { allAlerts, recentPlayCount } = useAlerts();
  const { markets } = useMarkets();

  const trending = useMemo(
    () => [...markets].sort((a, b) => b.volume - a.volume).slice(0, 8),
    [markets],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const catFiltered = markets.filter((m) => cat === "all" || m.category === cat);

    if (!q && sortMode !== "relevance") {
      return sortMarkets(catFiltered, sortMode);
    }

    if (!q) {
      return sortMarkets(catFiltered, "volume");
    }

    return catFiltered
      .map((m) => ({ market: m, score: computeTortSearchScore(m, q) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ market }) => market);
  }, [query, cat, sortMode, markets]);

  const hotMarketIds = useMemo(() => {
    const now = Date.now();
    const ids = new Set<string>();
    allAlerts
      .filter((a) => a.kind === "play" && now - a.createdAt < RECENCY_THRESHOLD_MS)
      .forEach((a) => { if (a.marketId) ids.add(a.marketId); });
    return ids;
  }, [allAlerts]);

  const movers = useMemo(
    () => markets.filter((m) => Math.abs(m.change24h) >= 6).length,
    [markets],
  );

  const isSearching = query.trim().length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        ListHeaderComponent={
          <View>
            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.appName}>Tort Market</Text>
                  <View style={styles.betaPill}>
                    <Text style={styles.betaText}>POC BETA</Text>
                  </View>
                </View>
                <Text style={styles.appTagline}>Mass Tort Prediction Markets</Text>
              </View>
              <View style={styles.headerActions}>
                <Pressable
                  onPress={() => router.push("/invite")}
                  style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.7 }]}
                  testID="home-share"
                >
                  <Share2 size={13} color="#fff" />
                  <Text style={styles.shareBtnText}>Share</Text>
                </Pressable>
                <View style={styles.liveDot}>
                  <LivePulseDot />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              </View>
            </View>

            <BalanceHeader subtitle={`${markets.length} active mass torts · ${(markets.reduce((a, m) => a + m.volume, 0) / 1_000_000).toFixed(1)}M volume`} />

            <LiveSignalTicker />

            <SponsorSlot tier="banner" label="Top banner — under balance" />
            <SponsorSlot tier="ribbon" compact label="Sponsor ticker — scrolling logos" />

            {recentPlayCount >= 3 && (
              <Pressable style={styles.fomoBar} testID="fomo-bar">
                <Zap size={13} color={Colors.orange} />
                <Text style={styles.fomoText}>
                  <Text style={styles.fomoHighlight}>{recentPlayCount} traders</Text> placed bets in the last 10 min — market is hot
                </Text>
                <View style={styles.fomoLive}>
                  <View style={styles.fomoLiveDot} />
                </View>
              </Pressable>
            )}

            {movers >= 2 && (
              <View style={styles.moverBanner}>
                <Flame size={13} color={Colors.red} />
                <Text style={styles.moverText}>
                  <Text style={styles.moverHighlight}>{movers} markets</Text> moved {">"}6% today — fresh edges available
                </Text>
              </View>
            )}

            <LaunchProgress />
            <SponsorSlot tier="presenting" label="Presenting — launch progress" />
            <WelcomeBonusCard />
            <CoachCard />
            <SponsorSlot tier="native" label="Native card slot — between coach & campaign" />
            <CampaignPulseCard />
            <GrandPrizeBanner />
            <SponsorSlot tier="bounty" label="Grand prize co-sponsor" />
            <DailyClaimCard />
            <DailyMissionsCard />
            <RivalTrackerCard />

            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Search size={16} color={Colors.textMuted} />
                <TextInput
                  testID="markets-search"
                  placeholder="TortSearch: Roundup, Depo-Provera, PFAS..."
                  placeholderTextColor={Colors.textMuted}
                  value={query}
                  onChangeText={setQuery}
                  style={styles.searchInput}
                />
                {isSearching && (
                  <Pressable onPress={() => setQuery("")} style={styles.clearBtn} testID="search-clear">
                    <Text style={styles.clearText}>✕</Text>
                  </Pressable>
                )}
              </View>
              <Pressable
                onPress={() => setShowSort((v) => !v)}
                style={[styles.sortBtn, showSort && styles.sortBtnActive]}
                testID="sort-btn"
              >
                <SlidersHorizontal size={16} color={showSort ? "#fff" : Colors.text} />
              </Pressable>
            </View>

            {showSort && (
              <View style={styles.sortRow}>
                {SORT_MODES.map((s) => (
                  <Pressable
                    key={s.key}
                    onPress={() => { setSortMode(s.key); setShowSort(false); }}
                    style={[styles.sortPill, sortMode === s.key && styles.sortPillActive]}
                    testID={`sort-${s.key}`}
                  >
                    <Text style={[styles.sortText, sortMode === s.key && styles.sortTextActive]}>
                      {s.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
              {CATEGORIES.map((c) => {
                const active = cat === c.key;
                return (
                  <Pressable
                    key={c.key}
                    onPress={() => setCat(c.key)}
                    style={[styles.catPill, active && styles.catPillActive]}
                    testID={`cat-${c.key}`}
                  >
                    <Text style={[styles.catText, active && styles.catTextActive]}>{c.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {!isSearching && (
              <>
                <View style={styles.sectionHeader}>
                  <Flame size={16} color={Colors.orange} />
                  <Text style={styles.sectionTitle}>Trending Torts</Text>
                  <Text style={styles.sectionHint}>by 24h volume</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendRow}>
                  <View style={{ width: 200, marginRight: 12 }}>
                    <SponsorSlot tier="native" inline height={150} label="Sponsored trending card" />
                  </View>
                  {trending.map((m) => (
                    <View key={m.id} style={{ position: "relative" }}>
                      {hotMarketIds.has(m.id) && (
                        <View style={styles.hotBadge} testID={`hot-badge-${m.id}`}>
                          <Text style={styles.hotBadgeText}>HOT</Text>
                        </View>
                      )}
                      <MarketCard market={m} compact />
                    </View>
                  ))}
                </ScrollView>
              </>
            )}

            <View style={[styles.sectionHeader, { marginTop: isSearching ? 4 : 20 }]}>
              {isSearching ? (
                <>
                  <Search size={16} color={Colors.blue} />
                  <Text style={styles.sectionTitle}>TortSearch Results</Text>
                  <View style={styles.searchBadge}>
                    <Text style={styles.searchBadgeText}>{filtered.length} matched</Text>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>All Markets</Text>
                  <Text style={styles.sectionHint}>{filtered.length} active · {sortMode}</Text>
                </>
              )}
            </View>
          </View>
        }
        data={filtered}
        keyExtractor={(m) => m.id}
        renderItem={({ item, index }) => (
          <View style={styles.gridItem}>
            {hotMarketIds.has(item.id) && (
              <View style={styles.hotBadgeList}>
                <Text style={styles.hotBadgeText}>HOT</Text>
              </View>
            )}
            <MarketCard market={item} />
            {(index + 1) % 4 === 0 && (
              <SponsorSlot tier="native" inline label={`In-feed ad · slot #${Math.floor(index / 4) + 1}`} />
            )}
          </View>
        )}
        ListFooterComponent={<SponsorSlot tier="sticky" label="Bottom of feed banner" />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptySearch}>
            <Text style={styles.emptySearchTitle}>No results for "{query}"</Text>
            <Text style={styles.emptySearchSub}>Try "Roundup", "PFAS", "3M", or a defendant name</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  listContent: { paddingBottom: 32 },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  appName: { color: Colors.text, fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  betaPill: {
    backgroundColor: Colors.text,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  betaText: { color: Colors.yellow, fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  appTagline: { color: Colors.textSecondary, fontSize: 12, fontWeight: "600", marginTop: 2 },
  liveDot: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.emeraldSoft,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.emerald },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  shareBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: Colors.orange,
    paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999,
  },
  shareBtnText: { color: "#fff", fontSize: 11.5, fontWeight: "900", letterSpacing: 0.3 },
  liveText: { color: Colors.emerald, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },

  fomoBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginTop: 10,
    backgroundColor: Colors.orangeSoft,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: "#FFC89A",
  },
  fomoText: { flex: 1, color: Colors.text, fontSize: 12.5, fontWeight: "600" },
  fomoHighlight: { color: Colors.orange, fontWeight: "800" },
  fomoLive: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.orange },
  fomoLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.orange },

  moverBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginTop: 8,
    backgroundColor: Colors.redSoft,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1, borderColor: "#FCA5A5",
  },
  moverText: { flex: 1, color: Colors.text, fontSize: 12.5, fontWeight: "600" },
  moverHighlight: { color: Colors.red, fontWeight: "800" },

  searchRow: { paddingHorizontal: 16, marginTop: 16, flexDirection: "row", gap: 8 },
  searchBox: {
    flex: 1,
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 14, paddingHorizontal: 14, height: 46,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: 14, fontWeight: "500" },
  clearBtn: { padding: 4 },
  clearText: { color: Colors.textMuted, fontSize: 14, fontWeight: "700" },
  sortBtn: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
    alignItems: "center", justifyContent: "center",
  },
  sortBtnActive: { backgroundColor: Colors.text, borderColor: Colors.text },

  sortRow: {
    flexDirection: "row", flexWrap: "wrap", gap: 8,
    paddingHorizontal: 16, paddingTop: 10,
  },
  sortPill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  sortPillActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  sortText: { color: Colors.textSecondary, fontSize: 12, fontWeight: "700" },
  sortTextActive: { color: "#fff" },

  catRow: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  catPill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  catPillActive: { backgroundColor: Colors.text, borderColor: Colors.text },
  catText: { color: Colors.textSecondary, fontSize: 12, fontWeight: "700" },
  catTextActive: { color: "#fff" },

  sectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, marginBottom: 10, marginTop: 4,
  },
  sectionTitle: { color: Colors.text, fontSize: 18, fontWeight: "800", flex: 1 },
  sectionHint: { color: Colors.textMuted, fontSize: 12, fontWeight: "700" },
  searchBadge: {
    backgroundColor: Colors.blueSoft,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  searchBadgeText: { color: Colors.blue, fontSize: 11, fontWeight: "800" },

  trendRow: { paddingHorizontal: 16, paddingVertical: 2, paddingRight: 16 },
  gridItem: { paddingHorizontal: 16 },

  hotBadge: {
    position: "absolute", top: 8, right: 20, zIndex: 10,
    backgroundColor: Colors.orange,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  hotBadgeList: {
    position: "absolute", top: 10, right: 26, zIndex: 10,
    backgroundColor: Colors.orange,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  hotBadgeText: { color: "#fff", fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },

  emptySearch: { padding: 40, alignItems: "center" },
  emptySearchTitle: { color: Colors.text, fontSize: 16, fontWeight: "800", textAlign: "center" },
  emptySearchSub: { color: Colors.textMuted, fontSize: 13, fontWeight: "600", marginTop: 6, textAlign: "center" },
});
