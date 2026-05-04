import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Eye, EyeOff, Megaphone, Settings } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useSponsorMap } from "@/providers/SponsorMapProvider";

export default function SponsorMapToggle(): React.ReactElement {
  const { visible, toggle } = useSponsorMap();
  const insets = useSafeAreaInsets();
  const bottomBarH = Platform.OS === "ios" ? 88 : 64;

  return (
    <Pressable
      onPress={toggle}
      onLongPress={() => router.push("/admin")}
      delayLongPress={350}
      style={[
        styles.fab,
        {
          bottom: bottomBarH + 12 + (insets.bottom ? 0 : 0),
          backgroundColor: visible ? "#0B1220" : "#FF6A1A",
        },
      ]}
      testID="sponsor-map-toggle"
    >
      <View style={styles.iconWrap}>
        <Megaphone size={13} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>Sponsor Map</Text>
        <Text style={styles.sub}>{visible ? "Tap: hide · Hold: admin" : "Tap: show · Hold: admin"}</Text>
      </View>
      <Pressable onPress={() => router.push("/admin")} hitSlop={8} style={styles.gear} testID="sponsor-admin-btn">
        <Settings size={13} color="#fff" />
      </Pressable>
      {visible ? <Eye size={14} color="#fff" /> : <EyeOff size={14} color="#fff" />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 999,
    maxWidth: 230,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  gear: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  label: { color: "#fff", fontSize: 11.5, fontWeight: "900", letterSpacing: 0.3 },
  sub: { color: "rgba(255,255,255,0.78)", fontSize: 9.5, fontWeight: "700", marginTop: 1 },
});
