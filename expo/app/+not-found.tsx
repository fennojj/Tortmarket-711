import { Link, Stack } from "expo-router";

import { StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/colors";

export default function NotFoundScreen(): React.ReactElement {
  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen does not exist.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to markets</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20, backgroundColor: Colors.bg },
  title: { fontSize: 18, fontWeight: "800", color: Colors.text },
  link: { marginTop: 14, paddingVertical: 14 },
  linkText: { fontSize: 14, color: Colors.blue, fontWeight: "700" },
});
