import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/colors";

/**
 * Small fixed badge that shows the current deployed build version/timestamp.
 * Helps confirm at a glance which deploy is live on tortmarket.com.
 * The value is injected at build time by the GitHub Pages workflow via
 * EXPO_PUBLIC_BUILD_VERSION. Falls back to "dev" when running locally.
 */
export default function BuildBadge() {
  const version = process.env.EXPO_PUBLIC_BUILD_VERSION ?? "dev";

  return (
    <View pointerEvents="none" style={styles.wrap} testID="build-badge">
      <View style={styles.dot} />
      <Text style={styles.text} numberOfLines={1}>
        build {version}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 96 : 72,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.55)",
    zIndex: 9999,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.emerald,
  },
  text: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
