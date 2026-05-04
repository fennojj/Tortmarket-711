import React, { useEffect, useRef } from "react";
import { Animated, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Radio, ExternalLink } from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { useLiveSignals } from "@/providers/LiveSignalsProvider";
import { useMarkets } from "@/providers/MarketsProvider";

/**
 * Compact ticker that shows the most recent real-world headline ingested by
 * LiveSignalsProvider. Tapping opens the source article (best effort).
 */
export default function LiveSignalTicker(): React.ReactElement | null {
  const { latestHeadline, totalSignalsApplied } = useLiveSignals();
  const { marketById } = useMarkets();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  if (!latestHeadline) return null;
  const market = marketById(latestHeadline.marketId);
  const bullish = latestHeadline.polarity > 0;

  const onOpen = () => {
    if (!latestHeadline.link) return;
    Linking.openURL(latestHeadline.link).catch((e) => console.log("[Ticker] open error", e));
  };

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.85 }]}
      testID="live-signal-ticker"
    >
      <View style={styles.left}>
        <Animated.View style={[styles.dot, { backgroundColor: bullish ? Colors.emerald : Colors.red, opacity: pulse }]} />
        <Radio size={12} color={Colors.text} />
        <Text style={styles.live}>LIVE</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.market} numberOfLines={1}>
          {market?.caseName ?? latestHeadline.marketId} · {latestHeadline.source}
        </Text>
        <Text style={styles.headline} numberOfLines={2}>
          {latestHeadline.title}
        </Text>
      </View>
      <View style={styles.right}>
        <View style={[styles.polarity, { backgroundColor: bullish ? Colors.emeraldSoft : Colors.redSoft }]}>
          <Text style={[styles.polarityText, { color: bullish ? Colors.emerald : Colors.red }]}>
            {bullish ? "+" : ""}
            {latestHeadline.polarity.toFixed(0)}
          </Text>
        </View>
        {Platform.OS !== "web" && totalSignalsApplied > 0 ? (
          <Text style={styles.count}>{totalSignalsApplied}</Text>
        ) : null}
        <ExternalLink size={12} color={Colors.textMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  left: { alignItems: "center", gap: 4, paddingRight: 6, borderRightWidth: 1, borderRightColor: Colors.border },
  dot: { width: 8, height: 8, borderRadius: 4 },
  live: { color: Colors.text, fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  market: { color: Colors.textMuted, fontSize: 10.5, fontWeight: "800", letterSpacing: 0.2, textTransform: "uppercase" },
  headline: { color: Colors.text, fontSize: 13, fontWeight: "700", lineHeight: 17, marginTop: 2 },
  right: { alignItems: "center", gap: 4 },
  polarity: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  polarityText: { fontSize: 11, fontWeight: "900" },
  count: { color: Colors.textMuted, fontSize: 9, fontWeight: "800" },
});
