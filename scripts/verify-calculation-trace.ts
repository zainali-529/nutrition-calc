// ================================================================================
// Verify the calculation TRACE — the numbers shown in "See background calculation"
// ================================================================================
// Unlike scripts/verify-calculator.mjs, which re-implements the maths inline with
// its own copy of the ingredient data, this script imports the REAL
// lib/calculations.ts. A regression in the shipped code shows up here.
//
// What it proves:
//   1. `calculateNutrients` still reproduces the verified Google Sheet scenario
//      (156 kg batch) — through the actual code path the app uses.
//   2. The trace's per-row values SUM to its totals. If a row were dropped or
//      double-counted, the sheet would show a table that doesn't add up.
//   3. Recomputing each concentration from the trace's own totals reproduces
//      `calculateNutrients`' published result, at the same decimals the UI shows.
//      This is the property that makes the sheet trustworthy: the explanation and
//      the answer are arithmetically the same thing.
//   4. Rows that contribute nothing (unknown key, zero/negative kg) are excluded
//      from both the trace and the totals.
//   5. Scale invariance: doubling every quantity leaves all percentages alone.
//
// Run:  npx tsx scripts/verify-calculation-trace.ts
// ================================================================================

import {
  buildCalculationTrace,
  calculateNutrients,
  TRACE_NUTRIENTS,
  type FormulaItem,
} from '../lib/calculations';
import { getAllIngredients } from '../lib/constants';

let pass = 0;
let fail = 0;
const ok = (label: string, cond: boolean, extra = '') => {
  console.log(`  ${cond ? '✅' : '❌'}  ${label}${extra ? `  ${extra}` : ''}`);
  cond ? pass++ : fail++;
};
const near = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) < tol;

const mk = (pairs: [string, number][]): FormulaItem[] =>
  pairs.map(([key, kg]) => ({ key, name: key, kg }));

// ── 1. The verified sheet scenario, through the real code ───────────────────
console.log('\n=== 1. Google Sheet reference (156 kg) via real calculateNutrients ===');
const REF = mk([
  ['corn', 50], ['wheat_bran', 32], ['molasses', 10], ['sbm', 48],
  ['rsm', 5], ['canola_meal', 5], ['sesame_cake', 5], ['limestone', 1],
]);
const res = calculateNutrients(REF);
const EXPECTED: Record<string, number> = {
  totalAsFed: 156, totalDM: 137.04, dm: 87.846, protein: 24.377, energy: 2.980,
  tdn: 79.281, adf: 7.994, fiber: 19.882, fat: 3.425, starch: 29.760,
  calcium: 0.517, phosphorus: 0.614, ash: 5.770, cost: 24750, perKgPrice: 158.654,
};
for (const [k, want] of Object.entries(EXPECTED)) {
  const got = (res as unknown as Record<string, number>)[k];
  ok(k.padEnd(11), Math.abs(got - want) < 0.01, `got ${got}, expected ${want}`);
}

// ── 2 & 3. Trace sums to its totals, and reproduces the published result ────
console.log('\n=== 2. Trace rows sum to trace totals ===');
const tr = buildCalculationTrace(REF);
ok('as-fed kg sums', near(tr.rows.reduce((s, r) => s + r.qty, 0), tr.totals.qty));
ok('DM kg sums', near(tr.rows.reduce((s, r) => s + r.dmKg, 0), tr.totals.dmKg));
ok('ME Mcal sums', near(tr.rows.reduce((s, r) => s + r.meMcal, 0), tr.totals.meMcal));
ok('cost sums', near(tr.rows.reduce((s, r) => s + r.cost, 0), tr.totals.cost));
for (const n of TRACE_NUTRIENTS) {
  ok(`${n.label.padEnd(6)} kg sums`, near(tr.rows.reduce((s, r) => s + r.kg[n.key], 0), tr.totals.kg[n.key]));
}

console.log('\n=== 3. Recomputing from the trace reproduces the published result ===');
for (const n of TRACE_NUTRIENTS) {
  const decimals = (n.key === 'ca' || n.key === 'p') ? 3 : 2;
  const recomputed = Number(((tr.totals.kg[n.key] / tr.totals.dmKg) * 100).toFixed(decimals));
  const published = (res as unknown as Record<string, number>)[n.resultKey];
  ok(`${n.label.padEnd(6)} Σkg÷ΣDM×100 == result`, near(recomputed, published), `${recomputed} vs ${published}`);
}
ok('ME  ΣMcal÷ΣDM == result',
  near(Number((tr.totals.meMcal / tr.totals.dmKg).toFixed(3)), res.energy));
ok('DM% ΣDM÷Σqty×100 == result',
  near(Number(((tr.totals.dmKg / tr.totals.qty) * 100).toFixed(2)), res.dm));
ok('Rs/kg Σcost÷Σqty == result',
  near(Number((tr.totals.cost / tr.totals.qty).toFixed(2)), res.perKgPrice));

// ── 4. Non-contributing rows are excluded ───────────────────────────────────
console.log('\n=== 4. Zero / negative / unknown rows are excluded ===');
const withJunk: FormulaItem[] = [
  ...REF,
  { key: 'corn', name: 'zero corn', kg: 0 },
  { key: 'sbm', name: 'negative sbm', kg: -5 },
  { key: 'not_a_real_ingredient', name: 'ghost', kg: 10 },
];
const trJunk = buildCalculationTrace(withJunk);
ok('row count unchanged', trJunk.rows.length === tr.rows.length, `${trJunk.rows.length} vs ${tr.rows.length}`);
ok('totals unchanged', near(trJunk.totals.dmKg, tr.totals.dmKg) && near(trJunk.totals.cost, tr.totals.cost));
const resJunk = calculateNutrients(withJunk);
ok('published result unchanged', resJunk.protein === res.protein && resJunk.energy === res.energy);

// ── 5. Scale invariance ─────────────────────────────────────────────────────
console.log('\n=== 5. Scale invariance (double every quantity) ===');
const doubled = REF.map((r) => ({ ...r, kg: r.kg * 2 }));
const resD = calculateNutrients(doubled);
for (const n of TRACE_NUTRIENTS) {
  const a = (res as unknown as Record<string, number>)[n.resultKey];
  const b = (resD as unknown as Record<string, number>)[n.resultKey];
  ok(`${n.label.padEnd(6)} unchanged`, near(a, b), `${a} vs ${b}`);
}
ok('ME unchanged', near(res.energy, resD.energy));
ok('Rs/kg unchanged', near(res.perKgPrice, resD.perKgPrice));
ok('totals DOUBLED', near(resD.totalDM, res.totalDM * 2) && near(resD.totalAsFed, res.totalAsFed * 2));

// ── 6. Property sweep across random formulas ────────────────────────────────
console.log('\n=== 6. Trace/result agreement across 300 random formulas ===');
const KEYS = getAllIngredients().map((i) => i.key);
let seed = 987654321;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
let drift = 0;
for (let t = 0; t < 300; t++) {
  const f: FormulaItem[] = [];
  const n = 1 + Math.floor(rnd() * 8);
  for (let j = 0; j < n; j++) {
    const k = KEYS[Math.floor(rnd() * KEYS.length)];
    if (!f.some((x) => x.key === k)) f.push({ key: k, name: k, kg: Math.round(rnd() * 5000) / 100 });
  }
  if (!f.length) continue;
  const tt = buildCalculationTrace(f);
  if (tt.totals.dmKg === 0) continue;
  const rr = calculateNutrients(f);
  for (const nut of TRACE_NUTRIENTS) {
    const decimals = (nut.key === 'ca' || nut.key === 'p') ? 3 : 2;
    const recomputed = Number(((tt.totals.kg[nut.key] / tt.totals.dmKg) * 100).toFixed(decimals));
    if (!near(recomputed, (rr as unknown as Record<string, number>)[nut.resultKey])) drift++;
  }
}
ok('no trace/result drift', drift === 0, `${drift} disagreements`);

console.log(`\n──────  ${pass} passed · ${fail} failed  ──────\n`);
process.exit(fail === 0 ? 0 : 1);
