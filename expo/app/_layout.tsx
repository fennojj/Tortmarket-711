import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AppProvider } from "@/providers/AppProvider";
import { AlertsProvider } from "@/providers/AlertsProvider";
import { EngagementProvider } from "@/providers/EngagementProvider";
import { CampaignProvider } from "@/providers/CampaignProvider";
import { SponsorMapProvider } from "@/providers/SponsorMapProvider";
import { SponsorConfigProvider } from "@/providers/SponsorConfigProvider";
import { SponsorUpdatesProvider } from "@/providers/SponsorUpdatesProvider";
import { MarketsProvider } from "@/providers/MarketsProvider";
import { LiveSignalsProvider } from "@/providers/LiveSignalsProvider";
import { NotificationProvider } from "@/providers/NotificationProvider";
import { AdminConfigProvider } from "@/providers/AdminConfigProvider";
import OnboardingModal from "@/components/OnboardingModal";
import SponsorMapToggle from "@/components/SponsorMapToggle";
import InAppToast from "@/components/InAppToast";
import { Colors } from "@/constants/colors";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import BuildBadge from "@/components/BuildBadge";

SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: "Back",
        headerStyle: { backgroundColor: Colors.bg },
        headerTitleStyle: { color: Colors.text, fontWeight: "700" },
        headerTintColor: Colors.blue,
        contentStyle: { backgroundColor: Colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="market/[id]"
        options={{ title: "Market", presentation: "card" }}
      />
      <Stack.Screen
        name="wager"
        options={{ title: "Place Wager", presentation: "modal" }}
      />
      <Stack.Screen
        name="campaigns"
        options={{ title: "Campaign Agent", presentation: "card" }}
      />
      <Stack.Screen
        name="invite"
        options={{ title: "Invite Friends", presentation: "modal" }}
      />
      <Stack.Screen
        name="admin"
        options={{ title: "Sponsor Admin", presentation: "modal" }}
      />
      <Stack.Screen
        name="sponsor-updates"
        options={{ title: "Sponsor Updates", presentation: "card" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MarketsProvider>
          <AdminConfigProvider>
          <AppProvider>
            <AlertsProvider>
              <LiveSignalsProvider>
              <EngagementProvider>
                <CampaignProvider>
                  <SponsorConfigProvider>
                    <SponsorUpdatesProvider>
                    <NotificationProvider>
                    <SponsorMapProvider>
                      <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.bg }}>
                        <SafeAreaProvider>
                          <StatusBar style="dark" />
                          <RootLayoutNav />
                          <OnboardingModal />
                          <SponsorMapToggle />
                          <InAppToast />
                          <BuildBadge />
                        </SafeAreaProvider>
                      </GestureHandlerRootView>
                    </SponsorMapProvider>
                    </NotificationProvider>
                    </SponsorUpdatesProvider>
                  </SponsorConfigProvider>
                </CampaignProvider>
              </EngagementProvider>
              </LiveSignalsProvider>
            </AlertsProvider>
          </AppProvider>
          </AdminConfigProvider>
        </MarketsProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
