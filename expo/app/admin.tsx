import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Save, Trash2, RefreshCw, Eye, EyeOff } from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { useSponsorConfig, type SponsorMap } from "@/providers/SponsorConfigProvider";
import { useSponsorMap } from "@/providers/SponsorMapProvider";
import SponsorSlot from "@/components/SponsorSlot";
import type { SponsorSlotTier } from "@/constants/sponsors";

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

  const onLoadSample = () => {
    setText(JSON.stringify(SAMPLE, null, 2));
  };

  const onLoadCurrent = () => {
    setText(JSON.stringify(creatives, null, 2));
  };

  return (
    <>
      <Stack.Screen options={{ title: "Sponsor Admin" }} />
      <KeyboardAvoidingView
        style={styles.wrap}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Live status</Text>
            <Row label="Local override" value={localActive ? "ACTIVE" : "off"} accent={localActive ? Colors.emerald : Colors.textMuted} />
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
                {mapVisible ? <Eye size={14} color={Colors.text} /> : <EyeOff size={14} color={Colors.textMuted} />}
                <Text style={styles.toggleLabel}>Slot map (placeholders)</Text>
              </View>
              <Switch value={mapVisible} onValueChange={setMapVisible} />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Active creatives</Text>
          <Text style={styles.sectionHint}>Tap a slot to preview it inline. Set active:true in JSON to render real creative.</Text>
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
            <Pressable style={[styles.smallBtn, styles.smallBtnGhost]} onPress={onLoadCurrent}>
              <Text style={styles.smallBtnText}>Load current</Text>
            </Pressable>
            <Pressable style={[styles.smallBtn, styles.smallBtnGhost]} onPress={onLoadSample}>
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

          <Pressable onPress={() => router.back()} style={styles.doneBtn}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

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

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 16, gap: 12, paddingBottom: 64 },
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
  rowValue: { color: Colors.text, fontSize: 12, fontWeight: "800", flexShrink: 1, textAlign: "right" },
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
  btnText: { color: "#fff", fontSize: 13, fontWeight: "800" },

  doneBtn: { alignSelf: "center", padding: 12, marginTop: 4 },
  doneText: { color: Colors.textMuted, fontSize: 13, fontWeight: "700" },
});
