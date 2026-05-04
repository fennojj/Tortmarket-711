import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { TriangleAlert, RotateCcw } from "lucide-react-native";
import { Colors } from "@/constants/colors";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export default class AppErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: "",
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || "Something went wrong.",
    };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.log("[AppErrorBoundary] runtime error", {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  private handleRetry = (): void => {
    console.log("[AppErrorBoundary] retry pressed");
    this.setState({ hasError: false, errorMessage: "" });
  };

  public render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.screen} testID="app-error-boundary">
          <View style={styles.card}>
            <View style={styles.iconWrap}>
              <TriangleAlert size={22} color={Colors.orange} />
            </View>
            <Text style={styles.title}>Something crashed</Text>
            <Text style={styles.body}>
              The app hit an unexpected error. You can retry without losing your session.
            </Text>
            <Text style={styles.message} numberOfLines={3}>
              {this.state.errorMessage || "Unexpected runtime error"}
            </Text>
            <Pressable onPress={this.handleRetry} style={styles.button} testID="app-error-retry-button">
              <RotateCcw size={16} color="#FFFFFF" />
              <Text style={styles.buttonText}>Retry</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 22,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: Colors.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  body: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  message: {
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  button: {
    marginTop: 18,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.blue,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
