import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  LayoutTemplate,
  Megaphone,
  Paintbrush,
  Share2,
  Trash2,
  X,
} from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { type SponsorCreative, type SponsorSlotTier, TIERS } from "@/constants/sponsors";
import { useSponsorConfig } from "@/providers/SponsorConfigProvider";
import SponsorSlot from "@/components/SponsorSlot";
import JoinSponsorReel from "@/components/JoinSponsorReel";
import TortMarketLogo from "@/components/TortMarketLogo";

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

function isHex(v: string): boolean {
  return HEX_RE.test(v.trim());
}

function toColor(v: string, fallback: string): string {
  const trimmed = v.trim();
  return isHex(trimmed) ? trimmed.toUpperCase() : fallback;
}

const TIERS_LIST: { key: SponsorSlotTier; label: string; price: string }[] = [
  { key: "title", label: "Title sponsor", price: "$25K / 4-day" },
  { key: "presenting", label: "Presenting sponsor", price: "$10K / 4-day" },
  { key: "coach", label: "Coach sponsor", price: "$8K / 4-day" },
  { key: "leaderboard", label: "Leaderboard sponsor", price: "$6K / 4-day" },
  { key: "banner", label: "Banner ad", price: "$2K / 4-day" },
  { key: "native", label: "Native card", price: "$3K / 4-day" },
  { key: "tier", label: "Category sponsor", price: "$1.5K / tier" },
  { key: "sticky", label: "Sticky footer", price: "$5K / 4-day" },
  { key: "ribbon", label: "Ribbon / ticker", price: "$1K / 4-day" },
  { key: "bounty", label: "Case bounty", price: "$1.5K / case" },
];

interface DemoForm {
  name: string;
  tagline: string;
  logoUrl: string;
  imageUrl: string;
  url: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  tier: SponsorSlotTier;
}

const DEFAULT_FORM: DemoForm = {
  name: "",
  tagline: "",
  logoUrl: "",
  imageUrl: "",
  url: "",
  backgroundColor: "#0B1220",
  textColor: "#FFFFFF",
  accentColor: "#FF6A1A",
  tier: "banner",
};

function buildCreative(form: DemoForm): SponsorCreative {
  return {
    name: form.name.trim() || "Your Firm Name",
    tagline: form.tagline.trim() || undefined,
    logoUrl: form.logoUrl.trim() || undefined,
    imageUrl: form.imageUrl.trim() || undefined,
    url: form.url.trim() || undefined,
    backgroundColor: toColor(form.backgroundColor, "#0B1220"),
    textColor: toColor(form.textColor, "#FFFFFF"),
    accentColor: toColor(form.accentColor, "#FF6A1A"),
    active: true,
  };
}

function encodeDemoParams(form: DemoForm): string {
  const params = new URLSearchParams();
  params.set("tier", form.tier);
  if (form.name.trim()) params.set("name", form.name.trim());
  if (form.tagline.trim()) params.set("tagline", form.tagline.trim());
  if (form.logoUrl.trim()) params.set("logoUrl", form.logoUrl.trim());
  if (form.imageUrl.trim()) params.set("imageUrl", form.imageUrl.trim());
  if (form.url.trim()) params.set("url", form.url.trim());
  if (form.backgroundColor.trim() && isHex(form.backgroundColor.trim())) params.set("bg", form.backgroundColor.trim());
  if (form.textColor.trim() && isHex(form.textColor.trim())) params.set("fg", form.textColor.trim());
  if (form.accentColor.trim() && isHex(form.accentColor.trim())) params.set("accent", form.accentColor.trim());
  return params.toString();
}

function decodeDemoParams(raw: Record<string, string | string[]>): Partial<DemoForm> {
  const get = (k: string): string | undefined => {
    const v = raw[k];
    return typeof v === "string" ? v : undefined;
  };
  const tier = get("tier") as SponsorSlotTier | undefined;
  return {
    ...(tier && TIERS.includes(tier) ? { tier } : {}),
    ...(get("name") ? { name: get("name") } : {}),
    ...(get("tagline") ? { tagline: get("tagline") } : {}),
    ...(get("logoUrl") ? { logoUrl: get("logoUrl") } : {}),
    ...(get("imageUrl") ? { imageUrl: get("imageUrl") } : {}),
    ...(get("url") ? { url: get("url") } : {}),
    ...(get("bg") ? { backgroundColor: get("bg") } : {}),
    ...(get("fg") ? { textColor: get("fg") } : {}),
    ...(get("accent") ? { accentColor: get("accent") } : {}),
  };
}

export default function SponsorDemoScreen(): React.ReactElement {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const { setLocalOverride, clearLocalOverride, localActive } = useSponsorConfig();

  const [form, setForm] = useState<DemoForm>({ ...DEFAULT_FORM, ...decodeDemoParams(params) });
  const [applied, setApplied] = useState<boolean>(false);
  const [showMap, setShowMap] = useState<boolean>(true);
  const [showAllSlots, setShowAllSlots] = useState<boolean>(false);

  const creative = useMemo(() => buildCreative(form), [form]);
  const demoMap = useMemo<Partial<Record<SponsorSlotTier, SponsorCreative>>>(() => ({ [form.tier]: creative }), [form.tier, creative]);
  const allSlotsMap = useMemo<Partial<Record<SponsorSlotTier, SponsorCreative>>>(() => {
    if (!showAllSlots) return {};
    const map: Partial<Record<SponsorSlotTier, SponsorCreative>> = {};
    TIERS_LIST.forEach((t) => {
      map[t.key] = { ...creative, active: true };
    });
    return map;
  }, [showAllSlots, creative]);

  const shareUrl = useMemo(() => {
    const base = "https://tortmarket.com/sponsor-demo";
    const qs = encodeDemoParams(form);
    return qs ? `${base}?${qs}` : base;
  }, [form]);

  const apply = useCallback(async () => {
    try {
      await setLocalOverride(demoMap);
      setApplied(true);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch (e) {
      Alert.alert("Could not apply preview", "Try again.");
    }
  }, [demoMap, setLocalOverride]);

  const clear = useCallback(async () => {
    try {
      await clearLocalOverride();
      setApplied(false);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch (e) {
      Alert.alert("Could not clear preview", "Try again.");
    }
  }, [clearLocalOverride]);

  const copyLink = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(shareUrl);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      Alert.alert("Copied", "Share this link with a prospective sponsor. Opening it pre-fills the demo.");
    } catch (e) {
      Alert.alert("Could not copy", "Try again.");
    }
  }, [shareUrl]);

  useEffect(() => {
    // Auto-apply on mount if the screen was opened via a shareable link so sponsors
    // immediately see their creative in the live app.
    if (params.name && !localActive) {
      apply();
    }
  }, []);

  const update = <K extends keyof DemoForm>(key: K, value: DemoForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setApplied(false);
  };

  const sectionTitle = (label: string, icon: React.ReactNode) => (
    <View style={styles.sectionHeader}>
      {icon}
      <Text style={styles.sectionTitle}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.wrap}>
      <Stack.Screen options={{ title: "Sponsor Demo", presentation: "modal" }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <TortMarketLogo size="sm" withGlow style={{ marginBottom: 10 }} />
            <Text style={styles.heroTitle}>Sponsor Preview</Text>
            <Text style={styles.heroSub}>
              Show sponsors exactly how their banner appears during the conference game.
              Edit fields, pick a tier, then apply or share the link.
            </Text>
          </View>

          {sectionTitle(
            "1. Creative",
            <Paintbrush size={14} color={Colors.blue} />,
          )}

          <Field label="Sponsor name *" value={form.name} onChange={(v) => update("name", v)} placeholder="Smith & Jones LLP" />
          <Field label="Tagline" value={form.tagline} onChange={(v) => update("tagline", v)} placeholder="Fighting for victims since 1998" />
          <Field label="Logo URL" value={form.logoUrl} onChange={(v) => update("logoUrl", v)} placeholder="https://example.com/logo.png" />
          <Field label="Banner / background image URL" value={form.imageUrl} onChange={(v) => update("imageUrl", v)} placeholder="https://example.com/banner.jpg" />
          <Field label="Click-through URL" value={form.url} onChange={(v) => update("url", v)} placeholder="https://example.com/landing" />

          <View style={styles.colorRow}>
            <ColorField label="Background" value={form.backgroundColor} onChange={(v) => update("backgroundColor", v)} />
            <ColorField label="Text" value={form.textColor} onChange={(v) => update("textColor", v)} />
            <ColorField label="Accent" value={form.accentColor} onChange={(v) => update("accentColor", v)} />
          </View>

          {sectionTitle(
            "2. Placement",
            <LayoutTemplate size={14} color={Colors.blue} />,
          )}

          <View style={styles.tierGrid}>
            {TIERS_LIST.map((t) => (
              <Pressable
                key={t.key}
                onPress={() => update("tier", t.key)}
                style={[styles.tierPill, form.tier === t.key && styles.tierPillActive]}
              >
                <Text style={[styles.tierName, form.tier === t.key && styles.tierNameActive]}>{t.label}</Text>
                <Text style={[styles.tierPrice, form.tier === t.key && styles.tierPriceActive]}>{t.price}</Text>
              </Pressable>
            ))}
          </View>

          {sectionTitle(
            "3. Live preview",
            <Eye size={14} color={Colors.blue} />,
          )}

          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewLabel}>Selected slot</Text>
              <View style={styles.previewBadge}>
                <Text style={styles.previewBadgeText}>{form.tier.toUpperCase()}</Text>
              </View>
            </View>
            <SponsorSlot tier={form.tier} creative={creative} />
          </View>

          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewLabel}>Join-screen sponsor reel</Text>
            </View>
            <View style={{ marginHorizontal: -16 }}>
              <JoinSponsorReel demoCreative={creative} />
            </View>
          </View>

          <View style={styles.toggleRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {showMap ? <Eye size={14} color={Colors.text} /> : <EyeOff size={14} color={Colors.textMuted} />}
              <Text style={styles.toggleLabel}>Show sponsor map overlays</Text>
            </View>
            <Pressable onPress={() => setShowMap((v) => !v)} hitSlop={8}>
              <View style={[styles.toggleSwitch, showMap && styles.toggleSwitchOn]}>
                <View style={[styles.toggleKnob, showMap && styles.toggleKnobOn]} />
              </View>
            </Pressable>
          </View>

          <View style={styles.toggleRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Megaphone size={14} color={showAllSlots ? Colors.blue : Colors.textMuted} />
              <Text style={styles.toggleLabel}>Fill every slot with this creative</Text>
            </View>
            <Pressable onPress={() => setShowAllSlots((v) => !v)} hitSlop={8}>
              <View style={[styles.toggleSwitch, showAllSlots && styles.toggleSwitchOn]}>
                <View style={[styles.toggleKnob, showAllSlots && styles.toggleKnobOn]} />
              </View>
            </Pressable>
          </View>

          {showAllSlots && (
            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>Every slot filled</Text>
              {TIERS_LIST.map((t) => (
                <SponsorSlot key={t.key} tier={t.key} creative={creative} />
              ))}
            </View>
          )}

          {sectionTitle(
            "4. Share & apply",
            <Share2 size={14} color={Colors.blue} />,
          )}

          <View style={styles.linkCard}>
            <Text style={styles.linkUrl} numberOfLines={1}>{shareUrl}</Text>
            <Pressable onPress={copyLink} style={styles.linkBtn}>
              <Copy size={14} color="#fff" />
              <Text style={styles.linkBtnText}>Copy demo link</Text>
            </Pressable>
          </View>

          <View style={styles.actionRow}>
            <Pressable onPress={apply} style={[styles.btn, styles.btnPrimary]} disabled={applied}>
              {applied ? <Check size={14} color="#fff" /> : <Eye size={14} color="#fff" />}
              <Text style={styles.btnText}>{applied ? "Applied to app" : "Apply to live app"}</Text>
            </Pressable>
            <Pressable onPress={clear} style={[styles.btn, styles.btnGhost]} disabled={!localActive}>
              <Trash2 size={14} color={localActive ? Colors.red : Colors.textMuted} />
              <Text style={[styles.btnText, { color: localActive ? Colors.red : Colors.textMuted }]}>Clear</Text>
            </Pressable>
          </View>

          <Pressable onPress={() => router.back()} style={styles.doneBtn}>
            <X size={14} color={Colors.textMuted} />
            <Text style={styles.doneText}>Close preview</Text>
          </Pressable>

          <Text style={styles.foot}>
            Applying stores the demo creative locally on this device only. The shareable link
            lets sponsors open the same preview themselves.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const valid = isHex(value.trim());
  return (
    <View style={styles.colorField}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.colorInputWrap}>
        <View style={[styles.colorDot, { backgroundColor: valid ? value.trim() : Colors.border }]} />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="#0B1220"
          placeholderTextColor={Colors.textMuted}
          style={styles.colorInput}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={7}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 20, paddingBottom: 44 },
  hero: { alignItems: "center", marginBottom: 24, marginTop: 8 },
  heroTitle: { fontSize: 24, fontWeight: "900", color: Colors.text, letterSpacing: -0.5 },
  heroSub: { fontSize: 13.5, color: Colors.textSecondary, textAlign: "center", marginTop: 8, lineHeight: 20 },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 22, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: "900", color: Colors.text, letterSpacing: 0.2 },

  field: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: "800", color: Colors.text, marginBottom: 6, letterSpacing: 0.2 },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    height: 46,
    color: Colors.text,
    fontSize: 14,
    fontWeight: "600",
  },

  colorRow: { flexDirection: "row", gap: 12, marginBottom: 4 },
  colorField: { flex: 1 },
  colorInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    height: 46,
  },
  colorDot: { width: 18, height: 18, borderRadius: 6, borderWidth: 1, borderColor: "rgba(0,0,0,0.1)" },
  colorInput: { flex: 1, color: Colors.text, fontSize: 13, fontWeight: "700", letterSpacing: 0.5 },

  tierGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tierPill: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: "47%",
    flex: 1,
  },
  tierPillActive: { borderColor: Colors.blue, backgroundColor: Colors.blueSoft },
  tierName: { fontSize: 12.5, fontWeight: "800", color: Colors.text },
  tierNameActive: { color: Colors.blue },
  tierPrice: { fontSize: 10.5, color: Colors.textMuted, marginTop: 2, fontWeight: "700" },
  tierPriceActive: { color: Colors.blue },

  previewCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 14,
  },
  previewHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  previewLabel: { fontSize: 12, fontWeight: "800", color: Colors.textSecondary },
  previewBadge: { backgroundColor: Colors.blueSoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  previewBadgeText: { fontSize: 9, fontWeight: "900", color: Colors.blue, letterSpacing: 0.6 },

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  toggleLabel: { fontSize: 13, fontWeight: "700", color: Colors.text },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.border,
    padding: 2,
  },
  toggleSwitchOn: { backgroundColor: Colors.blue },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff", transform: [{ translateX: 0 }] },
  toggleKnobOn: { transform: [{ translateX: 20 }] },

  linkCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 12,
  },
  linkUrl: { fontSize: 12, color: Colors.textMuted, fontWeight: "600" },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.text,
    borderRadius: 12,
    height: 44,
  },
  linkBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },

  actionRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 14,
  },
  btnPrimary: { backgroundColor: Colors.blue },
  btnGhost: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  btnText: { fontSize: 14, fontWeight: "800", color: "#fff" },

  doneBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    height: 44,
  },
  doneText: { fontSize: 14, fontWeight: "700", color: Colors.textMuted },

  foot: {
    fontSize: 11.5,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 18,
    lineHeight: 17,
  },
});
