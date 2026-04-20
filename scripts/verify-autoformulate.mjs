// Runtime verification of the Auto-Formulate LP solver.
// Run:  node scripts/verify-autoformulate.mjs
//
// Four scenarios:
//   1. Happy path — dairy cow mid lactation, rich ingredient set.
//   2. Infeasible  — only Corn + Molasses + Limestone (no real protein).
//   3. Lock — lock 30 kg corn + 8 kg molasses, optimise rest.
//   4. Lock conflict — lock 60 kg corn + 60 kg SBM (total 120 kg > 100 kg batch).

import solver from 'javascript-lp-solver';

// ── Trimmed ingredient data (mirrors lib/constants.ts) ──────────────────────
const INGS = {
  corn:         { dm: 89, cp: 9,  me: 3.25, tdn: 88, adf: 4, ndf: 12, fat: 4,  starch: 70, ca: 0.03, p: 0.28, ash: 1.3, price: 102, maxInclusion: 50 },
  wheat_bran:   { dm: 87, cp: 16, me: 2.63, tdn: 68, adf: 13, ndf: 45, fat: 4,  starch: 22, ca: 0.13, p: 1.10, ash: 6,   price: 75,  maxInclusion: 30 },
  molasses:     { dm: 75, cp: 4,  me: 2.29, tdn: 75, adf: 0,  ndf: 0,  fat: 0,  starch: 0,  ca: 1.00, p: 0.06, ash: 11,  price: 75,  maxInclusion: 10 },
  sbm:          { dm: 89, cp: 46, me: 3.18, tdn: 84, adf: 7,  ndf: 13, fat: 2,  starch: 6,  ca: 0.27, p: 0.65, ash: 6.5, price: 300, maxInclusion: 30 },
  csm:          { dm: 90, cp: 38, me: 2.50, tdn: 72, adf: 18, ndf: 28, fat: 2,  starch: 5,  ca: 0.15, p: 1.00, ash: 6,   price: 150, maxInclusion: 25 },
  canola_meal:  { dm: 90, cp: 36, me: 2.70, tdn: 67, adf: 17, ndf: 27, fat: 4,  starch: 10, ca: 0.75, p: 1.10, ash: 6.5, price: 180, maxInclusion: 20 },
  limestone:    { dm: 98, cp: 0,  me: 0,    tdn: 0,  adf: 0,  ndf: 0,  fat: 0,  starch: 0,  ca: 36,   p: 0,    ash: 95,  price: 50,  maxInclusion: 3  },
  dcp:          { dm: 96, cp: 0,  me: 0,    tdn: 0,  adf: 0,  ndf: 0,  fat: 0,  starch: 0,  ca: 22,   p: 18,   ash: 92,  price: 180, maxInclusion: 2  },
  salt:         { dm: 99, cp: 0,  me: 0,    tdn: 0,  adf: 0,  ndf: 0,  fat: 0,  starch: 0,  ca: 0,    p: 0,    ash: 99,  price: 25,  maxInclusion: 1  },
};

const CONSTRAINED = [
  { key: 'protein',    field: 'cp'  },
  { key: 'energy',     field: 'me'  },
  { key: 'tdn',        field: 'tdn' },
  { key: 'fiber',      field: 'ndf' },
  { key: 'fat',        field: 'fat' },
  { key: 'calcium',    field: 'ca'  },
  { key: 'phosphorus', field: 'p'   },
];

function runScenario(label, ingredientKeys, ranges, { batchSize = 100, locks = {}, mode = 'min_cost' } = {}) {
  console.log(`\n=== ${label} ===`);

  const variables = {};
  const constraints = { total: { equal: batchSize } };
  for (const c of CONSTRAINED) {
    constraints[`${c.key}_min`] = { min: 0 };
    constraints[`${c.key}_max`] = { max: 0 };
  }
  for (const k of ingredientKeys) {
    const capKg = (INGS[k].maxInclusion / 100) * batchSize;
    constraints[`cap_${k}`] = { max: capKg };
  }
  for (const [k, lockedKg] of Object.entries(locks)) {
    if (ingredientKeys.includes(k)) {
      constraints[`lock_${k}`] = { equal: lockedKg };
    }
  }

  for (const k of ingredientKeys) {
    const ing = INGS[k];
    const dm = ing.dm / 100;
    const coef = {
      total: 1,
      cost: ing.price,
      cp_total: dm * ing.cp,
      me_total: dm * ing.me,
    };
    for (const c of CONSTRAINED) {
      const value = ing[c.field];
      const bound = ranges[c.key];
      coef[`${c.key}_min`] = dm * (value - bound.min);
      coef[`${c.key}_max`] = dm * (value - bound.max);
    }
    coef[`cap_${k}`] = 1;
    if (locks[k] !== undefined) coef[`lock_${k}`] = 1;
    variables[k] = coef;
  }

  const [optimizeField, opType] =
    mode === 'max_protein' ? ['cp_total', 'max'] :
    mode === 'max_energy'  ? ['me_total', 'max'] :
                             ['cost',     'min'];
  const model = { optimize: optimizeField, opType, constraints, variables };
  const res = solver.Solve(model);

  if (res.feasible === false) {
    console.log(`  ❌ INFEASIBLE — the solver cannot satisfy all constraints simultaneously.`);
    return { ok: false };
  }

  console.log(`  ✅ FEASIBLE  (mode: ${mode})`);
  let actualCost = 0;
  for (const k of ingredientKeys) {
    const q = res[k] ?? 0;
    actualCost += q * INGS[k].price;
  }
  console.log(`  Objective value: ${res.result.toFixed(4)}   Total cost: Rs ${actualCost.toFixed(0)}  (Rs ${(actualCost/batchSize).toFixed(2)} / kg)`);

  // Evaluate concentration of each constrained nutrient
  let totalDM = 0;
  for (const k of ingredientKeys) {
    const q = res[k] ?? 0;
    totalDM += q * (INGS[k].dm / 100);
  }
  for (const c of CONSTRAINED) {
    let nut = 0;
    for (const k of ingredientKeys) {
      const q = res[k] ?? 0;
      nut += q * (INGS[k].dm / 100) * (INGS[k][c.field]);
    }
    const conc = nut / totalDM;
    const bound = ranges[c.key];
    const ok = conc >= bound.min - 0.001 && conc <= bound.max + 0.001;
    console.log(`    ${ok ? '✓' : '✗'} ${c.key.padEnd(10)} ${conc.toFixed(2)}  (target ${bound.min}-${bound.max})`);
  }

  console.log(`  Ingredients used:`);
  for (const k of ingredientKeys) {
    const q = res[k];
    if (q && q > 0.01) {
      const lockedMark = locks[k] !== undefined ? ' 🔒' : '';
      console.log(`    • ${k.padEnd(14)} ${q.toFixed(2)} kg${lockedMark}`);
    }
  }

  // Verify locks held
  for (const [k, lockedKg] of Object.entries(locks)) {
    const actual = res[k] ?? 0;
    const held = Math.abs(actual - lockedKg) < 0.01;
    console.log(`    ${held ? '✓' : '✗'} Lock ${k}=${lockedKg} kg → solver gave ${actual.toFixed(2)} kg`);
  }
  return { ok: true };
}

// Targets — Dairy Cow Mid Lactation
const dairyMidLact = {
  protein:    { min: 18, max: 20 },
  energy:     { min: 2.70, max: 2.90 },
  tdn:        { min: 72, max: 76 },
  fiber:      { min: 18, max: 28 },
  fat:        { min: 3.0, max: 5.0 },
  calcium:    { min: 0.80, max: 1.00 },
  phosphorus: { min: 0.45, max: 0.60 },
};

const ALL = ['corn', 'wheat_bran', 'molasses', 'sbm', 'csm', 'canola_meal', 'limestone', 'dcp', 'salt'];

// ── Scenario 1: Happy path ──────────────────────────────────────────────────
runScenario('Scenario 1 — No locks (baseline)', ALL, dairyMidLact);

// ── Scenario 2: Infeasible — no real protein ────────────────────────────────
runScenario(
  'Scenario 2 — Only corn + molasses + limestone (no real protein) → should FAIL',
  ['corn', 'molasses', 'limestone'],
  dairyMidLact
);

// ── Scenario 3: Lock corn @ 40 kg, molasses @ 10 kg — feasible locks ────────
runScenario(
  'Scenario 3 — Lock corn=40, molasses=10 → solver optimises rest',
  ALL,
  dairyMidLact,
  { locks: { corn: 40, molasses: 10 } }
);

// ── Scenario 4: Lock conflict (overweight) ──────────────────────────────────
runScenario(
  'Scenario 4 — Lock corn=60 + sbm=60 (total 120 > batch 100) → should FAIL',
  ALL,
  dairyMidLact,
  { locks: { corn: 60, sbm: 60 } }
);

// ── User bug repro — 10 ingredients selected, Dairy Cow Early Lactation ────
// corn, molasses, rsm (sarso), sesame_cake (til), wheat_bran (chokhar),
// bypassFat, limestone, dcp, salt, sodium_bicarb
const USER_INGREDIENTS = ['corn', 'molasses', 'rsm', 'sesame_cake', 'wheat_bran', 'bypassFat', 'limestone', 'dcp', 'salt'];
// Note: test script doesn't have sodium_bicarb — doesn't affect feasibility (zero nutrients).

const dairyEarlyLact = {
  protein:    { min: 20, max: 22 },
  energy:     { min: 2.80, max: 3.10 },
  tdn:        { min: 75, max: 80 },
  fiber:      { min: 15, max: 25 },
  fat:        { min: 3.0, max: 6.0 },
  calcium:    { min: 0.90, max: 1.20 },
  phosphorus: { min: 0.50, max: 0.65 },
};
// Add bypassFat to INGS for this test
INGS.bypassFat = { dm: 99, cp: 0, me: 4.78, tdn: 180, adf: 0, ndf: 0, fat: 99, starch: 0, ca: 0, p: 0, ash: 0, price: 400, maxInclusion: 5 };
INGS.sesame_cake = { dm: 90, cp: 40, me: 2.99, tdn: 68, adf: 22, ndf: 30, fat: 10, starch: 3, ca: 1.20, p: 0.65, ash: 11, price: 120, maxInclusion: 20 };
INGS.rsm = { dm: 90, cp: 35, me: 2.65, tdn: 66, adf: 18, ndf: 28, fat: 7, starch: 8, ca: 0.62, p: 1.10, ash: 7.5, price: 110, maxInclusion: 15 };

runScenario(
  'Scenario USER — 9 ingredients, Dairy Cow Early Lactation',
  USER_INGREDIENTS,
  dairyEarlyLact,
);

// Tight stages with narrower ranges — likely bottleneck for user's ingredient set
const heiferCalf = {
  protein: { min: 20, max: 24 }, energy: { min: 2.90, max: 3.20 }, tdn: { min: 78, max: 83 },
  fiber: { min: 12, max: 20 }, fat: { min: 3.0, max: 5.0 },
  calcium: { min: 0.90, max: 1.20 }, phosphorus: { min: 0.50, max: 0.70 },
};
runScenario('Scenario USER+Heifer Calf — tight NDF≤20%', USER_INGREDIENTS, heiferCalf);

const fatteningFinisher = {
  protein: { min: 12, max: 14 }, energy: { min: 3.00, max: 3.30 }, tdn: { min: 80, max: 85 },
  fiber: { min: 12, max: 20 }, fat: { min: 3.0, max: 5.0 },
  calcium: { min: 0.45, max: 0.65 }, phosphorus: { min: 0.30, max: 0.40 },
};
runScenario('Scenario USER+Fattening Bull Finisher — ME≥3.00', USER_INGREDIENTS, fatteningFinisher);

const dairyCowMid = {
  protein: { min: 18, max: 20 }, energy: { min: 2.70, max: 2.90 }, tdn: { min: 72, max: 76 },
  fiber: { min: 18, max: 28 }, fat: { min: 3.0, max: 5.0 },
  calcium: { min: 0.80, max: 1.00 }, phosphorus: { min: 0.45, max: 0.60 },
};
runScenario('Scenario USER+Dairy Cow Mid Lactation — middle-of-road', USER_INGREDIENTS, dairyCowMid);

// ── Phase 3 — three optimisation modes on the same baseline ─────────────────
console.log('\n────── PHASE 3: Multi-objective modes (same baseline) ──────');
runScenario('Scenario 5a — Mode: min_cost',    ALL, dairyMidLact, { mode: 'min_cost'    });
runScenario('Scenario 5b — Mode: max_protein', ALL, dairyMidLact, { mode: 'max_protein' });
runScenario('Scenario 5c — Mode: max_energy',  ALL, dairyMidLact, { mode: 'max_energy'  });

console.log('');
