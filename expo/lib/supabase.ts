import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client for cross-device referral crediting.
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
