/**
 * Live news ingestion for mass tort markets.
 *
 * Pulls real headlines from Google News RSS via the public rss2json proxy
 * (no API key required, supports CORS / web). Each market has a query string
 * tuned to its defendant + case shorthand. New headlines are scored for
 * sentiment polarity (bullish for plaintiffs vs. defense) and converted into
 * market signals that mutate fair value + emit an alert with the source URL.
 *
 * Designed to fail soft: any network/JSON error returns an empty result and
 * the simulated activity engine continues unaffected.
 */

export interface LiveHeadline {
  /** Stable ID derived from the GUID/link so we can dedupe across polls. */
  id: string;
  marketId: string;
  title: string;
  link: string;
  source: string;
  publishedAt: number;
  /** -10..+10. Positive = bullish for YES (plaintiff). */
  polarity: number;
  /** 0..1 conviction strength. */
  magnitude: number;
  matchedTerms: string[];
}

interface NewsQuery {
  marketId: string;
  query: string;
}

/**
 * Google News query strings per market. We bias toward case-name + legal verbs
 * so generic corporate news doesn't pollute the feed.
 */
export const NEWS_QUERIES: NewsQuery[] = [
  { marketId: "roundup", query: "Roundup glyphosate Bayer lawsuit OR verdict OR appeal" },
  { marketId: "depo-provera", query: "Depo-Provera meningioma MDL Pfizer" },
  { marketId: "camp-lejeune", query: "Camp Lejeune CLJA settlement claims" },
  { marketId: "talc", query: "Johnson Johnson talc ovarian cancer LTL" },
  { marketId: "3m-earplugs", query: "3M Combat Arms earplugs settlement" },
  { marketId: "paraquat", query: "Paraquat Parkinson MDL Syngenta" },
  { marketId: "pfas-afff", query: "PFAS AFFF firefighting foam settlement" },
  { marketId: "hair-relaxer", query: "hair relaxer MDL uterine cancer L'Oreal" },
  { marketId: "social-media", query: "social media MDL Meta TikTok adolescent" },
  { marketId: "zantac", query: "Zantac ranitidine NDMA MDL" },
  { marketId: "tylenol-autism", query: "Tylenol acetaminophen autism MDL Daubert" },
  { marketId: "asbestos", query: "asbestos mesothelioma trust verdict" },
  { marketId: "hernia-mesh", query: "Bard hernia mesh MDL bellwether" },
  { marketId: "exactech", query: "Exactech knee hip recall lawsuit" },
  { marketId: "cpap", query: "Philips CPAP recall MDL" },
  { marketId: "ozempic", query: "Ozempic GLP-1 gastroparesis MDL" },
  { marketId: "nec-formula", query: "NEC infant formula MDL Abbott" },
  { marketId: "uber-sa", query: "Uber sexual assault MDL" },
  { marketId: "suboxone", query: "Suboxone tooth decay MDL Indivior" },
  { marketId: "firefighter-turnout", query: "firefighter turnout gear PFAS lawsuit" },
  { marketId: "pfas-water", query: "PFAS drinking water utility lawsuit" },
  { marketId: "nitrous-oxide", query: "Galaxy Gas nitrous oxide lawsuit" },
  { marketId: "tepezza", query: "Tepezza hearing loss MDL Horizon" },
  { marketId: "bair-hugger", query: "3M Bair Hugger MDL" },
  { marketId: "ethylene-oxide", query: "ethylene oxide Sterigenics lawsuit" },
];

/** Plaintiff-positive (bullish YES) keyword set. */
const BULL_TERMS: { term: RegExp; weight: number }[] = [
  { term: /\bsettle(d|ment|s)?\b/i, weight: 3 },
  { term: /\bbillion\b/i, weight: 2 },
  { term: /\bverdict\b/i, weight: 2 },
  { term: /\bplaintiff(s|s')?\s+win/i, weight: 4 },
  { term: /\bawarded?\b/i, weight: 2 },
  { term: /\bdamages\b/i, weight: 1 },
  { term: /\breserve(s)?\s+(increase|raised|expand)/i, weight: 3 },
  { term: /\bdaubert\s+(denied|granted to plaintiff|survived)/i, weight: 4 },
  { term: /\bappeal\s+denied\b/i, weight: 3 },
  { term: /\bmotion to dismiss\s+denied/i, weight: 3 },
  { term: /\bbellwether\b/i, weight: 1 },
  { term: /\bMDL (consolidated|expanded|approved)/i, weight: 2 },
  { term: /\bclass\s+certif/i, weight: 2 },
  { term: /\bnew claim/i, weight: 1 },
  { term: /\b(found|held)\s+liable\b/i, weight: 4 },
];

/** Defense-positive (bearish YES) keyword set. */
const BEAR_TERMS: { term: RegExp; weight: number }[] = [
  { term: /\bdismiss(ed|al)?\b/i, weight: 3 },
  { term: /\bsummary\s+judgment\b/i, weight: 2 },
  { term: /\bdaubert\s+(excluded|granted to defense|order excludes)/i, weight: 4 },
  { term: /\bpreempt(ed|ion)\b/i, weight: 3 },
  { term: /\breversed?\b/i, weight: 3 },
  { term: /\bappeal\s+granted\b/i, weight: 3 },
  { term: /\bthrown?\s+out\b/i, weight: 3 },
  { term: /\bdefense\s+win/i, weight: 4 },
  { term: /\bnot\s+liable\b/i, weight: 3 },
  { term: /\bjunk\s+science\b/i, weight: 2 },
  { term: /\bexperts?\s+excluded\b/i, weight: 3 },
  { term: /\b(rejected|denied)\s+plaintiff/i, weight: 2 },
];

function scoreSentiment(title: string): { polarity: number; magnitude: number; matched: string[] } {
  let bull = 0;
  let bear = 0;
  const matched: string[] = [];
  for (const { term, weight } of BULL_TERMS) {
    if (term.test(title)) {
      bull += weight;
      matched.push(term.source.replace(/\\b/g, "").replace(/\?\:/g, "").replace(/[\(\)\\]/g, "").slice(0, 24));
    }
  }
  for (const { term, weight } of BEAR_TERMS) {
    if (term.test(title)) {
      bear += weight;
      matched.push(term.source.replace(/\\b/g, "").replace(/\?\:/g, "").replace(/[\(\)\\]/g, "").slice(0, 24));
    }
  }
  const raw = bull - bear;
  if (raw === 0) return { polarity: 0, magnitude: 0, matched };
  const polarity = Math.max(-10, Math.min(10, raw));
  const magnitude = Math.min(1, (Math.abs(bull) + Math.abs(bear)) / 8);
  return { polarity, magnitude, matched };
}

interface Rss2JsonItem {
  title?: string;
  link?: string;
  guid?: string;
  pubDate?: string;
  author?: string;
}

interface Rss2JsonResponse {
  status?: string;
  feed?: { title?: string };
  items?: Rss2JsonItem[];
}

function stableId(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

export type FetchHeadlinesResult =
  | { ok: true; headlines: LiveHeadline[] }
  | { ok: false; retryable: boolean };

const FETCH_TIMEOUT_MS = 8_000;

/**
 * Fetch latest headlines for a market. Returns a typed result so callers can
 * distinguish "no signal items" (ok, empty) from a network / rate-limit error
 * (not ok, retryable) to drive exponential backoff.
 */
export async function fetchMarketHeadlines(
  marketId: string,
  query: string,
  limit: number = 6,
): Promise<FetchHeadlinesResult> {
  const rss = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rss)}&count=${limit}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: "GET", signal: controller.signal });
    clearTimeout(timeoutId);
    // 429 / 502 / 503 = rate-limited or upstream down — signal retryable
    if (res.status === 429 || res.status === 502 || res.status === 503) {
      console.warn(`[LiveNews] ${res.status} for ${marketId} — will back off`);
      return { ok: false, retryable: true };
    }
    if (!res.ok) return { ok: false, retryable: false };
    const data: Rss2JsonResponse = await res.json();
    if (data.status !== "ok" || !Array.isArray(data.items)) {
      return { ok: true, headlines: [] };
    }
    const out: LiveHeadline[] = [];
    for (const it of data.items) {
      const title = (it.title ?? "").trim();
      const link = (it.link ?? "").trim();
      if (!title || !link) continue;
      const { polarity, magnitude, matched } = scoreSentiment(title);
      if (polarity === 0 || magnitude === 0) continue;
      const sourceMatch = title.match(/\s-\s([^-]+)$/);
      const source = sourceMatch ? sourceMatch[1].trim() : (it.author ?? "Google News");
      const cleanTitle = sourceMatch ? title.slice(0, sourceMatch.index!).trim() : title;
      const ts = it.pubDate ? Date.parse(it.pubDate) : Date.now();
      out.push({
        id: `news-${marketId}-${stableId(it.guid ?? link)}`,
        marketId,
        title: cleanTitle,
        link,
        source,
        publishedAt: Number.isFinite(ts) ? ts : Date.now(),
        polarity,
        magnitude,
        matchedTerms: matched,
      });
    }
    return { ok: true, headlines: out };
  } catch (e) {
    clearTimeout(timeoutId);
    const isAbort = e instanceof Error && e.name === "AbortError";
    console.warn("[LiveNews] fetch error", marketId, isAbort ? "(timeout)" : e);
    return { ok: false, retryable: true };
  }
}
