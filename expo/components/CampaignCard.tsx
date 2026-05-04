import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import {
  ArrowRight,
  BadgeCheck,
  Eye,
  MousePointerClick,
  Pause,
  Play,
  Radio,
  Users,
  Zap,
} from "lucide-react-native";
import { Colors } from "@/constants/colors";
import {
  type Campaign,
  type CampaignChannel,
  channelLabel,
  kindLabel,
  toneColor,
} from "@/utils/campaigns";

interface Props {
  campaign: Campaign;
  onLaunch?: (id: string) => void;
  onPause?: (id: string) => void;
}

const CHANNEL_COLORS: Record<CampaignChannel, { bg: string; fg: string }> = {
  x: { bg: "#111827", fg: "#fff" },
  reddit: { bg: "#FFE2D1", fg: "#FF4500" },
  discord: { bg: "#EEE4FF", fg: "#5865F2" },
  push: { bg: "#D1FADF", fg: "#10B981" },
  email: { bg: "#DCE7FF", fg: "#2563EB" },
};

function fmtN(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function CampaignCard({ campaign, onLaunch, onPause }: Props): React.ReactElement {
  const [expandedChannel, setExpandedChannel] = useState<CampaignChannel | null>(null);
  const accent = useMemo(() => toneColor(campaign.tone), [campaign.tone]);
  const isLive = campaign.status === "live";
  const isDone = campaign.status === "completed";

  const statusLabel = isLive
    ? "LIVE"
    : isDone
    ? "COMPLETED"
    : campaign.status === "scheduled"
    ? "SCHEDULED"
    : "DRAFT";

  const openRoute = () => {
    if (campaign.cta.route) router.push(campaign.cta.route as never);
  };

  return (
    <View style={styles.card} testID={`campaign-${campaign.id}`}>
      <View style={styles.topRow}>
        <View style={[styles.kindPill, { backgroundColor: accent + "22", borderColor: accent + "55" }]}>
          <Zap size={10} color={accent} />
          <Text style={[styles.kindText, { color: accent }]}>{kindLabel(campaign.kind)}</Text>
        </View>
        <View style={[styles.statusPill, isLive && styles.statusLive, isDone && styles.statusDone]}>
          {isLive ? (
            <View style={styles.liveDot} />
          ) : isDone ? (
            <BadgeCheck size={10} color={Colors.emerald} />
          ) : (
            <Radio size={10} color={Colors.textMuted} />
          )}
          <Text style={[styles.statusText, isLive && { color: Colors.emerald }, isDone && { color: Colors.emerald }]}>
            {statusLabel}
          </Text>
        </View>
        <Text style={styles.time}>{timeAgo(campaign.createdAt)}</Text>
      </View>

      <Text style={styles.headline} numberOfLines={2}>
        {campaign.headline}
      </Text>
      <Text style={styles.tagline} numberOfLines={3}>
        {campaign.tagline}
      </Text>

      {campaign.reasons.length > 0 ? (
        <View style={styles.reasonRow}>
          {campaign.reasons.slice(0, 3).map((r) => (
            <View key={r} style={styles.reasonChip}>
              <Text style={styles.reasonText}>{r}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.channelRow}>
        {campaign.channels.map((c) => {
          const clr = CHANNEL_COLORS[c];
          const active = expandedChannel === c;
          return (
            <Pressable
              key={c}
              onPress={() => setExpandedChannel(active ? null : c)}
              style={[styles.channelChip, { backgroundColor: clr.bg }, active && styles.channelChipActive]}
              testID={`cmp-${campaign.id}-ch-${c}`}
            >
              <Text style={[styles.channelText, { color: clr.fg }]}>{channelLabel(c)}</Text>
            </Pressable>
          );
        })}
      </View>

      {expandedChannel ? (
        <View style={styles.postBox}>
          <Text style={styles.postLabel}>{channelLabel(expandedChannel)} draft</Text>
          <Text style={styles.postBody}>
            {campaign.posts.find((p) => p.channel === expandedChannel)?.body ?? ""}
          </Text>
          {campaign.posts.find((p) => p.channel === expandedChannel)?.hashtags?.length ? (
            <Text style={styles.hashtags}>
              {campaign.posts
                .find((p) => p.channel === expandedChannel)
                ?.hashtags?.join(" ")}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.metricsRow}>
        <Metric icon="eye" label="Impressions" value={fmtN(campaign.metrics.impressions)} />
        <Metric icon="click" label="Clicks" value={fmtN(campaign.metrics.clicks)} />
        <Metric icon="users" label="Signups" value={fmtN(campaign.metrics.signups)} />
        <Metric icon="zap" label="Plays" value={fmtN(campaign.metrics.plays)} />
      </View>

      {isLive ? (
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(100, (campaign.metrics.impressions / Math.max(1, campaign.priority * 300)) * 100)}%`,
                backgroundColor: accent,
              },
            ]}
          />
        </View>
      ) : null}

      <View style={styles.actionRow}>
        {campaign.cta.route ? (
          <Pressable onPress={openRoute} style={styles.ctaBtn} testID={`cmp-${campaign.id}-cta`}>
            <Text style={styles.ctaText}>{campaign.cta.label}</Text>
            <ArrowRight size={13} color={Colors.text} />
          </Pressable>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {isLive ? (
          <Pressable
            onPress={() => onPause?.(campaign.id)}
            style={styles.iconBtn}
            testID={`cmp-${campaign.id}-pause`}
          >
            <Pause size={14} color={Colors.textSecondary} />
          </Pressable>
        ) : !isDone ? (
          <Pressable
            onPress={() => onLaunch?.(campaign.id)}
            style={[styles.iconBtn, styles.iconBtnAccent]}
            testID={`cmp-${campaign.id}-launch`}
          >
            <Play size={14} color="#fff" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: "eye" | "click" | "users" | "zap";
  label: string;
  value: string;
}) {
  const Icon = icon === "eye" ? Eye : icon === "click" ? MousePointerClick : icon === "users" ? Users : Zap;
  return (
    <View style={styles.metric}>
      <Icon size={11} color={Colors.textMuted} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  kindPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  kindText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusLive: { backgroundColor: Colors.emeraldSoft, borderColor: Colors.emerald + "55" },
  statusDone: { backgroundColor: Colors.emeraldSoft, borderColor: Colors.emerald + "55" },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.emerald },
  statusText: { color: Colors.textMuted, fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  time: { marginLeft: "auto", color: Colors.textMuted, fontSize: 11, fontWeight: "700" },

  headline: { color: Colors.text, fontSize: 15.5, fontWeight: "900", marginTop: 10, letterSpacing: -0.2 },
  tagline: { color: Colors.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 4 },

  reasonRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  reasonChip: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  reasonText: { color: Colors.textSecondary, fontSize: 10.5, fontWeight: "700" },

  channelRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  channelChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  channelChipActive: { borderWidth: 1, borderColor: Colors.text },
  channelText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.4 },

  postBox: {
    marginTop: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 11,
  },
  postLabel: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  postBody: { color: Colors.text, fontSize: 12.5, lineHeight: 17, fontWeight: "500" },
  hashtags: { color: Colors.blue, fontSize: 11.5, fontWeight: "700", marginTop: 6 },

  metricsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 12,
  },
  metric: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 2,
    alignItems: "flex-start",
  },
  metricValue: { color: Colors.text, fontSize: 13, fontWeight: "900", marginTop: 2 },
  metricLabel: { color: Colors.textMuted, fontSize: 9, fontWeight: "700", letterSpacing: 0.3 },

  progressTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    overflow: "hidden",
    marginTop: 10,
  },
  progressFill: { height: "100%", borderRadius: 999 },

  actionRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  ctaText: { color: Colors.text, fontSize: 12, fontWeight: "800" },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginLeft: "auto",
  },
  iconBtnAccent: { backgroundColor: Colors.text, borderColor: Colors.text },
});
