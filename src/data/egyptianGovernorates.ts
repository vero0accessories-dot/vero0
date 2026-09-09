export interface CanonicalGovernorate {
  id: string;
  governorate: string; // English
  governorate_ar: string; // Arabic
  initialRate: number; // EGP
}

export const CANONICAL_GOVERNORATES: CanonicalGovernorate[] = [
  { id: "cairo", governorate: "Cairo", governorate_ar: "القاهرة", initialRate: 50 },
  { id: "giza", governorate: "Giza", governorate_ar: "الجيزة", initialRate: 50 },
  { id: "qalyubia", governorate: "Qalyubia", governorate_ar: "القليوبية", initialRate: 60 },
  { id: "alexandria", governorate: "Alexandria", governorate_ar: "الإسكندرية", initialRate: 70 },
  { id: "dakahlia", governorate: "Dakahlia", governorate_ar: "الدقهلية", initialRate: 70 },
  { id: "sharqia", governorate: "Sharqia", governorate_ar: "الشرقية", initialRate: 70 },
  { id: "gharbia", governorate: "Gharbia", governorate_ar: "الغربية", initialRate: 70 },
  { id: "monufia", governorate: "Monufia", governorate_ar: "المنوفية", initialRate: 70 },
  { id: "beheira", governorate: "Beheira", governorate_ar: "البحيرة", initialRate: 75 },
  { id: "kafr_el_sheikh", governorate: "Kafr El Sheikh", governorate_ar: "كفر الشيخ", initialRate: 75 },
  { id: "damietta", governorate: "Damietta", governorate_ar: "دمياط", initialRate: 75 },
  { id: "port_said", governorate: "Port Said", governorate_ar: "بورسعيد", initialRate: 75 },
  { id: "ismailia", governorate: "Ismailia", governorate_ar: "الإسماعيلية", initialRate: 75 },
  { id: "suez", governorate: "Suez", governorate_ar: "السويس", initialRate: 75 },
  { id: "fayoum", governorate: "Fayoum", governorate_ar: "الفيوم", initialRate: 80 },
  { id: "beni_suef", governorate: "Beni Suef", governorate_ar: "بني سويف", initialRate: 80 },
  { id: "minya", governorate: "Minya", governorate_ar: "المنيا", initialRate: 90 },
  { id: "assiut", governorate: "Assiut", governorate_ar: "أسيوط", initialRate: 90 },
  { id: "sohag", governorate: "Sohag", governorate_ar: "سوهاج", initialRate: 90 },
  { id: "qena", governorate: "Qena", governorate_ar: "قنا", initialRate: 90 },
  { id: "luxor", governorate: "Luxor", governorate_ar: "الأقصر", initialRate: 90 },
  { id: "aswan", governorate: "Aswan", governorate_ar: "أسوان", initialRate: 90 },
  { id: "red_sea", governorate: "Red Sea", governorate_ar: "البحر الأحمر", initialRate: 90 },
  { id: "new_valley", governorate: "New Valley", governorate_ar: "الوادي الجديد", initialRate: 90 },
  { id: "north_sinai", governorate: "North Sinai", governorate_ar: "شمال سيناء", initialRate: 90 },
  { id: "south_sinai", governorate: "South Sinai", governorate_ar: "جنوب سيناء", initialRate: 90 },
  { id: "matrouh", governorate: "Matrouh", governorate_ar: "مطروح", initialRate: 90 },
];

/**
 * Normalizes any English or Arabic governorate string into a stable canonical ID.
 * Returns null if not recognized.
 */
export function normalizeGovernorateId(input?: string | null): string | null {
  if (!input || typeof input !== "string") return null;

  const clean = input
    .trim()
    .toLowerCase()
    .replace(/[–—_]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b(governorate|gov|muhafazah|muhafazat|province|city|region)\b/gi, "")
    .replace(/(محافظة|مدينة|منطقة)/g, "")
    .trim();

  if (!clean) return null;

  // Direct match against canonical IDs
  const directId = CANONICAL_GOVERNORATES.find((g) => g.id === clean || g.id === clean.replace(/\s+/g, "_"));
  if (directId) return directId.id;

  // Normalizer for Arabic text: strip alef hamza, teh marbuta, etc.
  const stripArabicDiacritics = (str: string) =>
    str
      .replace(/[إأآا]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/[\u064B-\u065F]/g, "") // tashkeel
      .replace(/\s+/g, " ")
      .trim();

  const normalizedClean = stripArabicDiacritics(clean);

  for (const g of CANONICAL_GOVERNORATES) {
    // English name comparison
    const normEn = g.governorate.toLowerCase().replace(/[–—_]/g, " ").replace(/\s+/g, " ");
    if (clean === normEn || clean.replace(/[^a-z]/g, "") === normEn.replace(/[^a-z]/g, "")) {
      return g.id;
    }

    // Arabic name comparison
    const normAr = stripArabicDiacritics(g.governorate_ar);
    if (normalizedClean === normAr || normalizedClean.includes(normAr) || normAr.includes(normalizedClean)) {
      return g.id;
    }
  }

  // Common aliases
  const aliases: Record<string, string> = {
    "cairo": "cairo",
    "el qahira": "cairo",
    "al qahirah": "cairo",
    "giza": "giza",
    "el giza": "giza",
    "alex": "alexandria",
    "alexandria": "alexandria",
    "el eskandariya": "alexandria",
    "port said": "port_said",
    "portsaid": "port_said",
    "red sea": "red_sea",
    "hurghada": "red_sea",
    "sharm": "south_sinai",
    "sharm el sheikh": "south_sinai",
    "south sinai": "south_sinai",
    "north sinai": "north_sinai",
    "el arish": "north_sinai",
    "new valley": "new_valley",
    "el wadi el gedid": "new_valley",
    "kafr el sheikh": "kafr_el_sheikh",
    "kafr elsheikh": "kafr_el_sheikh",
    "beni suef": "beni_suef",
    "benisuef": "beni_suef",
  };

  if (aliases[clean]) return aliases[clean];
  if (aliases[clean.replace(/\s+/g, "_")]) return aliases[clean.replace(/\s+/g, "_")];

  return null;
}

export const DEFAULT_SHIPPING_RATES = CANONICAL_GOVERNORATES.map((g) => ({
  id: g.id,
  governorate: g.governorate,
  governorate_ar: g.governorate_ar,
  rate: g.initialRate,
  is_active: true,
}));

