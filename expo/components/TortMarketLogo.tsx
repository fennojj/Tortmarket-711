import React from "react";
import { Image, StyleSheet, View, type ViewStyle } from "react-native";

export type LogoSize = "xs" | "sm" | "md" | "lg" | "xl" | "hero";

interface Props {
  size?: LogoSize;
  style?: ViewStyle;
  withGlow?: boolean;
}

const SIZE_MAP: Record<LogoSize, number> = {
  xs: 28,
  sm: 40,
  md: 64,
  lg: 96,
  xl: 128,
  hero: 160,
};

export default function TortMarketLogo({ size = "md", style, withGlow = false }: Props): React.ReactElement {
  const dim = SIZE_MAP[size];
  return (
    <View style={[styles.container, withGlow && styles.glow, { width: dim, height: dim }, style]}>
      <Image
        source={require("@/assets/images/tortmarket-logo.jpg")}
        style={{ width: dim, height: dim }}
        resizeMode="contain"
        accessibilityLabel="Tort Market logo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 999,
    overflow: "hidden",
  },
  glow: {
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 12,
  },
});
