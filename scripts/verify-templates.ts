// ================================================================================
// Verify every quick-start template produces a feasible Balanced LP solution.
//
// Each template lands the user on Step 3 with autoBalanceOnMount=true, which
// triggers a Balanced-mode LP run. If the LP can't satisfy all constraints,
// the user sees an amber error toast — bad first-time UX. This script catches
// that failure mode so we can fix templates BEFORE shipping.
//
// Run: npx tsx scripts/verify-templates.ts
// ================================================================================

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

import { autoFormulate, type OptimisationMode } from '../lib/autoFormulate';
import { getNutritionRange, getIngredient } from '../lib/constants';
import { calculateNutrients, type FormulaItem } from '../lib/calculations';
import { QUICK_START_TEMPLATES } from '../lib/templates';

let pass = 0;
let fail = 0;
const ok = (label: string, cond: boolean) => {
  if (cond) { console.log(`  ✅ ${label}`); pass += 1; }
  else      { console.log(`  ❌ ${label}`); fail += 1; }
};

console.log('\n=== Verify quick-start templates produce a feasible Balanced LP ===\n');

for (const tpl of QUICK_START_TEMPLATES) {
  console.log(`▶ ${tpl.id} — ${tpl.nameEn}`);
  const ranges = getNutritionRange(tpl.animalId, tpl.stageIndex);
  if (!ranges) {
    fail += 1;
    console.log(`  ❌ no nutrient range for ${tpl.animalId}/${tpl.stageIndex}\n`);
    continue;
  }

  // Flatten the template's chosen ingredients into the LP input
  const ingredientKeys = [
    ...tpl.chosenIngredients.energy,
    ...tpl.chosenIngredients.protein,
    ...tpl.chosenIngredients.fiber,
    ...tpl.chosenIngredients.fat,
  ];

  // Try all 4 modes — Balanced is the default that fires on Step 3 mount,
  // but we should also test min_cost since the user can switch.
  const modes: OptimisationMode[] = ['balanced', 'min_cost', 'max_protein', 'max_energy'];
  for (const mode of modes) {
    const r = autoFormulate({ ingredientKeys, ranges, mode });
    if (r.success) {
      // Build a FormulaItem[] from the result + verify nutrients are in range
      const formula: FormulaItem[] = Object.entries(r.quantities)
        .filter(([_, kg]) => kg > 0.001)
        .map(([key, kg]) => {
          const data = getIngredient(key)!;
          return { key, kg, name: data.nameEn, price: data.price };
        });
      const n = calculateNutrients(formula);
      const inRange = (val: number, r: { min: number; max: number }, tol = 0.05) =>
        val >= r.min - tol && val <= r.max + tol;
      const allInRange =
        inRange(n.protein,    ranges.protein) &&
        inRange(n.energy,     ranges.energy, 0.02) &&
        inRange(n.tdn,        ranges.tdn) &&
        inRange(n.fiber,      ranges.fiber) &&
        inRange(n.fat,        ranges.fat) &&
        inRange(n.calcium,    ranges.calcium, 0.01) &&
        inRange(n.phosphorus, ranges.phosphorus, 0.005);
      ok(`  mode=${mode.padEnd(11)} feasible · all nutrients in range`, allInRange);
      if (mode === 'balanced') {
        console.log(`     CP ${n.protein}%, ME ${n.energy}, TDN ${n.tdn}%, NDF ${n.fiber}%, Ca ${n.calcium}%, P ${n.phosphorus}%, Rs ${r.perKgPrice}/kg`);
      }
    } else {
      ok(`  mode=${mode.padEnd(11)} feasible`, false);
      console.log(`     reason: ${r.reason}, bottleneck: ${r.bottleneck ?? '(none)'}`);
    }
  }
  console.log('');
}

console.log(`──────  ${pass} passed · ${fail} failed  ──────\n`);
process.exit(fail === 0 ? 0 : 1);
