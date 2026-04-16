// ================================================================================
// INGREDIENT NUTRITION REGISTRY
// ================================================================================
// All composition values are on DRY MATTER (DM) basis per international convention
// (NRC / INRA / Feedipedia). Only `dm` itself is expressed as % of as-fed weight.
//
// Price is Rs per kg of AS-FED product (what the farmer actually buys).
//
// >>> TO ADD A NEW INGREDIENT <<<
// Simply add a new entry to the INGREDIENTS array below. Fill in:
//   - key:        unique id (snake_case)
//   - category:   'energy' | 'protein' | 'fiber' | 'fat'
//   - icon:       one emoji character
//   - nameEn / nameUr + energy/protein levels
//   - nutritional values on DM basis
// Everything else (category lists, icon maps, lookup helpers) is auto-derived.
// ================================================================================

import { getOverride } from './ingredientOverrides';

export type IngredientCategory = 'energy' | 'protein' | 'fiber' | 'fat';
export type IntensityLevel = 'high' | 'med' | 'low';

export interface Ingredient {
  key: string;
  category: IngredientCategory;
  icon: string;
  nameEn: string;
  nameUr: string;
  energyLevel: IntensityLevel;
  proteinLevel: IntensityLevel;
  // ---- Composition (all % on DM basis, except DM itself which is % of as-fed) ----
  dm: number;      // %  of as-fed that is dry matter
  cp: number;      // %  Crude Protein   (DM basis)
  me: number;      // Mcal/kg DM         Metabolizable Energy
  tdn: number;     // %  Total Digestible Nutrients (DM basis)
  adf: number;     // %  Acid Detergent Fiber (DM basis)
  ndf: number;     // %  Neutral Detergent Fiber (DM basis)
  fat: number;     // %  Crude Fat       (DM basis)
  starch: number;  // %  Starch          (DM basis)
  ca: number;      // %  Calcium         (DM basis)
  p: number;       // %  Phosphorus      (DM basis)
  ash: number;     // %  Ash             (DM basis)
  // ---- Commercial ----
  price: number;   // Rs / kg as-fed
  notesEn?: string;
  notesUr?: string;
}

// -------------------------------------------------------------------------------
// MASTER INGREDIENT LIST  —  single source of truth
// -------------------------------------------------------------------------------
export const INGREDIENTS: Ingredient[] = [
  // =========================================================================
  //  ENERGY SOURCES  —  grains, cereals, and energy-dense by-products
  // =========================================================================
  {
    key: 'corn', category: 'energy', icon: '🌽',
    nameEn: 'Corn (Makai)', nameUr: 'مکئی',
    energyLevel: 'high', proteinLevel: 'low',
    dm: 89, cp: 9, me: 3.25, tdn: 88, adf: 4, ndf: 12, fat: 4, starch: 70,
    ca: 0.03, p: 0.28, ash: 1.3, price: 102,
    notesEn: 'Primary energy source — high starch, low protein',
    notesUr: 'بنیادی توانائی — نشاستہ زیادہ، پروٹین کم',
  },
  {
    key: 'wheat_grain', category: 'energy', icon: '🌾',
    nameEn: 'Wheat Grain (Gandum)', nameUr: 'گندم دانہ',
    energyLevel: 'high', proteinLevel: 'low',
    dm: 89, cp: 14, me: 3.28, tdn: 88, adf: 5, ndf: 14, fat: 2, starch: 63,
    ca: 0.05, p: 0.39, ash: 2, price: 95,
    notesEn: 'Grind coarsely — fine grinding causes acidosis risk',
    notesUr: 'موٹا پیسیں — باریک پیسنا تیزابیت کا خطرہ',
  },
  {
    key: 'barley', category: 'energy', icon: '🌿',
    nameEn: 'Barley (Jau)', nameUr: 'جو',
    energyLevel: 'high', proteinLevel: 'low',
    dm: 89, cp: 12, me: 3.00, tdn: 84, adf: 7, ndf: 20, fat: 2.5, starch: 58,
    ca: 0.05, p: 0.38, ash: 2.5, price: 80,
    notesEn: 'Good energy, safer than wheat for rumen',
    notesUr: 'اچھی توانائی، رومین کے لیے گندم سے محفوظ',
  },
  {
    key: 'millet', category: 'energy', icon: '🟡',
    nameEn: 'Millet (Bajra)', nameUr: 'باجرہ',
    energyLevel: 'high', proteinLevel: 'low',
    dm: 90, cp: 11, me: 3.10, tdn: 82, adf: 7, ndf: 15, fat: 5, starch: 55,
    ca: 0.04, p: 0.30, ash: 2, price: 90,
    notesEn: 'Higher fat than corn — seasonal availability',
    notesUr: 'مکئی سے زیادہ چکنائی — موسمی دستیابی',
  },
  {
    key: 'rice_polish', category: 'energy', icon: '⚪',
    nameEn: 'Rice Polish', nameUr: 'رائس پولش',
    energyLevel: 'high', proteinLevel: 'low',
    dm: 90, cp: 13, me: 2.86, tdn: 85, adf: 9, ndf: 22, fat: 13, starch: 40,
    ca: 0.10, p: 1.50, ash: 8, price: 100,
    notesEn: 'High fat (13%) and phosphorus — mycotoxin risk in monsoon',
    notesUr: 'چکنائی اور فاسفورس زیادہ — مانسون میں مائیکوٹاکسن کا خطرہ',
  },
  {
    key: 'broken_rice', category: 'energy', icon: '🍚',
    nameEn: 'Broken Rice (Tukri)', nameUr: 'ٹکری چاول',
    energyLevel: 'high', proteinLevel: 'low',
    dm: 89, cp: 8, me: 3.25, tdn: 87, adf: 2, ndf: 4, fat: 1, starch: 75,
    ca: 0.03, p: 0.15, ash: 1, price: 80,
    notesEn: 'Very high starch — limit to 25% of concentrate to avoid acidosis',
    notesUr: 'نشاستہ بہت زیادہ — تیزابیت سے بچنے کے لیے 25% تک محدود رکھیں',
  },
  {
    key: 'molasses', category: 'energy', icon: '🍯',
    nameEn: 'Molasses (Sheera)', nameUr: 'شیرہ',
    energyLevel: 'high', proteinLevel: 'low',
    dm: 75, cp: 4, me: 2.29, tdn: 75, adf: 0, ndf: 0, fat: 0, starch: 0,
    ca: 1.00, p: 0.06, ash: 11, price: 75,
    notesEn: 'Improves palatability — limit to 10-15% of concentrate. High calcium source.',
    notesUr: 'ذائقہ بہتر بناتا ہے — 10-15% تک محدود رکھیں۔ کیلشیم زیادہ۔',
  },
  {
    key: 'wheat_middlings', category: 'energy', icon: '📦',
    nameEn: 'Wheat Middlings (Maida Chokar)', nameUr: 'میدہ چوکر',
    energyLevel: 'med', proteinLevel: 'med',
    dm: 88, cp: 17, me: 2.80, tdn: 76, adf: 10, ndf: 35, fat: 4.5, starch: 25,
    ca: 0.12, p: 0.90, ash: 5, price: 70,
    notesEn: 'Between bran and flour — good energy + moderate protein',
    notesUr: 'چوکر اور آٹے کے درمیان — اچھی توانائی + معتدل پروٹین',
  },

  // =========================================================================
  //  PROTEIN SOURCES  —  oilcakes, meals, and high-protein by-products
  // =========================================================================
  {
    key: 'sbm', category: 'protein', icon: '🫘',
    nameEn: 'Soybean Meal (SBM)', nameUr: 'سویا کھل',
    energyLevel: 'med', proteinLevel: 'high',
    dm: 89, cp: 46, me: 3.18, tdn: 84, adf: 7, ndf: 13, fat: 2, starch: 6,
    ca: 0.27, p: 0.65, ash: 6.5, price: 300,
    notesEn: 'Gold-standard protein — best amino acid profile for dairy',
    notesUr: 'بہترین پروٹین — دودھ کے لیے بہترین امینو ایسڈ',
  },
  {
    key: 'csm', category: 'protein', icon: '🟨',
    nameEn: 'Cottonseed Cake (Binola)', nameUr: 'بنولہ کھل',
    energyLevel: 'low', proteinLevel: 'high',
    dm: 90, cp: 38, me: 2.50, tdn: 72, adf: 18, ndf: 28, fat: 2, starch: 5,
    ca: 0.15, p: 1.00, ash: 6, price: 150,
    notesEn: 'Cheapest protein in Pakistan — aflatoxin caution in monsoon. Contains gossypol.',
    notesUr: 'سستا ترین پروٹین — مانسون میں افلاٹوکسین خطرہ۔ گوسیپول ہوتا ہے۔',
  },
  {
    key: 'rsm', category: 'protein', icon: '🟤',
    nameEn: 'Mustard Cake (Sarso Khal)', nameUr: 'سرسوں کھل',
    energyLevel: 'low', proteinLevel: 'med',
    dm: 90, cp: 35, me: 2.65, tdn: 66, adf: 18, ndf: 28, fat: 7, starch: 8,
    ca: 0.62, p: 1.10, ash: 7.5, price: 110,
    notesEn: 'Contains glucosinolates — limit to 20% of concentrate',
    notesUr: 'گلوکوسینولیٹس — 20% تک محدود رکھیں',
  },
  {
    key: 'canola_meal', category: 'protein', icon: '🌼',
    nameEn: 'Canola Meal', nameUr: 'کینولا میل',
    energyLevel: 'low', proteinLevel: 'high',
    dm: 90, cp: 36, me: 2.70, tdn: 67, adf: 17, ndf: 27, fat: 4, starch: 10,
    ca: 0.75, p: 1.10, ash: 6.5, price: 180,
    notesEn: 'Low glucosinolates (safer than mustard cake)',
    notesUr: 'کم گلوکوسینولیٹس (سرسوں کھل سے محفوظ)',
  },
  {
    key: 'sfm', category: 'protein', icon: '🌻',
    nameEn: 'Sunflower Meal (Surajmukhi)', nameUr: 'سورج مکھی کھل',
    energyLevel: 'low', proteinLevel: 'med',
    dm: 90, cp: 32, me: 2.10, tdn: 65, adf: 22, ndf: 30, fat: 1, starch: 2,
    ca: 0.30, p: 0.80, ash: 6, price: 130,
    notesEn: 'High fiber oilcake — seasonal availability',
    notesUr: 'فائبر والی کھل — موسمی دستیابی',
  },
  {
    key: 'sesame_cake', category: 'protein', icon: '🌱',
    nameEn: 'Sesame Cake (Til Khal)', nameUr: 'تل کھل',
    energyLevel: 'high', proteinLevel: 'high',
    dm: 90, cp: 40, me: 2.99, tdn: 68, adf: 22, ndf: 30, fat: 10, starch: 3,
    ca: 1.20, p: 0.65, ash: 11, price: 120,
    notesEn: 'High fat & calcium — good for dairy. South Punjab specialty.',
    notesUr: 'چکنائی اور کیلشیم زیادہ — دودھ کے لیے اچھی۔ جنوبی پنجاب۔',
  },
  {
    key: 'guar', category: 'protein', icon: '🫛',
    nameEn: 'Guar Meal (Guar Khal)', nameUr: 'گوار کھل',
    energyLevel: 'low', proteinLevel: 'high',
    dm: 90, cp: 48, me: 2.20, tdn: 75, adf: 20, ndf: 28, fat: 6, starch: 5,
    ca: 0.20, p: 0.50, ash: 5, price: 160,
    notesEn: 'Must be toasted — raw has anti-nutritional factors. Limit to 15%.',
    notesUr: 'بھون کر استعمال کریں — کچی میں نقصان دہ عوامل۔ 15% تک۔',
  },
  {
    key: 'corn_gluten_feed', category: 'protein', icon: '🌽',
    nameEn: 'Corn Gluten Feed (CGM 30)', nameUr: 'کارن گلوٹین فیڈ',
    energyLevel: 'med', proteinLevel: 'med',
    dm: 90, cp: 22, me: 2.60, tdn: 75, adf: 10, ndf: 36, fat: 3.5, starch: 15,
    ca: 0.09, p: 0.85, ash: 7, price: 85,
    notesEn: 'Common cheap protein in Pakistan — corn wet-milling byproduct',
    notesUr: 'پاکستان میں سستا پروٹین — مکئی سے بنتا ہے',
  },
  {
    key: 'corn_gluten_meal', category: 'protein', icon: '🟠',
    nameEn: 'Corn Gluten Meal 60%', nameUr: 'کارن گلوٹین میل 60%',
    energyLevel: 'high', proteinLevel: 'high',
    dm: 91, cp: 60, me: 3.70, tdn: 90, adf: 3, ndf: 5, fat: 3, starch: 15,
    ca: 0.04, p: 0.50, ash: 2, price: 200,
    notesEn: 'Premium bypass protein — expensive but highly digestible',
    notesUr: 'اعلی درجے کا بائی پاس پروٹین — مہنگا مگر انتہائی ہضم',
  },
  {
    key: 'pkc', category: 'protein', icon: '🥥',
    nameEn: 'Palm Kernel Cake (PKC)', nameUr: 'پام کرنل کیک',
    energyLevel: 'med', proteinLevel: 'low',
    dm: 91, cp: 16, me: 2.40, tdn: 70, adf: 35, ndf: 65, fat: 8, starch: 2,
    ca: 0.25, p: 0.55, ash: 4, price: 65,
    notesEn: 'Imported — high fiber for an oilcake. Good for buffaloes.',
    notesUr: 'درآمد شدہ — بھینسوں کے لیے اچھی۔ فائبر زیادہ۔',
  },
  {
    key: 'whole_cottonseed', category: 'protein', icon: '⭕',
    nameEn: 'Whole Cottonseed (Binola)', nameUr: 'سابت بنولہ',
    energyLevel: 'high', proteinLevel: 'med',
    dm: 91, cp: 23, me: 3.00, tdn: 80, adf: 28, ndf: 44, fat: 20, starch: 3,
    ca: 0.15, p: 0.60, ash: 4, price: 120,
    notesEn: 'High fat (20%) — limit to 3-4 kg/day for dairy. Contains gossypol.',
    notesUr: 'چکنائی 20% — دودھ کے لیے 3-4 کلو/دن تک۔ گوسیپول ہوتا ہے۔',
  },

  // =========================================================================
  //  BRAN & FIBER  —  concentrate-level fiber sources (NOT roughages)
  // =========================================================================
  {
    key: 'wheat_bran', category: 'fiber', icon: '🟫',
    nameEn: 'Wheat Bran (Chokhar)', nameUr: 'چوکر',
    energyLevel: 'med', proteinLevel: 'med',
    dm: 87, cp: 16, me: 2.63, tdn: 68, adf: 13, ndf: 45, fat: 4, starch: 22,
    ca: 0.13, p: 1.10, ash: 6, price: 75,
    notesEn: 'Most common Pakistani concentrate fiber — very high phosphorus (1.1%)',
    notesUr: 'پاکستان میں سب سے عام فائبر — فاسفورس بہت زیادہ (1.1%)',
  },
  {
    key: 'rice_bran', category: 'fiber', icon: '🟤',
    nameEn: 'Rice Bran', nameUr: 'چاول کی بھوسی',
    energyLevel: 'med', proteinLevel: 'low',
    dm: 91, cp: 13, me: 2.20, tdn: 64, adf: 15, ndf: 28, fat: 14, starch: 20,
    ca: 0.08, p: 1.50, ash: 10, price: 55,
    notesEn: 'High fat (14%) and phosphorus — cheaper than rice polish. Check for adulteration.',
    notesUr: 'چکنائی اور فاسفورس زیادہ — رائس پولش سے سستی۔ ملاوٹ چیک کریں۔',
  },

  // =========================================================================
  //  SUPPLEMENTS  —  minerals, buffers, and fat supplements
  // =========================================================================
  {
    key: 'bypassFat', category: 'fat', icon: '🛢️',
    nameEn: 'Bypass Fat', nameUr: 'بائی پاس فیٹ',
    energyLevel: 'high', proteinLevel: 'low',
    dm: 99, cp: 0, me: 4.78, tdn: 180, adf: 0, ndf: 0, fat: 99, starch: 0,
    ca: 0, p: 0, ash: 0, price: 400,
    notesEn: 'Rumen-protected fat — use 100-300g/day for dairy. Do not exceed 6% total fat.',
    notesUr: 'رومین محفوظ چکنائی — دودھ کے لیے 100-300 گرام/دن۔ کل چکنائی 6% سے زیادہ نہ ہو۔',
  },
  {
    key: 'limestone', category: 'fat', icon: '🪨',
    nameEn: 'Limestone (Choona Patthar)', nameUr: 'چونا پتھر',
    energyLevel: 'low', proteinLevel: 'low',
    dm: 98, cp: 0, me: 0, tdn: 0, adf: 0, ndf: 0, fat: 0, starch: 0,
    ca: 36, p: 0, ash: 95, price: 50,
    notesEn: 'Primary calcium supplement — 36% Ca. Typical inclusion 1-2%.',
    notesUr: 'بنیادی کیلشیم — 36% کیلشیم۔ عام طور پر 1-2% شامل کریں۔',
  },
  {
    key: 'dcp', category: 'fat', icon: '💊',
    nameEn: 'DCP (Dicalcium Phosphate)', nameUr: 'ڈی سی پی',
    energyLevel: 'low', proteinLevel: 'low',
    dm: 96, cp: 0, me: 0, tdn: 0, adf: 0, ndf: 0, fat: 0, starch: 0,
    ca: 22, p: 18, ash: 92, price: 180,
    notesEn: 'Calcium + Phosphorus supplement — 22% Ca, 18% P. Use 0.5-1%.',
    notesUr: 'کیلشیم + فاسفورس — 22% Ca, 18% P۔ 0.5-1% شامل کریں۔',
  },
  {
    key: 'salt', category: 'fat', icon: '🧂',
    nameEn: 'Salt (Namak)', nameUr: 'نمک',
    energyLevel: 'low', proteinLevel: 'low',
    dm: 99, cp: 0, me: 0, tdn: 0, adf: 0, ndf: 0, fat: 0, starch: 0,
    ca: 0, p: 0, ash: 99, price: 25,
    notesEn: 'Essential — typical inclusion 0.5-1% of concentrate',
    notesUr: 'ضروری — 0.5-1% شامل کریں',
  },
  {
    key: 'sodium_bicarb', category: 'fat', icon: '💎',
    nameEn: 'Sodium Bicarbonate (Meethoda)', nameUr: 'میٹھا سوڈا',
    energyLevel: 'low', proteinLevel: 'low',
    dm: 99, cp: 0, me: 0, tdn: 0, adf: 0, ndf: 0, fat: 0, starch: 0,
    ca: 0, p: 0, ash: 99, price: 120,
    notesEn: 'Rumen buffer — prevents acidosis in high-grain diets. Use 0.5-1%.',
    notesUr: 'رومین بفر — زیادہ دانے والی خوراک میں تیزابیت روکتا ہے۔ 0.5-1%۔',
  },
];

// -------------------------------------------------------------------------------
// DERIVED DATA — do not edit manually; all built from INGREDIENTS above
// -------------------------------------------------------------------------------

/** Map of key -> ingredient for O(1) lookups (hardcoded defaults). */
export const NUTRITION_DATA: Record<string, Ingredient> = Object.fromEntries(
  INGREDIENTS.map((i) => [i.key, i])
);

/**
 * Safe lookup by key — returns the hardcoded default merged with any user
 * overrides persisted in localStorage.  This is the primary lookup function;
 * all calculations and UI should go through here.
 */
export function getIngredient(key: string): Ingredient | undefined {
  const base = NUTRITION_DATA[key];
  if (!base) return undefined;
  const override = getOverride(key);
  if (!override) return base;
  return { ...base, ...override };
}

/** Always returns the unmodified hardcoded default (ignores user overrides). */
export function getDefaultIngredient(key: string): Ingredient | undefined {
  return NUTRITION_DATA[key];
}

/** All ingredients in a category. */
export function getIngredientsByCategory(category: IngredientCategory): Ingredient[] {
  return INGREDIENTS.filter((i) => i.category === category);
}

/** Emoji icon for an ingredient key (with fallback). */
export function getIngredientIcon(key: string): string {
  return NUTRITION_DATA[key]?.icon ?? '🌾';
}

// -------------------------------------------------------------------------------
// CATEGORIES (titles + selection constraints + auto-derived ingredient lists)
// -------------------------------------------------------------------------------
export const INGREDIENT_CATEGORIES = {
  energy: {
    titleEn: 'Energy Sources',
    titleUr: 'توانائی کے ذرائع',
    min: 1,
    ingredients: INGREDIENTS.filter((i) => i.category === 'energy').map((i) => i.key),
  },
  protein: {
    titleEn: 'Protein Sources',
    titleUr: 'پروٹین کے ذرائع',
    min: 1,
    ingredients: INGREDIENTS.filter((i) => i.category === 'protein').map((i) => i.key),
  },
  fiber: {
    titleEn: 'Bran & Fiber',
    titleUr: 'چوکر اور فائبر',
    min: 0,
    ingredients: INGREDIENTS.filter((i) => i.category === 'fiber').map((i) => i.key),
  },
  fat: {
    titleEn: 'Supplements & Minerals',
    titleUr: 'سپلیمنٹس اور معدنیات',
    min: 0,
    ingredients: INGREDIENTS.filter((i) => i.category === 'fat').map((i) => i.key),
  },
} as const;

// ================================================================================
// ANIMAL / STAGE / REGION DATA — targets & labels (unrelated to ingredients)
// ================================================================================

// ================================================================================
// ANIMAL STAGES
// ================================================================================
// Stage labels are indexed — NUTRITION_RANGES[animal][stageIndex] must match.
// Keep the `en` and `ur` arrays the same length as their corresponding range row.
// ================================================================================

export const STAGES = {
  dairy_cow: {
    en: ['Early Lactation (0–100 days)', 'Mid Lactation (100–200 days)', 'Late Lactation (200–305 days)', 'Dry Period (60 days before calving)'],
    ur: ['شروع کا دودھ (0-100 دن)', 'درمیانی دودھ (100-200 دن)', 'آخری دودھ (200-305 دن)', 'خشک دور (60 دن)'],
  },
  dairy_buffalo: {
    en: ['Early Lactation (0–100 days)', 'Mid Lactation (100–200 days)', 'Late Lactation (200–305 days)', 'Dry Period (60 days before calving)'],
    ur: ['شروع کا دودھ', 'درمیانی دودھ', 'آخری دودھ', 'خشک دور'],
  },
  heifer: {
    en: ['Calf (3–6 months)', 'Growing Heifer (6–15 months)', 'Pregnant Heifer (15+ months)'],
    ur: ['بچہ (3-6 ماہ)', 'بڑھتی بچھڑی (6-15 ماہ)', 'گابھن بچھڑی'],
  },
  fattening_bull: {
    en: ['Starter (100–200 kg)', 'Grower (200–300 kg)', 'Finisher (>300 kg)'],
    ur: ['ابتدائی (100-200 کلو)', 'بڑھوتری (200-300 کلو)', 'تیاری (>300 کلو)'],
  },
  dairy_goat: {
    en: ['Early Lactation', 'Mid/Late Lactation', 'Late Pregnancy', 'Dry Period'],
    ur: ['شروع کا دودھ', 'درمیانی/آخری دودھ', 'آخری حمل', 'خشک دور'],
  },
  fattening_goat: {
    en: ['Grower (15–25 kg)', 'Finisher (25–40 kg)'],
    ur: ['بڑھوتری (15-25 کلو)', 'تیاری (25-40 کلو)'],
  },
} as const;

export const ANIMALS = [
  { id: 'dairy_cow',      icon: '🐄', labelEn: 'Dairy Cow',      labelUr: 'دودھ والی گائے' },
  { id: 'dairy_buffalo',  icon: '🐃', labelEn: 'Dairy Buffalo',  labelUr: 'دودھ والی بھینس' },
  { id: 'heifer',         icon: '🐄', labelEn: 'Heifer (Cow/Buffalo)', labelUr: 'بچھڑی (گائے/بھینس)' },
  { id: 'fattening_bull', icon: '🐂', labelEn: 'Fattening Bull', labelUr: 'موٹا کرنے والا بیل' },
  { id: 'dairy_goat',     icon: '🐐', labelEn: 'Dairy Goat',     labelUr: 'دودھ والی بکری' },
  { id: 'fattening_goat', icon: '🐐', labelEn: 'Fattening Goat', labelUr: 'موٹا کرنے والی بکری' },
];

// ================================================================================
// CONCENTRATE-MIX TARGET RANGES (on DM basis)
// ================================================================================
// IMPORTANT: These ranges are for the CONCENTRATE portion of the ration —
// what the farmer mixes from corn, oilcakes, bran, molasses, etc. The animal
// ALSO receives fresh forage, hay, or silage on top of this. The concentrate
// therefore runs LEANER on NDF (forage brings fiber) and RICHER on CP, ME, TDN,
// Ca, P than a complete Total Mixed Ration (TMR) would.
//
// References:
//   Dairy Cow     — NRC Dairy 2001/2021, Punjab Dairy Development Board
//   Dairy Buffalo — ICAR India, NDRI Karnal (higher milk-fat profile)
//   Heifer        — NRC Dairy 2001 (replacement heifer guidelines)
//   Fattening Bull— NRC Beef 2016 (feedlot finishing)
//   Dairy Goat    — NRC Small Ruminants 2007, INRA
//   Fattening Goat— NRC Small Ruminants 2007, ICAR
//
// `fat` is crude-fat min/max (upper limit matters — too much depresses fiber
// digestion in the rumen).
// ================================================================================

export interface NutrientRange {
  protein:    { min: number; max: number };  // % CP (DM)
  energy:     { min: number; max: number };  // Mcal ME / kg DM
  tdn:        { min: number; max: number };  // % TDN (DM)
  fiber:      { min: number; max: number };  // % NDF (DM)
  fat:        { min: number; max: number };  // % Fat (DM)
  calcium:    { min: number; max: number };  // % Ca  (DM)
  phosphorus: { min: number; max: number };  // % P   (DM)
}

export const NUTRITION_RANGES: Record<string, NutrientRange[]> = {
  // ---------------- 🐄 DAIRY COW ----------------
  dairy_cow: [
    // Early Lactation — peak milk, negative energy balance → densest concentrate
    { protein: { min: 20, max: 22 }, energy: { min: 2.80, max: 3.10 }, tdn: { min: 75, max: 80 }, fiber: { min: 15, max: 25 }, fat: { min: 3.0, max: 6.0 }, calcium: { min: 0.90, max: 1.20 }, phosphorus: { min: 0.50, max: 0.65 } },
    // Mid Lactation
    { protein: { min: 18, max: 20 }, energy: { min: 2.70, max: 2.90 }, tdn: { min: 72, max: 76 }, fiber: { min: 18, max: 28 }, fat: { min: 3.0, max: 5.0 }, calcium: { min: 0.80, max: 1.00 }, phosphorus: { min: 0.45, max: 0.60 } },
    // Late Lactation
    { protein: { min: 16, max: 18 }, energy: { min: 2.60, max: 2.80 }, tdn: { min: 68, max: 73 }, fiber: { min: 22, max: 32 }, fat: { min: 2.5, max: 4.5 }, calcium: { min: 0.70, max: 0.90 }, phosphorus: { min: 0.40, max: 0.55 } },
    // Dry Period
    { protein: { min: 14, max: 16 }, energy: { min: 2.40, max: 2.60 }, tdn: { min: 65, max: 70 }, fiber: { min: 25, max: 35 }, fat: { min: 2.0, max: 4.0 }, calcium: { min: 0.50, max: 0.70 }, phosphorus: { min: 0.35, max: 0.45 } },
  ],

  // ---------------- 🐃 DAIRY BUFFALO ----------------
  // Buffalo milk is 6-8% fat vs cow's 3.5-4% — needs similar energy density
  dairy_buffalo: [
    // Early Lactation
    { protein: { min: 18, max: 22 }, energy: { min: 2.80, max: 3.10 }, tdn: { min: 75, max: 80 }, fiber: { min: 15, max: 25 }, fat: { min: 3.0, max: 6.0 }, calcium: { min: 0.85, max: 1.15 }, phosphorus: { min: 0.45, max: 0.60 } },
    // Mid Lactation
    { protein: { min: 16, max: 20 }, energy: { min: 2.70, max: 2.90 }, tdn: { min: 72, max: 76 }, fiber: { min: 18, max: 28 }, fat: { min: 3.0, max: 5.0 }, calcium: { min: 0.75, max: 1.00 }, phosphorus: { min: 0.42, max: 0.55 } },
    // Late Lactation
    { protein: { min: 14, max: 18 }, energy: { min: 2.60, max: 2.80 }, tdn: { min: 68, max: 73 }, fiber: { min: 22, max: 32 }, fat: { min: 2.5, max: 4.5 }, calcium: { min: 0.65, max: 0.85 }, phosphorus: { min: 0.38, max: 0.50 } },
    // Dry Period
    { protein: { min: 13, max: 15 }, energy: { min: 2.40, max: 2.60 }, tdn: { min: 65, max: 70 }, fiber: { min: 25, max: 35 }, fat: { min: 2.0, max: 4.0 }, calcium: { min: 0.50, max: 0.70 }, phosphorus: { min: 0.32, max: 0.42 } },
  ],

  // ---------------- 🐂 HEIFER (Cow/Buffalo) ----------------
  // Growing females — protein for frame, Ca/P for skeleton; concentrate fed along with good forage
  heifer: [
    // Calf 3–6 months — still on milk + starter concentrate + some forage
    { protein: { min: 20, max: 24 }, energy: { min: 2.90, max: 3.20 }, tdn: { min: 78, max: 83 }, fiber: { min: 12, max: 20 }, fat: { min: 3.0, max: 5.0 }, calcium: { min: 0.90, max: 1.20 }, phosphorus: { min: 0.50, max: 0.70 } },
    // Growing Heifer 6–15 months
    { protein: { min: 16, max: 18 }, energy: { min: 2.60, max: 2.80 }, tdn: { min: 68, max: 73 }, fiber: { min: 20, max: 30 }, fat: { min: 2.5, max: 4.0 }, calcium: { min: 0.70, max: 0.90 }, phosphorus: { min: 0.40, max: 0.55 } },
    // Pregnant Heifer 15+ months
    { protein: { min: 14, max: 16 }, energy: { min: 2.50, max: 2.70 }, tdn: { min: 65, max: 70 }, fiber: { min: 25, max: 35 }, fat: { min: 2.0, max: 4.0 }, calcium: { min: 0.70, max: 0.95 }, phosphorus: { min: 0.40, max: 0.55 } },
  ],

  // ---------------- 🐂 FATTENING BULL ----------------
  // Maximize ADG (average daily gain) — high energy, moderate-low CP trends down over time
  fattening_bull: [
    // Starter 100–200 kg — building frame
    { protein: { min: 16, max: 18 }, energy: { min: 2.70, max: 2.95 }, tdn: { min: 72, max: 78 }, fiber: { min: 18, max: 25 }, fat: { min: 3.0, max: 5.0 }, calcium: { min: 0.70, max: 0.90 }, phosphorus: { min: 0.40, max: 0.55 } },
    // Grower 200–300 kg
    { protein: { min: 14, max: 16 }, energy: { min: 2.85, max: 3.15 }, tdn: { min: 76, max: 82 }, fiber: { min: 15, max: 22 }, fat: { min: 3.0, max: 5.0 }, calcium: { min: 0.55, max: 0.75 }, phosphorus: { min: 0.35, max: 0.45 } },
    // Finisher >300 kg — maximum energy, minimum fiber
    { protein: { min: 12, max: 14 }, energy: { min: 3.00, max: 3.30 }, tdn: { min: 80, max: 85 }, fiber: { min: 12, max: 20 }, fat: { min: 3.0, max: 5.0 }, calcium: { min: 0.45, max: 0.65 }, phosphorus: { min: 0.30, max: 0.40 } },
  ],

  // ---------------- 🐐 DAIRY GOAT ----------------
  dairy_goat: [
    // Early Lactation
    { protein: { min: 18, max: 22 }, energy: { min: 2.80, max: 3.05 }, tdn: { min: 75, max: 80 }, fiber: { min: 15, max: 25 }, fat: { min: 3.0, max: 6.0 }, calcium: { min: 0.90, max: 1.20 }, phosphorus: { min: 0.45, max: 0.60 } },
    // Mid/Late Lactation
    { protein: { min: 16, max: 18 }, energy: { min: 2.60, max: 2.85 }, tdn: { min: 70, max: 76 }, fiber: { min: 20, max: 30 }, fat: { min: 2.5, max: 5.0 }, calcium: { min: 0.70, max: 0.95 }, phosphorus: { min: 0.40, max: 0.55 } },
    // Late Pregnancy — prevent pregnancy toxemia
    { protein: { min: 15, max: 17 }, energy: { min: 2.65, max: 2.85 }, tdn: { min: 70, max: 75 }, fiber: { min: 22, max: 32 }, fat: { min: 2.5, max: 4.5 }, calcium: { min: 0.70, max: 0.90 }, phosphorus: { min: 0.40, max: 0.52 } },
    // Dry Period
    { protein: { min: 12, max: 14 }, energy: { min: 2.40, max: 2.60 }, tdn: { min: 65, max: 70 }, fiber: { min: 25, max: 35 }, fat: { min: 2.0, max: 3.5 }, calcium: { min: 0.50, max: 0.70 }, phosphorus: { min: 0.32, max: 0.42 } },
  ],

  // ---------------- 🐐 FATTENING GOAT ----------------
  fattening_goat: [
    // Grower 15–25 kg — rapid growth phase
    { protein: { min: 16, max: 18 }, energy: { min: 2.70, max: 2.95 }, tdn: { min: 72, max: 78 }, fiber: { min: 15, max: 25 }, fat: { min: 3.0, max: 5.0 }, calcium: { min: 0.70, max: 0.90 }, phosphorus: { min: 0.35, max: 0.50 } },
    // Finisher 25–40 kg — max energy for fat deposition and market weight
    { protein: { min: 14, max: 16 }, energy: { min: 2.85, max: 3.15 }, tdn: { min: 76, max: 82 }, fiber: { min: 12, max: 22 }, fat: { min: 3.0, max: 5.0 }, calcium: { min: 0.60, max: 0.80 }, phosphorus: { min: 0.30, max: 0.45 } },
  ],
};

/** Safe getter for the range set at a given animal + stage. */
export function getNutritionRange(
  animalId: string | null,
  stageIndex: number
): NutrientRange | null {
  if (!animalId) return null;
  const stages = NUTRITION_RANGES[animalId];
  if (!stages) return null;
  return stages[stageIndex] ?? null;
}

export const STATUS_INDICATORS = [
  {
    type: 'success',
    icon: '✅',
    titleUr: 'پروٹین ٹھیک ہے',
    titleEn: 'Protein is OK',
    descUr: 'تبدیلی کی ضرورت نہیں',
    descEn: 'No changes needed',
  },
  {
    type: 'warning',
    icon: '⚠️',
    titleUr: 'فائبر تھوڑا کم ہے',
    titleEn: 'Fiber slightly low',
    descUr: 'بھوسہ/خشک گھاس شامل کریں',
    descEn: 'Add straw/hay',
  },
  {
    type: 'error',
    icon: '🛑',
    titleUr: 'کیلشیم کم ہے',
    titleEn: 'Calcium low',
    descUr: 'چونا پتھر ضروری ہے',
    descEn: 'Add limestone',
  },
];
