import React from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Radio } from "lucide-react-native";
import { Colors } from "@/constants/colors";
import AlertCard from "@/components/AlertCard";
import SponsorSlot from "@/components/SponsorSlot";
import { useAlerts } from "@/providers/AlertsProvider";
import type { AlertKind } from "@/types";

const FILTERS: { key: "all" | AlertKind; label: string }[] = [
  { key: "all", label: "All" },
  { key: "prediction", label: "TortCast" },
  { key: "play", label: "Plays" },
  { key: "x", label: "X" },
  { key: "reddit", label: "Reddit" },
  { key: "announcement", label: "Announce" },
  { key: "resolution", label: "Resolved" },
];

export default function AlertsScreen(): React.ReactElement {
  const { alerts, filter, setFilter, upvote } = useAlerts();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Live Alerts</Text>
          <Text style={styles.subtitle}>Plays, forecasts, and social chatter</Text>
        </View>
        <View style={styles.livePill}>
          <View style={styles.dot} />
          <Radio size={11} color={Colors.emerald} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.pill, active && styles.pillActive]}
              testID={`alerts-filter-${f.key}`}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={alerts}
        keyExtractor={(a) => a.id}
        ListHeaderComponent={
          <View>
            <SponsorSlot tier="banner" label="Live Alerts top banner" />
            <SponsorSlot tier="ribbon" compact label="Sponsored breaking-news ticker" />
          </View>
        }
        renderItem={({ item, index }) => (
          <View>
            <AlertCard alert={item} onUpvote={upvote} />
            {(index + 1) % 5 === 0 && (
              <SponsorSlot tier="native" inline label={`In-feed sponsored alert · #${Math.floor(index / 5) + 1}`} />
            )}
          </View>
        )}
        ListFooterComponent={<SponsorSlot tier="sticky" label="Alerts feed bottom" />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No alerts yet. Make a play to start the feed.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4,
  },
  titleWrap: { flex: 1 },
  title: { color: Colors.text, fontSize: 26, fontWeight: "900", letterSpacing: -0.5 },
  subtitle: { color: Colors.textSecondary, fontSize: 12, fontWeight: "600", marginTop: 2 },
  livePill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.emeraldSoft,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.emerald },
  liveText: { color: Colors.emerald, fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  filterRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6, gap: 8 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  pillActive: { backgroundColor: Colors.text, borderColor: Colors.text },
  pillText: { color: Colors.textSecondary, fontSize: 12, fontWeight: "700" },
  pillTextActive: { color: "#fff" },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { color: Colors.textMuted, fontSize: 13, fontWeight: "600", textAlign: "center" },
});
