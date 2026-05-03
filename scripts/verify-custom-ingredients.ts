// ================================================================================
// Verify the custom-ingredient end-to-end pipeline.
//
// What this proves:
//   1. saveCustomIngredient persists to (a polyfilled) localStorage
//   2. getIngredient(key) returns the custom record
//   3. getCategoryIngredientKeys(category) includes custom keys
//   4. autoFormulate() runs the LP with a mix of built-in + custom ingredients
//   5. removeCustomIngredient cleans up properly
//   6. generateUniqueKey avoids collisions
//
// Polyfills `window.localStorage` with an in-memory Map BEFORE any lib import,
// so the lib functions can run outside a browser.
//
// Run:  npx tsx scripts/verify-custom-ingredients.ts
// ================================================================================

// ── localStorage polyfill — must come BEFORE any lib import ─────────────────
const store = new Map<string, string>();
(globalThis as any).window = {
  localStorage: {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear:    () => { store.clear(); },
    key:      (i: number) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
  },
};

import { autoFormulate } from '../lib/autoFormulate';
import {
  getIngredient,
  getCategoryIngredientKeys,
  getAllIngredients,
  getNutritionRange,
  type Ingredient,
} from '../lib/constants';
import {
  saveCustomIngredient,
  getCustomIngredients,
  removeCustomIngredient,
  isCustomIngredient,
  generateUniqueKey,
} from '../lib/customIngredients';

let pass = 0;
let fail = 0;
const ok = (label: string, cond: boolean) => {
  if (cond) { console.log(`  ✅ ${label}`); pass += 1; }
  else      { console.log(`  ❌ ${label}`); fail += 1; }
};

// ── Test 1: save + retrieve ─────────────────────────────────────────────────
console.log('\n=== Test 1: save & retrieve a custom ingredient ===');

const farmMix: Ingredient = {
  key: 'farm_mix',
  category: 'protein',
  icon: '🥄',
  nameEn: 'Farm Mix',
  nameUr: 'فارم مکس',
  energyLevel: 'med',
  proteinLevel: 'high',
  dm: 90, cp: 35, me: 2.7, tdn: 75, adf: 12, ndf: 22, fat: 6, starch: 8,
  ca: 0.5, p: 0.7, ash: 6, price: 140, maxInclusion: 25,
  capReasonEn: 'User-defined.',
  capReasonUr: 'صارف کا اپنا جزو۔',
};

saveCustomIngredient(farmMix);

ok('getCustomIngredients() returns one entry',  getCustomIngredients().length === 1);
ok('isCustomIngredient("farm_mix") === true',   isCustomIngredient('farm_mix') === true);
ok('isCustomIngredient("corn")     === false',  isCustomIngredient('corn') === false);

const looked = getIngredient('farm_mix');
ok('getIngredient returns the custom record',   looked !== undefined);
ok('  → cp matches',     looked?.cp === 35);
ok('  → category right', looked?.category === 'protein');
ok('  → nameEn right',   looked?.nameEn === 'Farm Mix');

// ── Test 2: category list includes the custom ingredient ────────────────────
console.log('\n=== Test 2: getCategoryIngredientKeys includes custom ===');

const proteinKeys = getCategoryIngredientKeys('protein');
ok('protein keys include farm_mix', proteinKeys.includes('farm_mix'));
ok('still has built-in sbm',         proteinKeys.includes('sbm'));
ok('built-in count is unchanged',    proteinKeys.length >= 16); // 15 built-ins + 1 custom
console.log(`  protein category now has ${proteinKeys.length} ingredients`);

// ── Test 3: LP baseline (built-ins only) ────────────────────────────────────
console.log('\n=== Test 3: LP baseline — built-ins only ===');

const dairyMid = getNutritionRange('dairy_cow', 1);
ok('dairyMid range loaded', dairyMid !== null);

// Use the canonical feasible set from verify-autoformulate.mjs Scenario 1.
const BASELINE_KEYS = ['corn', 'wheat_bran', 'molasses', 'sbm', 'csm', 'canola_meal', 'limestone', 'dcp', 'salt'];
const baseline = autoFormulate({ ingredientKeys: BASELINE_KEYS, ranges: dairyMid! });
ok('baseline LP feasible', baseline.success === true);
if (baseline.success) {
  console.log(`  baseline cost: Rs ${baseline.cost} (Rs ${baseline.perKgPrice}/kg)`);
}

// ── Test 4: LP including the custom ingredient ──────────────────────────────
console.log('\n=== Test 4: LP with custom ingredient included ===');

const withCustom = autoFormulate({
  ingredientKeys: [...BASELINE_KEYS, 'farm_mix'],
  ranges: dairyMid!,
});
ok('LP feasible with custom included', withCustom.success === true);
if (withCustom.success) {
  console.log(`  cost with custom: Rs ${withCustom.cost} (Rs ${withCustom.perKgPrice}/kg)`);
  const kg = withCustom.quantities['farm_mix'] ?? 0;
  console.log(`  farm_mix used:    ${kg.toFixed(2)} kg`);
  ok('LP recognised farm_mix as a candidate', 'farm_mix' in withCustom.quantities);
  ok('farm_mix quantity is a finite number',  Number.isFinite(kg));
}

// ── Test 5: LP using the custom as the SOLE protein source ──────────────────
console.log('\n=== Test 5: LP with custom as the ONLY protein source ===');

// Save a high-CP, high-ME custom protein. Cap 35% gives the LP enough headroom
// to satisfy a demanding (early-lactation) protein target without needing any
// built-in oilcake.
saveCustomIngredient({
  ...farmMix,
  key: 'super_protein',
  nameEn: 'Super Protein Cake',
  cp: 45, me: 2.8, tdn: 78, ndf: 16, fat: 4, ca: 0.3, p: 0.6, price: 200, maxInclusion: 35,
  proteinLevel: 'high',
});

// Dairy cow EARLY lactation (CP 20-22, ME 2.80-3.10, Ca 0.9-1.2) — the highest-
// demand stage. If the LP can hit these targets using a custom protein as the
// sole oilcake equivalent, the integration definitely works.
const dairyEarly = getNutritionRange('dairy_cow', 0)!;

const customOnly = autoFormulate({
  ingredientKeys: ['corn', 'wheat_bran', 'molasses', 'super_protein', 'limestone', 'dcp', 'salt'],
  ranges: dairyEarly,
});
ok('LP feasible with custom as sole protein', customOnly.success === true);
if (customOnly.success) {
  const kg = customOnly.quantities['super_protein'] ?? 0;
  console.log(`  super_protein used: ${kg.toFixed(2)} kg`);
  ok('super_protein actually utilised', kg > 0);

  // Verify the achieved CP% sits inside the target window — using the
  // custom-supplied CP value confirms the LP read it from getIngredient().
  const totalDM = Object.entries(customOnly.quantities).reduce((acc, [k, q]) => {
    const i = getIngredient(k);
    return acc + q * (i ? i.dm / 100 : 0);
  }, 0);
  const cpKg = Object.entries(customOnly.quantities).reduce((acc, [k, q]) => {
    const i = getIngredient(k);
    return acc + q * (i ? i.dm / 100 : 0) * (i?.cp ?? 0);
  }, 0);
  const cpPct = cpKg / totalDM;
  console.log(`  achieved CP%: ${cpPct.toFixed(2)} (target ${dairyEarly.protein.min}-${dairyEarly.protein.max})`);
  ok('CP target met using custom-supplied protein',
    cpPct >= dairyEarly.protein.min - 0.01 && cpPct <= dairyEarly.protein.max + 0.01);
}

// ── Test 6: removeCustomIngredient cleans up ────────────────────────────────
console.log('\n=== Test 6: removeCustomIngredient ===');

removeCustomIngredient('farm_mix');
ok('farm_mix gone after delete',         getIngredient('farm_mix') === undefined);
ok('isCustomIngredient now false',       !isCustomIngredient('farm_mix'));
ok('super_protein still present',        getIngredient('super_protein') !== undefined);
ok('protein category dropped farm_mix',  !getCategoryIngredientKeys('protein').includes('farm_mix'));

// ── Test 7: generateUniqueKey collision-avoidance ───────────────────────────
console.log('\n=== Test 7: generateUniqueKey ===');

const taken = new Set(getAllIngredients().map((i) => i.key));
ok('Plain "Farm Mash" → farm_mash',      generateUniqueKey('Farm Mash', taken) === 'farm_mash');
taken.add('farm_mash');
ok('Collision → farm_mash_2',            generateUniqueKey('Farm Mash', taken) === 'farm_mash_2');
ok('Empty name → "custom"',              generateUniqueKey('', taken) === 'custom');
ok('Punctuation gets stripped',          generateUniqueKey('My!@# Special  Mix', taken) === 'my_special_mix');

// ── Test 8: built-in lookup still works (regression) ────────────────────────
console.log('\n=== Test 8: built-in lookup unaffected by custom store ===');

ok('corn still resolves',          getIngredient('corn') !== undefined);
ok('corn.cp still 9',              getIngredient('corn')?.cp === 9);
ok('isCustom("corn") is false',    !isCustomIngredient('corn'));
ok('isCustom("urea") is false',    !isCustomIngredient('urea'));

// ────────────────────────────────────────────────────────────────────────────
console.log(`\n──────  ${pass} passed · ${fail} failed  ──────\n`);
process.exit(fail === 0 ? 0 : 1);
