// ================================================================================
// Verify the custom-ingredient end-to-end pipeline.
//
// What this proves:
//   1. saveCustomIngredient persists to localStorage
//   2. getIngredient(key) returns the custom record (not undefined)
//   3. getCategoryIngredientKeys(category) includes custom keys
//   4. autoFormulate() runs the LP with a mix of built-in + custom ingredients
//   5. removeCustomIngredient cleans up properly
//
// Polyfills localStorage with an in-memory Map so the lib/ functions can run
// outside the browser. The lib code is compiled on the fly via tsx.
//
// Run:  node scripts/verify-custom-ingredients.mjs
// ================================================================================

// In-memory localStorage polyfill — must be set BEFORE importing any lib code.
const store = new Map();
globalThis.window = {
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, v); },
    removeItem: (k) => { store.delete(k); },
    clear: () => { store.clear(); },
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
  },
};

// tsx makes TS files importable from .mjs
const { register } = await import('tsx/esm/api');
const unregister = register();

const { autoFormulate } = await import('../lib/autoFormulate.ts');
const {
  getIngredient,
  getCategoryIngredientKeys,
  getAllIngredients,
  getNutritionRange,
} = await import('../lib/constants.ts');
const {
  saveCustomIngredient,
  getCustomIngredients,
  removeCustomIngredient,
  isCustomIngredient,
  generateUniqueKey,
} = await import('../lib/customIngredients.ts');

unregister();

let pass = 0, fail = 0;
const ok = (label, cond) => {
  if (cond) { console.log(`  ✅ ${label}`); pass++; }
  else { console.log(`  ❌ ${label}`); fail++; }
};

// ────────────────────────────────────────────────────────────────────────────
// Test 1: save + retrieve a custom ingredient
// ────────────────────────────────────────────────────────────────────────────
console.log('\n=== Test 1: save & retrieve a custom ingredient ===');

const farmMix = {
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

ok('getCustomIngredients() returns one entry', getCustomIngredients().length === 1);
ok('isCustomIngredient("farm_mix") === true', isCustomIngredient('farm_mix') === true);
ok('isCustomIngredient("corn") === false', isCustomIngredient('corn') === false);

const looked = getIngredient('farm_mix');
ok('getIngredient returns the custom record', looked !== undefined);
ok('  → cp matches',    looked?.cp === 35);
ok('  → category right', looked?.category === 'protein');
ok('  → nameEn right',   looked?.nameEn === 'Farm Mix');

// ────────────────────────────────────────────────────────────────────────────
// Test 2: category list includes the custom key
// ────────────────────────────────────────────────────────────────────────────
console.log('\n=== Test 2: getCategoryIngredientKeys includes custom ===');

const proteinKeys = getCategoryIngredientKeys('protein');
ok('protein keys include farm_mix', proteinKeys.includes('farm_mix'));
ok('still has built-in sbm',         proteinKeys.includes('sbm'));
ok('built-in count is unchanged',    proteinKeys.length >= 16); // 15 built-in + 1 custom

console.log(`  protein category now has ${proteinKeys.length} ingredients`);

// ────────────────────────────────────────────────────────────────────────────
// Test 3: autoFormulate WITHOUT the custom ingredient (baseline)
// ────────────────────────────────────────────────────────────────────────────
console.log('\n=== Test 3: LP baseline — built-ins only ===');

const dairyMid = getNutritionRange('dairy_cow', 1); // mid lactation
ok('dairyMid range loaded', dairyMid !== null);

const baseline = autoFormulate({
  ingredientKeys: ['corn', 'wheat_bran', 'molasses', 'csm', 'limestone', 'salt'],
  ranges: dairyMid,
});
ok('baseline LP feasible', baseline.success === true);
console.log(`  baseline cost: Rs ${baseline.cost} (Rs ${baseline.perKgPrice}/kg)`);

// ────────────────────────────────────────────────────────────────────────────
// Test 4: autoFormulate WITH the custom ingredient — must accept it
// ────────────────────────────────────────────────────────────────────────────
console.log('\n=== Test 4: LP with custom ingredient included ===');

const withCustom = autoFormulate({
  ingredientKeys: ['corn', 'wheat_bran', 'molasses', 'csm', 'limestone', 'salt', 'farm_mix'],
  ranges: dairyMid,
});
ok('LP feasible with custom included', withCustom.success === true);
if (withCustom.success) {
  console.log(`  cost with custom: Rs ${withCustom.cost} (Rs ${withCustom.perKgPrice}/kg)`);
  const farmMixUsed = withCustom.quantities['farm_mix'] ?? 0;
  console.log(`  farm_mix used:    ${farmMixUsed.toFixed(2)} kg`);
  ok('LP recognised farm_mix as a candidate', 'farm_mix' in withCustom.quantities);
  // It might or might not be selected — depends on price economics. Just verify
  // the LP didn't crash and returned a number for it.
  ok('farm_mix quantity is a finite number', Number.isFinite(farmMixUsed));
}

// ────────────────────────────────────────────────────────────────────────────
// Test 5: autoFormulate using ONLY a custom ingredient (forced-use scenario)
// ────────────────────────────────────────────────────────────────────────────
console.log('\n=== Test 5: LP with custom as the ONLY protein source ===');

// Save a protein-rich custom ingredient so the LP can find a feasible mix
saveCustomIngredient({
  ...farmMix,
  key: 'super_protein',
  nameEn: 'Super Protein Cake',
  cp: 50, me: 3.0, tdn: 82, fat: 4, ca: 0.3, p: 0.6, price: 200, maxInclusion: 30,
  proteinLevel: 'high',
});

const customOnly = autoFormulate({
  ingredientKeys: ['corn', 'wheat_bran', 'molasses', 'super_protein', 'limestone', 'salt'],
  ranges: dairyMid,
});
ok('LP feasible with custom as sole protein', customOnly.success === true);
if (customOnly.success) {
  const usedKg = customOnly.quantities['super_protein'] ?? 0;
  console.log(`  super_protein used: ${usedKg.toFixed(2)} kg`);
  ok('super_protein is actually utilised', usedKg > 0);
}

// ────────────────────────────────────────────────────────────────────────────
// Test 6: removeCustomIngredient cleans up
// ────────────────────────────────────────────────────────────────────────────
console.log('\n=== Test 6: removeCustomIngredient ===');

removeCustomIngredient('farm_mix');
ok('farm_mix gone after delete',         getIngredient('farm_mix') === undefined);
ok('isCustomIngredient now false',       !isCustomIngredient('farm_mix'));
ok('super_protein still present',        getIngredient('super_protein') !== undefined);
ok('protein category dropped farm_mix',  !getCategoryIngredientKeys('protein').includes('farm_mix'));

// ────────────────────────────────────────────────────────────────────────────
// Test 7: generateUniqueKey collision-avoidance
// ────────────────────────────────────────────────────────────────────────────
console.log('\n=== Test 7: generateUniqueKey ===');

const taken = new Set(getAllIngredients().map((i) => i.key));
ok('Plain "Farm Mash" → farm_mash',  generateUniqueKey('Farm Mash', taken) === 'farm_mash');
taken.add('farm_mash');
ok('Collision → farm_mash_2',        generateUniqueKey('Farm Mash', taken) === 'farm_mash_2');
ok('Empty name → "custom"',          generateUniqueKey('', taken) === 'custom');
ok('Punctuation gets stripped',      generateUniqueKey('My!@# Special  Mix', taken) === 'my_special_mix');

// ────────────────────────────────────────────────────────────────────────────
console.log(`\n──────  ${pass} passed · ${fail} failed  ──────\n`);
process.exit(fail === 0 ? 0 : 1);
