import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client for the 5,000-signup campaign.
 *
 * Required SQL (run once in Supabase SQL editor):
 *
 *   create table if not exists public.referrals (
 *     id uuid primary key default gen_random_uuid(),
 *     inviter_code text not null,
 *     invitee_handle text not null,
 *     invitee_email text,
 *     created_at timestamptz not null default now(),
 *     claimed_by_inviter boolean not null default false,
 *     claimed_at timestamptz
 *   );
 *   create index if not exists referrals_inviter_idx
 *     on public.referrals (inviter_code, claimed_by_inviter);
 *   alter table public.referrals enable row level security;
 *   create policy "anyone can insert referral"
 *     on public.referrals for insert with check (true);
 *   create policy "anyone can read by inviter"
 *     on public.referrals for select using (true);
 *   create policy "anyone can claim"
 *     on public.referrals for update using (true) with check (true);
 *
 *   create table if not exists public.signups (
 *     id uuid primary key default gen_random_uuid(),
 *     handle text not null,
 *     email text,
 *     referral_code text,
 *     referred_by text,
 *     source text,
 *     platform text,
 *     campaign text,
 *     created_at timestamptz not null default now()
 *   );
 *   create unique index if not exists signups_email_idx
 *     on public.signups (lower(email)) where email is not null;
 *   create index if not exists signups_created_idx
 *     on public.signups (created_at desc);
 *   create index if not exists signups_ref_idx
 *     on public.signups (referred_by);
 *   alter table public.signups enable row level security;
 *   create policy "anyone can insert signup"
 *     on public.signups for insert with check (true);
 *   create policy "anyone can read signups"
 *     on public.signups for select using (true);
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabaseEnabled: boolean =
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

export const supabase = supabaseEnabled
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

export interface ReferralRow {
  id: string;
  inviter_code: string;
  invitee_handle: string;
  invitee_email: string | null;
  created_at: string;
  claimed_by_inviter: boolean;
  claimed_at: string | null;
}

export async function recordReferralSignup(args: {
  inviterCode: string;
  inviteeHandle: string;
  inviteeEmail: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "supabase-disabled" };
  try {
    const { error } = await supabase.from("referrals").insert({
      inviter_code: args.inviterCode,
      invitee_handle: args.inviteeHandle,
      invitee_email: args.inviteeEmail,
    });
    if (error) {
      console.log("[Referrals] insert error", error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    console.log("[Referrals] insert exception", e);
    return { ok: false, error: "exception" };
  }
}

export async function fetchUnclaimedReferrals(
  inviterCode: string,
): Promise<ReferralRow[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("referrals")
      .select("*")
      .eq("inviter_code", inviterCode)
      .eq("claimed_by_inviter", false)
      .order("created_at", { ascending: true })
      .limit(50);
    if (error) {
      console.log("[Referrals] fetch error", error.message);
      return [];
    }
    return (data ?? []) as ReferralRow[];
  } catch (e) {
    console.log("[Referrals] fetch exception", e);
    return [];
  }
}

export async function markReferralsClaimed(ids: string[]): Promise<void> {
  if (!supabase || ids.length === 0) return;
  try {
    const { error } = await supabase
      .from("referrals")
      .update({ claimed_by_inviter: true, claimed_at: new Date().toISOString() })
      .in("id", ids);
    if (error) console.log("[Referrals] claim error", error.message);
  } catch (e) {
    console.log("[Referrals] claim exception", e);
  }
}

export interface SignupRow {
  id: string;
  handle: string;
  email: string | null;
  referral_code: string | null;
  referred_by: string | null;
  source: string | null;
  platform: string | null;
  campaign: string | null;
  created_at: string;
}

export async function recordSignup(args: {
  handle: string;
  email: string | null;
  referralCode: string | null;
  referredBy: string | null;
  source: string | null;
  platform: string | null;
  campaign?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "supabase-disabled" };
  try {
    const { error } = await supabase.from("signups").insert({
      handle: args.handle,
      email: args.email,
      referral_code: args.referralCode,
      referred_by: args.referredBy,
      source: args.source,
      platform: args.platform,
      campaign: args.campaign ?? "launch-5k",
    });
    if (error) {
      // Duplicate email is fine — treat as success so the user is not blocked.
      if (error.code === "23505") return { ok: true };
      console.log("[Signups] insert error", error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    console.log("[Signups] insert exception", e);
    return { ok: false, error: "exception" };
  }
}

export interface SignupStats {
  total: number;
  last24h: number;
  last7d: number;
  today: number;
}

export async function fetchSignupStats(
  campaign: string = "launch-5k",
): Promise<SignupStats> {
  const empty: SignupStats = { total: 0, last24h: 0, last7d: 0, today: 0 };
  if (!supabase) return empty;
  try {
    const now = Date.now();
    const day = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const week = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayIso = startOfDay.toISOString();

    const base = () =>
      supabase!.from("signups").select("id", { count: "exact", head: true }).eq("campaign", campaign);

    const [totalRes, dayRes, weekRes, todayRes] = await Promise.all([
      base(),
      base().gte("created_at", day),
      base().gte("created_at", week),
      base().gte("created_at", todayIso),
    ]);
    return {
      total: totalRes.count ?? 0,
      last24h: dayRes.count ?? 0,
      last7d: weekRes.count ?? 0,
      today: todayRes.count ?? 0,
    };
  } catch (e) {
    console.log("[Signups] stats exception", e);
    return empty;
  }
}

export async function fetchRecentSignups(
  limit: number = 50,
  campaign: string = "launch-5k",
): Promise<SignupRow[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("signups")
      .select("*")
      .eq("campaign", campaign)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      console.log("[Signups] recent error", error.message);
      return [];
    }
    return (data ?? []) as SignupRow[];
  } catch (e) {
    console.log("[Signups] recent exception", e);
    return [];
  }
}

export interface TopInviter {
  code: string;
  count: number;
}

export async function fetchTopInviters(
  limit: number = 10,
  campaign: string = "launch-5k",
): Promise<TopInviter[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("signups")
      .select("referred_by")
      .eq("campaign", campaign)
      .not("referred_by", "is", null)
      .limit(5000);
    if (error) {
      console.log("[Signups] top inviters error", error.message);
      return [];
    }
    const counts = new Map<string, number>();
    for (const row of (data ?? []) as { referred_by: string | null }[]) {
      const code = row.referred_by;
      if (!code) continue;
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch (e) {
    console.log("[Signups] top inviters exception", e);
    return [];
  }
}
