import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Zap } from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { useApp } from "@/providers/AppProvider";

export default function BalanceHeader({ subtitle }: { subtitle?: string }) {
  const { user, portfolioValue } = useApp();
  return (
    <LinearGradient
      colors={["#2563EB", "#1D4ED8", "#7C3AED"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.wrap}
    >
      <View style={styles.row}>
        <View>
          <Text style={styles.label}>Point Balance</Text>
          <Text style={styles.balance}>{user.pointBalance.toLocaleString()}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <View style={styles.bolt}>
          <Zap color="#FFFFFF" size={20} />
        </View>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Portfolio Value</Text>
          <Text style={styles.statValue}>{Math.round(portfolioValue).toLocaleString()}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Open Positions</Text>
          <Text style={styles.statValue}>{user.positions.length}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Titles</Text>
          <Text style={styles.statValue}>{user.titles.length}</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 22,
    padding: 18,
    marginHorizontal: 16,
    marginTop: 8,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  label: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  balance: { color: "#FFFFFF", fontSize: 34, fontWeight: "800", marginTop: 2, letterSpacing: -0.5 },
  subtitle: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "600", marginTop: 4 },
  bolt: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 14,
    padding: 12,
  },
  stat: { flex: 1 },
  statLabel: { color: "rgba(255,255,255,0.8)", fontSize: 10, fontWeight: "700", letterSpacing: 0.3, textTransform: "uppercase" },
  statValue: { color: "#FFFFFF", fontSize: 16, fontWeight: "800", marginTop: 2 },
  divider: { width: 1, backgroundColor: "rgba(255,255,255,0.18)", marginHorizontal: 10 },
});

// referenced but unused import fix
void Colors;
