import React from "react";
import {
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { ExternalLink, Megaphone, Pin, Plus, Star } from "lucide-react-native";
import { Colors } from "@/constants/colors";
import {
  useSponsorUpdates,
  type SponsorUpdate,
} from "@/providers/SponsorUpdatesProvider";

function openUrl(url?: string) {
  if (!url) return;
  if (Platform.OS === "web") {
    try {
      window.open(url, "_blank");
    } catch (_) {}
  } else {
    Linking.openURL(url).catch(() => {});
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function SponsorUpdatesScreen(): React.ReactElement {
  const router = useRouter();
  const { updates } = useSponsorUpdates();

  return (
    <>
      <Stack.Screen
        options={{
          title: "Sponsor Updates",
          headerRight: () => (
            <Pressable
              onPress={() => router.push("/admin?tab=updates")}
              style={styles.headerBtn}
              testID="open-compose"
            >
              <Plus size={16} color={Colors.blue} />
              <Text style={styles.headerBtnText}>New</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
        {updates.length === 0 ? (
          <View style={styles.empty}>
            <Megaphone size={28} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No sponsor updates yet</Text>
            <Text style={styles.emptyHint}>
              Tap “New” to post the first announcement from a sponsor — product news,
              CLE invites, booth giveaways, or limited offers.
            </Text>
            <Pressable
              style={styles.emptyBtn}
              onPress={() => router.push("/admin?tab=updates")}
              testID="empty-compose"
            >
              <Plus size={14} color="#fff" />
              <Text style={styles.emptyBtnText}>Compose update</Text>
            </Pressable>
          </View>
        ) : (
          updates.map((u) => <UpdateCard key={u.id} update={u} />)
        )}
      </ScrollView>
    </>
  );
}

function UpdateCard({ update }: { update: SponsorUpdate }) {
  return (
    <Pressable
      onPress={() => openUrl(update.url)}
      style={styles.card}
      testID={`update-${update.id}`}
    >
      {update.imageUrl ? (
        <Image source={{ uri: update.imageUrl }} style={styles.image} />
      ) : null}
      <View style={styles.cardInner}>
        <View style={styles.cardTopRow}>
          <View style={styles.sponsorRow}>
            <Megaphone size={11} color={Colors.orange} />
            <Text style={styles.sponsorName} numberOfLines={1}>
              {update.sponsorName}
            </Text>
            {update.tier ? (
              <Text style={styles.tierTag}>{update.tier.toUpperCase()}</Text>
            ) : null}
          </View>
          <View style={styles.flagRow}>
            {update.pinned ? <Pin size={11} color={Colors.blue} /> : null}
            {update.featured ? <Star size={11} color={Colors.yellow} /> : null}
            <Text style={styles.time}>{timeAgo(update.createdAt)}</Text>
          </View>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {update.title}
        </Text>
        <Text style={styles.body} numberOfLines={4}>
          {update.body}
        </Text>
        {update.url ? (
          <View style={styles.linkRow}>
            <ExternalLink size={11} color={Colors.blue} />
            <Text style={styles.linkText} numberOfLines={1}>
              {update.url.replace(/^https?:\/\//, "")}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 16, gap: 12, paddingBottom: 64 },
  headerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 4,
  },
  headerBtnText: { color: Colors.blue, fontSize: 14, fontWeight: "800" },

  empty: {
    alignItems: "center",
    gap: 10,
    padding: 24,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 20,
  },
  emptyTitle: { color: Colors.text, fontSize: 16, fontWeight: "900" },
  emptyHint: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 18,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.blue,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    marginTop: 4,
  },
  emptyBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },

  card: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  image: { width: "100%", height: 160, backgroundColor: Colors.surface },
  cardInner: { padding: 14, gap: 6 },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sponsorRow: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  sponsorName: {
    color: Colors.orange,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.4,
    flexShrink: 1,
  },
  tierTag: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.6,
    backgroundColor: Colors.surface,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  flagRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  time: { color: Colors.textMuted, fontSize: 11, fontWeight: "700" },

  title: { color: Colors.text, fontSize: 16, fontWeight: "900", lineHeight: 21 },
  body: { color: Colors.textSecondary, fontSize: 13, fontWeight: "500", lineHeight: 19 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  linkText: { color: Colors.blue, fontSize: 12, fontWeight: "800" },
});
