import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as Linking from "expo-linking";
import { useMarkets } from "@/providers/MarketsProvider";
import type { AlertItem, Position, User } from "@/types";
import {
  generateReferralCode,
  normalizeRefCode,
  parseRefFromUrl,
  PENDING_REF_KEY,
  REFERRAL_BONUS_INVITEE,
  REFERRAL_BONUS_INVITER,
} from "@/utils/referrals";
import {
  fetchUnclaimedReferrals,
  markReferralsClaimed,
  recordReferralSignup,
  supabaseEnabled,
} from "@/lib/supabase";

const STORAGE_KEY = "tortsite.user.v1";

const DEFAULT_USER: User = {
  id: "me",
  handle: "@you",
  pointBalance: 100000,
  positions: [],
  titles: [],
  streakDays: 0,
  welcomeBonusClaimed: false,
  referralCount: 0,
  referralBonusEarned: 0,
};

export const DAILY_BASE_REWARD = 500;
export const WELCOME_BONUS = 50000;
export const SHARE_BONUS = 7500;
export const WEEKLY_GRAND_PRIZE = 1000000;

function isSameDay(a: number, b: number): boolean {
  const da = new Date(a); const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}
function isConsecutiveDay(prev: number, now: number): boolean {
  const d = new Date(prev);
  d.setDate(d.getDate() + 1);
  return isSameDay(d.getTime(), now);
}

async function loadUser(): Promise<User> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_USER, referralCode: generateReferralCode() };
    }
    const parsed = JSON.parse(raw) as User;
    const merged: User = { ...DEFAULT_USER, ...parsed };
    if (!merged.referralCode) merged.referralCode = generateReferralCode();
    return merged;
  } catch (e) {
    console.log("[AppProvider] loadUser error", e);
    return { ...DEFAULT_USER, referralCode: generateReferralCode() };
  }
}

async function saveUser(u: User): Promise<User> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  return u;
}

export const [AppProvider, useApp] = createContextHook(() => {
  const qc = useQueryClient();
  const { markets, marketById, applyTrade } = useMarkets();
  const [user, setUser] = useState<User>(DEFAULT_USER);
  const [lastPlay, setLastPlay] = useState<AlertItem | null>(null);
  const [pendingRef, setPendingRef] = useState<string | null>(null);

  const userQuery = useQuery({ queryKey: ["user"], queryFn: loadUser });

  useEffect(() => {
    if (userQuery.data) {
      setUser(userQuery.data);
    }
  }, [userQuery.data]);

  useEffect(() => {
    let mounted = true;
    const captureRef = async (url: string | null | undefined) => {
      const code = parseRefFromUrl(url ?? null);
      if (!code) return;
      try {
        await AsyncStorage.setItem(PENDING_REF_KEY, code);
        if (mounted) setPendingRef(code);
        console.log("[Referrals] captured pending ref", code);
      } catch (e) {
        console.log("[Referrals] persist pending ref error", e);
      }
    };

    AsyncStorage.getItem(PENDING_REF_KEY)
      .then((stored) => {
        const code = normalizeRefCode(stored);
        if (code && mounted) setPendingRef(code);
      })
      .catch((e) => console.log("[Referrals] read pending ref error", e));

    Linking.getInitialURL()
      .then((url) => captureRef(url))
      .catch((e) => console.log("[Referrals] initial url error", e));

    const sub = Linking.addEventListener("url", (event) => {
      captureRef(event.url);
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  const persistMutation = useMutation({
    mutationFn: saveUser,
    onSuccess: (u) => {
      qc.setQueryData(["user"], u);
    },
  });

  const buyShares = useCallback(
    (args: { marketId: string; side: "YES" | "NO"; shares: number; priceCents: number }) => {
      const cost = Math.round(args.shares * args.priceCents);
      if (cost > user.pointBalance) {
        console.log("[AppProvider] insufficient balance", { cost, balance: user.pointBalance });
        return { ok: false as const, reason: "Insufficient points" };
      }
      const existing = user.positions.find(
        (p) => p.marketId === args.marketId && p.side === args.side,
      );
      let positions: Position[];
      if (existing) {
        const totalShares = existing.shares + args.shares;
        const avg = (existing.shares * existing.avgPrice + args.shares * args.priceCents) / totalShares;
        positions = user.positions.map((p) =>
          p.id === existing.id ? { ...p, shares: totalShares, avgPrice: avg } : p,
        );
      } else {
        const np: Position = {
          id: `${args.marketId}-${args.side}-${Date.now()}`,
          marketId: args.marketId,
          side: args.side,
          shares: args.shares,
          avgPrice: args.priceCents,
          createdAt: Date.now(),
        };
        positions = [...user.positions, np];
      }
      const next: User = {
        ...user,
        pointBalance: user.pointBalance - cost,
        positions,
      };
      setUser(next);
      persistMutation.mutate(next);

      // live impact: move prices + bump volume
      applyTrade({
        marketId: args.marketId,
        side: args.side,
        shares: args.shares,
        priceCents: args.priceCents,
      });

      if (cost >= 10000) {
        console.log("[Discord Webhook] #whale-tracker:", {
          user: user.handle,
          market: args.marketId,
          side: args.side,
          points: cost,
        });
      }

      const market = marketById(args.marketId);
      const playEvent: AlertItem = {
        id: `play-${Date.now()}`,
        kind: "play",
        marketId: args.marketId,
        title: `${user.handle} went ${args.side} on ${market?.caseName ?? args.marketId}`,
        body: `${args.shares.toLocaleString()} shares @ ${args.priceCents}¢ • ${cost.toLocaleString()} pts`,
        author: user.handle,
        side: args.side,
        shares: args.shares,
        cost,
        createdAt: Date.now(),
      };
      setLastPlay(playEvent);
      console.log("[AppProvider] play emitted", playEvent);

      return { ok: true as const };
    },
    [user, persistMutation, applyTrade, marketById],
  );

  const redeemReward = useCallback(
    (args: { rewardId: string; cost: number; name: string }) => {
      if (args.cost > user.pointBalance) {
        return { ok: false as const, reason: "Insufficient points" };
      }
      const next: User = { ...user, pointBalance: user.pointBalance - args.cost };
      setUser(next);
      persistMutation.mutate(next);
      console.log("[Rewards] redeemed", args);
      return { ok: true as const };
    },
    [user, persistMutation],
  );

  const claimDaily = useCallback(() => {
    const now = Date.now();
    if (user.lastClaimAt && isSameDay(user.lastClaimAt, now)) {
      console.log("[AppProvider] daily already claimed");
      return { ok: false as const, reason: "Already claimed today", amount: 0, streak: user.streakDays ?? 0 };
    }
    const prevStreak = user.streakDays ?? 0;
    const consecutive = user.lastClaimAt ? isConsecutiveDay(user.lastClaimAt, now) : false;
    const nextStreak = consecutive ? prevStreak + 1 : 1;
    const bonus = Math.min(nextStreak - 1, 6) * 250;
    const amount = DAILY_BASE_REWARD + bonus;
    const next: User = {
      ...user,
      pointBalance: user.pointBalance + amount,
      lastClaimAt: now,
      streakDays: nextStreak,
    };
    setUser(next);
    persistMutation.mutate(next);
    console.log("[AppProvider] claimDaily", { amount, streak: nextStreak });
    return { ok: true as const, amount, streak: nextStreak };
  }, [user, persistMutation]);

  const claimWelcomeBonus = useCallback(() => {
    if (user.welcomeBonusClaimed) return { ok: false as const, reason: "Already claimed" };
    const next: User = {
      ...user,
      pointBalance: user.pointBalance + WELCOME_BONUS,
      welcomeBonusClaimed: true,
    };
    setUser(next);
    persistMutation.mutate(next);
    return { ok: true as const, amount: WELCOME_BONUS };
  }, [user, persistMutation]);

  const claimShareBonus = useCallback(() => {
    if (user.shareBonusClaimed) return { ok: false as const, reason: "Already claimed", amount: 0 };
    const next: User = {
      ...user,
      pointBalance: user.pointBalance + SHARE_BONUS,
      shareBonusClaimed: true,
    };
    setUser(next);
    persistMutation.mutate(next);
    console.log("[AppProvider] share bonus claimed", { amount: SHARE_BONUS });
    return { ok: true as const, amount: SHARE_BONUS };
  }, [user, persistMutation]);

  const resetBalance = useCallback(() => {
    const next = { ...DEFAULT_USER };
    setUser(next);
    persistMutation.mutate(next);
  }, [persistMutation]);

  const registerUser = useCallback(
    (args: { handle: string; email: string; source?: string; referredBy?: string }) => {
      const ref = normalizeRefCode(args.referredBy) ?? pendingRef;
      const isSelfRef = ref && user.referralCode && ref === user.referralCode;
      const appliedRef = isSelfRef ? null : ref;
      const inviteeBonus = appliedRef ? REFERRAL_BONUS_INVITEE : 0;

      const next: User = {
        ...user,
        handle: args.handle.startsWith("@") ? args.handle : `@${args.handle}`,
        email: args.email.trim().toLowerCase(),
        source: args.source ?? "poc-direct",
        joinedAt: Date.now(),
        onboarded: true,
        referralCode: user.referralCode ?? generateReferralCode(),
        referredBy: appliedRef ?? undefined,
        pointBalance: user.pointBalance + inviteeBonus,
      };
      setUser(next);
      persistMutation.mutate(next);
      AsyncStorage.removeItem(PENDING_REF_KEY).catch(() => {});
      setPendingRef(null);

      console.log("[Signup] captured", {
        handle: next.handle,
        email: next.email,
        source: next.source,
        joinedAt: next.joinedAt,
        referredBy: next.referredBy,
        referralCode: next.referralCode,
      });

      fetch("https://ntfy.sh/tortsite-signups-q15qiisdf8i47w9fba50o", {
        method: "POST",
        headers: {
          "Title": "New TortSite Signup",
          "Priority": "high",
          "Tags": "bust_in_silhouette,gavel",
          "Content-Type": "text/plain",
        },
        body: `${next.handle} just joined via ${next.source}${appliedRef ? ` (referred by ${appliedRef})` : ""}\nEmail: ${next.email}\nCode: ${next.referralCode}\n${new Date(next.joinedAt!).toLocaleString()}`,
      }).catch((e) => console.log("[Signup] ntfy error", e));

      if (appliedRef) {
        recordReferralSignup({
          inviterCode: appliedRef,
          inviteeHandle: next.handle,
          inviteeEmail: next.email ?? "",
        }).catch((e) => console.log("[Referral] record error", e));
        fetch("https://ntfy.sh/tortsite-referrals-q15qiisdf8i47w9fba50o", {
          method: "POST",
          headers: {
            "Title": "TortSite Referral Credit",
            "Priority": "default",
            "Tags": "handshake,gift",
            "Content-Type": "text/plain",
          },
          body: `Inviter ${appliedRef} → ${next.handle} (${next.email}). Credit ${REFERRAL_BONUS_INVITER} pts.`,
        }).catch((e) => console.log("[Referral] ntfy error", e));
      }

      return { ok: true as const, referredBy: appliedRef };
    },
    [user, persistMutation, pendingRef],
  );

  const creditReferrals = useCallback(
    (count: number) => {
      if (count <= 0) return;
      const totalBonus = REFERRAL_BONUS_INVITER * count;
      const next: User = {
        ...user,
        pointBalance: user.pointBalance + totalBonus,
        referralCount: (user.referralCount ?? 0) + count,
        referralBonusEarned: (user.referralBonusEarned ?? 0) + totalBonus,
      };
      setUser(next);
      persistMutation.mutate(next);
      console.log("[Referral] credited", { count, totalBonus });
    },
    [user, persistMutation],
  );

  const referralPollQuery = useQuery({
    queryKey: ["referral-pending", user.referralCode ?? "none"],
    queryFn: async () => {
      if (!user.referralCode || !supabaseEnabled) return [] as string[];
      const rows = await fetchUnclaimedReferrals(user.referralCode);
      return rows.map((r) => r.id);
    },
    enabled: !!user.referralCode && supabaseEnabled,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const ids = referralPollQuery.data ?? [];
    if (ids.length === 0) return;
    markReferralsClaimed(ids)
      .then(() => {
        creditReferrals(ids.length);
        qc.invalidateQueries({ queryKey: ["referral-pending"] });
      })
      .catch((e) => console.log("[Referral] claim chain error", e));
  }, [referralPollQuery.data, creditReferrals, qc]);

  const applyPendingRef = useCallback(
    async (raw: string) => {
      const code = normalizeRefCode(raw);
      if (!code) return;
      try {
        await AsyncStorage.setItem(PENDING_REF_KEY, code);
        setPendingRef(code);
        console.log("[Referrals] applied via deep link", code);
      } catch (e) {
        console.log("[Referrals] applyPendingRef error", e);
      }
    },
    [],
  );

  const creditOwnReferral = useCallback(() => {
    const next: User = {
      ...user,
      pointBalance: user.pointBalance + REFERRAL_BONUS_INVITER,
      referralCount: (user.referralCount ?? 0) + 1,
      referralBonusEarned: (user.referralBonusEarned ?? 0) + REFERRAL_BONUS_INVITER,
    };
    setUser(next);
    persistMutation.mutate(next);
    console.log("[Referral] self credit applied", { count: next.referralCount });
  }, [user, persistMutation]);

  const portfolioValue = useMemo(() => {
    return user.positions.reduce((acc, p) => {
      const m = markets.find((mm) => mm.id === p.marketId);
      if (!m) return acc;
      const price = p.side === "YES" ? m.yesPrice : m.noPrice;
      return acc + p.shares * price;
    }, 0);
  }, [user.positions, markets]);

  const portfolioCost = useMemo(() => {
    return user.positions.reduce((acc, p) => acc + p.shares * p.avgPrice, 0);
  }, [user.positions]);

  const canClaimDaily = useMemo(() => {
    if (!user.lastClaimAt) return true;
    return !isSameDay(user.lastClaimAt, Date.now());
  }, [user.lastClaimAt]);

  return {
    user,
    isLoading: userQuery.isLoading,
    buyShares,
    redeemReward,
    claimDaily,
    claimWelcomeBonus,
    claimShareBonus,
    canClaimDaily,
    resetBalance,
    registerUser,
    creditOwnReferral,
    portfolioValue,
    portfolioCost,
    lastPlay,
    pendingRef,
    applyPendingRef,
  };
});
