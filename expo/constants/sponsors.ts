export type SponsorSlotTier =
  | "title"
  | "presenting"
  | "coach"
  | "leaderboard"
  | "banner"
  | "native"
  | "tier"
  | "sticky"
  | "ribbon"
  | "bounty";

export interface SponsorTier {
  id: string;
  name: string;
  tagline: string;
  url?: string;
}

export interface SponsorCreative {
  /** Display name of the sponsor */
  name: string;
  /** Short tagline shown under the name */
  tagline?: string;
  /** Remote URL to a logo image */
  logoUrl?: string;
  /** Remote URL to a background/banner image (optional) */
  imageUrl?: string;
  /** Solid background color (used if no imageUrl) */
  backgroundColor?: string;
  /** Text color override */
  textColor?: string;
  /** Accent/badge color */
  accentColor?: string;
  /** Click-through URL (web only) */
  url?: string;
  /** Set to true to show this creative in the live app */
  active: boolean;
}

export interface ConferenceCase {
  id: string;
  name: string;
  pointThreshold: number;
  unitsAvailable: number;
  sponsor: string;
  description: string;
  image: string;
}

export interface ConferenceConfig {
  active: boolean;
  name: string;
  city: string;
  startISO: string;
  endISO: string;
  titleSponsor: SponsorTier | null;
  coachSponsor: SponsorTier | null;
  presentingSponsors: SponsorTier[];
  cases: ConferenceCase[];
}

// ─────────────────────────────────────────────────────────────────────────────
// SPONSOR CREATIVES
// To add a sponsor: fill in the fields for the desired slot tier and set
// active: true.  The slot will render the real creative in the live app.
// When the Sponsor Map toggle is ON, a small overlay badge still appears so
// you can demo the slot layout to prospective sponsors.
// ─────────────────────────────────────────────────────────────────────────────
export const SPONSOR_CREATIVES: Partial<Record<SponsorSlotTier, SponsorCreative>> = {
  // ── EXAMPLES ── uncomment and fill in to activate ─────────────────────────

  // banner: {
  //   name: "Smith & Jones LLP",
  //   tagline: "Fighting for victims since 1998 · Free consultation",
  //   logoUrl: "https://your-cdn.com/smith-jones-logo.png",
  //   backgroundColor: "#0B1F4B",
  //   textColor: "#FFFFFF",
  //   accentColor: "#F59E0B",
  //   url: "https://smithjones.com",
  //   active: true,
  // },

  // presenting: {
  //   name: "Acme Litigation Finance",
  //   tagline: "Non-recourse funding for mass tort cases",
  //   logoUrl: "https://your-cdn.com/acme-logo.png",
  //   backgroundColor: "#1A2E1A",
  //   textColor: "#D1FAE5",
  //   accentColor: "#10B981",
  //   url: "https://acmefinance.com",
  //   active: true,
  // },

  // native: {
  //   name: "TortLink Pro",
  //   tagline: "Connect with 500+ mass tort attorneys instantly",
  //   imageUrl: "https://your-cdn.com/tortlink-bg.jpg",
  //   textColor: "#FFFFFF",
  //   accentColor: "#6366F1",
  //   url: "https://tortlink.com",
  //   active: true,
  // },

  // sticky: {
  //   name: "National Tort Network",
  //   tagline: "Your trusted source for mass tort intelligence",
  //   backgroundColor: "#0F172A",
  //   textColor: "#F8FAFC",
  //   accentColor: "#FF6A1A",
  //   url: "https://nationaltort.com",
  //   active: true,
  // },
};

// ─────────────────────────────────────────────────────────────────────────────

export const CONFERENCE: ConferenceConfig = {
  active: true,
  name: "Bar Conference 2026",
  city: "TBD",
  startISO: "2026-05-04",
  endISO: "2026-05-07",

  titleSponsor: {
    id: "title-1",
    name: "Your Title Sponsor",
    tagline: "Presenting Sponsor of the Tort Site Live Leaderboard",
    url: undefined,
  },

  coachSponsor: {
    id: "coach-1",
    name: "Your Coach Sponsor",
    tagline: "TortCoach AI · Powered by",
    url: undefined,
  },

  presentingSponsors: [],

  cases: [
    {
      id: "case-bronze",
      name: "Conference Bronze Case",
      pointThreshold: 25_000,
      unitsAvailable: 100,
      sponsor: "Conference Sponsor",
      description: "Reach 25K points to claim a sponsored welcome case.",
      image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800",
    },
    {
      id: "case-silver",
      name: "Conference Silver Case",
      pointThreshold: 75_000,
      unitsAvailable: 50,
      sponsor: "Conference Sponsor",
      description: "Hit 75K points to unlock a premium silver case at the booth.",
      image: "https://images.unsplash.com/photo-1606293459339-cb1faab63b21?w=800",
    },
    {
      id: "case-gold",
      name: "Conference Gold Case",
      pointThreshold: 150_000,
      unitsAvailable: 20,
      sponsor: "Conference Sponsor",
      description: "Top performers at 150K+ pts claim a limited gold case.",
      image: "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=800",
    },
  ],
};
