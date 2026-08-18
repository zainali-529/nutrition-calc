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
//   - category:   'energy' | 'protein' | 'fiber' | 'fat' | 'supplement'
//   - icon:       one emoji character
//   - nameEn / nameUr + energy/protein levels
//   - nutritional values on DM basis
// Everything else (category lists, icon maps, lookup helpers) is auto-derived.
// ================================================================================

import { getOverride } from './ingredientOverrides';
import { getCustomIngredient, getCustomIngredients } from './customIngredients';

/**
 * The five ingredient buckets shown in Step 2.
 *
 * `fat` holds TRUE fat/oil sources only (bypass fats and free vegetable oils).
 * `supplement` holds minerals and buffers (limestone, DCP, salt, soda) — these
 * used to live under `fat`, which made the category a grab-bag. They are now
 * separate so the picker reads correctly and so a farmer choosing "fat" gets
 * energy-dense fat rather than a calcium source.
 *
 * Ingredient KEYS were deliberately left unchanged during that split, so
 * existing saved formulas and templates keep resolving. `savedFormulas.ts`
 * re-buckets old saves on load — see `migrateChosenIngredients()` there.
 */
export type IngredientCategory = 'energy' | 'protein' | 'fiber' | 'fat' | 'supplement';
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
  /**
   * Maximum practical inclusion as % of the final concentrate mix.
   * Science-based cap — considers anti-nutritional factors (gossypol,
   * glucosinolates), palatability, acidosis risk, rancidity, and rumen
   * function. Used by the auto-formulator to constrain feasible recipes.
   */
  maxInclusion: number;
  /** Why the cap exists — scientific reasoning (English). Shown in ingredient modal. */
  capReasonEn: string;
  /** Why the cap exists — Urdu translation. */
  capReasonUr: string;
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
    ca: 0.03, p: 0.28, ash: 1.3, price: 102, maxInclusion: 50,
    capReasonEn: 'Over 50% means protein deficit (corn is only 9% CP) and rumen starch overload causing acidosis, especially when finely ground.',
    capReasonUr: '50% سے زیادہ پروٹین کی کمی (مکئی میں صرف 9% پروٹین) اور تیزابیت کا خطرہ، خاص طور پر باریک پیسنے پر۔',
    notesEn: 'Primary energy source — high starch, low protein',
    notesUr: 'بنیادی توانائی — نشاستہ زیادہ، پروٹین کم',
  },
  {
    key: 'wheat_grain', category: 'energy', icon: '🌾',
    nameEn: 'Wheat Grain (Gandum)', nameUr: 'گندم دانہ',
    energyLevel: 'high', proteinLevel: 'low',
    dm: 89, cp: 14, me: 3.28, tdn: 88, adf: 5, ndf: 14, fat: 2, starch: 63,
    ca: 0.05, p: 0.39, ash: 2, price: 95, maxInclusion: 30,
    capReasonEn: 'Wheat starch ferments faster than corn starch — over 30% causes rapid pH drop, sub-acute ruminal acidosis (SARA) and laminitis risk in dairy cows.',
    capReasonUr: 'گندم کا نشاستہ مکئی سے تیزی سے ہضم — 30% سے زیادہ تیزابیت (SARA) اور دودھیل گائے میں کھر (لیمینائٹس) کا خطرہ۔',
    notesEn: 'Grind coarsely — fine grinding causes acidosis risk',
    notesUr: 'موٹا پیسیں — باریک پیسنا تیزابیت کا خطرہ',
  },
  {
    key: 'barley', category: 'energy', icon: '🌿',
    nameEn: 'Barley (Jau)', nameUr: 'جو',
    energyLevel: 'high', proteinLevel: 'low',
    dm: 89, cp: 12, me: 3.00, tdn: 84, adf: 7, ndf: 20, fat: 2.5, starch: 58,
    ca: 0.05, p: 0.38, ash: 2.5, price: 80, maxInclusion: 40,
    capReasonEn: 'Safer than wheat because starch digests at moderate rate, but over 40% concentrate fibre drops too low and cost-benefit vs corn becomes unfavorable.',
    capReasonUr: 'گندم سے محفوظ کیونکہ نشاستہ درمیانی رفتار سے ہضم، مگر 40% سے زیادہ فائبر کم اور لاگت بڑھ جاتی ہے۔',
    notesEn: 'Good energy, safer than wheat for rumen',
    notesUr: 'اچھی توانائی، رومین کے لیے گندم سے محفوظ',
  },
  {
    // Common in Sindh and southern Punjab. Slightly less digestible than corn
    // because of kafirin proteins surrounding the starch granules; red varieties
    // also carry tannins that bind dietary protein.
    key: 'sorghum', category: 'energy', icon: '🟥',
    nameEn: 'Sorghum (Jowar)', nameUr: 'جوار',
    energyLevel: 'high', proteinLevel: 'low',
    dm: 89, cp: 10, me: 3.15, tdn: 84, adf: 6, ndf: 13, fat: 3, starch: 70,
    ca: 0.04, p: 0.30, ash: 2, price: 80, maxInclusion: 35,
    capReasonEn: 'Tannins in red sorghum bind dietary protein and reduce digestibility. Kafirin proteins make the starch less digestible than corn (~5-10% lower). Over 35% noticeably reduces ADG and milk yield, and pale-yellow milk fat may result.',
    capReasonUr: 'سرخ جوار میں ٹینن پروٹین کو باندھتے ہیں، کفیرین مکئی کے مقابلے نشاستہ کم ہضم بناتے ہیں۔ 35% سے زیادہ پر دودھ اور وزن بڑھنا کم ہو سکتا ہے۔',
    notesEn: 'Cheaper alternative to corn — common in Sindh/southern Punjab. Grind for best digestion.',
    notesUr: 'مکئی کا سستا متبادل — سندھ اور جنوبی پنجاب میں عام۔ بہترین ہاضمے کے لیے پیسیں۔',
  },
  {
    key: 'millet', category: 'energy', icon: '🟡',
    nameEn: 'Millet (Bajra)', nameUr: 'باجرہ',
    energyLevel: 'high', proteinLevel: 'low',
    dm: 90, cp: 11, me: 3.10, tdn: 82, adf: 7, ndf: 15, fat: 5, starch: 55,
    ca: 0.04, p: 0.30, ash: 2, price: 90, maxInclusion: 30,
    capReasonEn: 'Contains tannins that bind protein and reduce digestibility — over 30% protein utilisation drops noticeably and bitter taste reduces intake.',
    capReasonUr: 'ٹینن پروٹین کو باندھتے ہیں، ہضم کم کرتے ہیں — 30% سے زیادہ پروٹین کا فائدہ کم اور ذائقہ تلخ۔',
    notesEn: 'Higher fat than corn — seasonal availability',
    notesUr: 'مکئی سے زیادہ چکنائی — موسمی دستیابی',
  },
  {
    key: 'rice_polish', category: 'energy', icon: '⚪',
    nameEn: 'Rice Polish', nameUr: 'رائس پولش',
    energyLevel: 'high', proteinLevel: 'low',
    dm: 90, cp: 13, me: 2.86, tdn: 85, adf: 9, ndf: 22, fat: 13, starch: 40,
    ca: 0.10, p: 1.50, ash: 8, price: 100, maxInclusion: 25,
    capReasonEn: 'High oil (13%) turns rancid quickly in heat/humidity and harbours mycotoxins (aflatoxin) in monsoon. Over 25% the fat coats fibre and depresses rumen digestion.',
    capReasonUr: 'تیل زیادہ (13%) — گرمی/نمی میں جلدی خراب، مانسون میں افلاٹوکسین۔ 25% سے زیادہ فائبر ہضم متاثر۔',
    notesEn: 'High fat (13%) and phosphorus — mycotoxin risk in monsoon',
    notesUr: 'چکنائی اور فاسفورس زیادہ — مانسون میں مائیکوٹاکسن کا خطرہ',
  },
  {
    key: 'broken_rice', category: 'energy', icon: '🍚',
    nameEn: 'Broken Rice (Tukri)', nameUr: 'ٹکری چاول',
    energyLevel: 'high', proteinLevel: 'low',
    dm: 89, cp: 8, me: 3.25, tdn: 87, adf: 2, ndf: 4, fat: 1, starch: 75,
    ca: 0.03, p: 0.15, ash: 1, price: 80, maxInclusion: 25,
    capReasonEn: '75% starch with almost no fibre (4% NDF). Over 25% causes severe acidosis risk — worse than wheat because no natural fibre to buffer the rumen.',
    capReasonUr: 'نشاستہ 75%، فائبر تقریباً نہیں — 25% سے زیادہ شدید تیزابیت، گندم سے بھی زیادہ خطرناک۔',
    notesEn: 'Very high starch — limit to 25% of concentrate to avoid acidosis',
    notesUr: 'نشاستہ بہت زیادہ — تیزابیت سے بچنے کے لیے 25% تک محدود رکھیں',
  },
  {
    key: 'molasses', category: 'energy', icon: '🍯',
    nameEn: 'Molasses (Sheera)', nameUr: 'شیرہ',
    energyLevel: 'high', proteinLevel: 'low',
    dm: 75, cp: 4, me: 2.29, tdn: 75, adf: 0, ndf: 0, fat: 0, starch: 0,
    ca: 1.00, p: 0.06, ash: 11, price: 75, maxInclusion: 10,
    capReasonEn: 'Sugar (~60%) ferments very fast, sharply dropping rumen pH. Over 10% causes diarrhoea, poor fibre digestion, and sticky mix clumps in feeders.',
    capReasonUr: 'شکر 60% تیزی سے خمیر ہوتی ہے، رومن کا pH گر جاتا ہے۔ 10% سے زیادہ دست، فائبر ہضم کم، مکسر میں چپکاؤ۔',
    notesEn: 'Improves palatability — limit to 10-15% of concentrate. High calcium source.',
    notesUr: 'ذائقہ بہتر بناتا ہے — 10-15% تک محدود رکھیں۔ کیلشیم زیادہ۔',
  },
  {
    key: 'wheat_middlings', category: 'energy', icon: '📦',
    nameEn: 'Wheat Middlings (Maida Chokar)', nameUr: 'میدہ چوکر',
    energyLevel: 'med', proteinLevel: 'med',
    dm: 88, cp: 17, me: 2.80, tdn: 76, adf: 10, ndf: 35, fat: 4.5, starch: 25,
    ca: 0.12, p: 0.90, ash: 5, price: 70, maxInclusion: 25,
    capReasonEn: 'Very fine particle size bypasses rumen chewing — poorly utilised. Over 25% reduces saliva production, rumen motility, and may contain flour-mill residues.',
    capReasonUr: 'بہت باریک ذرات — رومن میں چبائی کے بغیر گزر جاتے ہیں۔ 25% سے زیادہ تھوک اور رومن حرکت کم۔',
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
    ca: 0.27, p: 0.65, ash: 6.5, price: 300, maxInclusion: 30,
    capReasonEn: 'Very rumen-degradable (65% RDP) — over 30% means excess ammonia released, wasted as urea by liver (metabolic stress). Also expensive at high inclusions.',
    capReasonUr: 'رومن میں تیز حل ہوتی ہے — 30% سے زیادہ امونیا ضائع، جگر پر دباؤ، مہنگی بھی۔',
    notesEn: 'Gold-standard protein — best amino acid profile for dairy',
    notesUr: 'بہترین پروٹین — دودھ کے لیے بہترین امینو ایسڈ',
  },
  {
    key: 'csm', category: 'protein', icon: '🟨',
    nameEn: 'Cottonseed Cake (Binola)', nameUr: 'بنولہ کھل',
    energyLevel: 'low', proteinLevel: 'high',
    dm: 90, cp: 38, me: 2.50, tdn: 72, adf: 18, ndf: 28, fat: 2, starch: 5,
    ca: 0.15, p: 1.00, ash: 6, price: 150, maxInclusion: 25,
    capReasonEn: 'Contains gossypol — accumulates in the liver, reduces fertility in adult cattle and is toxic to calves. Aflatoxin risk in humid monsoon storage.',
    capReasonUr: 'گوسیپول — جگر میں جمع ہوتا ہے، بالغ مویشی میں زرخیزی کم، بچھڑوں کے لیے زہریلا۔ مانسون میں افلاٹوکسین خطرہ۔',
    notesEn: 'Cheapest protein in Pakistan — aflatoxin caution in monsoon. Contains gossypol.',
    notesUr: 'سستا ترین پروٹین — مانسون میں افلاٹوکسین خطرہ۔ گوسیپول ہوتا ہے۔',
  },
  {
    key: 'rsm', category: 'protein', icon: '🟤',
    nameEn: 'Mustard Cake (Sarso Khal)', nameUr: 'سرسوں کھل',
    energyLevel: 'low', proteinLevel: 'med',
    dm: 90, cp: 35, me: 2.65, tdn: 66, adf: 18, ndf: 28, fat: 7, starch: 8,
    ca: 0.62, p: 1.10, ash: 7.5, price: 110, maxInclusion: 15,
    capReasonEn: 'Contains glucosinolates (goitrogens — damage thyroid) and erucic acid — bitter taste, can cause off-flavour in milk. Pakistani mustard is especially high in these.',
    capReasonUr: 'گلوکوسینولیٹس (تھائیرائیڈ نقصان) اور اروسک ایسڈ — تلخ ذائقہ، دودھ میں بو۔ پاکستانی سرسوں میں مقدار زیادہ۔',
    notesEn: 'Contains glucosinolates — limit to 20% of concentrate',
    notesUr: 'گلوکوسینولیٹس — 20% تک محدود رکھیں',
  },
  {
    key: 'canola_meal', category: 'protein', icon: '🌼',
    nameEn: 'Canola Meal', nameUr: 'کینولا میل',
    energyLevel: 'low', proteinLevel: 'high',
    dm: 90, cp: 36, me: 2.70, tdn: 67, adf: 17, ndf: 27, fat: 4, starch: 10,
    ca: 0.75, p: 1.10, ash: 6.5, price: 180, maxInclusion: 20,
    capReasonEn: 'Improved variety with lower glucosinolates than mustard, but still present. Over 20% gradually reduces palatability and shows mild thyroid effects long-term.',
    capReasonUr: 'سرسوں سے بہتر مگر گلوکوسینولیٹس اب بھی موجود۔ 20% سے زیادہ ذائقہ اور تھائیرائیڈ پر آہستہ اثر۔',
    notesEn: 'Low glucosinolates (safer than mustard cake)',
    notesUr: 'کم گلوکوسینولیٹس (سرسوں کھل سے محفوظ)',
  },
  {
    key: 'sfm', category: 'protein', icon: '🌻',
    nameEn: 'Sunflower Meal (Surajmukhi)', nameUr: 'سورج مکھی کھل',
    energyLevel: 'low', proteinLevel: 'med',
    dm: 90, cp: 32, me: 2.10, tdn: 65, adf: 22, ndf: 30, fat: 1, starch: 2,
    ca: 0.30, p: 0.80, ash: 6, price: 130, maxInclusion: 25,
    capReasonEn: 'Very high fibre for a protein source (30% NDF) — dilutes concentrate energy density. Also low in lysine, an essential amino acid for milk yield.',
    capReasonUr: 'پروٹین کھل کے لیے فائبر زیادہ (30% NDF) — کانسنٹریٹ کی توانائی کم۔ لائیسن بھی کم جو دودھ کے لیے ضروری ہے۔',
    notesEn: 'High fiber oilcake — seasonal availability',
    notesUr: 'فائبر والی کھل — موسمی دستیابی',
  },
  {
    key: 'sesame_cake', category: 'protein', icon: '🌱',
    nameEn: 'Sesame Cake (Til Khal)', nameUr: 'تل کھل',
    energyLevel: 'high', proteinLevel: 'high',
    dm: 90, cp: 40, me: 2.99, tdn: 68, adf: 22, ndf: 30, fat: 10, starch: 3,
    ca: 1.20, p: 0.65, ash: 11, price: 120, maxInclusion: 20,
    capReasonEn: 'Oxalates bind calcium (making Ca unavailable despite 1.2%), phytates bind P/Zn/Fe. Very low lysine — over 20% causes amino acid imbalance that hurts milk yield.',
    capReasonUr: 'آکسالیٹ کیلشیم کو باندھتے ہیں، فائیٹیٹ P/Zn کو۔ لائیسن کم — 20% سے زیادہ امینو ایسڈ عدم توازن اور دودھ کم۔',
    notesEn: 'High fat & calcium — good for dairy. South Punjab specialty.',
    notesUr: 'چکنائی اور کیلشیم زیادہ — دودھ کے لیے اچھی۔ جنوبی پنجاب۔',
  },
  {
    // Major Pakistani protein source — high quality when fresh, but the
    // single most aflatoxin-prone feed ingredient in the country. Always
    // smell-check and request a lab certificate during monsoon.
    key: 'groundnut_cake', category: 'protein', icon: '🥜',
    nameEn: 'Groundnut Cake (Mongphali Khal)', nameUr: 'مونگ پھلی کھل',
    energyLevel: 'med', proteinLevel: 'high',
    dm: 91, cp: 46, me: 2.85, tdn: 78, adf: 9, ndf: 16, fat: 7, starch: 7,
    ca: 0.18, p: 0.65, ash: 5, price: 220, maxInclusion: 20,
    capReasonEn: 'Extreme aflatoxin risk — Aspergillus flavus thrives in humid Pakistani storage and aflatoxin passes into milk (M1) and damages the liver. Lysine and methionine deficient — over 20% causes amino acid imbalance reducing milk yield. Always lab-test monsoon stocks.',
    capReasonUr: 'افلاٹوکسین کا انتہائی خطرہ — Aspergillus کی نمو پاکستانی نمی میں بہت تیز، دودھ میں منتقل اور جگر کو نقصان۔ لائیسن اور میتھیونین کی کمی — 20% سے زیادہ امینو ایسڈ توازن بگڑتا ہے اور دودھ کم۔ مانسون کے ذخیرے کا ٹیسٹ ضروری۔',
    notesEn: 'Premium Pakistani protein — palatable and energy-rich. Test for aflatoxin before buying in monsoon.',
    notesUr: 'پاکستانی اعلی پروٹین — جانور پسند کرتا ہے۔ مانسون میں خریدنے سے پہلے افلاٹوکسین ٹیسٹ کرائیں۔',
  },
  {
    // Traditional Pakistani dairy ingredient. Feeds known to give a richer
    // yellow ghee color (from omega-3 fatty acids reducing milk fat oxidation).
    key: 'linseed_cake', category: 'protein', icon: '🟪',
    nameEn: 'Linseed Cake (Alsi Khal)', nameUr: 'السی کھل',
    energyLevel: 'med', proteinLevel: 'high',
    dm: 90, cp: 33, me: 2.55, tdn: 70, adf: 17, ndf: 26, fat: 8, starch: 5,
    ca: 0.40, p: 0.85, ash: 6, price: 160, maxInclusion: 15,
    capReasonEn: 'Mucilage (soluble fibre gel) slows rumen passage, and linamarin (cyanogenic glycoside) is mildly toxic at high intake. Residual oil is rich in omega-3 — turns rancid in heat. Over 15% reduces feed intake and oxidation risk increases.',
    capReasonUr: 'مسلیج رومن کی حرکت سست کرتا ہے، لینامارین (سائینوجنک) معتدل سمی۔ بقیہ تیل اومیگا-3 سے بھرپور — گرمی میں جلد خراب۔ 15% سے زیادہ پر کھانا کم اور خرابی کا خطرہ۔',
    notesEn: 'Improves milk fat and ghee color (omega-3). Store in cool, dry place — limited shelf life in heat.',
    notesUr: 'دودھ کی چکنائی اور گھی کا رنگ بہتر کرتی ہے (اومیگا-3)۔ ٹھنڈی خشک جگہ رکھیں — گرمی میں جلد خراب۔',
  },
  {
    key: 'guar', category: 'protein', icon: '🫛',
    nameEn: 'Guar Meal (Guar Khal)', nameUr: 'گوار کھل',
    energyLevel: 'low', proteinLevel: 'high',
    dm: 90, cp: 48, me: 2.20, tdn: 75, adf: 20, ndf: 28, fat: 6, starch: 5,
    ca: 0.20, p: 0.50, ash: 5, price: 160, maxInclusion: 15,
    capReasonEn: 'Contains trypsin inhibitors, saponins, and residual cyanogens even after toasting. Over 15% reduces protein digestibility sharply and cattle refuse it due to bitterness.',
    capReasonUr: 'ٹرپسن روکنے والے، سیپونن اور سائینوجنک مرکبات — بھوننے کے بعد بھی۔ 15% سے زیادہ پروٹین ہضم کم اور تلخ ذائقے سے جانور انکار کرتا ہے۔',
    notesEn: 'Must be toasted — raw has anti-nutritional factors. Limit to 15%.',
    notesUr: 'بھون کر استعمال کریں — کچی میں نقصان دہ عوامل۔ 15% تک۔',
  },
  {
    // Feed-grade dal chana — typically broken / discoloured chickpea grains
    // rejected from human food sorting. Both protein-rich AND energy-dense
    // (45% starch), so it dual-counts as a partial energy source too.
    key: 'dal_chana', category: 'protein', icon: '🟢',
    nameEn: 'Dal Chana (Chickpea Grain)', nameUr: 'دال چنا',
    energyLevel: 'high', proteinLevel: 'med',
    dm: 89, cp: 22, me: 3.10, tdn: 80, adf: 6, ndf: 14, fat: 5, starch: 45,
    ca: 0.20, p: 0.40, ash: 3.5, price: 120, maxInclusion: 25,
    capReasonEn: 'Raw chickpea contains trypsin inhibitors and raffinose-family oligosaccharides — cause flatulence and reduced protein digestion. Over 25% rarely justified economically vs. cheaper oilcakes. Roasting / soaking improves utilisation.',
    capReasonUr: 'کچے چنے میں ٹرپسن روکنے والے اور رفنوز شکر — گیس اور پروٹین ہضم میں کمی۔ 25% سے زیادہ مہنگا — تیلی کھلوں کے مقابلے غیر مفید۔ بھوننے یا بھگونے سے بہتر۔',
    notesEn: 'Feed-grade broken chana — protein + starch combined. Roast or soak for best digestion.',
    notesUr: 'فیڈ گریڈ ٹوٹا چنا — پروٹین اور نشاستہ دونوں۔ بھون کر یا بھگو کر استعمال بہتر۔',
  },
  {
    key: 'corn_gluten_feed', category: 'protein', icon: '🌽',
    nameEn: 'Corn Gluten Feed (CGM 30)', nameUr: 'کارن گلوٹین فیڈ',
    energyLevel: 'med', proteinLevel: 'med',
    dm: 90, cp: 22, me: 2.60, tdn: 75, adf: 10, ndf: 36, fat: 3.5, starch: 15,
    ca: 0.09, p: 0.85, ash: 7, price: 85, maxInclusion: 25,
    capReasonEn: 'Wet-milling by-product — quality varies batch-to-batch (CP can swing 18-28%). Over 25% introduces too much nutritional variability and a P:Ca imbalance.',
    capReasonUr: 'مکئی کی صنعت کا ذیلی پروڈکٹ — ہر بیچ میں معیار مختلف (پروٹین 18-28%)۔ 25% سے زیادہ غیر مستقل مزاجی اور معدنی عدم توازن۔',
    notesEn: 'Common cheap protein in Pakistan — corn wet-milling byproduct',
    notesUr: 'پاکستان میں سستا پروٹین — مکئی سے بنتا ہے',
  },
  {
    key: 'corn_gluten_meal', category: 'protein', icon: '🟠',
    nameEn: 'Corn Gluten Meal 60%', nameUr: 'کارن گلوٹین میل 60%',
    energyLevel: 'high', proteinLevel: 'high',
    dm: 91, cp: 60, me: 3.70, tdn: 90, adf: 3, ndf: 5, fat: 3, starch: 15,
    ca: 0.04, p: 0.50, ash: 2, price: 200, maxInclusion: 15,
    capReasonEn: '60% concentrated protein but very low in lysine and tryptophan. Over 15% creates amino acid imbalance that actually REDUCES milk yield — "first-limiting amino acid" problem.',
    capReasonUr: '60% پروٹین مگر لائیسن اور ٹرپٹوفین بہت کم۔ 15% سے زیادہ امینو ایسڈ کا توازن بگڑتا ہے اور دودھ کم ہو جاتا ہے۔',
    notesEn: 'Premium bypass protein — expensive but highly digestible',
    notesUr: 'اعلی درجے کا بائی پاس پروٹین — مہنگا مگر انتہائی ہضم',
  },
  {
    key: 'pkc', category: 'protein', icon: '🥥',
    nameEn: 'Palm Kernel Cake (PKC)', nameUr: 'پام کرنل کیک',
    energyLevel: 'med', proteinLevel: 'low',
    dm: 91, cp: 16, me: 2.40, tdn: 70, adf: 35, ndf: 65, fat: 8, starch: 2,
    ca: 0.25, p: 0.55, ash: 4, price: 65, maxInclusion: 20,
    capReasonEn: 'Very high fibre for a protein ingredient (65% NDF) — contradicts the purpose of concentrate. Over 20% drags down energy density and slows digestion in the rumen.',
    capReasonUr: 'پروٹین کے لیے فائبر بہت زیادہ (65% NDF)۔ 20% سے زیادہ توانائی کم اور رومن ہضم سست ہو جاتا ہے۔',
    notesEn: 'Imported — high fiber for an oilcake. Good for buffaloes.',
    notesUr: 'درآمد شدہ — بھینسوں کے لیے اچھی۔ فائبر زیادہ۔',
  },
  {
    key: 'whole_cottonseed', category: 'protein', icon: '⭕',
    nameEn: 'Whole Cottonseed (Binola)', nameUr: 'سابت بنولہ',
    energyLevel: 'high', proteinLevel: 'med',
    dm: 91, cp: 23, me: 3.00, tdn: 80, adf: 28, ndf: 44, fat: 20, starch: 3,
    ca: 0.15, p: 0.60, ash: 4, price: 120, maxInclusion: 10,
    capReasonEn: '20% fat PLUS gossypol — double risk. Excess fat depresses rumen fibre digestion (milk fat drops) and gossypol accumulates long-term. Limit dairy to 3-4 kg/day.',
    capReasonUr: 'چکنائی 20% + گوسیپول — دوہرا خطرہ۔ 10% سے زیادہ رومن فائبر ہضم متاثر، دودھ کی چکنائی کم، گوسیپول جمع ہوتا ہے۔',
    notesEn: 'High fat (20%) — limit to 3-4 kg/day for dairy. Contains gossypol.',
    notesUr: 'چکنائی 20% — دودھ کے لیے 3-4 کلو/دن تک۔ گوسیپول ہوتا ہے۔',
  },
  {
    // Urea = non-protein nitrogen (NPN). Rumen microbes convert urea → ammonia →
    // microbial protein. The "cp" value here is the standard NPN convention:
    // 46% N × 6.25 = 287.5% crude-protein equivalent. The LP treats it like any
    // other CP source; the strict 1.5% maxInclusion cap is what prevents ammonia
    // toxicity. Suitable ONLY for adult ruminants with a developed rumen.
    key: 'urea', category: 'protein', icon: '⚗️',
    nameEn: 'Urea (Feed Grade)', nameUr: 'یوریا',
    energyLevel: 'low', proteinLevel: 'high',
    dm: 99, cp: 287, me: 0, tdn: 0, adf: 0, ndf: 0, fat: 0, starch: 0,
    ca: 0, p: 0, ash: 0, price: 100, maxInclusion: 1.5,
    capReasonEn: 'Urea is non-protein nitrogen — rumen microbes convert it to true protein. Above 1.5% of concentrate, ammonia is released faster than microbes can capture it, causing alkalosis, muscle tetany, and death within hours. NEVER feed to calves under 3 months (no functional rumen) or to monogastrics. Must be mixed uniformly — hot spots can kill an animal that eats them.',
    capReasonUr: 'یوریا غیر پروٹینی نائٹروجن ہے — رومن کے جراثیم اسے اصلی پروٹین میں بدلتے ہیں۔ کانسنٹریٹ میں 1.5% سے زیادہ پر امونیا جراثیم کی صلاحیت سے زیادہ تیزی سے بنتی ہے، جس سے الکلوسس، تشنج اور چند گھنٹوں میں موت۔ 3 ماہ سے کم بچھڑوں اور غیر مویشی جانوروں کو ہرگز نہ دیں۔ یکساں مکس کرنا لازمی — ایک جگہ زیادہ مقدار جان لیوا۔',
    notesEn: 'NPN source — 1 kg urea ≈ 2.6 kg soybean meal protein-equivalent at a fraction of the cost. Adult ruminants only. Mix uniformly with grain (starch feeds the microbes that use the N). Introduce gradually over 2–3 weeks.',
    notesUr: 'NPN ذریعہ — 1 کلو یوریا تقریباً 2.6 کلو سویا میل کے پروٹین کے برابر، بہت سستا۔ صرف بالغ مویشی۔ دانوں کے ساتھ یکساں ملائیں (نشاستہ جراثیم کو نائٹروجن استعمال کرنے میں مدد دیتا ہے)۔ 2–3 ہفتوں میں آہستہ آہستہ شامل کریں۔',
  },

  // =========================================================================
  //  BRAN & FIBER  —  concentrate-level fiber sources (NOT roughages)
  // =========================================================================
  {
    key: 'wheat_bran', category: 'fiber', icon: '🟫',
    nameEn: 'Wheat Bran (Chokhar)', nameUr: 'چوکر',
    energyLevel: 'med', proteinLevel: 'med',
    dm: 87, cp: 16, me: 2.63, tdn: 68, adf: 13, ndf: 45, fat: 4, starch: 22,
    ca: 0.13, p: 1.10, ash: 6, price: 75, maxInclusion: 30,
    capReasonEn: 'Very high phosphorus (1.1%) with low calcium (0.13%) — inverts Ca:P ratio. Over 30% causes urinary stones (urolithiasis) and bulkiness dilutes energy density.',
    capReasonUr: 'فاسفورس زیادہ (1.1%) اور کیلشیم کم — Ca:P توازن بگڑتا ہے۔ 30% سے زیادہ پیشاب میں پتھری اور توانائی کم۔',
    notesEn: 'Most common Pakistani concentrate fiber — very high phosphorus (1.1%)',
    notesUr: 'پاکستان میں سب سے عام فائبر — فاسفورس بہت زیادہ (1.1%)',
  },
  {
    key: 'rice_bran', category: 'fiber', icon: '🟤',
    nameEn: 'Rice Bran', nameUr: 'چاول کی بھوسی',
    energyLevel: 'med', proteinLevel: 'low',
    dm: 91, cp: 13, me: 2.20, tdn: 64, adf: 15, ndf: 28, fat: 14, starch: 20,
    ca: 0.08, p: 1.50, ash: 10, price: 55, maxInclusion: 20,
    capReasonEn: '14% oil + lipase enzyme — goes rancid within weeks unless stabilised. Often adulterated with rice hull in Pakistani markets. Over 20% causes fat overload and mycotoxin risk.',
    capReasonUr: 'تیل 14% + لائپیز انزائم — چند ہفتوں میں خراب۔ پاکستانی بازار میں چاول کے چھلکے کی ملاوٹ عام۔ 20% سے زیادہ چکنائی اور مائیکوٹاکسن خطرہ۔',
    notesEn: 'High fat (14%) and phosphorus — cheaper than rice polish. Check for adulteration.',
    notesUr: 'چکنائی اور فاسفورس زیادہ — رائس پولش سے سستی۔ ملاوٹ چیک کریں۔',
  },
  {
    // By-product of besan / dal milling — abundant in Pakistan and very cheap.
    // Useful as a "filler" fiber but should not dominate the concentrate.
    key: 'chickpea_husk', category: 'fiber', icon: '🌰',
    nameEn: 'Chickpea Husk (Channa Chilka)', nameUr: 'کالا چنا کا چھلکا',
    energyLevel: 'low', proteinLevel: 'low',
    dm: 90, cp: 9, me: 2.10, tdn: 60, adf: 32, ndf: 55, fat: 1.5, starch: 10,
    ca: 0.35, p: 0.25, ash: 6, price: 50, maxInclusion: 25,
    capReasonEn: 'Highly fibrous and energy-poor (only ~2.1 Mcal/kg DM) — over 25% drags concentrate energy below dairy needs. Mill quality varies widely; beware adulteration with dust or broken pieces.',
    capReasonUr: 'فائبر زیادہ، توانائی کم (صرف ~2.1 Mcal/kg) — 25% سے زیادہ پر کانسنٹریٹ کی توانائی دودھ کی ضرورت سے کم۔ ملوں سے معیار میں فرق، گرد یا ٹوٹے کی ملاوٹ ممکن۔',
    notesEn: 'Cheap by-product of besan/dal mills — common in Punjab. Good filler, not a primary nutrient source.',
    notesUr: 'بیسن اور دال ملوں کا سستا ضمنی پروڈکٹ — پنجاب میں عام۔ بھرنے کے لیے، بنیادی غذا نہیں۔',
  },
  {
    // Soyhull NDF is uniquely digestible — closer to forage NDF than to typical
    // by-product fibre. Often imported alongside SBM shipments.
    key: 'soybean_hulls', category: 'fiber', icon: '🟩',
    nameEn: 'Soybean Hulls (Soyabean Chilka)', nameUr: 'سویا بین کا چھلکا',
    energyLevel: 'med', proteinLevel: 'low',
    dm: 91, cp: 12, me: 2.30, tdn: 73, adf: 50, ndf: 67, fat: 2, starch: 3,
    ca: 0.55, p: 0.18, ash: 5, price: 70, maxInclusion: 25,
    capReasonEn: 'Very high NDF (67%) but unique — the fibre is highly digestible (~73% TDN), behaving more like good forage than ordinary by-product. Still, over 25% lacks the physical fibre length cattle need to chew and produce saliva for rumen buffering.',
    capReasonUr: 'NDF بہت زیادہ (67%) مگر منفرد — یہ فائبر آسانی سے ہضم ہوتی ہے (~73% TDN)، اچھے چارے کی طرح۔ پھر بھی 25% سے زیادہ پر چبائی والی فائبر کی کمی، رومن میں بفرنگ متاثر۔',
    notesEn: 'Dairy-friendly digestible fibre — can partially replace forage. Often imported with SBM.',
    notesUr: 'دودھ کے لیے موزوں ہضم پذیر فائبر — چارے کی جزوی جگہ۔ سویا میل کے ساتھ درآمد ہوتی ہے۔',
  },

  // =========================================================================
  //  FATS & OILS  —  true fat sources (energy-dense, no protein)
  // =========================================================================
  //
  // Two families, and the distinction matters a lot in practice:
  //
  //   1. BYPASS (rumen-protected) FAT — the fatty acids are either calcium
  //      soaps or hydrogenated/prilled, so they pass the rumen inert and are
  //      absorbed in the small intestine. Safe at meaningful inclusions.
  //
  //   2. FREE VEGETABLE OILS — unprotected. They coat fibre particles and are
  //      toxic to cellulolytic rumen bacteria, so fibre digestion and milk fat
  //      collapse well before the diet's total-fat ceiling is reached. Every
  //      free oil is therefore capped at 2-3%, far below the bypass fats.
  //
  // Energy values are scaled from the long-standing `bypassFat` anchor
  // (99% fat → ME 4.78, TDN 180) so the whole category stays internally
  // consistent: ME ≈ 4.78 × (fat% / 99), TDN ≈ 180 × (fat% / 99).
  //
  // NOTE: several ingredients in OTHER categories are also significant fat
  // sources — whole cottonseed (20% fat), rice polish (13%), rice bran (14%),
  // sesame cake (10%). Those usually supply fat more cheaply than pure oil.
  // =========================================================================
  {
    // Unchanged key ('bypassFat') — renaming it would orphan every saved
    // formula and template that references it. Only the label now states 99%.
    key: 'bypassFat', category: 'fat', icon: '🛢️',
    nameEn: 'Bypass Fat 99% (Prilled)', nameUr: 'بائی پاس فیٹ 99%',
    energyLevel: 'high', proteinLevel: 'low',
    dm: 99, cp: 0, me: 4.78, tdn: 180, adf: 0, ndf: 0, fat: 99, starch: 0,
    ca: 0, p: 0, ash: 0, price: 400, maxInclusion: 5,
    capReasonEn: 'Total diet fat must stay under 6-7% — otherwise fibre digestion collapses and milk fat drops sharply. Bypass fat stacks with natural fat from corn/bran/sesame — cap kept at 5% for safety.',
    capReasonUr: 'کل خوراک میں چکنائی 6-7% سے کم رکھنی ضروری، ورنہ فائبر ہضم متاثر اور دودھ کی چکنائی گر جاتی ہے۔ مکئی/چوکر/تل کی قدرتی چکنائی کے ساتھ مل کر حد تک پہنچ جاتی ہے۔',
    notesEn: 'Rumen-protected fat — use 100-300g/day for dairy. Do not exceed 6% total fat.',
    notesUr: 'رومین محفوظ چکنائی — دودھ کے لیے 100-300 گرام/دن۔ کل چکنائی 6% سے زیادہ نہ ہو۔',
  },
  {
    // Calcium salts of palm fatty acids — the other common commercial grade.
    // Lower fat than the prilled 99% product, but it carries ~9% calcium,
    // which the LP correctly counts toward the Ca requirement.
    key: 'bypass_fat_85', category: 'fat', icon: '🧴',
    nameEn: 'Bypass Fat 85% (Calcium Soap)', nameUr: 'بائی پاس فیٹ 85% (کیلشیم سوپ)',
    energyLevel: 'high', proteinLevel: 'low',
    dm: 96, cp: 0, me: 4.10, tdn: 155, adf: 0, ndf: 0, fat: 85, starch: 0,
    ca: 9, p: 0, ash: 10, price: 340, maxInclusion: 6,
    capReasonEn: 'Calcium-soap bypass fat is the most rumen-inert form, so it tolerates a slightly higher cap than prilled fat. The limit is still total diet fat (6-7%) — and because this product is ~9% calcium, high inclusions also push calcium up and can break the Ca:P ratio.',
    capReasonUr: 'کیلشیم سوپ والی بائی پاس فیٹ رومن میں سب سے زیادہ غیر فعال ہے، اس لیے حد تھوڑی زیادہ ہے۔ پھر بھی کل چکنائی 6-7% سے کم رکھیں — اور اس میں تقریباً 9% کیلشیم ہے، زیادہ مقدار Ca:P توازن بگاڑ سکتی ہے۔',
    notesEn: 'Cheaper per kg than prilled 99% fat and supplies calcium too. Slightly less energy-dense (85% fat).',
    notesUr: 'پرلڈ 99% سے سستی اور ساتھ کیلشیم بھی دیتی ہے۔ توانائی تھوڑی کم (85% چکنائی)۔',
  },
  {
    key: 'mustard_oil', category: 'fat', icon: '🌻',
    nameEn: 'Mustard Oil (Sarson ka Tel)', nameUr: 'سرسوں کا تیل',
    energyLevel: 'high', proteinLevel: 'low',
    dm: 100, cp: 0, me: 4.83, tdn: 182, adf: 0, ndf: 0, fat: 100, starch: 0,
    ca: 0, p: 0, ash: 0, price: 520, maxInclusion: 2,
    capReasonEn: 'Free (unprotected) oil — it coats fibre particles and kills cellulolytic rumen bacteria, so fibre digestion and milk fat drop well before the diet fat ceiling. Mustard oil additionally carries erucic acid and a pungent smell that suppresses intake. Keep to 2% and always mix into the grain, never pour on top.',
    capReasonUr: 'کھلا (غیر محفوظ) تیل — فائبر کے ذرات پر چڑھ جاتا ہے اور رومن کے فائبر ہضم کرنے والے جراثیم مار دیتا ہے، اس لیے دودھ کی چکنائی جلد گر جاتی ہے۔ سرسوں کے تیل میں اروسک ایسڈ اور تیز بو بھی ہے جو خوراک کم کر دیتی ہے۔ 2% تک رکھیں اور دانے میں اچھی طرح ملائیں۔',
    notesEn: 'Widely available across Punjab. Cheapest way to lift fat when bypass fat is unavailable — but far less rumen-safe.',
    notesUr: 'پنجاب بھر میں دستیاب۔ بائی پاس فیٹ نہ ملنے پر سستا متبادل — مگر رومن کے لیے کم محفوظ۔',
  },
  {
    key: 'sesame_oil', category: 'fat', icon: '🫗',
    nameEn: 'Sesame Oil (Til ka Tel)', nameUr: 'تل کا تیل',
    energyLevel: 'high', proteinLevel: 'low',
    dm: 100, cp: 0, me: 4.83, tdn: 182, adf: 0, ndf: 0, fat: 100, starch: 0,
    ca: 0, p: 0, ash: 0, price: 600, maxInclusion: 2,
    capReasonEn: 'Free oil — same rumen-fibre problem as any unprotected oil, so capped at 2%. Sesame oil is unusually oxidation-stable (natural sesamol/sesamin antioxidants) and palatable, but it is one of the most expensive fat sources per Mcal, so high inclusions are rarely economic.',
    capReasonUr: 'کھلا تیل — ہر غیر محفوظ تیل کی طرح رومن کی فائبر ہضم متاثر کرتا ہے، اس لیے 2% تک۔ تل کا تیل خراب ہونے میں دیر لگاتا ہے اور ذائقہ اچھا ہے، مگر فی توانائی سب سے مہنگا ہے۔',
    notesEn: 'Most oxidation-stable of the local oils — good shelf life in heat. Premium priced; South Punjab specialty.',
    notesUr: 'مقامی تیلوں میں سب سے دیرپا — گرمی میں خراب نہیں ہوتا۔ مہنگا؛ جنوبی پنجاب کی خصوصیت۔',
  },
  {
    // Taramira = Eruca sativa (rocket). A traditional rain-fed oilseed of
    // Punjab / Sindh; the oil is pungent and mostly non-food, so it reaches
    // feed markets cheaply.
    key: 'taramira_oil', category: 'fat', icon: '🌾',
    nameEn: 'Taramira Oil (Eruca sativa)', nameUr: 'تارامیرا کا تیل',
    energyLevel: 'high', proteinLevel: 'low',
    dm: 100, cp: 0, me: 4.83, tdn: 182, adf: 0, ndf: 0, fat: 100, starch: 0,
    ca: 0, p: 0, ash: 0, price: 400, maxInclusion: 2,
    capReasonEn: 'Free oil, plus the highest erucic-acid and glucosinolate load of any local oil — extremely pungent. Above 2% cattle refuse the feed outright, and the glucosinolate breakdown products affect the thyroid. Cheapest oil in the market precisely because of this.',
    capReasonUr: 'کھلا تیل، اور مقامی تیلوں میں اروسک ایسڈ اور گلوکوسینولیٹ سب سے زیادہ — بہت تیز بو۔ 2% سے زیادہ پر جانور کھانے سے انکار کر دیتا ہے، اور تھائیرائیڈ پر اثر پڑتا ہے۔ اسی وجہ سے سب سے سستا۔',
    notesEn: 'Rain-fed Punjab/Sindh oilseed. Cheapest oil available, but the most intake-limiting — introduce very gradually.',
    notesUr: 'بارانی پنجاب/سندھ کی فصل۔ سستا ترین تیل مگر خوراک سب سے زیادہ کم کرتا ہے — آہستہ آہستہ شامل کریں۔',
  },
  {
    key: 'linseed_oil', category: 'fat', icon: '🟣',
    nameEn: 'Linseed Oil (Alsi ka Tel)', nameUr: 'السی کا تیل',
    energyLevel: 'high', proteinLevel: 'low',
    dm: 100, cp: 0, me: 4.83, tdn: 182, adf: 0, ndf: 0, fat: 100, starch: 0,
    ca: 0, p: 0, ash: 0, price: 550, maxInclusion: 2,
    capReasonEn: 'Free oil, and ~55% of it is alpha-linolenic acid (omega-3). Polyunsaturated oils are the WORST for the rumen — they poison fibre-digesting bacteria faster than saturated fats and cause milk-fat depression at low inclusions. It also oxidises (goes rancid) within days in Pakistani heat. Hard 2% cap.',
    capReasonUr: 'کھلا تیل، اور تقریباً 55% اومیگا-3 (الفا لینولینک ایسڈ)۔ کثیر غیر سیر شدہ تیل رومن کے لیے سب سے زیادہ نقصان دہ — فائبر ہضم کرنے والے جراثیم تیزی سے مارتا ہے اور دودھ کی چکنائی کم کر دیتا ہے۔ گرمی میں چند دن میں خراب۔ سخت 2% حد۔',
    notesEn: 'Improves milk omega-3 and ghee colour, but store cool and use fast — shortest shelf life of any oil here.',
    notesUr: 'دودھ میں اومیگا-3 اور گھی کا رنگ بہتر کرتا ہے، مگر ٹھنڈی جگہ رکھیں اور جلد استعمال کریں۔',
  },
  {
    key: 'rice_bran_oil', category: 'fat', icon: '🟤',
    nameEn: 'Rice Bran Oil', nameUr: 'چاول کی بھوسی کا تیل',
    energyLevel: 'high', proteinLevel: 'low',
    dm: 100, cp: 0, me: 4.83, tdn: 182, adf: 0, ndf: 0, fat: 100, starch: 0,
    ca: 0, p: 0, ash: 0, price: 380, maxInclusion: 2.5,
    capReasonEn: 'Free oil — capped for the same rumen-fibre reason as the others, but slightly higher than the pungent oils because it is bland and does not depress intake. Naturally rich in oryzanol and vitamin E, which slows rancidity. Frequently adulterated in local markets — check before buying in bulk.',
    capReasonUr: 'کھلا تیل — دیگر تیلوں جیسی وجہ سے محدود، مگر بو نہ ہونے کی وجہ سے حد تھوڑی زیادہ۔ اوریزانول اور وٹامن E کی وجہ سے جلد خراب نہیں ہوتا۔ مقامی بازار میں ملاوٹ عام — خریدنے سے پہلے جانچ لیں۔',
    notesEn: 'Cheapest bland oil — no intake penalty, abundant from Pakistan\'s rice mills. Best free-oil choice for dairy.',
    notesUr: 'سستا اور بے بو تیل — جانور آسانی سے کھاتا ہے، چاول کی ملوں سے وافر۔ دودھ کے لیے بہترین کھلا تیل۔',
  },
  {
    key: 'canola_oil', category: 'fat', icon: '🌼',
    nameEn: 'Canola Oil', nameUr: 'کینولا کا تیل',
    energyLevel: 'high', proteinLevel: 'low',
    dm: 100, cp: 0, me: 4.83, tdn: 182, adf: 0, ndf: 0, fat: 100, starch: 0,
    ca: 0, p: 0, ash: 0, price: 480, maxInclusion: 2.5,
    capReasonEn: 'Free oil — same 2-3% rumen limit. Canola is the low-erucic-acid, low-glucosinolate improved rape variety, so unlike mustard or taramira oil it is bland and does not cut intake. Mostly monounsaturated, making it gentler on the rumen than linseed oil.',
    capReasonUr: 'کھلا تیل — وہی 2-3% رومن حد۔ کینولا بہتر قسم ہے جس میں اروسک ایسڈ اور گلوکوسینولیٹ کم ہیں، اس لیے سرسوں یا تارامیرا کے تیل کی طرح خوراک کم نہیں کرتا۔ زیادہ تر یک غیر سیر شدہ، رومن کے لیے السی سے بہتر۔',
    notesEn: 'Bland like rice bran oil but pricier. Gentler fatty-acid profile than linseed; good compromise choice.',
    notesUr: 'چاول کے تیل کی طرح بے بو مگر مہنگا۔ السی سے بہتر فیٹی ایسڈ پروفائل۔',
  },

  // =========================================================================
  //  SUPPLEMENTS & MINERALS  —  macro-minerals and rumen buffers
  // =========================================================================
  // These carry no protein and (except limestone/DCP's calcium) no energy —
  // they exist to close mineral gaps and stabilise rumen pH. Previously filed
  // under the 'fat' category; now their own bucket. Keys are unchanged.
  // =========================================================================
  {
    key: 'limestone', category: 'supplement', icon: '🪨',
    nameEn: 'Limestone (Choona Patthar)', nameUr: 'چونا پتھر',
    energyLevel: 'low', proteinLevel: 'low',
    dm: 98, cp: 0, me: 0, tdn: 0, adf: 0, ndf: 0, fat: 0, starch: 0,
    ca: 36, p: 0, ash: 95, price: 50, maxInclusion: 3,
    capReasonEn: '36% pure calcium — over 3% overwhelms absorption, raises milk-fever risk in dry cows (calcium dysregulation), and breaks Ca:P ratio (ideal 1.5:1 to 2:1).',
    capReasonUr: 'خالص کیلشیم 36% — 3% سے زیادہ ہاضمہ برداشت نہیں کرتا، خشک گائے میں دودھ بخار کا خطرہ، Ca:P توازن بگڑتا ہے۔',
    notesEn: 'Primary calcium supplement — 36% Ca. Typical inclusion 1-2%.',
    notesUr: 'بنیادی کیلشیم — 36% کیلشیم۔ عام طور پر 1-2% شامل کریں۔',
  },
  {
    key: 'dcp', category: 'supplement', icon: '💊',
    nameEn: 'DCP (Dicalcium Phosphate)', nameUr: 'ڈی سی پی',
    energyLevel: 'low', proteinLevel: 'low',
    dm: 96, cp: 0, me: 0, tdn: 0, adf: 0, ndf: 0, fat: 0, starch: 0,
    ca: 22, p: 18, ash: 92, price: 180, maxInclusion: 2,
    capReasonEn: 'Balanced Ca+P mineral but expensive. Over 2% is wasteful — excess is excreted, raising feed cost and environmental phosphorus pollution without benefit.',
    capReasonUr: 'کیلشیم اور فاسفورس دونوں، مگر مہنگا۔ 2% سے زیادہ ضائع — جسم سے نکل جاتا ہے، لاگت بڑھتی ہے، فاسفورس آلودگی۔',
    notesEn: 'Calcium + Phosphorus supplement — 22% Ca, 18% P. Use 0.5-1%.',
    notesUr: 'کیلشیم + فاسفورس — 22% Ca, 18% P۔ 0.5-1% شامل کریں۔',
  },
  {
    key: 'salt', category: 'supplement', icon: '🧂',
    nameEn: 'Salt (Namak)', nameUr: 'نمک',
    energyLevel: 'low', proteinLevel: 'low',
    dm: 99, cp: 0, me: 0, tdn: 0, adf: 0, ndf: 0, fat: 0, starch: 0,
    ca: 0, p: 0, ash: 99, price: 25, maxInclusion: 1,
    capReasonEn: 'Essential for sodium balance but over 1% makes the mix bitter — cattle refuse feed, water intake spikes, and milk yield can drop from reduced DMI.',
    capReasonUr: 'سوڈیم کے لیے ضروری، مگر 1% سے زیادہ ذائقہ نمکین — جانور کم کھاتا ہے، پانی زیادہ پیتا ہے، دودھ کم ہو سکتا ہے۔',
    notesEn: 'Essential — typical inclusion 0.5-1% of concentrate',
    notesUr: 'ضروری — 0.5-1% شامل کریں',
  },
  {
    key: 'sodium_bicarb', category: 'supplement', icon: '💎',
    nameEn: 'Sodium Bicarbonate (Meethoda)', nameUr: 'میٹھا سوڈا',
    energyLevel: 'low', proteinLevel: 'low',
    dm: 99, cp: 0, me: 0, tdn: 0, adf: 0, ndf: 0, fat: 0, starch: 0,
    ca: 0, p: 0, ash: 99, price: 120, maxInclusion: 2,
    capReasonEn: 'Rumen buffer — over 2% over-alkalinises the rumen (pH too high), paradoxically hurting fibre digestion and reducing microbial protein synthesis. Also expensive.',
    capReasonUr: 'رومن بفر — 2% سے زیادہ رومن بہت الکلائن ہو جاتا ہے، فائبر ہضم کم اور مائیکروبیل پروٹین کم۔ مہنگا بھی ہے۔',
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
 *
 * Custom (user-added) ingredients live in a separate localStorage store and
 * fall through to the built-in lookup. See `lib/customIngredients.ts`.
 */
export function getIngredient(key: string): Ingredient | undefined {
  const base = NUTRITION_DATA[key];
  if (base) {
    const override = getOverride(key);
    if (!override) return base;
    return { ...base, ...override };
  }
  // Not a built-in — fall back to the custom store (user-added ingredients).
  // Overrides also apply to custom ingredients so the editor stays usable.
  const custom = getCustomIngredient(key);
  if (!custom) return undefined;
  const override = getOverride(key);
  return override ? { ...custom, ...override } : custom;
}

/**
 * Always returns the unmodified default (ignores user overrides). For built-in
 * ingredients this is the hardcoded record; for custom ingredients the saved
 * values ARE the default.
 */
export function getDefaultIngredient(key: string): Ingredient | undefined {
  return NUTRITION_DATA[key] ?? getCustomIngredient(key);
}

/** All ingredients in a category — built-ins plus user-added customs. */
export function getIngredientsByCategory(category: IngredientCategory): Ingredient[] {
  const builtIn = INGREDIENTS.filter((i) => i.category === category);
  const custom  = getCustomIngredients().filter((i) => i.category === category);
  return [...builtIn, ...custom];
}

/** Convenience: just the keys for a category, in built-ins-then-customs order. */
export function getCategoryIngredientKeys(category: IngredientCategory): string[] {
  return getIngredientsByCategory(category).map((i) => i.key);
}

/** Every ingredient available right now — built-ins followed by user-added customs. */
export function getAllIngredients(): Ingredient[] {
  return [...INGREDIENTS, ...getCustomIngredients()];
}

/** Emoji icon for an ingredient key (with fallback). */
export function getIngredientIcon(key: string): string {
  return NUTRITION_DATA[key]?.icon ?? getCustomIngredient(key)?.icon ?? '🌾';
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
    titleEn: 'Fats & Oils',
    titleUr: 'چکنائی اور تیل',
    min: 0,
    ingredients: INGREDIENTS.filter((i) => i.category === 'fat').map((i) => i.key),
  },
  supplement: {
    titleEn: 'Supplements & Minerals',
    titleUr: 'سپلیمنٹس اور معدنیات',
    min: 0,
    ingredients: INGREDIENTS.filter((i) => i.category === 'supplement').map((i) => i.key),
  },
} as const;

/** Every category key, in the order Step 2 renders them. */
export const CATEGORY_KEYS = [
  'energy', 'protein', 'fiber', 'fat', 'supplement',
] as const satisfies readonly IngredientCategory[];

/**
 * A fresh, empty `chosenIngredients` map with every category bucket present.
 * Use this instead of hand-writing the object literal so adding a category in
 * future doesn't require touching each call site.
 */
export function emptyChosenIngredients(): Record<string, string[]> {
  return Object.fromEntries(CATEGORY_KEYS.map((k) => [k, [] as string[]]));
}

/**
 * Resolve which category currently owns an ingredient key.
 *
 * Goes through `getIngredient()` first because that handles built-ins AND
 * user-added custom ingredients; falls back to the static category lists.
 * Returns null for unknown keys so callers can decide how to handle them.
 */
export function categoryOfIngredient(key: string): IngredientCategory | null {
  const ing = getIngredient(key);
  if (ing) return ing.category;
  for (const catKey of CATEGORY_KEYS) {
    if (INGREDIENT_CATEGORIES[catKey].ingredients.includes(key)) return catKey;
  }
  return null;
}

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
  { id: 'dairy_cow',      icon: '🐄', image: '/images/animals/dairy_cow.jpg',      labelEn: 'Dairy Cow',           labelUr: 'دودھ والی گائے' },
  { id: 'dairy_buffalo',  icon: '🐃', image: '/images/animals/dairy_buffalo.jpg',  labelEn: 'Dairy Buffalo',       labelUr: 'دودھ والی بھینس' },
  { id: 'heifer',         icon: '🐄', image: '/images/animals/heifer.jpg',         labelEn: 'Heifer (Cow/Buffalo)', labelUr: 'بچھڑی (گائے/بھینس)' },
  { id: 'fattening_bull', icon: '🐂', image: '/images/animals/fattening_bull.jpg', labelEn: 'Fattening Bull',      labelUr: 'موٹا کرنے والا بیل' },
  { id: 'dairy_goat',     icon: '🐐', image: '/images/animals/dairy_goat.jpg',     labelEn: 'Dairy Goat',          labelUr: 'دودھ والی بکری' },
  { id: 'fattening_goat', icon: '🐐', image: '/images/animals/fattening_goat.jpg', labelEn: 'Fattening Goat',      labelUr: 'موٹا کرنے والی بکری' },
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
