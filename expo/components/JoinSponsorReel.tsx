import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Crown, Flame, Trophy, Zap } from "lucide-react-native";
import { useSponsorConfig } from "@/providers/SponsorConfigProvider";
import { useSponsorUpdates } from "@/providers/SponsorUpdatesProvider";
import { LEADERBOARD } from "@/mocks/leaderboard";

interface RewardTick {
  handle: string;
  amount: number;
  case: string;
}

function buildSeed(): RewardTick[] {
  const pool: RewardTick[] = [];
  LEADERBOARD.forEach((s) => {
    s.entries.slice(0, 3).forEach((e) => {
      pool.push({ handle: e.handle, amount: e.points, case: s.caseName });
    });
  });
  return pool.sort((a, b) => b.amount - a.amount).slice(0, 12);
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

/**
 * Sponsor strip + live "Top Action Trader" reward ticker, shown on the
 * Claim Your Seat screen. Updates every 2.5s with a small randomized
 * delta so it feels live without needing a backend.
 */
export default function JoinSponsorReel(): React.ReactElement | null {
  const { creativeFor } = useSponsorConfig();
  const { featured } = useSponsorUpdates();

  const presenting = creativeFor("presenting");
  const leaderboard = creativeFor("leaderboard");
  const title = creativeFor("title");
  const sponsor =
    (presenting?.active && presenting) ||
    (leaderboard?.active && leaderboard) ||
    (title?.active && title) ||
    null;

  const featuredUpdate = featured[0] ?? null;

  const seed = useMemo<RewardTick[]>(() => buildSeed(), []);
  const [idx, setIdx] = useState<number>(0);
  const [jitter, setJitter] = useState<number>(0);
  const fade = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const t = setInterval(() => {
      Animated.sequence([
        Animated.timing(fade, {
          toValue: 0,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fade, {
          toValue: 1,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      setTimeout(() => {
        setIdx((i) => (i + 1) % seed.length);
        setJitter(Math.floor(Math.random() * 4200));
      }, 220);
    }, 2600);
    return () => clearInterval(t);
  }, [fade, seed.length]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulse]);

  const current = seed[idx];
  if (!current) return null;

  const dotOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
  const dotScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.25] });

  const openSponsor = () => {
    const url = sponsor?.url;
    if (!url) return;
    if (Platform.OS === "web") {
      try { window.open(url, "_blank"); } catch (_) {}
    } else {
      Linking.openURL(url).catch(() => {});
    }
  };

  return (
    <View style={styles.wrap} testID="join-sponsor-reel">
      {/* Sponsor strip */}
      <Pressable
        onPress={openSponsor}
        disabled={!sponsor?.url}
        style={styles.sponsorRow}
        testID="join-sponsor-strip"
      >
        <View style={styles.sponsorLeft}>
          <Text style={styles.sponsoredLabel}>POWERED BY</Text>
          {sponsor ? (
            <View style={styles.sponsorChip}>
              {sponsor.logoUrl ? (
                <Image source={{ uri: sponsor.logoUrl }} style={styles.sponsorLogo} resizeMode="contain" />
              ) : (
                <Crown size={12} color="#FDE68A" />
              )}
              <Text style={styles.sponsorName} numberOfLines={1}>
                {sponsor.name}
              </Text>
            </View>
          ) : (
            <View style={styles.sponsorChip}>
              <Crown size={12} color="#FDE68A" />
              <Text style={styles.sponsorName}>Tort Market House</Text>
            </View>
          )}
        </View>
        <View style={styles.refPill}>
          <Zap size={10} color="#0B1220" />
          <Text style={styles.refPillText}>REFERRAL SPONSOR</Text>
        </View>
      </Pressable>

      {/* Live reward ticker */}
      <View style={styles.ticker} testID="join-reward-ticker">
        <View style={styles.tickerHeader}>
          <View style={styles.liveDotRow}>
            <Animated.View
              style={[
                styles.liveDot,
                { opacity: dotOpacity, transform: [{ scale: dotScale }] },
              ]}
            />
            <Text style={styles.liveText}>LIVE REWARDS · TOP ACTION TRADERS</Text>
          </View>
          <Trophy size={12} color="#FDE68A" />
        </View>

        <Animated.View style={[styles.tickerBody, { opacity: fade }]}>
          <View style={styles.tickerLeft}>
            <Flame size={14} color="#FF6A1A" />
            <Text style={styles.tickerHandle} numberOfLines={1}>
              {current.handle}
            </Text>
          </View>
          <View style={styles.tickerRight}>
            <Text style={styles.tickerAmt}>
              +{fmt(current.amount + jitter)}
            </Text>
            <Text style={styles.tickerCase} numberOfLines={1}>
              {current.case}
            </Text>
          </View>
        </Animated.View>

        {featuredUpdate ? (
          <View style={styles.featured}>
            <Text style={styles.featuredTag}>SPONSOR DROP</Text>
            <Text style={styles.featuredTitle} numberOfLines={1}>
              {featuredUpdate.title}
            </Text>
          </View>
        ) : (
          <View style={styles.featured}>
            <Text style={styles.featuredTag}>BOUNTY POOL</Text>
            <Text style={styles.featuredTitle} numberOfLines={1}>
              250,000 pts up for grabs this week · trade to qualify
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "stretch",
    marginTop: 14,
    gap: 10,
  },
  sponsorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.32)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sponsorLeft: { flex: 1, gap: 4 },
  sponsoredLabel: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  sponsorChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sponsorLogo: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  sponsorName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.2,
    maxWidth: 180,
  },
  refPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FDE68A",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  refPillText: {
    color: "#0B1220",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  ticker: {
    backgroundColor: "rgba(0,0,0,0.32)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  tickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  liveDotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "#EF4444",
  },
  liveText: {
    color: "#FCA5A5",
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 1,
  },
  tickerBody: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  tickerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  tickerHandle: {
    color: "#fff",
    fontSize: 13.5,
    fontWeight: "900",
    flexShrink: 1,
  },
  tickerRight: {
    alignItems: "flex-end",
    maxWidth: 160,
  },
  tickerAmt: {
    color: "#FDE68A",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  tickerCase: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
    fontWeight: "700",
    maxWidth: 160,
  },
  featured: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featuredTag: {
    color: "#0B1220",
    backgroundColor: "#FDE68A",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    overflow: "hidden",
  },
  featuredTitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11.5,
    fontWeight: "700",
    flex: 1,
  },
});
