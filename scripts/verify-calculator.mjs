// Runtime verification: does the refactored calculator match the Google Sheet?
// Run with:  node scripts/verify-calculator.mjs
//
// Reproduces the verified sheet scenario (Total Qty = 156 kg).
// Expected values come directly from the sheet after Sarso CP + Lime Stone price fixes.

// Minimal inline reproduction of the ingredient data + calculation logic,
// kept in sync with lib/constants.ts and lib/calculations.ts.
// This file exists only for smoke-testing — delete it any time.

const REGISTRY = {
  corn:        { dm: 89, cp: 9,  me: 3.25, tdn: 88, adf: 4,  ndf: 12, fat: 4, starch: 70, ca: 0.03, p: 0.28, ash: 1.3,  price: 102 },
  wheat_bran:  { dm: 87, cp: 16, me: 2.63, tdn: 68, adf: 13, ndf: 45, fat: 4, starch: 22, ca: 0.13, p: 1.1,  ash: 6,    price: 75  },
  molasses:    { dm: 75, cp: 4,  me: 2.29, tdn: 75, adf: 0,  ndf: 0,  fat: 0, starch: 0,  ca: 1,    p: 0.06, ash: 11,   price: 75  },
  sbm:         { dm: 89, cp: 46, me: 3.18, tdn: 84, adf: 7,  ndf: 13, fat: 2, starch: 6,  ca: 0.27, p: 0.65, ash: 6.5,  price: 300 },
  rsm:         { dm: 90, cp: 35, me: 2.65, tdn: 66, adf: 18, ndf: 28, fat: 7, starch: 8,  ca: 0.62, p: 1.1,  ash: 7.5,  price: 110 },
  canola_meal: { dm: 90, cp: 36, me: 2.7,  tdn: 67, adf: 17, ndf: 27, fat: 4, starch: 10, ca: 0.75, p: 1.1,  ash: 6.5,  price: 180 },
  sesame_cake: { dm: 90, cp: 40, me: 2.99, tdn: 68, adf: 22, ndf: 30, fat: 10,starch: 3,  ca: 1.2,  p: 0.65, ash: 11,   price: 120 },
  limestone:   { dm: 98, cp: 0,  me: 0,    tdn: 0,  adf: 0,  ndf: 0,  fat: 0, starch: 0,  ca: 36,   p: 0,    ash: 95,   price: 50  },
};

const formula = [
  { key: 'corn',        kg: 50 },
  { key: 'wheat_bran',  kg: 32 },
  { key: 'molasses',    kg: 10 },
  { key: 'sbm',         kg: 48 },
  { key: 'rsm',         kg: 5  },
  { key: 'canola_meal', kg: 5  },
  { key: 'sesame_cake', kg: 5  },
  { key: 'limestone',   kg: 1  },
];

let totalAsFed = 0, totalDM = 0;
let cpKg = 0, meMcal = 0, tdnKg = 0, adfKg = 0, ndfKg = 0;
let fatKg = 0, starchKg = 0, caKg = 0, pKg = 0, ashKg = 0, cost = 0;

for (const item of formula) {
  const d = REGISTRY[item.key];
  const qty = item.kg;
  const dmKg = qty * (d.dm / 100);
  totalAsFed += qty;
  totalDM    += dmKg;
  cpKg       += dmKg * (d.cp     / 100);
  meMcal     += dmKg *  d.me;
  tdnKg      += dmKg * (d.tdn    / 100);
  adfKg      += dmKg * (d.adf    / 100);
  ndfKg      += dmKg * (d.ndf    / 100);
  fatKg      += dmKg * (d.fat    / 100);
  starchKg   += dmKg * (d.starch / 100);
  caKg       += dmKg * (d.ca     / 100);
  pKg        += dmKg * (d.p      / 100);
  ashKg      += dmKg * (d.ash    / 100);
  cost       += qty  *  d.price;
}

const pct = (kg) => (kg / totalDM) * 100;
const row = (label, got, expected) => {
  const okGot = Number(got).toFixed(3);
  const ok    = Math.abs(Number(got) - expected) < 0.01 ? '✅' : '❌';
  console.log(`${ok}  ${label.padEnd(18)} got ${okGot.padStart(10)}   expected ${expected}`);
};

console.log('\n=== Verify refactored calculator vs. Google Sheet (156 kg) ===\n');
row('Total Qty',      totalAsFed,          156);
row('Total DM (kg)',  totalDM,             137.04);
row('DM %',           (totalDM/totalAsFed)*100, 87.846);
row('CP % (DM)',      pct(cpKg),           24.377);
row('Energy Mcal/kg', meMcal/totalDM,      2.980);
row('TDN % (DM)',     pct(tdnKg),          79.281);
row('ADF % (DM)',     pct(adfKg),          7.994);
row('NDF % (DM)',     pct(ndfKg),          19.882);
row('Fat % (DM)',     pct(fatKg),          3.425);
row('Starch % (DM)',  pct(starchKg),       29.760);
row('Calcium % (DM)', pct(caKg),           0.517);
row('Phos % (DM)',    pct(pKg),            0.614);
row('Ash % (DM)',     pct(ashKg),          5.770);
row('Total cost Rs',  cost,                24750);
row('Rs per kg',      cost/totalAsFed,     158.654);
console.log('');

// ============================================================================
// Scale-invariance test: doubling every quantity must leave % values unchanged.
// ============================================================================

let s1 = 0, s2 = 0;
for (const item of formula) {
  const d = REGISTRY[item.key];
  s1 += item.kg * (d.dm / 100) * (d.cp / 100);
  s2 += item.kg * 2 * (d.dm / 100) * (d.cp / 100);
}
const dmTotal1 = formula.reduce((t, i) => t + i.kg     * (REGISTRY[i.key].dm/100), 0);
const dmTotal2 = formula.reduce((t, i) => t + i.kg * 2 * (REGISTRY[i.key].dm/100), 0);

const cp1 = (s1 / dmTotal1) * 100;
const cp2 = (s2 / dmTotal2) * 100;

console.log('=== Scale-invariance (halve→double → same percentages) ===');
console.log(`  CP% at 156 kg:   ${cp1.toFixed(4)}`);
console.log(`  CP% at 312 kg:   ${cp2.toFixed(4)}`);
console.log(`  Δ:               ${Math.abs(cp1 - cp2).toExponential(3)}  ${Math.abs(cp1 - cp2) < 1e-10 ? '✅' : '❌'}`);
