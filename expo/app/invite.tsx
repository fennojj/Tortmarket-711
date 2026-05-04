import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  Check,
  CheckCircle2,
  Copy,
  Gift,
  Link as LinkIcon,
  Mail,
  MessageCircle,
  MessagesSquare,
  Rocket,
  Send,
  Share2,
  Sparkles,
  Trophy,
  Twitter,
  Users,
  Zap,
} from "lucide-react-native";
import { Colors } from "@/constants/colors";
import { SHARE_BONUS, useApp } from "@/providers/AppProvider";
import {
  getInviteMessage,
  getInviteUrl,
  getLaunchProgress,
  REFERRAL_BONUS_INVITEE,
  REFERRAL_BONUS_INVITER,
} from "@/utils/referrals";

export default function InviteScreen(): React.ReactElement {
  const { user, creditOwnReferral, claimShareBonus } = useApp();
  const [copied, setCopied] = useState<boolean>(false);

  const tryAwardShareBonus = useCallback(() => {
    if (user.shareBonusClaimed) return;
    const res = claimShareBonus();
    if (res.ok) {
      Alert.alert(
        "+" + SHARE_BONUS.toLocaleString() + " pts",
        "Founder Share Bonus unlocked. Thanks for spreading the word.",
      );
    }
  }, [user.shareBonusClaimed, claimShareBonus]);

  const code = user.referralCode ?? "TORTSITE";
  const url = useMemo(() => getInviteUrl(code), [code]);
  const message = useMemo(() => getInviteMessage(code, user.handle), [code, user.handle]);

  const progress = useMemo(
    () => getLaunchProgress(user.referralCount ?? 0),
    [user.referralCount],
  );

  const handleCopy = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(url);
      setCopied(true);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      setTimeout(() => setCopied(false), 1800);
      tryAwardShareBonus();
    } catch (e) {
      console.log("[Invite] copy error", e);
    }
  }, [url, tryAwardShareBonus]);

  const handleShare = useCallback(async () => {
    try {
      if (Platform.OS === "web") {
        const nav = navigator as Navigator & {
          share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
        };
        if (nav.share) {
          await nav.share({ title: "Tort Site", text: message, url });
        } else {
          await Clipboard.setStringAsync(message);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }
        return;
      }
      await Share.share({ message, url });
      tryAwardShareBonus();
    } catch (e) {
      console.log("[Invite] share error", e);
    }
  }, [message, url, tryAwardShareBonus]);

  const openExternal = useCallback(async (target: string, label: string) => {
    try {
      if (Platform.OS !== "web") {
        Haptics.selectionAsync().catch(() => {});
      }
      const supported = Platform.OS === "web" ? true : await Linking.canOpenURL(target);
      if (supported) {
        await Linking.openURL(target);
        tryAwardShareBonus();
      } else {
        await Clipboard.setStringAsync(message);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch (e) {
      console.log("[Invite] channel error", label, e);
    }
  }, [message, tryAwardShareBonus]);

  const encodedMsg = useMemo(() => encodeURIComponent(message), [message]);
  const encodedUrl = useMemo(() => encodeURIComponent(url), [url]);
  const encodedSubject = useMemo(() => encodeURIComponent("Join me on Tort Site"), []);

  const channels = useMemo(() => {
    const smsSep = Platform.OS === "ios" ? "&" : "?";
    return [
      {
        id: "sms",
        label: "Messages",
        icon: MessageCircle,
        color: "#22C55E",
        url: `sms:${smsSep}body=${encodedMsg}`,
      },
      {
        id: "whatsapp",
        label: "WhatsApp",
        icon: MessagesSquare,
        color: "#25D366",
        url: `whatsapp://send?text=${encodedMsg}`,
      },
      {
        id: "email",
        label: "Email",
        icon: Mail,
        color: "#3B82F6",
        url: `mailto:?subject=${encodedSubject}&body=${encodedMsg}`,
      },
      {
        id: "x",
        label: "X / Twitter",
        icon: Twitter,
        color: "#0F172A",
        url: `https://twitter.com/intent/tweet?text=${encodedMsg}`,
      },
      {
        id: "telegram",
        label: "Telegram",
        icon: Send,
        color: "#229ED9",
        url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedMsg}`,
      },
      {
        id: "reddit",
        label: "Reddit",
        icon: Share2,
        color: "#FF4500",
        url: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedSubject}`,
      },
    ];
  }, [encodedMsg, encodedUrl, encodedSubject]);

  const onDevCredit = useCallback(() => {
    creditOwnReferral();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [creditOwnReferral]);

  return (
    <View style={styles.wrap} testID="invite-screen">
      <Stack.Screen options={{ title: "Invite Friends" }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={["#0B1220", "#1E3A8A", "#2563EB"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroBadge}>
            <Rocket size={11} color="#fff" />
            <Text style={styles.heroBadgeText}>5,000 FOUNDER PUSH</Text>
          </View>
          <Text style={styles.heroTitle}>Bring the next trader.</Text>
          <Text style={styles.heroSub}>
            Earn {REFERRAL_BONUS_INVITER.toLocaleString()} pts for every friend who joins. They get
            +{REFERRAL_BONUS_INVITEE.toLocaleString()} bonus on top of their welcome stack.
          </Text>

          <View style={styles.prize5kCard} testID="prize-5000-card">
            <View style={styles.prize5kIcon}>
              <Trophy size={16} color="#0B1220" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.prize5kEyebrow}>TRADER #5,000 PRIZE</Text>
              <Text style={styles.prize5kTitle}>Be the exact 5,000th signup.</Text>
              <Text style={styles.prize5kBody}>
                Win 1,000,000 pts, a lifetime Founder badge, and a case of bourbon shipped to the bar conference. Time it right — watch the counter live.
              </Text>
            </View>
          </View>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <Trophy size={12} color={Colors.yellow} />
              <Text style={styles.heroStatVal}>{(user.referralCount ?? 0).toLocaleString()}</Text>
              <Text style={styles.heroStatLabel}>your invites</Text>
            </View>
            <View style={styles.heroStatDiv} />
            <View style={styles.heroStat}>
              <Sparkles size={12} color={Colors.emerald} />
              <Text style={styles.heroStatVal}>
                {(user.referralBonusEarned ?? 0).toLocaleString()}
              </Text>
              <Text style={styles.heroStatLabel}>pts earned</Text>
            </View>
            <View style={styles.heroStatDiv} />
            <View style={styles.heroStat}>
              <Users size={12} color="#fff" />
              <Text style={styles.heroStatVal}>{progress.total.toLocaleString()}</Text>
              <Text style={styles.heroStatLabel}>members</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.codeCard}>
          <Text style={styles.cardLabel}>Your invite code</Text>
          <View style={styles.codeRow}>
            <Text style={styles.codeText} testID="invite-code">{code}</Text>
            <Pressable
              onPress={handleCopy}
              style={[styles.copyBtn, copied && styles.copyBtnDone]}
              testID="invite-copy"
            >
              {copied ? <Check size={14} color="#fff" /> : <Copy size={14} color="#fff" />}
              <Text style={styles.copyText}>{copied ? "Copied" : "Copy link"}</Text>
            </Pressable>
          </View>

          <View style={styles.linkRow}>
            <LinkIcon size={12} color={Colors.textMuted} />
            <Text style={styles.linkText} numberOfLines={1}>{url}</Text>
          </View>
        </View>

        <View style={styles.giftCard} testID="invite-gift-card">
          <View style={styles.giftIcon}>
            <Gift size={18} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.giftEyebrow}>SEND A GIFT</Text>
            <Text style={styles.giftTitle}>
              +{REFERRAL_BONUS_INVITEE.toLocaleString()} pts for your friend
            </Text>
            <Text style={styles.giftBody}>
              When they sign up with your link, you both get credited automatically.
            </Text>
          </View>
        </View>

        <View
          style={[styles.shareBonusCard, user.shareBonusClaimed && styles.shareBonusCardDone]}
          testID="invite-share-bonus"
        >
          <View style={[styles.shareBonusIcon, user.shareBonusClaimed && styles.shareBonusIconDone]}>
            {user.shareBonusClaimed ? (
              <CheckCircle2 size={18} color="#fff" />
            ) : (
              <Zap size={18} color="#0B1220" />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.shareBonusEyebrow}>
              {user.shareBonusClaimed ? "FOUNDER SHARE BONUS · CLAIMED" : "ONE-TIME FOUNDER SHARE BONUS"}
            </Text>
            <Text style={styles.shareBonusTitle}>
              {user.shareBonusClaimed
                ? `+${SHARE_BONUS.toLocaleString()} pts already credited`
                : `+${SHARE_BONUS.toLocaleString()} pts the moment you share`}
            </Text>
            <Text style={styles.shareBonusBody}>
              {user.shareBonusClaimed
                ? "Thanks for spreading the word. Keep inviting to stack referral pts."
                : "Tap any channel below or copy your link — bonus drops instantly, no signup required."}
            </Text>
          </View>
        </View>

        <Pressable onPress={handleShare} style={styles.shareBtn} testID="invite-share">
          <Share2 size={16} color="#fff" />
          <Text style={styles.shareText}>Send gift to a friend</Text>
        </Pressable>

        <View style={styles.channelsWrap} testID="invite-channels">
          <Text style={styles.channelsTitle}>Send to your people</Text>
          <Text style={styles.channelsSub}>Tap a channel to blast your invite directly.</Text>
          <View style={styles.channelGrid}>
            {channels.map((c) => {
              const Icon = c.icon;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => openExternal(c.url, c.label)}
                  style={({ pressed }) => [styles.channelBtn, pressed && styles.channelBtnPressed]}
                  testID={`invite-channel-${c.id}`}
                >
                  <View style={[styles.channelIcon, { backgroundColor: c.color }]}>
                    <Icon size={18} color="#fff" />
                  </View>
                  <Text style={styles.channelLabel}>{c.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.howRow}>
          <Text style={styles.howTitle}>How it works</Text>
          <Step n={1} title="Share your link" body="Send via text, X, Reddit, or any group chat." />
          <Step n={2} title="They sign up" body={`Friend joins via your link, gets +${REFERRAL_BONUS_INVITEE.toLocaleString()} bonus pts.`} />
          <Step n={3} title="You earn" body={`+${REFERRAL_BONUS_INVITER.toLocaleString()} pts each, climbing the leaderboard fast.`} />
        </View>

        <View style={styles.legal}>
          <Gift size={12} color={Colors.textMuted} />
          <Text style={styles.legalText}>
            Proof of concept · points are simulated. No real money. Bonuses credit instantly.
          </Text>
        </View>

        {__DEV__ ? (
          <Pressable onPress={onDevCredit} style={styles.devBtn} testID="invite-dev-credit">
            <Text style={styles.devText}>Dev: simulate 1 referral credit</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{n}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepBody}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 16, paddingBottom: 60 },

  hero: { borderRadius: 22, padding: 20 },
  heroBadge: {
    alignSelf: "flex-start",
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999,
  },
  heroBadgeText: { color: "#fff", fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  heroTitle: { color: "#fff", fontSize: 26, fontWeight: "900", marginTop: 12, letterSpacing: -0.5 },
  heroSub: { color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: "600", marginTop: 6, lineHeight: 19 },

  prize5kCard: {
    flexDirection: "row", gap: 10,
    marginTop: 14,
    backgroundColor: "rgba(250, 204, 21, 0.14)",
    borderWidth: 1, borderColor: "rgba(250, 204, 21, 0.5)",
    borderRadius: 14, padding: 12,
  },
  prize5kIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.yellow,
    alignItems: "center", justifyContent: "center",
  },
  prize5kEyebrow: { color: "#FDE68A", fontSize: 9.5, fontWeight: "900", letterSpacing: 0.8 },
  prize5kTitle: { color: "#fff", fontSize: 14, fontWeight: "900", marginTop: 2, letterSpacing: -0.2 },
  prize5kBody: { color: "rgba(255,255,255,0.82)", fontSize: 11.5, fontWeight: "600", marginTop: 3, lineHeight: 16 },

  heroStatsRow: {
    flexDirection: "row", alignItems: "center",
    marginTop: 16,
    backgroundColor: "rgba(0,0,0,0.22)",
    borderRadius: 14, padding: 12,
  },
  heroStat: { flex: 1, alignItems: "center", gap: 3 },
  heroStatDiv: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.16)" },
  heroStatVal: { color: "#fff", fontSize: 17, fontWeight: "900" },
  heroStatLabel: { color: "rgba(255,255,255,0.7)", fontSize: 9.5, fontWeight: "800", letterSpacing: 0.4 },

  codeCard: {
    marginTop: 14,
    backgroundColor: Colors.surface,
    borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  cardLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: "900", letterSpacing: 0.7, textTransform: "uppercase" },
  codeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  codeText: { color: Colors.text, fontSize: 28, fontWeight: "900", letterSpacing: 4 },
  copyBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.text,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12,
  },
  copyBtnDone: { backgroundColor: Colors.emerald },
  copyText: { color: "#fff", fontSize: 12.5, fontWeight: "800" },
  linkRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 12,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  linkText: { color: Colors.textSecondary, fontSize: 12, fontWeight: "600", flex: 1 },

  giftCard: {
    flexDirection: "row", gap: 12, alignItems: "center",
    marginTop: 14,
    padding: 14,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1, borderColor: Colors.border,
  },
  giftIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: Colors.orange,
    alignItems: "center", justifyContent: "center",
  },
  giftEyebrow: { color: Colors.orange, fontSize: 9.5, fontWeight: "900", letterSpacing: 0.8 },
  giftTitle: { color: Colors.text, fontSize: 15, fontWeight: "900", marginTop: 2 },
  giftBody: { color: Colors.textSecondary, fontSize: 12, fontWeight: "600", marginTop: 3, lineHeight: 17 },

  shareBonusCard: {
    flexDirection: "row", gap: 12, alignItems: "center",
    marginTop: 12,
    padding: 14,
    backgroundColor: "rgba(250, 204, 21, 0.10)",
    borderRadius: 18,
    borderWidth: 1, borderColor: "rgba(250, 204, 21, 0.45)",
  },
  shareBonusCardDone: {
    backgroundColor: "rgba(16, 185, 129, 0.10)",
    borderColor: "rgba(16, 185, 129, 0.45)",
  },
  shareBonusIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: Colors.yellow,
    alignItems: "center", justifyContent: "center",
  },
  shareBonusIconDone: { backgroundColor: Colors.emerald },
  shareBonusEyebrow: { color: Colors.yellow, fontSize: 9.5, fontWeight: "900", letterSpacing: 0.8 },
  shareBonusTitle: { color: Colors.text, fontSize: 15, fontWeight: "900", marginTop: 2, letterSpacing: -0.2 },
  shareBonusBody: { color: Colors.textSecondary, fontSize: 12, fontWeight: "600", marginTop: 3, lineHeight: 17 },

  shareBtn: {
    marginTop: 12,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.orange,
    height: 52, borderRadius: 16,
  },
  shareText: { color: "#fff", fontSize: 15, fontWeight: "900", letterSpacing: 0.3 },

  channelsWrap: {
    marginTop: 22,
    backgroundColor: Colors.surface,
    borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  channelsTitle: { color: Colors.text, fontSize: 15, fontWeight: "900" },
  channelsSub: { color: Colors.textSecondary, fontSize: 12, fontWeight: "600", marginTop: 3 },
  channelGrid: {
    flexDirection: "row", flexWrap: "wrap",
    marginTop: 12,
    marginHorizontal: -6,
  },
  channelBtn: {
    width: "33.3333%",
    paddingHorizontal: 6, paddingVertical: 8,
    alignItems: "center",
  },
  channelBtnPressed: { opacity: 0.6 },
  channelIcon: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  channelLabel: { color: Colors.text, fontSize: 11.5, fontWeight: "800", marginTop: 6 },

  howRow: { marginTop: 22 },
  howTitle: { color: Colors.text, fontSize: 16, fontWeight: "900", marginBottom: 10 },
  step: {
    flexDirection: "row", gap: 12, alignItems: "flex-start",
    paddingVertical: 8,
  },
  stepNum: {
    width: 28, height: 28, borderRadius: 9,
    backgroundColor: Colors.blueSoft,
    alignItems: "center", justifyContent: "center",
  },
  stepNumText: { color: Colors.blue, fontSize: 13, fontWeight: "900" },
  stepTitle: { color: Colors.text, fontSize: 14, fontWeight: "800" },
  stepBody: { color: Colors.textSecondary, fontSize: 12.5, fontWeight: "600", marginTop: 2, lineHeight: 18 },

  legal: {
    flexDirection: "row", gap: 6, alignItems: "flex-start",
    marginTop: 16, paddingHorizontal: 4,
  },
  legalText: { color: Colors.textMuted, fontSize: 11, fontWeight: "600", flex: 1, lineHeight: 16 },

  devBtn: {
    marginTop: 18,
    alignSelf: "center",
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  devText: { color: Colors.textMuted, fontSize: 11, fontWeight: "700" },
});
