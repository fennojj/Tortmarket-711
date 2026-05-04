import { Market } from "@/types";

function genHistory(seed: number, endPrice: number): { t: number; yes: number }[] {
  const points: { t: number; yes: number }[] = [];
  let v = endPrice;
  const now = Date.now();
  for (let i = 29; i >= 0; i--) {
    const noise = Math.sin(seed + i * 0.7) * 8 + Math.cos(seed * 1.3 + i * 0.4) * 5;
    v = Math.max(3, Math.min(97, endPrice + noise - i * 0.3));
    points.push({ t: now - i * 86400000, yes: Math.round(v) });
  }
  points[points.length - 1] = { t: now, yes: endPrice };
  return points;
}

const raw: Omit<Market, "history">[] = [
  { id: "roundup", caseName: "Bayer Roundup (Glyphosate NHL)", defendant: "Bayer / Monsanto", category: "pharmaceutical", description: "Plaintiffs allege Roundup exposure caused non-Hodgkin lymphoma. Pending consolidated actions and appeals.", yesPrice: 68, noPrice: 32, volume: 4820000, change24h: 3.4, resolutionStatus: "active", mdlSentiment: 72, daubertStrength: 78, corporateReserves: 81 },
  { id: "depo-provera", caseName: "Depo-Provera Meningioma MDL", defendant: "Pfizer", category: "pharmaceutical", description: "Long-term Depo-Provera use linked to intracranial meningioma. Newly consolidated MDL.", yesPrice: 57, noPrice: 43, volume: 2110000, change24h: 7.8, resolutionStatus: "active", mdlSentiment: 64, daubertStrength: 59, corporateReserves: 48 },
  { id: "camp-lejeune", caseName: "Camp Lejeune Water Contamination", defendant: "U.S. Government", category: "toxic_exposure", description: "Veterans and families exposed to contaminated water 1953-1987. CLJA claims under PACT Act.", yesPrice: 74, noPrice: 26, volume: 6030000, change24h: 1.2, resolutionStatus: "active", mdlSentiment: 82, daubertStrength: 70, corporateReserves: 88 },
  { id: "talc", caseName: "J&J Talcum Powder Ovarian Cancer", defendant: "Johnson & Johnson / LTL", category: "product_liability", description: "Talc-based baby powder allegedly contaminated with asbestos. Third bankruptcy strategy in play.", yesPrice: 62, noPrice: 38, volume: 3840000, change24h: -2.1, resolutionStatus: "active", mdlSentiment: 66, daubertStrength: 68, corporateReserves: 73 },
  { id: "3m-earplugs", caseName: "3M Combat Arms Earplugs", defendant: "3M / Aearo", category: "product_liability", description: "Defective military-issued earplugs causing hearing loss. $6B settlement framework.", yesPrice: 89, noPrice: 11, volume: 5620000, change24h: 0.4, resolutionStatus: "active", mdlSentiment: 91, daubertStrength: 85, corporateReserves: 94 },
  { id: "paraquat", caseName: "Paraquat Parkinson's Disease MDL", defendant: "Syngenta / Chevron", category: "pharmaceutical", description: "Herbicide paraquat allegedly linked to Parkinson's in agricultural workers.", yesPrice: 41, noPrice: 59, volume: 1980000, change24h: -5.3, resolutionStatus: "active", mdlSentiment: 45, daubertStrength: 38, corporateReserves: 52 },
  { id: "pfas-afff", caseName: "PFAS / AFFF Firefighting Foam", defendant: "3M / DuPont / Chemours", category: "environmental", description: "Forever chemicals contamination in water supplies. Multi-billion settlements expanding.", yesPrice: 81, noPrice: 19, volume: 7210000, change24h: 2.6, resolutionStatus: "active", mdlSentiment: 85, daubertStrength: 80, corporateReserves: 90 },
  { id: "hair-relaxer", caseName: "Chemical Hair Relaxer Cancer MDL", defendant: "L'Oréal / Strength of Nature", category: "pharmaceutical", description: "Hair relaxers linked to uterine and ovarian cancer in Black women.", yesPrice: 48, noPrice: 52, volume: 1450000, change24h: 4.7, resolutionStatus: "active", mdlSentiment: 52, daubertStrength: 55, corporateReserves: 40 },
  { id: "social-media", caseName: "Social Media Adolescent Harm MDL", defendant: "Meta / TikTok / Snap", category: "consumer", description: "Platforms allegedly designed to addict minors, causing mental health harm.", yesPrice: 36, noPrice: 64, volume: 3320000, change24h: -1.8, resolutionStatus: "active", mdlSentiment: 40, daubertStrength: 42, corporateReserves: 30 },
  { id: "zantac", caseName: "Zantac (Ranitidine) Cancer", defendant: "GSK / Sanofi / Pfizer", category: "pharmaceutical", description: "NDMA contamination in ranitidine. Mixed Daubert outcomes across jurisdictions.", yesPrice: 29, noPrice: 71, volume: 2740000, change24h: -3.9, resolutionStatus: "active", mdlSentiment: 32, daubertStrength: 25, corporateReserves: 38 },
  { id: "tylenol-autism", caseName: "Tylenol / Acetaminophen Autism MDL", defendant: "Johnson & Johnson / Retailers", category: "pharmaceutical", description: "Prenatal acetaminophen use and autism/ADHD. Daubert order excluded plaintiff experts.", yesPrice: 14, noPrice: 86, volume: 1280000, change24h: -0.5, resolutionStatus: "active", mdlSentiment: 18, daubertStrength: 12, corporateReserves: 22 },
  { id: "asbestos", caseName: "Asbestos Mesothelioma (Ongoing)", defendant: "Multiple Defendants", category: "toxic_exposure", description: "Ongoing asbestos trust and tort claims. Stable settlement environment.", yesPrice: 84, noPrice: 16, volume: 2890000, change24h: 0.1, resolutionStatus: "active", mdlSentiment: 88, daubertStrength: 90, corporateReserves: 85 },
  { id: "hernia-mesh", caseName: "Bard Hernia Mesh MDL", defendant: "C.R. Bard / Becton Dickinson", category: "medical_device", description: "Polypropylene hernia mesh complications. Bellwether verdicts mixed.", yesPrice: 55, noPrice: 45, volume: 1620000, change24h: 1.9, resolutionStatus: "active", mdlSentiment: 58, daubertStrength: 60, corporateReserves: 50 },
  { id: "exactech", caseName: "Exactech Knee & Hip Recall", defendant: "Exactech Inc.", category: "medical_device", description: "Defective polyethylene packaging causing premature implant failure.", yesPrice: 76, noPrice: 24, volume: 980000, change24h: 2.3, resolutionStatus: "active", mdlSentiment: 78, daubertStrength: 74, corporateReserves: 80 },
  { id: "cpap", caseName: "Philips CPAP / BiPAP Recall", defendant: "Philips Respironics", category: "medical_device", description: "Foam degradation in sleep apnea devices. Economic loss settled; injury MDL continues.", yesPrice: 67, noPrice: 33, volume: 2340000, change24h: -0.8, resolutionStatus: "active", mdlSentiment: 70, daubertStrength: 65, corporateReserves: 72 },
  { id: "ozempic", caseName: "Ozempic / GLP-1 Gastroparesis MDL", defendant: "Novo Nordisk / Eli Lilly", category: "pharmaceutical", description: "Severe GI injuries allegedly underwarned. Early-stage MDL, discovery underway.", yesPrice: 33, noPrice: 67, volume: 1870000, change24h: 6.2, resolutionStatus: "active", mdlSentiment: 38, daubertStrength: 30, corporateReserves: 35 },
  { id: "nec-formula", caseName: "NEC Infant Formula MDL", defendant: "Abbott / Mead Johnson", category: "pharmaceutical", description: "Cow-milk formulas and necrotizing enterocolitis in preterm infants.", yesPrice: 52, noPrice: 48, volume: 1360000, change24h: -4.1, resolutionStatus: "active", mdlSentiment: 54, daubertStrength: 50, corporateReserves: 55 },
  { id: "uber-sa", caseName: "Uber Sexual Assault MDL", defendant: "Uber Technologies", category: "consumer", description: "Alleged inadequate driver screening and safety protocols.", yesPrice: 44, noPrice: 56, volume: 1120000, change24h: 1.1, resolutionStatus: "active", mdlSentiment: 48, daubertStrength: 46, corporateReserves: 42 },
  { id: "suboxone", caseName: "Suboxone Tooth Decay MDL", defendant: "Indivior", category: "pharmaceutical", description: "Sublingual film allegedly causing severe dental erosion.", yesPrice: 46, noPrice: 54, volume: 760000, change24h: 0.6, resolutionStatus: "active", mdlSentiment: 50, daubertStrength: 44, corporateReserves: 48 },
  { id: "firefighter-turnout", caseName: "Firefighter Turnout Gear PFAS", defendant: "Gear Manufacturers", category: "environmental", description: "PFAS in protective gear linked to cancer in firefighters.", yesPrice: 58, noPrice: 42, volume: 640000, change24h: 3.1, resolutionStatus: "active", mdlSentiment: 60, daubertStrength: 62, corporateReserves: 55 },
  { id: "pfas-water", caseName: "Municipal Water PFAS Claims", defendant: "Chemical Manufacturers", category: "environmental", description: "Public water utilities seeking remediation costs for PFAS contamination.", yesPrice: 79, noPrice: 21, volume: 3010000, change24h: 1.7, resolutionStatus: "active", mdlSentiment: 82, daubertStrength: 78, corporateReserves: 85 },
  { id: "nitrous-oxide", caseName: "Galaxy Gas Nitrous Oxide MDL", defendant: "Retailers / Distributors", category: "consumer", description: "Marketing of recreational nitrous to minors; neurological injury claims.", yesPrice: 38, noPrice: 62, volume: 420000, change24h: 5.5, resolutionStatus: "active", mdlSentiment: 42, daubertStrength: 40, corporateReserves: 32 },
  { id: "tepezza", caseName: "Tepezza Hearing Loss MDL", defendant: "Horizon Therapeutics / Amgen", category: "pharmaceutical", description: "Thyroid eye disease drug and permanent hearing loss.", yesPrice: 51, noPrice: 49, volume: 890000, change24h: -1.4, resolutionStatus: "active", mdlSentiment: 54, daubertStrength: 52, corporateReserves: 50 },
  { id: "bair-hugger", caseName: "3M Bair Hugger Surgical Warming", defendant: "3M", category: "medical_device", description: "Post-surgical joint infection claims from forced-air warming blankets.", yesPrice: 22, noPrice: 78, volume: 510000, change24h: -0.3, resolutionStatus: "active", mdlSentiment: 25, daubertStrength: 18, corporateReserves: 28 },
  { id: "ethylene-oxide", caseName: "Ethylene Oxide Sterilization Plants", defendant: "Sterigenics / BD", category: "environmental", description: "Carcinogenic emissions near sterilization facilities.", yesPrice: 63, noPrice: 37, volume: 1240000, change24h: 2.0, resolutionStatus: "active", mdlSentiment: 66, daubertStrength: 70, corporateReserves: 60 },
];

export const MARKETS: Market[] = raw.map((m, i) => ({
  ...m,
  history: genHistory(i + 1, m.yesPrice),
}));

export const CATEGORY_LABEL: Record<string, string> = {
  pharmaceutical: "Pharmaceutical",
  product_liability: "Product Liability",
  environmental: "Environmental",
  medical_device: "Medical Device",
  toxic_exposure: "Toxic Exposure",
  consumer: "Consumer",
};
