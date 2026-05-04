export const REFERRAL_BONUS_INVITER = 10000;
export const REFERRAL_BONUS_INVITEE = 5000;
export const LAUNCH_GOAL = 5000;
export const LAUNCH_BASE_MEMBERS = 1247;
export const PENDING_REF_KEY = "tortsite.pending_ref.v1";
export const LAUNCH_PROGRESS_START = Date.parse("2026-04-22T00:00:00Z");

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateReferralCode(): string {
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
  }
  return out;
}

export function normalizeRefCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.length < 4 || cleaned.length > 12) return null;
  return cleaned;
}

/**
 * Public web invite URL. Points at the project's Rork web preview, which
 * serves the SPA and runs the same React Native code on the web. The home
 * screen reads ?ref=… and redirects into /join.
 */
const RORK_PROJECT_ID =
  process.env.EXPO_PUBLIC_PROJECT_ID ?? "q15qiisdf8i47w9fba50o";
export const INVITE_WEB_HOST = `https://${RORK_PROJECT_ID}.rork.app`;

export function getInviteUrl(code: string): string {
  return `${INVITE_WEB_HOST}?ref=${encodeURIComponent(code)}`;
}

/**
 * Native app deep link (rork-app://join?ref=CODE) used when sharing inside
 * the app or when we know the receiver already has the app installed.
 */
export function getInviteAppDeepLink(code: string): string {
  return `rork-app://join?ref=${encodeURIComponent(code)}`;
}

export const EXPO_GO_IOS_URL = "https://apps.apple.com/app/expo-go/id982107779";
export const EXPO_GO_ANDROID_URL = "https://play.google.com/store/apps/details?id=host.exp.exponent";

export function getInviteMessage(code: string, handle: string): string {
  const url = getInviteUrl(code);
  return [
    `${handle} invited you to Tort Site — the prediction market for mass tort cases.`,
    "",
    "Trade on 70+ active MDL cases (Roundup, PFAS, Depo-Provera, Camp Lejeune, more).",
    "",
    "How to play (2 min):",
    "1. Install \"Expo Go\" from the App Store / Play Store",
    "2. Open this link on your phone — it launches inside Expo Go",
    "3. Sign up and we both get bonus points",
    "",
    url,
  ].join("\n");
}

export function parseRefFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const match = url.match(/[?&]ref=([^&#]+)/i);
    if (!match) return null;
    return normalizeRefCode(decodeURIComponent(match[1]));
  } catch (e) {
    console.log("[referrals] parse error", e);
    return null;
  }
}

export function getLaunchProgress(realMembers: number): {
  total: number;
  goal: number;
  pct: number;
  remaining: number;
} {
  const elapsedHours = Math.max(0, (Date.now() - LAUNCH_PROGRESS_START) / 3_600_000);
  const baseGrowth = Math.floor(elapsedHours * 7);
  const total = Math.min(LAUNCH_GOAL, LAUNCH_BASE_MEMBERS + baseGrowth + Math.max(0, realMembers));
  const pct = Math.min(1, total / LAUNCH_GOAL);
  return {
    total,
    goal: LAUNCH_GOAL,
    pct,
    remaining: Math.max(0, LAUNCH_GOAL - total),
  };
}
