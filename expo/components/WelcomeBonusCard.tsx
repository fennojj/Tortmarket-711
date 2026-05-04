import React from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { PartyPopper } from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { useApp, WELCOME_BONUS } from "@/providers/AppProvider";

export default function WelcomeBonusCard(): React.ReactElement | null {
  const { user, claimWelcomeBonus } = useApp();
  if (user.welcomeBonusClaimed) return null;

  const onClaim = () => {
    const res = claimWelcomeBonus();
    if (res.ok) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Welcome!", `You received ${WELCOME_BONUS.toLocaleString()} bonus points. Good luck trading.`);
    }
  };

  return (
    <View style={styles.wrap} testID="welcome-bonus-card">
      <View style={styles.iconWrap}>
        <PartyPopper size={18} color={Colors.emerald} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Beta Tester Welcome Bonus</Text>
        <Text style={styles.sub}>Claim {WELCOME_BONUS.toLocaleString()} pts for joining the POC launch.</Text>
      </View>
      <Pressable onPress={onClaim} style={styles.btn} testID="welcome-claim-btn">
        <Text style={styles.btnText}>Claim</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: Colors.emeraldSoft,
    borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: "rgba(16,185,129,0.35)",
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
  },
  title: { color: Colors.text, fontSize: 13, fontWeight: "800" },
  sub: { color: Colors.textSecondary, fontSize: 11, fontWeight: "600", marginTop: 2 },
  btn: {
    height: 34, paddingHorizontal: 14, borderRadius: 10,
    backgroundColor: Colors.emerald,
    alignItems: "center", justifyContent: "center",
  },
  btnText: { color: "#fff", fontSize: 12, fontWeight: "800" },
});
