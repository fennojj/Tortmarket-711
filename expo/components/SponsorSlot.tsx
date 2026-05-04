import React from "react";
import {
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { Megaphone } from "lucide-react-native";
import { useSponsorMap } from "@/providers/SponsorMapProvider";
import { useSponsorConfig } from "@/providers/SponsorConfigProvider";
import { type SponsorSlotTier } from "@/constants/sponsors";

export type { SponsorSlotTier };

interface SlotConfig {
  bg: string;
  border: string;
  textColor: string;
  label: string;
  price: string;
}

const SLOT_CONFIG: Record<SponsorSlotTier, SlotConfig> = {
  title:       { bg: "rgba(37,99,235,0.18)",  border: "#2563EB", textColor: "#1D4ED8", label: "TITLE SPONSOR",        price: "Premium · $25K / 4-day" },
  presenting:  { bg: "rgba(124,58,237,0.16)", border: "#7C3AED", textColor: "#6D28D9", label: "PRESENTING SPONSOR",   price: "$10K / 4-day" },
  coach:       { bg: "rgba(99,102,241,0.16)", border: "#6366F1", textColor: "#4F46E5", label: "COACH SPONSOR",        price: "$8K / 4-day" },
  leaderboard: { bg: "rgba(245,158,11,0.18)", border: "#D97706", textColor: "#B45309", label: "LEADERBOARD SPONSOR",  price: "$6K / 4-day" },
  bounty:      { bg: "rgba(217,119,6,0.18)",  border: "#B45309", textColor: "#92400E", label: "CASE BOUNTY SPONSOR",  price: "$1.5K / case" },
  banner:      { bg: "rgba(255,106,26,0.16)", border: "#FF6A1A", textColor: "#C2410C", label: "BANNER AD",            price: "$2K / 4-day" },
  native:      { bg: "rgba(16,185,129,0.16)", border: "#10B981", textColor: "#047857", label: "NATIVE CARD AD",       price: "$3K / 4-day" },
  tier:        { bg: "rgba(236,72,153,0.16)", border: "#DB2777", textColor: "#BE185D", label: "CATEGORY SPONSOR",     price: "$1.5K / tier" },
  sticky:      { bg: "rgba(239,68,68,0.16)",  border: "#EF4444", textColor: "#B91C1C", label: "STICKY FOOTER",        price: "$5K / 4-day" },
  ribbon:      { bg: "rgba(132,204,22,0.20)", border: "#65A30D", textColor: "#3F6212", label: "RIBBON / TICKER",      price: "$1K / 4-day" },
};

interface SponsorSlotProps {
  tier: SponsorSlotTier;
  height?: number;
  label?: string;
  note?: string;
  style?: ViewStyle | ViewStyle[];
  compact?: boolean;
  inline?: boolean;
}

function openUrl(url?: string) {
  if (!url) return;
  if (Platform.OS === "web") {
    try { window.open(url, "_blank"); } catch (_) {}
  } else {
    Linking.openURL(url).catch(() => {});
  }
}

export default function SponsorSlot({
  tier,
  height,
  label,
  note,
  style,
  compact,
  inline,
}: SponsorSlotProps): React.ReactElement | null {
  const { visible } = useSponsorMap();
  const { creativeFor } = useSponsorConfig();
  const creative = creativeFor(tier);
  const hasCreative = creative?.active === true;

  // No creative assigned → only show placeholder when sponsor map is on
  if (!hasCreative && !visible) return null;

  const cfg = SLOT_CONFIG[tier];
  const minH = height ?? (compact ? 52 : 70);

  // ── REAL CREATIVE ────────────────────────────────────────────────────────
  if (hasCreative && creative) {
    const bg = creative.backgroundColor ?? "#0B1220";
    const fg = creative.textColor ?? "#FFFFFF";
    const accent = creative.accentColor ?? "#FF6A1A";

    return (
      <Pressable
        onPress={() => openUrl(creative.url)}
        style={[
          styles.creativeWrapper,
          inline && styles.slotInline,
          { minHeight: minH },
          style,
        ]}
        testID={`sponsor-creative-${tier}`}
      >
        {/* Background image */}
        {creative.imageUrl ? (
          <Image
            source={{ uri: creative.imageUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: bg }]} />
        )}

        {/* Dim overlay for readability over images */}
        {creative.imageUrl && (
          <View style={[StyleSheet.absoluteFill, styles.imageDim]} />
        )}

        <View style={styles.creativeInner}>
          {/* Logo */}
          {creative.logoUrl && (
            <Image
              source={{ uri: creative.logoUrl }}
              style={styles.logo}
              resizeMode="contain"
            />
          )}

          <View style={{ flex: 1 }}>
            <Text style={[styles.creativeName, { color: fg }]} numberOfLines={1}>
              {creative.name}
            </Text>
            {creative.tagline ? (
              <Text style={[styles.creativeTagline, { color: fg }]} numberOfLines={2}>
                {creative.tagline}
              </Text>
            ) : null}
          </View>
        </View>

        {/* "Sponsored" badge */}
        <View style={[styles.sponsoredBadge, { backgroundColor: accent }]}>
          <Text style={styles.sponsoredText}>SPONSORED</Text>
        </View>

        {/* Sponsor map overlay badge (demo mode) */}
        {visible && (
          <View style={[styles.mapOverlay, { borderColor: cfg.border }]}>
            <Megaphone size={8} color={cfg.border} />
            <Text style={[styles.mapOverlayText, { color: cfg.border }]}>
              {cfg.label}
            </Text>
          </View>
        )}
      </Pressable>
    );
  }

  // ── PLACEHOLDER (sponsor map demo mode) ─────────────────────────────────
  return (
    <View
      style={[
        styles.slot,
        inline && styles.slotInline,
        compact && styles.slotCompact,
        {
          backgroundColor: cfg.bg,
          borderColor: cfg.border,
          minHeight: minH,
        },
        style,
      ]}
      testID={`sponsor-slot-${tier}`}
    >
      <View style={[styles.tag, { backgroundColor: cfg.border }]}>
        <Megaphone size={9} color="#fff" />
        <Text style={styles.tagText}>{cfg.label}</Text>
      </View>
      <Text style={[styles.title, { color: cfg.textColor }]} numberOfLines={1}>
        {label ?? "Sponsor logo + tagline"}
      </Text>
      <Text style={[styles.price, { color: cfg.textColor }]} numberOfLines={1}>
        {note ?? cfg.price}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Placeholder ──
  slot: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: "dashed",
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    gap: 3,
  },
  slotInline: { marginHorizontal: 0, marginVertical: 4 },
  slotCompact: { paddingVertical: 8, gap: 2 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  tagText: { color: "#fff", fontSize: 8.5, fontWeight: "900", letterSpacing: 0.6 },
  title: { fontSize: 12.5, fontWeight: "900", marginTop: 2 },
  price: { fontSize: 10, fontWeight: "700", opacity: 0.85 },

  // ── Real creative ──
  creativeWrapper: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 14,
    overflow: "hidden",
    minHeight: 70,
  },
  imageDim: {
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  creativeInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flex: 1,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  creativeName: {
    fontSize: 13.5,
    fontWeight: "900",
    letterSpacing: 0.1,
  },
  creativeTagline: {
    fontSize: 11,
    fontWeight: "600",
    opacity: 0.82,
    marginTop: 2,
    lineHeight: 15,
  },
  sponsoredBadge: {
    position: "absolute",
    top: 8,
    right: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  sponsoredText: {
    color: "#fff",
    fontSize: 7.5,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  mapOverlay: {
    position: "absolute",
    bottom: 6,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  mapOverlayText: {
    fontSize: 7.5,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});
