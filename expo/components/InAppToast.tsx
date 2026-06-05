import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { X } from "lucide-react-native";
import { useNotifications, type InAppNotification } from "@/providers/NotificationProvider";
import { Colors } from "@/constants/colors";

const KIND_COLOR: Record<InAppNotification["kind"], string> = {
  breaking: "#EF4444",
  coach: Colors.blue,
  trade: "#10B981",
  social: "#F59E0B",
  intel: "#8B5CF6",
};

const KIND_BG: Record<InAppNotification["kind"], string> = {
  breaking: "#FEF2F2",
  coach: "#EFF6FF",
  trade: "#F0FDF4",
  social: "#FFFBEB",
  intel: "#F5F3FF",
};

const PROGRESS_DURATION = 5000;

function Toast({ notif, onDismiss }: { notif: InAppNotification; onDismiss: () => void }) {
  const slideY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(1)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const accent = KIND_COLOR[notif.kind] ?? Colors.blue;
  const bg = KIND_BG[notif.kind] ?? "#fff";

  const doSlideOut = useCallback(() => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    Animated.parallel([
      Animated.timing(slideY, { toValue: -120, duration: 280, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start(() => onDismiss());
  }, [slideY, opacity, onDismiss]);

  useEffect(() => {
    // Slide in
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    Animated.parallel([
      Animated.spring(slideY, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    // Progress bar
    Animated.timing(progress, {
      toValue: 0,
      duration: PROGRESS_DURATION,
      useNativeDriver: false,
    }).start();

    // Auto-dismiss
    dismissTimer.current = setTimeout(doSlideOut, PROGRESS_DURATION);
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [slideY, opacity, progress, doSlideOut]);

  const handleTap = () => {
    if (notif.route) router.push(notif.route as never);
    doSlideOut();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY: slideY }],
          backgroundColor: notif.urgent ? "#fff" : "#fff",
          borderLeftColor: accent,
        },
      ]}
    >
      {notif.urgent && (
        <View style={[styles.urgentStripe, { backgroundColor: accent }]} />
      )}
      <Pressable style={styles.inner} onPress={handleTap}>
        {/* Icon + source */}
        <View style={[styles.iconWrap, { backgroundColor: bg }]}>
          <Text style={styles.iconText}>{notif.icon}</Text>
        </View>

        <View style={styles.textBlock}>
          <View style={styles.sourceRow}>
            <Text style={[styles.sourceLabel, { color: accent }]}>{notif.source}</Text>
            {notif.urgent && (
              <View style={[styles.urgentBadge, { backgroundColor: accent }]}>
                <Text style={styles.urgentText}>URGENT</Text>
              </View>
            )}
          </View>
          <Text style={styles.title} numberOfLines={1}>{notif.title}</Text>
          <Text style={styles.body} numberOfLines={2}>{notif.body}</Text>
        </View>

        <Pressable onPress={doSlideOut} style={styles.closeBtn} hitSlop={8}>
          <X size={14} color={Colors.textMuted} />
        </Pressable>
      </Pressable>

      {/* Progress bar */}
      <Animated.View
        style={[
          styles.progressBar,
          {
            backgroundColor: accent,
            width: progress.interpolate({
              inputRange: [0, 1],
              outputRange: ["0%", "100%"],
            }),
          },
        ]}
      />
    </Animated.View>
  );
}

export default function InAppToast(): React.ReactElement | null {
  const { current, dismiss } = useNotifications();
  const [visible, setVisible] = useState<InAppNotification | null>(null);

  useEffect(() => {
    if (current) setVisible(current);
  }, [current]);

  if (!visible) return null;

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <Toast
        key={visible.id}
        notif={visible}
        onDismiss={() => {
          setVisible(null);
          dismiss();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: Platform.OS === "ios" ? 52 : 40,
    left: 12,
    right: 12,
    zIndex: 99999,
  },
  container: {
    borderRadius: 18,
    borderLeftWidth: 4,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 12,
  },
  urgentStripe: {
    height: 3,
    width: "100%",
  },
  inner: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    gap: 10,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconText: {
    fontSize: 20,
    lineHeight: 24,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sourceLabel: {
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  urgentBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  urgentText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  title: {
    color: "#111",
    fontSize: 13.5,
    fontWeight: "800",
    lineHeight: 18,
  },
  body: {
    color: "#555",
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
    marginTop: 1,
  },
  closeBtn: {
    padding: 2,
    flexShrink: 0,
    marginTop: 2,
  },
  progressBar: {
    height: 3,
    alignSelf: "flex-start",
  },
});
