import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import {
  ArrowUpRight,
  Brain,
  Heart,
  Megaphone,
  MessageCircle,
  Rocket,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { useMarkets } from "@/providers/MarketsProvider";
import type { AlertItem } from "@/types";

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

interface Props {
  alert: AlertItem;
  onUpvote?: (id: string) => void;
}

export default function AlertCard({ alert, onUpvote }: Props): React.ReactElement {
  const { markets } = useMarkets();
  const market = useMemo(
    () => (alert.marketId ? markets.find((m) => m.id === alert.marketId) : undefined),
    [alert.marketId, markets],
  );

  const meta = useMemo(() => {
    switch (alert.kind) {
      case "prediction":
        return { label: "TortCast", color: Colors.purpleAccent, bg: "#EEE4FF", Icon: Brain };
      case "x":
        return { label: "X", color: Colors.text, bg: Colors.surface, Icon: MessageCircle };
      case "reddit":
        return { label: "Reddit", color: Colors.orange, bg: Colors.orangeSoft, Icon: MessageCircle };
      case "play":
        return { label: "Play", color: Colors.blue, bg: Colors.blueSoft, Icon: Rocket };
      case "announcement":
        return { label: "Announcement", color: Colors.yellow, bg: "#FFF5D6", Icon: Megaphone };
      case "resolution":
        return { label: "Resolved", color: Colors.emerald, bg: Colors.emeraldSoft, Icon: Trophy };
      default:
        return { label: "Alert", color: Colors.text, bg: Colors.surface, Icon: Megaphone };
    }
  }, [alert.kind]);

  const openMarket = () => {
    if (alert.marketId) router.push(`/market/${alert.marketId}`);
  };

  return (
    <Pressable
      onPress={openMarket}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
      testID={`alert-${alert.id}`}
    >
      <View style={styles.topRow}>
        <View style={[styles.kindPill, { backgroundColor: meta.bg }]}>
          <meta.Icon size={11} color={meta.color} />
          <Text style={[styles.kindText, { color: meta.color }]}>{meta.label}</Text>
        </View>
        {market ? (
          <View style={styles.priceChip}>
            {market.change24h >= 0 ? (
              <TrendingUp size={11} color={Colors.emerald} />
            ) : (
              <TrendingDown size={11} color={Colors.red} />
            )}
            <Text style={styles.priceText}>{`YES ${market.yesPrice}¢`}</Text>
          </View>
        ) : null}
        <Text style={styles.time}>{timeAgo(alert.createdAt)}</Text>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {alert.title}
      </Text>
      <Text style={styles.body} numberOfLines={3}>
        {alert.body}
      </Text>

      {alert.kind === "prediction" && typeof alert.confidence === "number" ? (
        <View style={styles.confRow}>
          <View style={styles.confTrack}>
            <View style={[styles.confFill, { width: `${alert.confidence}%` }]} />
          </View>
          <Text style={styles.confText}>{alert.confidence}% confidence</Text>
        </View>
      ) : null}

      <View style={styles.footRow}>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onUpvote?.(alert.id);
          }}
          style={styles.footBtn}
          hitSlop={8}
        >
          <Heart size={13} color={Colors.textSecondary} />
          <Text style={styles.footText}>{alert.upvotes ?? 0}</Text>
        </Pressable>
        {alert.reposts !== undefined ? (
          <View style={styles.footBtn}>
            <ArrowUpRight size={13} color={Colors.textSecondary} />
            <Text style={styles.footText}>{alert.reposts}</Text>
          </View>
        ) : null}
        {alert.author ? <Text style={styles.author}>{alert.author}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 16, padding: 14, marginBottom: 10,
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  kindPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
  },
  kindText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  priceChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
    borderWidth: 1, borderColor: Colors.border,
  },
  priceText: { color: Colors.text, fontSize: 11, fontWeight: "800" },
  time: { marginLeft: "auto", color: Colors.textMuted, fontSize: 11, fontWeight: "700" },
  title: { color: Colors.text, fontSize: 15, fontWeight: "800", marginTop: 10, letterSpacing: -0.2 },
  body: { color: Colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 4 },
  confRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  confTrack: {
    flex: 1, height: 6, borderRadius: 999,
    backgroundColor: Colors.surface, overflow: "hidden",
    borderWidth: 1, borderColor: Colors.border,
  },
  confFill: { height: "100%", backgroundColor: Colors.purpleAccent, borderRadius: 999 },
  confText: { color: Colors.textSecondary, fontSize: 11, fontWeight: "800" },
  footRow: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 12 },
  footBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  footText: { color: Colors.textSecondary, fontSize: 12, fontWeight: "700" },
  author: { marginLeft: "auto", color: Colors.textMuted, fontSize: 11, fontWeight: "700" },
});
