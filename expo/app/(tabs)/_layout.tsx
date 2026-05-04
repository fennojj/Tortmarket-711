import { Tabs } from "expo-router";
import { Home, Trophy, Gift, Briefcase, Radio, Sparkles } from "lucide-react-native";
import React from "react";
import { Platform } from "react-native";
import { Colors } from "@/constants/colors";
import { useAlerts } from "@/providers/AlertsProvider";
import { useEngagement } from "@/providers/EngagementProvider";

export default function TabLayout() {
  const { unreadCount } = useAlerts();
  const { actions } = useEngagement();

  const alertBadge = unreadCount > 0 ? Math.min(unreadCount, 99) : undefined;
  const coachBadge = actions.length > 0 ? Math.min(actions.length, 9) : undefined;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.blue,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.bg,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 88 : 64,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        headerStyle: { backgroundColor: Colors.bg, borderBottomColor: Colors.border },
        headerShadowVisible: false,
        headerTitleStyle: { color: Colors.text, fontWeight: "800", fontSize: 20 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Markets",
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Home color={color} size={size ?? 22} />,
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: "Coach",
          tabBarBadge: coachBadge,
          tabBarBadgeStyle: {
            backgroundColor: Colors.orange,
            fontSize: 10,
            minWidth: 16,
            height: 16,
            lineHeight: Platform.OS === "ios" ? 16 : undefined,
          },
          tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size ?? 22} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: "Alerts",
          tabBarBadge: alertBadge,
          tabBarBadgeStyle: {
            backgroundColor: Colors.red,
            fontSize: 10,
            minWidth: 16,
            height: 16,
            lineHeight: Platform.OS === "ios" ? 16 : undefined,
          },
          tabBarIcon: ({ color, size }) => <Radio color={color} size={size ?? 22} />,
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: "Portfolio",
          tabBarIcon: ({ color, size }) => <Briefcase color={color} size={size ?? 22} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: "Leaderboard",
          tabBarIcon: ({ color, size }) => <Trophy color={color} size={size ?? 22} />,
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: "Rewards",
          tabBarIcon: ({ color, size }) => <Gift color={color} size={size ?? 22} />,
        }}
      />
    </Tabs>
  );
}
