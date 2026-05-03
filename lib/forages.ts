// ================================================================================
// FORAGE INGREDIENT REGISTRY (TMR-only)
// ================================================================================
// Forages are the roughage half of a Total Mixed Ration (TMR) — fresh greens,
// silages, hay and straw. They are NEVER shown in the concentrate-only
// calculator (which lives in components/nutrition-calculator/), because
// concentrate formulation assumes forage is fed separately.
//
// The shape mirrors `Ingredient` from lib/constants.ts so the same DM-basis
// math, the same LP solver, and the same UI primitives can consume both with
// no special-casing.
//
// >>> TO ADD A NEW FORAGE <<<
// Append to FORAGES[]. Subcategory determines which tab in the TMR ingredient
// picker it lives in: 'fresh' | 'silage' | 'dry'.
//
// Values are on DRY MATTER (DM) basis — see lib/constants.ts for the rationale.
// Sources: Feedipedia, NRC Dairy 2001/2021, NRC Beef 2016, NRC Small Ruminants
// 2007, PARC (Pakistan Agricultural Research Council) regional averages.
// ================================================================================

import type { Ingredient, IngredientCategory } from './constants';
import { getIngredient, getCategoryIngredientKeys } from './constants';

/** Sub-category within "forage". Drives which tab a forage shows up in. */
export type ForageSubcategory = 'fresh' | 'silage' | 'dry';

/**
 * Widened ingredient type used by the TMR calculator. The `category` field
 * is widened to include 'forage' so a single typed list can carry both forages
 * and concentrates without unsafe casts. Concentrate-only code continues to
 * use the narrower `Ingredient` type — it never sees a 'forage' value.
 */
export type AnyIngredient = Omit<Ingredient, 'category'> & {
  category: IngredientCategory | 'forage';
};

export interface Forage extends Omit<Ingredient, 'category'> {
  /** Always 'forage' — distinguishes from concentrate categories. */
  category: 'forage';
  /** Tab in the TMR ingredient picker. */
  subcategory: ForageSubcategory;
}

// ────────────────────────────────────────────────────────────────────────────
// MASTER FORAGE LIST
// ────────────────────────────────────────────────────────────────────────────
export const FORAGES: Forage[] = [
  // ─────── FRESH GREEN FODDERS ───────
  {
    key: 'berseem_fresh', category: 'forage', subcategory: 'fresh', icon: '🌱',
    nameEn: 'Berseem (Egyptian Clover)', nameUr: 'برسیم',
    energyLevel: 'med', proteinLevel: 'high',
    dm: 18, cp: 18, me: 2.40, tdn: 63, adf: 28, ndf: 38, fat: 2.5, starch: 1,
    ca: 1.40, p: 0.30, ash: 12, price: 8, maxInclusion: 70,
    capReasonEn: 'Highly palatable winter fodder — over 70% of the diet can cause bloat (frothy gas) due to high soluble protein and saponins. Always wilt for 1-2 hours before feeding to reduce risk.',
    capReasonUr: 'سردیوں کا پسندیدہ چارہ — 70% سے زیادہ پر اپھارا (بلوٹ) کا خطرہ، گھلنشیل پروٹین اور سیپونن کی وجہ سے۔ دینے سے پہلے 1-2 گھنٹے مرجھانے دیں۔',
    notesEn: 'Punjab winter staple — Oct to April. Very high CP (18%) and Ca (1.4%).',
    notesUr: 'پنجاب کا سردیوں کا اہم چارہ (اکتوبر تا اپریل)۔ پروٹین اور کیلشیم زیادہ۔',
  },
  {
    key: 'alfalfa_fresh', category: 'forage', subcategory: 'fresh', icon: '🍀',
    nameEn: 'Alfalfa / Lucerne (Fresh)', nameUr: 'لوسرن (تازہ)',
    energyLevel: 'med', proteinLevel: 'high',
    dm: 20, cp: 19, me: 2.40, tdn: 62, adf: 30, ndf: 42, fat: 2.5, starch: 1,
    ca: 1.50, p: 0.28, ash: 11, price: 10, maxInclusion: 60,
    capReasonEn: 'Bloat risk above 60% — same saponin/soluble-protein issue as berseem. Less seasonal than berseem (year-round in irrigated areas) but slightly less palatable.',
    capReasonUr: '60% سے زیادہ پر اپھارا کا خطرہ — برسیم جیسا مسئلہ۔ سال بھر دستیاب (سیراب علاقوں میں) مگر برسیم سے کم پسندیدہ۔',
    notesEn: 'Year-round leguminous green — perennial. High CP, high Ca.',
    notesUr: 'سال بھر دستیاب پھلی دار چارہ — کئی سال چلتا ہے۔',
  },
  {
    key: 'maize_fodder_fresh', category: 'forage', subcategory: 'fresh', icon: '🌽',
    nameEn: 'Maize Fodder (Fresh)', nameUr: 'مکئی کا چارہ',
    energyLevel: 'med', proteinLevel: 'low',
    dm: 22, cp: 9, me: 2.20, tdn: 60, adf: 28, ndf: 55, fat: 2.5, starch: 12,
    ca: 0.35, p: 0.25, ash: 6, price: 6, maxInclusion: 70,
    capReasonEn: 'Low protein (9%) — over 70% in diet means CP target hard to meet without heavy oilcake supplementation. Watch for nitrate accumulation if heavily fertilised.',
    capReasonUr: 'پروٹین کم (9%) — 70% سے زیادہ پر پروٹین کے ہدف مشکل۔ زیادہ کھاد والی فصل میں نائٹریٹ خطرہ۔',
    notesEn: 'Summer staple (Apr–Sep). Cut at flowering for best yield × quality balance.',
    notesUr: 'گرمیوں کا اہم چارہ (اپریل تا ستمبر)۔ پھول آنے پر کاٹیں۔',
  },
  {
    key: 'jowar_fodder_fresh', category: 'forage', subcategory: 'fresh', icon: '🌾',
    nameEn: 'Jowar / Sorghum Fodder (Fresh)', nameUr: 'جوار کا چارہ',
    energyLevel: 'low', proteinLevel: 'low',
    dm: 23, cp: 9, me: 2.00, tdn: 58, adf: 35, ndf: 60, fat: 2.0, starch: 8,
    ca: 0.40, p: 0.22, ash: 6, price: 6, maxInclusion: 60,
    capReasonEn: 'Young sorghum (<60 cm) contains dhurrin — releases hydrocyanic acid (HCN) and can poison cattle. Always wait until plant exceeds 60 cm OR fully bloomed before grazing/cutting.',
    capReasonUr: 'چھوٹے پودے (60 سینٹی میٹر سے کم) میں ڈھرین — ہائیڈروسائنک ایسڈ بنتا ہے، مویشی کو زہر۔ ہمیشہ پودا 60 سینٹی میٹر سے بڑا ہونے کے بعد کاٹیں۔',
    notesEn: 'Drought-tolerant summer fodder. Avoid feeding young plants (HCN risk).',
    notesUr: 'خشک سالی برداشت کرنے والا گرمیوں کا چارہ۔ چھوٹے پودے نہ دیں۔',
  },
  {
    key: 'oats_fodder_fresh', category: 'forage', subcategory: 'fresh', icon: '🌿',
    nameEn: 'Oats Fodder (Jawi)', nameUr: 'جئی کا چارہ',
    energyLevel: 'med', proteinLevel: 'med',
    dm: 18, cp: 13, me: 2.20, tdn: 60, adf: 30, ndf: 50, fat: 2.5, starch: 5,
    ca: 0.40, p: 0.30, ash: 8, price: 8, maxInclusion: 70,
    capReasonEn: 'Cool-season alternative to berseem. Lower bloat risk (less saponin) but lower CP too — works best when blended with berseem or alfalfa.',
    capReasonUr: 'برسیم کا متبادل سردیوں کا چارہ۔ اپھارا کا خطرہ کم مگر پروٹین بھی کم — برسیم/لوسرن کے ساتھ ملا کر دینا بہتر۔',
    notesEn: 'Sown Oct–Nov, harvested Feb–Mar. Mid-quality CP, good palatability.',
    notesUr: 'اکتوبر-نومبر میں بویا، فروری-مارچ میں کاٹا جاتا ہے۔',
  },
  {
    key: 'bajra_fodder_fresh', category: 'forage', subcategory: 'fresh', icon: '🟡',
    nameEn: 'Bajra / Pearl Millet Fodder (Fresh)', nameUr: 'باجرہ کا چارہ',
    energyLevel: 'low', proteinLevel: 'low',
    dm: 20, cp: 9, me: 2.00, tdn: 58, adf: 35, ndf: 58, fat: 2.0, starch: 7,
    ca: 0.40, p: 0.25, ash: 6, price: 6, maxInclusion: 60,
    capReasonEn: 'Heat- and drought-tolerant. Quality drops sharply after heading — cut early for best digestibility. Tannin content can mildly suppress protein digestibility above 60%.',
    capReasonUr: 'گرمی اور خشک سالی برداشت۔ بال آنے کے بعد معیار تیزی سے گرتا ہے — جلدی کاٹیں۔ ٹینن 60% سے زیادہ پر پروٹین ہضم کم کرتا ہے۔',
    notesEn: 'Best for low-rainfall areas (Sindh, southern Punjab). Cut before heading.',
    notesUr: 'کم بارش والے علاقوں کے لیے بہترین (سندھ، جنوبی پنجاب)۔',
  },

  // ─────── SILAGES ───────
  {
    key: 'maize_silage', category: 'forage', subcategory: 'silage', icon: '🥫',
    nameEn: 'Maize / Corn Silage', nameUr: 'مکئی کا سائلج',
    energyLevel: 'med', proteinLevel: 'low',
    dm: 30, cp: 8, me: 2.40, tdn: 65, adf: 28, ndf: 48, fat: 3.0, starch: 25,
    ca: 0.30, p: 0.22, ash: 5, price: 12, maxInclusion: 70,
    capReasonEn: 'Highest-energy forage option (25% starch from grain) — over 70% pushes diet starch too high and concentrate slot becomes redundant. Ensure proper fermentation pH (≤4.2) to avoid mycotoxin growth.',
    capReasonUr: 'سب سے زیادہ توانائی والا چارہ (25% نشاستہ) — 70% سے زیادہ پر کانسنٹریٹ کی ضرورت ختم ہو جاتی ہے۔ مناسب خمیرہ (pH 4.2 سے کم) یقینی بنائیں۔',
    notesEn: 'Year-round storage. Provides energy + fibre simultaneously — gold standard for high-yielders.',
    notesUr: 'سال بھر ذخیرہ۔ توانائی اور فائبر دونوں — زیادہ دودھ والی گائے کے لیے بہترین۔',
  },
  {
    key: 'jowar_silage', category: 'forage', subcategory: 'silage', icon: '🟫',
    nameEn: 'Jowar / Sorghum Silage', nameUr: 'جوار کا سائلج',
    energyLevel: 'low', proteinLevel: 'low',
    dm: 28, cp: 8, me: 2.20, tdn: 58, adf: 35, ndf: 55, fat: 2.5, starch: 18,
    ca: 0.40, p: 0.20, ash: 7, price: 10, maxInclusion: 65,
    capReasonEn: 'Cheaper alternative to maize silage but ~10% less energy and starch. Tannins may persist in red varieties — choose white/grain sorghum for silage.',
    capReasonUr: 'مکئی کے سائلج کا سستا متبادل، مگر تقریباً 10% کم توانائی۔ سرخ اقسام میں ٹینن — سفید جوار بہتر۔',
    notesEn: 'Drought regions where maize is too thirsty. Use sweet/grain sorghum varieties.',
    notesUr: 'خشک علاقوں کے لیے جہاں مکئی ممکن نہ ہو۔',
  },

  // ─────── DRY (HAY / STRAW) ───────
  {
    key: 'alfalfa_hay', category: 'forage', subcategory: 'dry', icon: '🟢',
    nameEn: 'Alfalfa / Lucerne Hay', nameUr: 'لوسرن کی گھاس',
    energyLevel: 'med', proteinLevel: 'high',
    dm: 88, cp: 18, me: 2.20, tdn: 60, adf: 32, ndf: 42, fat: 2.0, starch: 1,
    ca: 1.40, p: 0.25, ash: 10, price: 25, maxInclusion: 50,
    capReasonEn: 'Premium dry forage — but sun-dried alfalfa loses ~15% leaf shatter, so CP drops vs fresh. Over 50% reduces palatability and chewing time (cattle prefer fresh greens).',
    capReasonUr: 'اعلی معیار خشک چارہ — مگر سورج میں خشک کرنے سے پتے جھڑتے ہیں، پروٹین گرتی ہے۔ 50% سے زیادہ پر جانور کم کھاتا ہے۔',
    notesEn: 'Year-round availability after drying. Buy 2nd or 3rd cut for best leaf retention.',
    notesUr: 'خشک کرنے کے بعد سال بھر دستیاب۔ دوسرا یا تیسرا کٹاؤ بہترین۔',
  },
  {
    key: 'berseem_hay', category: 'forage', subcategory: 'dry', icon: '🍃',
    nameEn: 'Berseem Hay', nameUr: 'برسیم کی گھاس',
    energyLevel: 'low', proteinLevel: 'high',
    dm: 88, cp: 16, me: 2.00, tdn: 58, adf: 36, ndf: 50, fat: 2.0, starch: 1,
    ca: 1.50, p: 0.25, ash: 11, price: 22, maxInclusion: 50,
    capReasonEn: 'Dehydrated berseem — leaf shatter is severe (berseem is leafier than alfalfa). Stems become brittle and indigestible portion rises — over 50% adds gut fill without nutrition.',
    capReasonUr: 'خشک برسیم — پتے زیادہ جھڑتے ہیں، تنا کھردرا اور کم ہضم۔ 50% سے زیادہ پر پیٹ بھرتا ہے مگر غذائیت کم۔',
    notesEn: 'Less common than alfalfa hay in Pakistan due to leaf shatter; mostly for smallholders.',
    notesUr: 'پاکستان میں لوسرن گھاس سے کم مقبول۔',
  },
  {
    key: 'wheat_straw', category: 'forage', subcategory: 'dry', icon: '🌾',
    nameEn: 'Wheat Straw (Bhusa / Turi)', nameUr: 'گندم کا بھوسہ',
    energyLevel: 'low', proteinLevel: 'low',
    dm: 89, cp: 4, me: 1.40, tdn: 42, adf: 50, ndf: 78, fat: 1.5, starch: 1,
    ca: 0.30, p: 0.10, ash: 8, price: 10, maxInclusion: 35,
    capReasonEn: 'Filler roughage only — 78% NDF and barely 4% CP means it dilutes the ration heavily. Above 35% the cow physically can\'t eat enough DM to meet energy and protein needs.',
    capReasonUr: 'صرف بھرنے کا چارہ — 78% فائبر اور 4% پروٹین۔ 35% سے زیادہ پر جانور کافی DM نہیں کھا سکتا۔',
    notesEn: 'Pakistan\'s most abundant roughage. Treat with urea + molasses to boost N digestibility.',
    notesUr: 'پاکستان کا سب سے عام چارہ۔ یوریا اور شیرہ سے علاج کر کے معیار بہتر بنائیں۔',
  },
  {
    key: 'rice_straw', category: 'forage', subcategory: 'dry', icon: '🟤',
    nameEn: 'Rice Straw', nameUr: 'چاول کا بھوسہ',
    energyLevel: 'low', proteinLevel: 'low',
    dm: 90, cp: 4, me: 1.30, tdn: 40, adf: 52, ndf: 76, fat: 1.5, starch: 1,
    ca: 0.30, p: 0.10, ash: 18, price: 8, maxInclusion: 30,
    capReasonEn: 'Even lower quality than wheat straw — 18% ash (silica) further blocks digestibility. Useful only as drought emergency feed or when heavily processed (chopped + treated).',
    capReasonUr: 'گندم کے بھوسے سے بھی کم معیار — 18% راکھ (سلیکا) ہاضمے کو روکتی ہے۔ صرف خشک سالی میں یا اچھی پروسیسنگ کے بعد۔',
    notesEn: 'Use only when wheat straw unavailable. Always chop and treat with urea/molasses.',
    notesUr: 'صرف جب گندم کا بھوسہ نہ ملے۔ ہمیشہ کاٹ کر اور یوریا/شیرہ کے ساتھ دیں۔',
  },
];

// ────────────────────────────────────────────────────────────────────────────
// LOOKUP HELPERS
// ────────────────────────────────────────────────────────────────────────────

const FORAGE_BY_KEY: Record<string, Forage> = Object.fromEntries(
  FORAGES.map((f) => [f.key, f]),
);

/** Returns the forage record for a key, or undefined. */
export function getForage(key: string): Forage | undefined {
  return FORAGE_BY_KEY[key];
}

/** True if the key belongs to a forage (vs a concentrate or custom). */
export function isForage(key: string): boolean {
  return FORAGE_BY_KEY[key] !== undefined;
}

/**
 * UNIFIED LOOKUP for the TMR calculator.
 *
 * Returns forage records first, then falls through to the concentrate
 * registry (built-ins + user customs). Keys are unique across both registries
 * so the order doesn't matter — but we check forages first for speed since
 * the TMR calculator deals with them most often.
 *
 * Returned shape is `AnyIngredient` (widened category) so a single typed list
 * can carry both forages and concentrates. The math (DM-basis calculations,
 * LP solver) only reads numeric fields and works unchanged.
 */
export function getAnyIngredient(key: string): AnyIngredient | undefined {
  const f = FORAGE_BY_KEY[key];
  if (f) {
    // Strip the forage-only `subcategory` field — AnyIngredient doesn't carry it.
    const { subcategory: _ignored, ...rest } = f;
    return rest;
  }
  return getIngredient(key);
}

/** All forage keys in a given subcategory ('fresh' | 'silage' | 'dry'). */
export function getForageKeysBySubcategory(sub: ForageSubcategory): string[] {
  return FORAGES.filter((f) => f.subcategory === sub).map((f) => f.key);
}

/** All concentrate keys (just delegates to constants.ts), grouped or flat. */
export function getAllConcentrateKeys(): string[] {
  return [
    ...getCategoryIngredientKeys('energy'),
    ...getCategoryIngredientKeys('protein'),
    ...getCategoryIngredientKeys('fiber'),
    ...getCategoryIngredientKeys('fat'),
  ];
}
