import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Lightweight A/B test for the join screen.
 *
 * - Deterministic per device: variant is picked once on first visit and
 *   persisted, so users always see the same screen on subsequent loads.
 * - 50/50 split between variant A (full hero) and variant B (frictionless).
 * - Variant is passed through to Supabase `signups.variant` so we can
 *   measure conversion in the admin dashboard.
 *
 * Add this column to Supabase once:
 *   alter table public.signups add column if not exists variant text;
 *   create index if not exists signups_variant_idx
 *     on public.signups (campaign, variant);
 */

export type JoinVariant = "A" | "B";

const VARIANT_KEY = "tortsite.ab.join.v1";

export async function getOrAssignJoinVariant(): Promise<JoinVariant> {
  try {
    const stored = await AsyncStorage.getItem(VARIANT_KEY);
    if (stored === "A" || stored === "B") return stored;
    const pick: JoinVariant = Math.random() < 0.5 ? "A" : "B";
    await AsyncStorage.setItem(VARIANT_KEY, pick);
    console.log("[ABTest] assigned join variant", pick);
    return pick;
  } catch (e) {
    console.log("[ABTest] assign error", e);
    return "A";
  }
}

export async function overrideJoinVariant(v: JoinVariant): Promise<void> {
  try {
    await AsyncStorage.setItem(VARIANT_KEY, v);
  } catch (e) {
    console.log("[ABTest] override error", e);
  }
}
