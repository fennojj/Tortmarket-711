import React, { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Crown, Medal, Sparkles, TrendingUp, User } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/constants/colors";
import { LEADERBOARD } from "@/mocks/leaderboard";
import { useApp } from "@/providers/AppProvider";
import { CONFERENCE } from "@/constants/sponsors";
import SponsorSlot from "@/components/SponsorSlot";

export default function LeaderboardScreen(): React.ReactElement {
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const { user, portfolioValue } = useApp();
  const section = LEADERBOARD[activeIdx];

  const userTotalPoints = useMemo(
    () => Math.round(user.pointBalance + portfolioValue),
    [user.pointBalance, portfolioValue],
  );

  const globalRank = useMemo(() => {
    const allPoints = LEADERBOARD.flatMap((s) => s.entries.map((e) => e.points));
    const above = allPoints.filter((p) => p > userTotalPoints).length;
    return above + 1;
  }, [userTotalPoints]);

  const totalPlayers = useMemo(
    () => LEADERBOARD.reduce((acc, s) => acc + s.entries.length, 0) + 1,
    [],
  );

  const sectionRank = useMemo(() => {
    const above = section.entries.filter((e) => e.points > userTotalPoints).length;
    return above + 1;
  }, [section.entries, userTotalPoints]);

  const topEntry = section.entries[0];
  const pointsToThrone = Math.max(0, topEntry.points - userTotalPoints);
  const isThrone = userTotalPoints >= topEntry.points;

  const titleSponsor = CONFERENCE.active ? CONFERENCE.titleSponsor : null;

  return (
    <View style={styles.wrap}>
      {titleSponsor && (
        <LinearGradient
          colors={["#0B1220", "#1E3A8A", "#2563EB"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.titleSponsor}
          testID="title-sponsor-banner"
        >
          <View style={styles.titleSponsorRow}>
            <View style={styles.titleSponsorBadge}>
              <Sparkles size={10} color={Colors.yellow} />
              <Text style={styles.titleSponsorBadgeText}>TITLE SPONSOR</Text>
            </View>
            <Text style={styles.titleSponsorConference}>{CONFERENCE.name.toUpperCase()}</Text>
          </View>
          <Text style={styles.titleSponsorName}>{titleSponsor.name}</Text>
          <Text style={styles.titleSponsorTagline}>{titleSponsor.tagline}</Text>
        </LinearGradient>
      )}
      {!titleSponsor && <SponsorSlot tier="title" label="TITLE SPONSOR — leaderboard hero" />}
      <SponsorSlot tier="leaderboard" label="Leaderboard presenting — below title" />
      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Crown size={18} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroLabel}>Current Throne</Text>
          <Text style={styles.heroTitle}>{section.titleLabel}</Text>
          <Text style={styles.heroSub}>
            Held by {topEntry.handle} · {topEntry.points.toLocaleString()} pts
          </Text>
        </View>
      </View>

      <LinearGradient
        colors={isThrone ? ["#10B981", "#059669"] : ["#0B1220", "#1E3A8A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.rankCard}
      >
        <View style={styles.rankCardInner}>
          <View style={styles.rankLeft}>
            <View style={styles.rankAvatar}>
              <User size={14} color="#fff" />
            </View>
            <View>
              <Text style={styles.rankHandle}>{user.handle}</Text>
              <Text style={styles.rankPoints}>{userTotalPoints.toLocaleString()} pts</Text>
            </View>
          </View>
          <View style={styles.rankRight}>
            <View style={styles.rankBadge}>
              <Text style={styles.rankBadgeNum}>#{globalRank}</Text>
              <Text style={styles.rankBadgeLabel}>Global</Text>
            </View>
            <View style={[styles.rankBadge, { backgroundColor: "rgba(255,255,255,0.12)" }]}>
              <Text style={styles.rankBadgeNum}>#{sectionRank}</Text>
              <Text style={styles.rankBadgeLabel}>This market</Text>
            </View>
          </View>
        </View>

        {!isThrone && pointsToThrone > 0 ? (
          <View style={styles.throneBar}>
            <TrendingUp size={11} color="rgba(255,255,255,0.85)" />
            <Text style={styles.throneText}>
              <Text style={styles.throneHighlight}>{pointsToThrone.toLocaleString()} pts</Text> behind the throne · play to climb
            </Text>
          </View>
        ) : (
          <View style={styles.throneBar}>
            <Crown size={11} color={Colors.yellow} />
            <Text style={styles.throneText}>
              <Text style={styles.throneHighlight}>You hold the throne</Text> · defend your position
            </Text>
          </View>
        )}
      </LinearGradient>

      <SponsorSlot tier="banner" label="Between rank card & market tabs" />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {LEADERBOARD.map((s, i) => {
          const active = i === activeIdx;
          return (
            <Pressable
              key={s.marketId}
              onPress={() => setActiveIdx(i)}
              style={[styles.tab, active && styles.tabActive]}
              testID={`lb-tab-${s.marketId}`}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={1}>
                {s.caseName.split("(")[0].trim()}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={section.entries}
        keyExtractor={(e) => `${section.marketId}-${e.rank}`}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <SponsorSlot tier="bounty" label={`Case bounty sponsor — ${section.caseName.split("(")[0].trim()}`} />
            <Text style={styles.listHeader}>Top traders · {section.caseName}</Text>
          </View>
        }
        ItemSeparatorComponent={({ leadingItem }) => {
          const r = (leadingItem as { rank: number }).rank;
          if (r === 3) {
            return <SponsorSlot tier="native" label="Top-3 podium sponsor" />;
          }
          if (r === 10) {
            return <SponsorSlot tier="banner" label="Mid-leaderboard banner" />;
          }
          return null;
        }}
        renderItem={({ item }) => {
          const rankColor =
            item.rank === 1
              ? Colors.yellow
              : item.rank === 2
              ? "#94A3B8"
              : item.rank === 3
              ? "#D97706"
              : Colors.textMuted;
          const isUser = item.handle === user.handle;
          return (
            <View
              style={[styles.row, isUser && styles.rowHighlight]}
              testID={`lb-entry-${item.rank}`}
            >
              <View
                style={[
                  styles.rankCircle,
                  { backgroundColor: item.rank <= 3 ? rankColor : Colors.surface },
                ]}
              >
                {item.rank <= 3 ? (
                  <Medal size={14} color="#fff" />
                ) : (
                  <Text style={styles.rankText}>{item.rank}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.handle, isUser && { color: Colors.blue }]}>
                  {isUser ? `${item.handle} (you)` : item.handle}
                </Text>
                {item.badge ? (
                  <View style={styles.badgePill}>
                    <Crown size={10} color={Colors.orange} />
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                ) : (
                  <Text style={styles.sub}>Top-tier trader</Text>
                )}
              </View>
              <Text style={[styles.points, isUser && { color: Colors.blue }]}>
                {item.points.toLocaleString()}
              </Text>
            </View>
          );
        }}
        ListFooterComponent={
          <View>
            {sectionRank > section.entries.length && (
              <View style={[styles.row, styles.rowHighlight, { marginTop: 8 }]}>
                <View style={[styles.rankCircle, { backgroundColor: Colors.blueSoft }]}>
                  <Text style={[styles.rankText, { color: Colors.blue }]}>{sectionRank}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.handle, { color: Colors.blue }]}>{user.handle} (you)</Text>
                  <Text style={styles.sub}>{userTotalPoints.toLocaleString()} pts · not yet ranked</Text>
                </View>
                <Text style={[styles.points, { color: Colors.blue }]}>
                  {userTotalPoints.toLocaleString()}
                </Text>
              </View>
            )}
            <SponsorSlot tier="sticky" label="Leaderboard footer banner" />
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.bg },
  titleSponsor: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  titleSponsorRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  titleSponsorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  titleSponsorBadgeText: { color: "#fff", fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  titleSponsorConference: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginLeft: "auto",
  },
  titleSponsorName: { color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: -0.5, marginTop: 4 },
  titleSponsorTagline: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "600" },
  heroCard: {
    marginHorizontal: 16, marginTop: 10,
    backgroundColor: Colors.text,
    borderRadius: 20, padding: 18,
    flexDirection: "row", alignItems: "center", gap: 14,
  },
  heroIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: Colors.orange, alignItems: "center", justifyContent: "center",
  },
  heroLabel: { color: "rgba(255,255,255,0.65)", fontSize: 10, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" },
  heroTitle: { color: "#fff", fontSize: 18, fontWeight: "900", marginTop: 2 },
  heroSub: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "600", marginTop: 2 },

  rankCard: {
    marginHorizontal: 16, marginTop: 10,
    borderRadius: 18, padding: 14, gap: 10,
  },
  rankCardInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rankLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  rankAvatar: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  rankHandle: { color: "#fff", fontSize: 14, fontWeight: "800" },
  rankPoints: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "600", marginTop: 1 },
  rankRight: { flexDirection: "row", gap: 8 },
  rankBadge: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: "center",
  },
  rankBadgeNum: { color: "#fff", fontSize: 14, fontWeight: "900" },
  rankBadgeLabel: { color: "rgba(255,255,255,0.7)", fontSize: 9, fontWeight: "700", marginTop: 1 },
  throneBar: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7,
  },
  throneText: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "600", flex: 1 },
  throneHighlight: { color: "#fff", fontWeight: "800" },

  tabs: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  tab: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    maxWidth: 180,
  },
  tabActive: { backgroundColor: Colors.blueSoft, borderColor: Colors.blue },
  tabText: { color: Colors.textSecondary, fontSize: 12, fontWeight: "700" },
  tabTextActive: { color: Colors.blue },

  list: { paddingHorizontal: 16, paddingBottom: 48 },
  listHeader: { color: Colors.textMuted, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },

  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 8,
  },
  rowHighlight: {
    borderColor: Colors.blue,
    backgroundColor: Colors.blueSoft,
  },
  rankCircle: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  rankText: { color: Colors.textSecondary, fontSize: 13, fontWeight: "800" },
  handle: { color: Colors.text, fontSize: 15, fontWeight: "800" },
  sub: { color: Colors.textMuted, fontSize: 11, fontWeight: "600", marginTop: 2 },
  badgePill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: Colors.orangeSoft,
    alignSelf: "flex-start",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
    marginTop: 3,
  },
  badgeText: { color: Colors.orange, fontSize: 10, fontWeight: "800" },
  points: { color: Colors.text, fontSize: 15, fontWeight: "800" },
});
