import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  Sparkles,
  Send,
  TrendingUp,
  TrendingDown,
  Shield,
  ArrowRight,
  Gauge,
  Activity,
  Zap,
  MapPin,
} from "lucide-react-native";
import { useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { useEngagement } from "@/providers/EngagementProvider";
import { useApp } from "@/providers/AppProvider";
import { useMarkets } from "@/providers/MarketsProvider";
import { CONFERENCE } from "@/constants/sponsors";
import SponsorSlot from "@/components/SponsorSlot";

/** Build a context-aware proactive insight without an API call */
function buildProactiveInsight(ctx: {
  signals: { engagementScore: number; churnRisk: number; state: string };
  portfolio: { riskLevel: string };
  edges: { marketId: string; recommendedSide: string; fairYes: number; confidence: number; reasons: string[] }[];
  user: { handle?: string; streakDays?: number; positions: unknown[] };
  markets: { id: string; caseName: string; yesPrice: number; noPrice: number }[];
  sessionCount: number;
}): string {
  const { signals, portfolio, edges, user, markets } = ctx;
  const streak = user.streakDays ?? 0;
  const topEdge = edges[0];
  const topMarket = topEdge ? markets.find((m) => m.id === topEdge.marketId) : null;
  const candidates: string[] = [];

  if (streak >= 7) {
    candidates.push(`🔥 ${streak}-day streak — you're in elite territory. The model weights active traders higher on the leaderboard right now.`);
  } else if (streak >= 3) {
    candidates.push(`🔥 ${streak} days running. Keep it going — streak bonuses stack and your engagement score is climbing.`);
  }

  if (topMarket && topEdge) {
    const up = topEdge.recommendedSide === "YES";
    const price = up ? topMarket.yesPrice : topMarket.noPrice;
    const fair = up ? topEdge.fairYes : 100 - topEdge.fairYes;
    const gap = (fair - price).toFixed(0);
    candidates.push(
      `📊 Top edge right now: ${topMarket.caseName} — model has ${up ? "YES" : "NO"} at ${fair.toFixed(0)}¢, currently trading at ${price}¢. That's a ${gap}¢ gap with ${topEdge.confidence.toFixed(0)}% confidence. ${topEdge.reasons[0] ?? ""}`
    );
  }

  if (portfolio.riskLevel === "high") {
    candidates.push(`⚠️ Your book is running HIGH risk with ${user.positions.length} open positions. Consider hedging before the next docket update drops.`);
  }

  if (signals.churnRisk > 65) {
    candidates.push(`👋 Welcome back — signals have shifted since your last visit. Multiple markets moved more than 8¢. Worth a quick scan before placing new positions.`);
  }

  if (signals.engagementScore > 75) {
    candidates.push(`⚡ Engagement at ${signals.engagementScore.toFixed(0)}/100 — you're in the model's top activity tier. Your trades carry more leaderboard weight right now.`);
  }

  if (candidates.length === 0) {
    candidates.push(`${edges.length} markets tracked live. Your churn risk is ${signals.churnRisk.toFixed(0)}% — let's keep that low. What do you want to dig into?`);
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}

/** Build the guided new-user onboarding sequence */
function buildNewUserMessages(ctx: {
  handle?: string;
  edges: { marketId: string; recommendedSide: string; fairYes: number; confidence: number; reasons: string[] }[];
  markets: { id: string; caseName: string; yesPrice: number; noPrice: number; mdlSentiment: number; daubertStrength: number }[];
}): { id: string; content: string; tradeCtaMarketId?: string }[] {
  const { handle, edges, markets } = ctx;
  const firstName = handle?.replace("@", "").split(/[-_]/)[0] ?? "there";

  const topEdge = edges[0];
  const topMarket = topEdge ? markets.find((m) => m.id === topEdge.marketId) : null;

  const msg1 = `Hey ${firstName} 👋 Welcome to TortCoach. I'm your personal mass-tort analyst — I track live MDL dockets, Daubert rulings, and corporate reserve signals across 25+ active cases.\n\nYour 25,000-point stake is live. Let me show you your first winning trade.`;

  const msg2 = topMarket && topEdge
    ? `📊 **Your #1 Trade Right Now:**\n\n${topMarket.caseName}\nSide: ${topEdge.recommendedSide === "YES" ? "✅ YES" : "❌ NO"}\nCurrent price: ${topEdge.recommendedSide === "YES" ? topMarket.yesPrice : topMarket.noPrice}¢\nModel fair value: ${topEdge.recommendedSide === "YES" ? topEdge.fairYes.toFixed(0) : (100 - topEdge.fairYes).toFixed(0)}¢\nEdge: ${(Math.abs(topEdge.fairYes - (topEdge.recommendedSide === "YES" ? topMarket.yesPrice : topMarket.noPrice))).toFixed(0)}¢ | Confidence: ${topEdge.confidence.toFixed(0)}%\n\n${topEdge.reasons[0] ?? "Strong multi-signal alignment detected."}`
    : `📊 Markets are live and pricing in real MDL signals. I track Daubert strength (how likely expert testimony survives), MDL sentiment (plaintiff-side momentum), and corporate reserves (how much defendants have set aside).\n\nThese three signals together form the model's fair value — when market price deviates, that's your edge.`;

  const msg3 = topMarket && topEdge
    ? `The model blends three signals for this case:\n\n• Daubert strength: ${topMarket.daubertStrength}/100 — expert testimony is ${topMarket.daubertStrength > 65 ? "solid" : "at risk"}\n• MDL sentiment: ${topMarket.mdlSentiment}/100 — plaintiff momentum is ${topMarket.mdlSentiment > 60 ? "building" : "mixed"}\n• Reserve signals: watching corporate filings for settlement hints\n\nTap "Place This Trade" to position yourself, or ask me any questions first. I'll walk you through it.`
    : `Start by browsing the Markets tab — find a case you know. Legal knowledge is a real edge here. Camp Lejeune, 3M Combat Arms, and Roundup are good starting points with strong signals.\n\nAsk me anything — case background, what a Daubert ruling means, or which market has the best edge right now. I'm here for it.`;

  return [
    { id: "ob-1", content: msg1 },
    { id: "ob-2", content: msg2, tradeCtaMarketId: topMarket?.id },
    { id: "ob-3", content: msg3, tradeCtaMarketId: topEdge ? topMarket?.id : undefined },
  ];
}

type ChatRole = "system" | "user" | "assistant";

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  tradeCtaMarketId?: string;
}

async function callCoachApi(messages: { role: ChatRole; content: string }[]): Promise<string> {
  const base = process.env.EXPO_PUBLIC_TOOLKIT_URL ?? "https://toolkit.rork.com";
  const url = `${base}/text/llm/`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.log("[Coach] api error", res.status, t);
    throw new Error(`Coach API ${res.status}`);
  }
  const json = (await res.json()) as { completion?: string };
  return json.completion ?? "I'm here — try that again in a second.";
}

const RETURNING_PROMPTS: string[] = [
  "What's my best move right now?",
  "Explain Daubert vs. MDL sentiment",
  "Should I rebalance my portfolio?",
  "Which market has the biggest edge?",
];

const NEW_USER_PROMPTS: string[] = [
  "Place this trade for me",
  "Why is this case a good bet?",
  "Explain how edges work",
  "What markets should I start with?",
  "How do I read the model signals?",
];

export default function CoachScreen(): React.ReactElement {
  const { signals, portfolio, edges, actions, coachSystemPrompt, track } = useEngagement();
  const { user } = useApp();
  const { markets } = useMarkets();

  const isNewUser = useMemo(
    () => user.onboarded && !!user.joinedAt && Date.now() - (user.joinedAt ?? 0) < 600_000,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const initialGreeting = useMemo<ChatMessage>(() => ({
    id: "greet",
    role: "assistant",
    content: isNewUser
      ? `Welcome${user.handle && user.handle !== "@you" ? `, ${user.handle}` : ""}! I'm TortCoach — your AI mass-tort analyst. Give me just a second to pull your personalized signals...`
      : `Back at it, ${user.handle}. Engagement ${signals.engagementScore.toFixed(0)}/100. I see ${edges.length} live markets and ${user.positions.length} positions on your book. What do you want to dig into?`,
  }), [isNewUser, user.handle, signals.engagementScore, edges.length, user.positions.length]);

  const [messages, setMessages] = useState<ChatMessage[]>([initialGreeting]);
  const [input, setInput] = useState<string>("");
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const insightFiredRef = useRef<boolean>(false);

  // New user: inject guided onboarding sequence
  useEffect(() => {
    if (insightFiredRef.current || !isNewUser) return;
    insightFiredRef.current = true;

    const steps = buildNewUserMessages({ handle: user.handle, edges, markets });

    steps.forEach((step, i) => {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { id: step.id, role: "assistant" as ChatRole, content: step.content, tradeCtaMarketId: step.tradeCtaMarketId },
        ]);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
      }, 900 + i * 2_200);
    });
  // Only fire once on mount for new users
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Returning user: fire proactive insight
  useEffect(() => {
    if (insightFiredRef.current || isNewUser) return;
    if (!user.onboarded || signals.state === "new") return;
    insightFiredRef.current = true;
    const timer = setTimeout(() => {
      const insight = buildProactiveInsight({
        signals, portfolio, edges, user, markets,
        sessionCount: signals.engagementScore > 0 ? 2 : 0,
      });
      setMessages((prev) => [
        ...prev,
        { id: `proactive-${Date.now()}`, role: "assistant" as ChatRole, content: insight },
      ]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }, 1_200);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      const history = [
        { role: "system" as ChatRole, content: coachSystemPrompt },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as ChatRole, content: text },
      ];
      return callCoachApi(history);
    },
    onSuccess: (reply) => {
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", content: reply },
      ]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
    },
    onError: (e) => {
      console.log("[Coach] err", e);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Lost the signal for a second. Try once more — your context is saved.",
        },
      ]);
    },
  });

  const send = useCallback(
    (textOverride?: string) => {
      const text = (textOverride ?? input).trim();
      if (!text || sendMutation.isPending) return;
      if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
      track({ kind: "coach_message", at: Date.now() });
      setMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: "user", content: text },
      ]);
      setInput("");
      sendMutation.mutate(text);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
    },
    [input, sendMutation, track],
  );

  const topEdges = useMemo(() => edges.slice(0, 5), [edges]);
  const quickPrompts = isNewUser ? NEW_USER_PROMPTS : RETURNING_PROMPTS;

  const handleTradeCtaTap = useCallback((marketId: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push(`/wager?marketId=${marketId}` as never);
  }, []);

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    if (item.role === "user") {
      return (
        <View style={[styles.msgRow, { justifyContent: "flex-end" }]}>
          <View style={styles.userBubble}>
            <Text style={styles.userText}>{item.content}</Text>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.msgRow}>
        <View style={styles.avatar}>
          <Sparkles size={12} color={Colors.yellow} />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={styles.botBubble}>
            <Text style={styles.botText}>{item.content}</Text>
          </View>
          {/* Trade CTA button for onboarding messages */}
          {item.tradeCtaMarketId && isNewUser && (
            <Pressable
              onPress={() => handleTradeCtaTap(item.tradeCtaMarketId!)}
              style={styles.tradeCtaBtn}
            >
              <Zap size={13} color="#fff" />
              <Text style={styles.tradeCtaText}>Place This Trade →</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }, [isNewUser, handleTradeCtaTap]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View>
              <LinearGradient
                colors={isNewUser ? ["#0B1220", "#1a2e5a", "#0d4a2f"] : ["#0B1220", "#1E3A8A"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hero}
              >
                <View style={styles.heroHead}>
                  <View style={styles.heroBadge}>
                    <Sparkles size={11} color={Colors.yellow} />
                    <Text style={styles.heroBadgeText}>TORTCOACH AI</Text>
                  </View>
                  {isNewUser ? (
                    <View style={styles.newUserBadge}>
                      <MapPin size={9} color="#86EFAC" />
                      <Text style={styles.newUserBadgeText}>ONBOARDING</Text>
                    </View>
                  ) : (
                    <View style={styles.stateChip}>
                      <Activity size={10} color="rgba(255,255,255,0.9)" />
                      <Text style={styles.stateChipText}>{signals.state.toUpperCase()}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.heroTitle}>
                  {isNewUser ? "Let's make your first trade" : "Your personal mass-tort analyst"}
                </Text>
                <Text style={styles.heroSub}>
                  {isNewUser
                    ? "I'll walk you through the top edge right now, explain why it's good, and help you position."
                    : "Real-time signals from MDL sentiment, Daubert strength, docket momentum, and your own book."}
                </Text>
                {CONFERENCE.active && CONFERENCE.coachSponsor && (
                  <View style={styles.coachSponsor} testID="coach-sponsor">
                    <View style={styles.coachSponsorPill}>
                      <Sparkles size={10} color={Colors.yellow} />
                      <Text style={styles.coachSponsorPillText}>{CONFERENCE.coachSponsor.tagline.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.coachSponsorName}>{CONFERENCE.coachSponsor.name}</Text>
                  </View>
                )}
                <View style={styles.statRow}>
                  <Stat label="Engagement" value={`${signals.engagementScore.toFixed(0)}`} icon="g" />
                  <Stat label="Churn risk" value={`${signals.churnRisk.toFixed(0)}%`} icon="d" />
                  <Stat label="Book risk" value={portfolio.riskLevel} icon="s" />
                </View>

                {/* New user step indicators */}
                {isNewUser && (
                  <View style={styles.stepRow}>
                    {["Intro", "Top Trade", "Why It Wins"].map((label, i) => (
                      <View key={label} style={styles.stepItem}>
                        <View style={[styles.stepDot, { backgroundColor: messages.length > i + 1 ? "#86EFAC" : "rgba(255,255,255,0.3)" }]} />
                        <Text style={[styles.stepLabel, { color: messages.length > i + 1 ? "#86EFAC" : "rgba(255,255,255,0.5)" }]}>{label}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </LinearGradient>

              <SponsorSlot tier="coach" label="Coach hero sponsor — logo + tagline" />
              <SponsorSlot tier="ribbon" compact label="Co-presenting strip" />

              {!isNewUser && actions.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Agent playbook</Text>
                  <Text style={styles.sectionSub}>Prioritized by your signals</Text>
                  {actions.slice(0, 3).map((a) => (
                    <Pressable
                      key={a.id}
                      onPress={() => {
                        if (a.route) router.push(a.route as never);
                        else send(`Tell me more about: ${a.title}`);
                      }}
                      style={styles.actionRow}
                      testID={`playbook-${a.id}`}
                    >
                      <View style={styles.actionDot} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.actionTitle}>{a.title}</Text>
                        <Text style={styles.actionBody} numberOfLines={2}>
                          {a.body}
                        </Text>
                      </View>
                      <ArrowRight size={16} color={Colors.textMuted} />
                    </Pressable>
                  ))}
                  <SponsorSlot tier="native" label="Sponsored playbook action" />
                </View>
              )}

              <SponsorSlot tier="banner" label="Between playbook & edges" />

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top model edges</Text>
                <Text style={styles.sectionSub}>
                  Fair value blends MDL sentiment · Daubert · reserves · momentum
                </Text>
                {topEdges.map((e) => {
                  const m = markets.find((mm) => mm.id === e.marketId);
                  if (!m) return null;
                  const up = e.recommendedSide === "YES";
                  const price = up ? m.yesPrice : m.noPrice;
                  const fair = up ? e.fairYes : 100 - e.fairYes;
                  return (
                    <Pressable
                      key={e.marketId}
                      onPress={() => router.push(`/market/${e.marketId}` as never)}
                      style={styles.edgeRow}
                      testID={`edge-${e.marketId}`}
                    >
                      <View
                        style={[
                          styles.sideBadge,
                          { backgroundColor: up ? Colors.emeraldSoft : Colors.redSoft },
                        ]}
                      >
                        {up ? (
                          <TrendingUp size={12} color={Colors.emerald} />
                        ) : (
                          <TrendingDown size={12} color={Colors.red} />
                        )}
                        <Text
                          style={[
                            styles.sideText,
                            { color: up ? Colors.emerald : Colors.red },
                          ]}
                        >
                          {e.recommendedSide}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.edgeName} numberOfLines={1}>
                          {m.caseName}
                        </Text>
                        <Text style={styles.edgeReason} numberOfLines={1}>
                          {e.reasons[0] ?? `${m.defendant}`}
                        </Text>
                      </View>
                      <View style={styles.edgeMeta}>
                        <Text style={styles.edgePrice}>
                          {price}¢ → {fair.toFixed(0)}¢
                        </Text>
                        <View style={styles.confPill}>
                          <Shield size={9} color={Colors.blue} />
                          <Text style={styles.confText}>{e.confidence.toFixed(0)}%</Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <SponsorSlot tier="presenting" label="Pre-chat presenting sponsor" />

              <View style={styles.chatHeader}>
                <Text style={styles.sectionTitle}>
                  {isNewUser ? "Ask TortCoach anything" : "Chat with TortCoach"}
                </Text>
                <Text style={styles.sectionSub}>
                  {isNewUser
                    ? "No question is too basic — I'm here to help you win"
                    : "Context-aware of your book + the docket"}
                </Text>
              </View>
            </View>
          }
          ListFooterComponent={
            sendMutation.isPending ? (
              <View style={styles.typing}>
                <ActivityIndicator size="small" color={Colors.textMuted} />
                <Text style={styles.typingText}>TortCoach is analyzing…</Text>
              </View>
            ) : null
          }
        />

        <SponsorSlot tier="sticky" compact label="Sticky pre-input banner" />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickRow}
        >
          <View style={{ marginRight: 8 }}>
            <SponsorSlot tier="tier" inline compact height={36} label="Sponsored prompt" />
          </View>
          {quickPrompts.map((p) => (
            <Pressable
              key={p}
              onPress={() => send(p)}
              style={[styles.quickChip, isNewUser && styles.quickChipNew]}
              testID={`quick-${p}`}
            >
              <Text style={[styles.quickText, isNewUser && styles.quickTextNew]}>{p}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            testID="coach-input"
            value={input}
            onChangeText={setInput}
            placeholder={isNewUser ? "Ask anything — I'll walk you through it…" : "Ask about a market, your book, or a signal…"}
            placeholderTextColor={Colors.textMuted}
            style={styles.input}
            onSubmitEditing={() => send()}
            returnKeyType="send"
            multiline
          />
          <Pressable
            onPress={() => send()}
            disabled={!input.trim() || sendMutation.isPending}
            style={[
              styles.sendBtn,
              (!input.trim() || sendMutation.isPending) && { opacity: 0.4 },
            ]}
            testID="coach-send"
          >
            <Send size={16} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: "g" | "d" | "s" }) {
  const Icon = icon === "g" ? Gauge : icon === "d" ? Activity : Shield;
  return (
    <View style={styles.stat}>
      <Icon size={12} color="rgba(255,255,255,0.8)" />
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  list: { paddingBottom: 16 },
  hero: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 20,
    padding: 18,
    gap: 8,
  },
  heroHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  heroBadge: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  heroBadgeText: { color: "#fff", fontSize: 10, fontWeight: "900", letterSpacing: 0.6 },
  newUserBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginLeft: "auto",
    backgroundColor: "rgba(134,239,172,0.18)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(134,239,172,0.35)",
  },
  newUserBadgeText: { color: "#86EFAC", fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  stateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginLeft: "auto",
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  stateChipText: { color: "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  heroTitle: { color: "#fff", fontSize: 22, fontWeight: "900", letterSpacing: -0.5, marginTop: 4 },
  heroSub: { color: "rgba(255,255,255,0.82)", fontSize: 12.5, fontWeight: "500", lineHeight: 18 },
  statRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  stat: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.10)",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 2,
  },
  statVal: { color: "#fff", fontSize: 15, fontWeight: "900", marginTop: 2 },
  statLabel: { color: "rgba(255,255,255,0.75)", fontSize: 10, fontWeight: "700", letterSpacing: 0.4 },

  stepRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  stepDot: { width: 8, height: 8, borderRadius: 4 },
  stepLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.4 },

  coachSponsor: {
    marginTop: 12,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  coachSponsorPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
  },
  coachSponsorPillText: { color: "rgba(255,255,255,0.85)", fontSize: 9, fontWeight: "900", letterSpacing: 0.6 },
  coachSponsorName: { color: "#fff", fontSize: 15, fontWeight: "900", letterSpacing: -0.2 },

  section: { paddingHorizontal: 16, marginTop: 18 },
  sectionTitle: { color: Colors.text, fontSize: 16, fontWeight: "900", letterSpacing: -0.2 },
  sectionSub: { color: Colors.textMuted, fontSize: 11.5, fontWeight: "600", marginTop: 2, marginBottom: 10 },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.blue },
  actionTitle: { color: Colors.text, fontSize: 13.5, fontWeight: "800" },
  actionBody: { color: Colors.textSecondary, fontSize: 11.5, fontWeight: "500", marginTop: 2 },

  edgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sideBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sideText: { fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  edgeName: { color: Colors.text, fontSize: 13, fontWeight: "800" },
  edgeReason: { color: Colors.textMuted, fontSize: 10.5, fontWeight: "600", marginTop: 2 },
  edgeMeta: { alignItems: "flex-end", gap: 4 },
  edgePrice: { color: Colors.text, fontSize: 11, fontWeight: "800" },
  confPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.blueSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  confText: { color: Colors.blue, fontSize: 10, fontWeight: "900" },

  chatHeader: { paddingHorizontal: 16, marginTop: 20, marginBottom: 4 },

  msgRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 10,
    gap: 8,
    alignItems: "flex-start",
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.text,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  botBubble: {
    maxWidth: "100%",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  botText: { color: Colors.text, fontSize: 13.5, lineHeight: 19, fontWeight: "500" },
  userBubble: {
    maxWidth: "82%",
    backgroundColor: Colors.text,
    borderRadius: 16,
    borderTopRightRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  userText: { color: "#fff", fontSize: 13.5, lineHeight: 19, fontWeight: "600" },

  tradeCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.emerald,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  tradeCtaText: { color: "#fff", fontSize: 13, fontWeight: "800" },

  typing: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  typingText: { color: Colors.textMuted, fontSize: 12, fontWeight: "600" },

  quickRow: { paddingHorizontal: 12, paddingTop: 8, gap: 8 },
  quickChip: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  quickChipNew: {
    backgroundColor: Colors.emeraldSoft,
    borderColor: "#86EFAC",
  },
  quickText: { color: Colors.text, fontSize: 12, fontWeight: "700" },
  quickTextNew: { color: Colors.emerald },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 8 : 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    color: Colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
});
