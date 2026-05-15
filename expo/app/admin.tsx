import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  Save,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  Send,
  Pin,
  Star,
  X,
  Megaphone,
  Share2,
  Copy,
} from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { Colors } from "@/constants/colors";
import { useSponsorConfig, type SponsorMap } from "@/providers/SponsorConfigProvider";
import { useSponsorMap } from "@/providers/SponsorMapProvider";
import { useSponsorUpdates } from "@/providers/SponsorUpdatesProvider";
import SponsorSlot from "@/components/SponsorSlot";
import type { SponsorSlotTier } from "@/constants/sponsors";

type AdminTab = "sponsors" | "updates" | "pitch";

const TIERS: SponsorSlotTier[] = [
  "banner",
  "presenting",
  "title",
  "coach",
  "leaderboard",
  "native",
  "tier",
  "sticky",
  "ribbon",
  "bounty",
];

const TIER_PRICES: Record<SponsorSlotTier, string> = {
  title: "$25,000 / 4-day",
  presenting: "$10,000 / 4-day",
  coach: "$8,000 / 4-day",
  leaderboard: "$6,000 / 4-day",
  bounty: "$1,500 / case",
  banner: "$2,000 / 4-day",
  native: "$3,000 / 4-day",
  tier: "$1,500 / tier",
  sticky: "$5,000 / 4-day",
  ribbon: "$1,000 / 4-day",
};

const SAMPLE: SponsorMap = {
  banner: {
    name: "Smith & Jones LLP",
    tagline: "Fighting for victims since 1998 — Free consultation",
    backgroundColor: "#0B1F4B",
    textColor: "#FFFFFF",
    accentColor: "#F59E0B",
    url: "https://example.com",
    active: true,
  },
};

export default function AdminScreen(): React.ReactElement {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const initialTab: AdminTab =
    params.tab === "updates" || params.tab === "pitch" ? params.tab : "sponsors";
  const [tab, setTab] = useState<AdminTab>(initialTab);

  return (
    <>
      <Stack.Screen options={{ title: "Sponsor Admin" }} />
      <View style={styles.wrap}>
        <View style={styles.tabBar}>
          <TabPill label="Sponsors" active={tab === "sponsors"} onPress={() => setTab("sponsors")} />
          <TabPill label="Updates" active={tab === "updates"} onPress={() => setTab("updates")} />
          <TabPill label="Pitch" active={tab === "pitch"} onPress={() => setTab("pitch")} />
        </View>
        {tab === "sponsors" && <SponsorsTab onDone={() => router.back()} />}
        {tab === "updates" && <UpdatesTab />}
        {tab === "pitch" && <PitchTab />}
      </View>
    </>
  );
}

function TabPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tabPill, active && styles.tabPillActive]}
      testID={`tab-${label.toLowerCase()}`}
    >
      <Text style={[styles.tabPillText, active && styles.tabPillTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── SPONSORS TAB ───────────────────────────────────────────────────────────
function SponsorsTab({ onDone }: { onDone: () => void }) {
  const {
    creatives,
    setLocalOverride,
    clearLocalOverride,
    refreshRemote,
    remoteUrl,
    remoteEnabled,
    remoteUpdatedAt,
    remoteFetching,
    localActive,
  } = useSponsorConfig();
  const { visible: mapVisible, setVisible: setMapVisible } = useSponsorMap();

  const initialJson = useMemo(() => JSON.stringify(creatives, null, 2), []);
  const [text, setText] = useState<string>(initialJson);
  const [error, setError] = useState<string | null>(null);

  const onSave = async () => {
    try {
      const parsed = JSON.parse(text) as SponsorMap;
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        setError("Top-level JSON must be an object keyed by tier.");
        return;
      }
      setError(null);
      await setLocalOverride(parsed);
      Alert.alert("Saved", "Sponsor creatives updated. Slots will refresh instantly.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid JSON";
      setError(msg);
    }
  };

  const onClear = () => {
    Alert.alert("Clear local override?", "Falls back to remote feed + defaults.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          await clearLocalOverride();
          setText("{}");
          Alert.alert("Cleared", "Local override removed.");
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Live status</Text>
          <Row
            label="Local override"
            value={localActive ? "ACTIVE" : "off"}
            accent={localActive ? Colors.emerald : Colors.textMuted}
          />
          <Row
            label="Remote feed"
            value={remoteEnabled ? (remoteFetching ? "fetching…" : "enabled") : "not configured"}
            accent={remoteEnabled ? Colors.blue : Colors.textMuted}
          />
          {remoteEnabled && (
            <>
              <Row label="Feed URL" value={remoteUrl} small />
              <Row
                label="Last fetch"
                value={remoteUpdatedAt ? new Date(remoteUpdatedAt).toLocaleTimeString() : "—"}
                small
              />
            </>
          )}
          <View style={styles.toggleRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {mapVisible ? (
                <Eye size={14} color={Colors.text} />
              ) : (
                <EyeOff size={14} color={Colors.textMuted} />
              )}
              <Text style={styles.toggleLabel}>Slot map (placeholders)</Text>
            </View>
            <Switch value={mapVisible} onValueChange={setMapVisible} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Active creatives</Text>
        <Text style={styles.sectionHint}>
          Tap a slot to preview it inline. Set active:true in JSON to render real creative.
        </Text>
        {TIERS.map((t) => {
          const c = creatives[t];
          return (
            <View key={t} style={styles.tierRow}>
              <View style={styles.tierHead}>
                <Text style={styles.tierName}>{t.toUpperCase()}</Text>
                <Text
                  style={[
                    styles.tierState,
                    { color: c?.active ? Colors.emerald : Colors.textMuted },
                  ]}
                >
                  {c?.active ? "LIVE" : c ? "INACTIVE" : "EMPTY"}
                </Text>
              </View>
              {c ? (
                <Text style={styles.tierMeta} numberOfLines={1}>
                  {c.name} {c.tagline ? `· ${c.tagline}` : ""}
                </Text>
              ) : null}
              <SponsorSlot tier={t} label={`${t} preview`} />
            </View>
          );
        })}

        <Text style={[styles.sectionTitle, { marginTop: 12 }]}>JSON editor</Text>
        <Text style={styles.sectionHint}>
          Paste a sponsor map keyed by tier. Saving stores it locally and updates every slot
          immediately. To distribute, host the same JSON at EXPO_PUBLIC_SPONSOR_FEED_URL.
        </Text>

        <View style={styles.editorRow}>
          <Pressable
            style={[styles.smallBtn, styles.smallBtnGhost]}
            onPress={() => setText(JSON.stringify(creatives, null, 2))}
          >
            <Text style={styles.smallBtnText}>Load current</Text>
          </Pressable>
          <Pressable
            style={[styles.smallBtn, styles.smallBtnGhost]}
            onPress={() => setText(JSON.stringify(SAMPLE, null, 2))}
          >
            <Text style={styles.smallBtnText}>Sample</Text>
          </Pressable>
          <Pressable style={[styles.smallBtn, styles.smallBtnGhost]} onPress={refreshRemote}>
            <RefreshCw size={12} color={Colors.text} />
            <Text style={styles.smallBtnText}>Refresh feed</Text>
          </Pressable>
        </View>

        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.editor}
          placeholder='{ "banner": { "name": "...", "active": true } }'
          placeholderTextColor={Colors.textMuted}
          testID="sponsor-json"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.actionRow}>
          <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onSave} testID="sponsor-save">
            <Save size={14} color="#fff" />
            <Text style={styles.btnText}>Save & apply</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnDanger]} onPress={onClear} testID="sponsor-clear">
            <Trash2 size={14} color="#fff" />
            <Text style={styles.btnText}>Clear local</Text>
          </Pressable>
        </View>

        <Pressable onPress={onDone} style={styles.doneBtn}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── UPDATES TAB ────────────────────────────────────────────────────────────
function UpdatesTab() {
  const router = useRouter();
  const { updates, addUpdate, removeUpdate, togglePinned, toggleFeatured } =
    useSponsorUpdates();

  const [sponsorName, setSponsorName] = useState<string>("");
  const [tier, setTier] = useState<SponsorSlotTier | undefined>(undefined);
  const [title, setTitle] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [url, setUrl] = useState<string>("");
  const [pinned, setPinned] = useState<boolean>(false);
  const [featured, setFeatured] = useState<boolean>(false);

  const reset = () => {
    setSponsorName("");
    setTier(undefined);
    setTitle("");
    setBody("");
    setImageUrl("");
    setUrl("");
    setPinned(false);
    setFeatured(false);
  };

  const onPost = async () => {
    if (!sponsorName.trim() || !title.trim() || !body.trim()) {
      Alert.alert("Missing fields", "Sponsor name, title, and body are required.");
      return;
    }
    await addUpdate({
      sponsorName,
      tier,
      title,
      body,
      imageUrl: imageUrl || undefined,
      url: url || undefined,
      pinned,
      featured,
    });
    reset();
    Alert.alert("Posted", "Sponsor update is live in the feed.");
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Compose update</Text>
        <Text style={styles.sectionHint}>
          Post sponsor announcements, CLE invites, booth giveaways, or limited offers.
          They appear in the public Sponsor Updates feed.
        </Text>

        <Field label="Sponsor name *" value={sponsorName} onChange={setSponsorName} placeholder="Smith & Jones LLP" />
        <Field label="Title *" value={title} onChange={setTitle} placeholder="Visit our booth #214 — free CLE credit" />
        <Field
          label="Body *"
          value={body}
          onChange={setBody}
          placeholder="What sponsors want attendees to know…"
          multiline
        />
        <Field
          label="Image URL"
          value={imageUrl}
          onChange={setImageUrl}
          placeholder="https://your-cdn.com/announcement.jpg"
        />
        <Field
          label="Click-through URL"
          value={url}
          onChange={setUrl}
          placeholder="https://sponsor.com/landing"
        />

        <Text style={styles.fieldLabel}>Tier (optional)</Text>
        <View style={styles.tierWrap}>
          <Pressable
            onPress={() => setTier(undefined)}
            style={[styles.tierChip, tier === undefined && styles.tierChipActive]}
          >
            <Text
              style={[styles.tierChipText, tier === undefined && styles.tierChipTextActive]}
            >
              none
            </Text>
          </Pressable>
          {TIERS.map((t) => (
            <Pressable
              key={t}
              onPress={() => setTier(t)}
              style={[styles.tierChip, tier === t && styles.tierChipActive]}
            >
              <Text
                style={[styles.tierChipText, tier === t && styles.tierChipTextActive]}
              >
                {t}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.flagsRow}>
          <View style={styles.flagToggle}>
            <Pin size={14} color={pinned ? Colors.blue : Colors.textMuted} />
            <Text style={styles.toggleLabel}>Pin</Text>
            <Switch value={pinned} onValueChange={setPinned} />
          </View>
          <View style={styles.flagToggle}>
            <Star size={14} color={featured ? Colors.yellow : Colors.textMuted} />
            <Text style={styles.toggleLabel}>Feature on home</Text>
            <Switch value={featured} onValueChange={setFeatured} />
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onPost} testID="post-update">
            <Send size={14} color="#fff" />
            <Text style={styles.btnText}>Post update</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.btnGhost]}
            onPress={() => router.push("/sponsor-updates")}
          >
            <Megaphone size={14} color={Colors.text} />
            <Text style={[styles.btnText, { color: Colors.text }]}>View feed</Text>
          </Pressable>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
          Posted updates ({updates.length})
        </Text>
        {updates.length === 0 ? (
          <Text style={styles.sectionHint}>No updates yet. Post one above.</Text>
        ) : (
          updates.map((u) => (
            <View key={u.id} style={styles.updateRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.updateTitle} numberOfLines={1}>
                  {u.title}
                </Text>
                <Text style={styles.updateMeta} numberOfLines={1}>
                  {u.sponsorName}
                  {u.tier ? ` · ${u.tier}` : ""}
                  {u.pinned ? " · pinned" : ""}
                  {u.featured ? " · featured" : ""}
                </Text>
              </View>
              <Pressable
                onPress={() => togglePinned(u.id)}
                style={styles.iconBtn}
                hitSlop={8}
              >
                <Pin size={14} color={u.pinned ? Colors.blue : Colors.textMuted} />
              </Pressable>
              <Pressable
                onPress={() => toggleFeatured(u.id)}
                style={styles.iconBtn}
                hitSlop={8}
              >
                <Star size={14} color={u.featured ? Colors.yellow : Colors.textMuted} />
              </Pressable>
              <Pressable
                onPress={() =>
                  Alert.alert("Delete update?", u.title, [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => removeUpdate(u.id),
                    },
                  ])
                }
                style={styles.iconBtn}
                hitSlop={8}
              >
                <X size={14} color={Colors.red} />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── PITCH TAB ──────────────────────────────────────────────────────────────
function PitchTab() {
  const pitchText = useMemo(() => {
    const lines = [
      "Tort Market — Sponsorship Opportunities",
      "",
      "Reach mass-tort attorneys where they make decisions. Tort Market is a daily-use",
      "intelligence + prediction-market app for plaintiff lawyers, conference attendees,",
      "and case investors. Sponsors get persistent placement, native cards, and",
      "dedicated announcements in the Sponsor Updates feed.",
      "",
      "TIERS",
      ...TIERS.map((t) => `  · ${t.toUpperCase().padEnd(12)} ${TIER_PRICES[t]}`),
      "",
      "WHAT YOU GET",
      "  · Logo + tagline rendered in your tier across the app",
      "  · Click-through to your landing page",
      "  · Unlimited posts in the Sponsor Updates feed during the engagement",
      "  · Optional featured placement on the home screen",
      "  · Performance recap (impressions, taps) at the end of the run",
      "",
      "Contact: sponsorships@tortsite.app",
    ];
    return lines.join("\n");
  }, []);

  const onCopy = async () => {
    try {
      await Clipboard.setStringAsync(pitchText);
      Alert.alert("Copied", "Pitch copied to clipboard.");
    } catch (e) {
      Alert.alert("Error", "Could not copy.");
    }
  };

  const onShare = async () => {
    try {
      await Share.share({ message: pitchText });
    } catch (_) {}
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Sponsorship pitch</Text>
      <Text style={styles.sectionHint}>
        Share this with prospective sponsors. Edit prices in admin.tsx (TIER_PRICES) to match
        your current rate card.
      </Text>

      <View style={styles.pitchCard}>
        <Text style={styles.pitchText}>{pitchText}</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onShare}>
          <Share2 size={14} color="#fff" />
          <Text style={styles.btnText}>Share</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.btnGhost]} onPress={onCopy}>
          <Copy size={14} color={Colors.text} />
          <Text style={[styles.btnText, { color: Colors.text }]}>Copy</Text>
        </Pressable>
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Tier rate card</Text>
      {TIERS.map((t) => (
        <View key={t} style={styles.rateRow}>
          <Text style={styles.rateName}>{t.toUpperCase()}</Text>
          <Text style={styles.ratePrice}>{TIER_PRICES[t]}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── helpers ────────────────────────────────────────────────────────────────
function Row({
  label,
  value,
  accent,
  small,
}: {
  label: string;
  value: string;
  accent?: string;
  small?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          accent ? { color: accent } : null,
          small ? { fontSize: 11 } : null,
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        multiline={multiline}
        style={[styles.input, multiline && styles.inputMultiline]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 16, gap: 12, paddingBottom: 64 },

  tabBar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: Colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tabPillActive: { backgroundColor: Colors.text, borderColor: Colors.text },
  tabPillText: { color: Colors.text, fontSize: 12, fontWeight: "800" },
  tabPillTextActive: { color: "#fff" },

  statusCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  statusTitle: { color: Colors.text, fontSize: 14, fontWeight: "900", marginBottom: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  rowLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: "700" },
  rowValue: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: "800",
    flexShrink: 1,
    textAlign: "right",
  },
  toggleRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  toggleLabel: { color: Colors.text, fontSize: 13, fontWeight: "700" },

  sectionTitle: { color: Colors.text, fontSize: 16, fontWeight: "900", marginTop: 4 },
  sectionHint: { color: Colors.textMuted, fontSize: 12, fontWeight: "600", marginBottom: 4 },

  tierRow: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 10,
    gap: 6,
  },
  tierHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tierName: { color: Colors.text, fontSize: 11, fontWeight: "900", letterSpacing: 0.6 },
  tierState: { fontSize: 10, fontWeight: "900", letterSpacing: 0.6 },
  tierMeta: { color: Colors.textSecondary, fontSize: 11, fontWeight: "600" },

  editorRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  smallBtnGhost: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  smallBtnText: { color: Colors.text, fontSize: 11, fontWeight: "800" },

  editor: {
    minHeight: 220,
    backgroundColor: "#0B1220",
    color: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
    textAlignVertical: "top",
  },
  error: { color: Colors.red, fontSize: 12, fontWeight: "700" },

  actionRow: { flexDirection: "row", gap: 10 },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 46,
    borderRadius: 12,
  },
  btnPrimary: { backgroundColor: Colors.blue },
  btnDanger: { backgroundColor: Colors.red },
  btnGhost: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnText: { color: "#fff", fontSize: 13, fontWeight: "800" },

  doneBtn: { alignSelf: "center", padding: 12, marginTop: 4 },
  doneText: { color: Colors.textMuted, fontSize: 13, fontWeight: "700" },

  fieldLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginTop: 4,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  inputMultiline: { minHeight: 100, textAlignVertical: "top" },

  tierWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tierChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tierChipActive: { backgroundColor: Colors.blue, borderColor: Colors.blue },
  tierChipText: { color: Colors.text, fontSize: 11, fontWeight: "800" },
  tierChipTextActive: { color: "#fff" },

  flagsRow: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  flagToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flex: 1,
  },

  updateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 10,
  },
  updateTitle: { color: Colors.text, fontSize: 13, fontWeight: "800" },
  updateMeta: { color: Colors.textMuted, fontSize: 11, fontWeight: "600", marginTop: 2 },
  iconBtn: { padding: 6 },

  pitchCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
  },
  pitchText: {
    color: Colors.text,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  rateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rateName: { color: Colors.text, fontSize: 12, fontWeight: "900", letterSpacing: 0.6 },
  ratePrice: { color: Colors.blue, fontSize: 12, fontWeight: "900" },
});
