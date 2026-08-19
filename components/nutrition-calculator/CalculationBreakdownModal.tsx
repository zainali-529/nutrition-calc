'use client';

// ============================================================================
// "SEE BACKGROUND CALCULATION" — the teaching sheet
// ============================================================================
// Shows the farmer exactly how every published number was produced, step by
// step, with real values substituted into each formula. The point is that a user
// can learn the rules from the calculator rather than trusting a black box.
//
// Every number here comes from `buildCalculationTrace()` — the SAME function
// `calculateNutrients()` uses. Re-deriving the arithmetic in this component
// would risk an explanation that quietly disagrees with the result it claims to
// explain, which is worse than showing nothing at all.
// ============================================================================

import { motion, AnimatePresence } from 'framer-motion';
import { FileText, FlaskConical, Printer, X } from 'lucide-react';
import {
  buildCalculationTrace,
  calculateNutrients,
  NUTRIENT_DP,
  TRACE_NUTRIENTS,
  type FormulaItem,
} from '@/lib/calculations';
import { getNutritionRange, type NutrientRange } from '@/lib/constants';

interface Props {
  isOpen: boolean;
  language: 'en' | 'ur';
  formula: FormulaItem[];
  animal: string;
  stage: string;
  animalId: string | null;
  stageIndex: number;
  onClose: () => void;
}

// Decimals come from NUTRIENT_DP in lib/calculations.ts — the same map the
// Step 3/4 cards use — so the sheet and the cards print identical digits.

const num = (v: number, d = 2) =>
  v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

/**
 * Operand formatter for the equations — 4 decimals.
 *
 * This matters more than it looks. At 2 decimals the DM% line read
 * "89.31 ÷ 99.99 × 100 = 89.31%", but a user checking that on a calculator gets
 * 89.32: the operands were display-rounded while the answer came from full
 * precision. On a sheet whose entire purpose is to be followed by hand, an
 * equation that doesn't reconcile destroys the trust it was meant to build.
 * Four decimals is enough for every line here to come out to the shown result.
 */
const eq = (v: number) => num(v, 4);

/** Which target range (if any) applies to a trace nutrient. */
function rangeFor(
  ranges: NutrientRange | null,
  resultKey: string,
): { min: number; max: number } | null {
  if (!ranges) return null;
  return (ranges as unknown as Record<string, { min: number; max: number }>)[resultKey] ?? null;
}

export function CalculationBreakdownModal({
  isOpen, language, formula, animal, stage, animalId, stageIndex, onClose,
}: Props) {
  if (!isOpen) return null;

  const trace = buildCalculationTrace(formula);
  const result = calculateNutrients(formula);
  const ranges = getNutritionRange(animalId, stageIndex);
  const en = language === 'en';

  // Pick the heaviest row for the worked example — the biggest contributor is the
  // one whose arithmetic the user most wants to follow, and it avoids picking a
  // mineral whose CP is 0 (which would demonstrate nothing).
  const example = trace.rows.length
    ? trace.rows.reduce((a, b) => (b.kg.cp > a.kg.cp ? b : a))
    : null;

  const t = {
    title:    en ? 'Background calculation' : 'پیچھے کا حساب',
    subtitle: en
      ? 'Every number this app shows you, and exactly how it was worked out.'
      : 'ایپ کے تمام اعداد، اور وہ کیسے نکالے گئے۔',
    // A CSV was the wrong artifact for this audience — see buildText().
    print:    en ? 'Print / Save as PDF' : 'پرنٹ / PDF محفوظ کریں',
    download: en ? 'Save as text'        : 'ٹیکسٹ محفوظ کریں',
    close:    en ? 'Close' : 'بند کریں',

    ruleTitle: en ? 'The rule' : 'اصول',
    ruleBody: en
      ? 'Feed is bought wet but the animal is fed on dry matter (DM), so every value is converted to a DM basis first. That is the whole method — three multiplications and one division.'
      : 'فیڈ گیلی خریدی جاتی ہے مگر جانور خشک مادہ (DM) پر کھاتا ہے، اس لیے ہر قدر پہلے DM بنیاد پر بدلی جاتی ہے۔ یہی پورا طریقہ ہے۔',

    s1: en
      ? 'Steps 1 & 2 — dry matter, then each ingredient’s kilograms of nutrient'
      : 'مرحلہ 1 اور 2 — خشک مادہ، پھر ہر جزو کے غذائی کلوگرام',
    s3: en ? 'Step 3 — turning kilograms into percentages'         : 'مرحلہ 3 — کلوگرام کو فیصد میں بدلنا',
    s4: en ? 'Step 4 — energy'                                      : 'مرحلہ 4 — توانائی',
    s5: en ? 'Step 5 — cost'                                        : 'مرحلہ 5 — لاگت',

    ingredient: en ? 'Ingredient' : 'جزو',
    asFed:  en ? 'As-fed kg' : 'تازہ کلو',
    dmPct:  en ? 'DM %'      : 'DM %',
    dmKg:   en ? 'DM kg'     : 'DM کلو',
    total:  en ? 'TOTAL'     : 'کل',
    target: en ? 'Target'    : 'ہدف',
    result: en ? 'Result'    : 'نتیجہ',
    verdict: en ? 'Status'   : 'حالت',
    onT:    en ? 'on target'    : 'ہدف پر',
    // Above/below rather than a flat "off target", to match the wording on the
    // Step 3/4 cards for the very same nutrient.
    aboveT: en ? 'above target' : 'ہدف سے زیادہ',
    belowT: en ? 'below target' : 'ہدف سے کم',
    noT:    en ? 'no target'    : 'ہدف نہیں',
    perKg:  en ? 'Rs/kg'     : 'روپے/کلو',
    lineCost: en ? 'Line cost' : 'لاگت',
    nutrientKgNote: en
      ? 'Each cell is: that ingredient’s DM kg × its % of that nutrient ÷ 100.'
      : 'ہر خانہ: اس جزو کا DM کلو × اس غذائی جزو کا % ÷ 100۔',
    whyDm: en
      ? 'Why the totals row matters: percentages can only be added up through kilograms. You cannot average percentages directly, because each ingredient contributes a different amount of dry matter.'
      : 'کل کی سطر کیوں اہم ہے: فیصد صرف کلوگرام کے ذریعے جمع ہو سکتے ہیں۔ فیصد کا براہِ راست اوسط نہیں لیا جا سکتا، کیونکہ ہر جزو مختلف مقدار میں خشک مادہ دیتا ہے۔',
    // Stated rather than hidden. Every row is rounded to 4 decimals for display,
    // and the sum of rounded numbers is not always the rounded sum — so adding a
    // column by hand can land 0.0001 away from the total. The totals come from
    // the unrounded values, which is why they are the ones used in Step 3.
    roundingNote: en
      ? 'Each row is rounded to 4 decimals to fit. Totals are computed from the full unrounded values, so adding a column by hand may land within ±0.0001 of the total shown.'
      : 'ہر سطر 4 اعشاریہ تک محدود ہے۔ کل بغیر گول کیے اعداد سے نکالا گیا ہے، اس لیے ہاتھ سے جوڑنے پر ±0.0001 کا فرق آ سکتا ہے۔',
    meNote: en
      ? 'Energy is already stated per kg of DM, so it is multiplied by DM kg directly — there is no ÷ 100.'
      : 'توانائی پہلے ہی فی کلو DM دی گئی ہے، اس لیے اسے سیدھا DM کلو سے ضرب دیا جاتا ہے — ÷ 100 نہیں۔',
    costNote: en
      ? 'Cost uses as-fed kg, not DM — you pay for what you physically weigh out.'
      : 'لاگت تازہ وزن پر ہے، DM پر نہیں — آپ وہی خریدتے ہیں جو تولا جاتا ہے۔',
  };

  /**
   * Plain-text sheet — replaced a CSV download.
   *
   * A CSV is the wrong artifact for this audience: on a phone it either opens in
   * nothing or in a spreadsheet app that mangles a 22-column table, and it can't
   * be read as a document or pasted into WhatsApp. So the download is now plain
   * text laid out as READABLE BLOCKS rather than a wide table — a 22-column grid
   * cannot survive a 40-character screen, but "Corn: 33.40 kg → 29.7260 kg DM"
   * reads fine anywhere, including in a chat message.
   */
  const buildText = (): string => {
    const W = 44;                       // target width — fits a phone screen
    const L: string[] = [];
    const rule = (c = '─') => L.push(c.repeat(W));
    const pad = (s: string, n: number) => s.length >= n ? s : s + ' '.repeat(n - s.length);
    /** Word-wrap prose so no line runs past the column width. */
    const wrap = (text: string, indent = '') => {
      let line = '';
      for (const word of text.split(' ')) {
        if ((indent + line + ' ' + word).trim().length > W && line) { L.push(indent + line); line = word; }
        else line = line ? `${line} ${word}` : word;
      }
      if (line) L.push(indent + line);
    };

    L.push(en ? 'BACKGROUND CALCULATION' : 'پیچھے کا حساب');
    L.push(`${animal} — ${stage}`);
    L.push(new Date().toLocaleString());
    L.push('');
    rule('=');
    L.push(en ? 'THE RULE' : 'اصول');
    rule('=');
    L.push('  DM kg       = as-fed kg x DM% / 100');
    L.push('  nutrient kg = DM kg x nutrient% / 100');
    L.push('  energy Mcal = DM kg x ME');
    L.push('  final %     = total nutrient kg');
    L.push('                / total DM kg x 100');
    L.push('');
    rule('=');
    L.push(en ? 'STEP 1 & 2 — EACH INGREDIENT' : 'مرحلہ 1 و 2 — ہر جزو');
    rule('=');
    for (const r of trace.rows) {
      L.push('');
      L.push(r.name.toUpperCase());
      L.push(`  ${pad(en ? 'as-fed' : 'تازہ وزن', 10)} ${num(r.qty)} kg`);
      L.push(`  ${pad('DM', 10)} ${num(r.qty)} x ${r.dmPct}% / 100 = ${eq(r.dmKg)} kg`);
      for (const n of TRACE_NUTRIENTS) {
        if (r.pct[n.key] === 0) continue;   // skip nutrients this ingredient has none of
        L.push(`  ${pad(n.label, 10)} ${eq(r.dmKg)} x ${r.pct[n.key]}% / 100 = ${eq(r.kg[n.key])} kg`);
      }
      if (r.mePerKgDm > 0) {
        L.push(`  ${pad('ME', 10)} ${eq(r.dmKg)} x ${r.mePerKgDm} = ${eq(r.meMcal)} Mcal`);
      }
      L.push(`  ${pad(en ? 'cost' : 'لاگت', 10)} ${num(r.qty)} x Rs ${r.unitPrice} = Rs ${num(r.cost)}`);
    }
    L.push('');
    rule('=');
    L.push(en ? 'TOTALS' : 'کل');
    rule('=');
    L.push(`  ${pad(en ? 'as-fed' : 'تازہ وزن', 10)} ${num(trace.totals.qty)} kg`);
    L.push(`  ${pad('DM', 10)} ${eq(trace.totals.dmKg)} kg`);
    for (const n of TRACE_NUTRIENTS) {
      L.push(`  ${pad(n.label, 10)} ${eq(trace.totals.kg[n.key])} kg`);
    }
    L.push(`  ${pad('ME', 10)} ${eq(trace.totals.meMcal)} Mcal`);
    L.push(`  ${pad(en ? 'cost' : 'لاگت', 10)} Rs ${num(trace.totals.cost)}`);
    L.push('');
    rule('=');
    L.push(en ? 'STEP 3 — PERCENTAGES (DM BASIS)' : 'مرحلہ 3 — فیصد');
    rule('=');
    for (const n of TRACE_NUTRIENTS) {
      const r = rangeFor(ranges, n.resultKey);
      const val = result[n.resultKey] as number;
      const ok = r ? val >= r.min && val <= r.max : null;
      const status = ok === null
        ? (en ? 'no target' : 'ہدف نہیں')
        : ok ? (en ? 'ON TARGET' : 'ہدف پر')
        : val < r!.min ? (en ? 'BELOW TARGET' : 'ہدف سے کم') : (en ? 'ABOVE TARGET' : 'ہدف سے زیادہ');
      L.push('');
      L.push(`  ${n.label}`);
      L.push(`    ${eq(trace.totals.kg[n.key])} / ${eq(trace.totals.dmKg)} x 100 = ${val.toFixed(NUTRIENT_DP[n.resultKey])}%`);
      L.push(`    ${en ? 'target' : 'ہدف'}: ${r ? `${r.min}-${r.max}%` : '—'}   ${status}`);
    }
    const meRange = rangeFor(ranges, 'energy');
    L.push('');
    L.push('  ME (Mcal/kg DM)');
    L.push(`    ${eq(trace.totals.meMcal)} / ${eq(trace.totals.dmKg)} = ${result.energy.toFixed(NUTRIENT_DP.energy)}`);
    L.push(`    ${en ? 'target' : 'ہدف'}: ${meRange ? `${meRange.min}-${meRange.max}` : '—'}`);
    L.push('');
    rule('=');
    L.push(en ? 'STEP 5 — COST' : 'مرحلہ 5 — لاگت');
    rule('=');
    L.push(`  Rs ${num(trace.totals.cost)} / ${num(trace.totals.qty)} kg = Rs ${result.perKgPrice.toFixed(2)} ${en ? 'per kg' : 'فی کلو'}`);
    L.push(`  DM% = ${eq(trace.totals.dmKg)} / ${eq(trace.totals.qty)} x 100 = ${result.dm.toFixed(NUTRIENT_DP.dm)}%`);
    L.push('');
    wrap(en
      ? 'Rows are rounded to 4 decimals; totals use full precision, so adding by hand may differ by +/-0.0001.'
      : 'سطریں 4 اعشاریہ تک محدود ہیں؛ کل مکمل درستگی سے، ہاتھ سے جوڑنے پر معمولی فرق آ سکتا ہے۔');
    return L.join('\r\n');
  };

  const handleDownloadText = () => {
    const a = document.createElement('a');
    a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(buildText());
    a.download = `background-calculation-${Date.now()}.txt`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  /**
   * Print / Save as PDF.
   *
   * `data-printing="calc"` on <body> flips the @media print rules in globals.css
   * so this sheet becomes the visible print target instead of the always-present
   * recipe sheet. Cleared afterwards so the default target stays the recipe.
   */
  const handlePrint = () => {
    document.body.dataset.printing = 'calc';
    try {
      window.print();
    } finally {
      setTimeout(() => { delete document.body.dataset.printing; }, 500);
    }
  };

  return (
    <AnimatePresence>
      <>
        {/* ── Print / PDF sheet ──────────────────────────────────────────────
            Hidden on screen; becomes the only visible content when the print
            handler sets body[data-printing="calc"]. Rebuilt as plain
            black-on-white with real table borders, because the on-screen design
            (tinted borders, sticky columns, horizontal scroll) does not survive
            being flattened onto A4. */}
        <div className="printable-calc hidden print:block text-black">
          <h1 className="text-lg font-bold">{t.title}</h1>
          <p className="text-sm">{animal} — {stage}</p>
          <p className="text-[10px] mb-3">{new Date().toLocaleString()}</p>

          <div className="text-[10px] font-mono border border-gray-400 p-2 mb-3">
            <div>DM kg = as-fed kg × DM% ÷ 100</div>
            <div>nutrient kg = DM kg × nutrient% ÷ 100</div>
            <div>energy Mcal = DM kg × ME</div>
            <div>final % = Σ nutrient kg ÷ Σ DM kg × 100</div>
          </div>

          <h2 className="text-[11px] font-bold uppercase mb-1">{t.s1}</h2>
          <table className="w-full text-[9px] mb-1" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {[t.ingredient, t.asFed, t.dmPct, t.dmKg,
                  ...TRACE_NUTRIENTS.map((n) => `${n.label} kg`), 'ME Mcal'].map((h) => (
                  <th key={h} className="border border-gray-400 px-1 py-0.5 text-right first:text-left bg-gray-100">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trace.rows.map((r) => (
                <tr key={r.key}>
                  <td className="border border-gray-400 px-1 py-0.5">{r.name}</td>
                  <td className="border border-gray-400 px-1 py-0.5 text-right">{num(r.qty)}</td>
                  <td className="border border-gray-400 px-1 py-0.5 text-right">{r.dmPct}%</td>
                  <td className="border border-gray-400 px-1 py-0.5 text-right">{eq(r.dmKg)}</td>
                  {TRACE_NUTRIENTS.map((n) => (
                    <td key={n.key} className="border border-gray-400 px-1 py-0.5 text-right">{eq(r.kg[n.key])}</td>
                  ))}
                  <td className="border border-gray-400 px-1 py-0.5 text-right">{eq(r.meMcal)}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td className="border border-gray-400 px-1 py-0.5">{t.total}</td>
                <td className="border border-gray-400 px-1 py-0.5 text-right">{num(trace.totals.qty)}</td>
                <td className="border border-gray-400 px-1 py-0.5" />
                <td className="border border-gray-400 px-1 py-0.5 text-right">{eq(trace.totals.dmKg)}</td>
                {TRACE_NUTRIENTS.map((n) => (
                  <td key={n.key} className="border border-gray-400 px-1 py-0.5 text-right">{eq(trace.totals.kg[n.key])}</td>
                ))}
                <td className="border border-gray-400 px-1 py-0.5 text-right">{eq(trace.totals.meMcal)}</td>
              </tr>
            </tbody>
          </table>
          <p className="text-[8px] mb-3">{t.roundingNote}</p>

          <h2 className="text-[11px] font-bold uppercase mb-1">{t.s3}</h2>
          <table className="w-full text-[9px] mb-3" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Nutrient', 'Σ kg ÷ Σ DM kg × 100', t.result, t.target, t.verdict].map((h) => (
                  <th key={h} className="border border-gray-400 px-1 py-0.5 text-left bg-gray-100">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TRACE_NUTRIENTS.map((n) => {
                const r = rangeFor(ranges, n.resultKey);
                const val = result[n.resultKey] as number;
                const ok = r ? val >= r.min && val <= r.max : null;
                return (
                  <tr key={n.key}>
                    <td className="border border-gray-400 px-1 py-0.5 font-bold">{n.label}</td>
                    <td className="border border-gray-400 px-1 py-0.5 font-mono">
                      {eq(trace.totals.kg[n.key])} ÷ {eq(trace.totals.dmKg)} × 100
                    </td>
                    <td className="border border-gray-400 px-1 py-0.5 text-right font-bold">
                      {val.toFixed(NUTRIENT_DP[n.resultKey])}%
                    </td>
                    <td className="border border-gray-400 px-1 py-0.5 text-right">{r ? `${r.min}–${r.max}%` : '—'}</td>
                    <td className="border border-gray-400 px-1 py-0.5">
                      {ok === null ? t.noT : ok ? t.onT : (val < r!.min ? t.belowT : t.aboveT)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="text-[9px] font-mono">
            <div><strong>{t.s4}:</strong> {eq(trace.totals.meMcal)} ÷ {eq(trace.totals.dmKg)} = {result.energy.toFixed(NUTRIENT_DP.energy)} Mcal/kg DM</div>
            <div><strong>{t.s5}:</strong> Rs {num(trace.totals.cost)} ÷ {num(trace.totals.qty)} = Rs {result.perKgPrice.toFixed(2)}/kg</div>
            <div>DM% = {eq(trace.totals.dmKg)} ÷ {eq(trace.totals.qty)} × 100 = {result.dm.toFixed(NUTRIENT_DP.dm)}%</div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] print:hidden"
        />
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed inset-x-0 bottom-0 sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:inset-x-auto sm:-translate-x-1/2 sm:-translate-y-1/2 w-full sm:w-[94vw] max-w-5xl z-[71] max-h-[94vh] flex flex-col"
        >
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] pb-safe-bottom sm:pb-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-200 flex-shrink-0 bg-slate-50/50">
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0e3b5e] to-[#558b2f] text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-[#0e3b5e]/20">
                  <FlaskConical className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-extrabold text-[#0e3b5e] leading-tight">{t.title}</h2>
                  <p className="text-[11px] sm:text-xs text-slate-500">{t.subtitle}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 flex-shrink-0 tap-transparent"
                aria-label={t.close}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-4 sm:px-5 py-4 space-y-5">
              {/* The rule */}
              <section className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">{t.ruleTitle}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{t.ruleBody}</p>
                <div className="mt-2.5 space-y-1 font-mono text-[11px] text-slate-800 bg-white rounded-lg border border-slate-200 p-2.5 overflow-x-auto">
                  <div>DM kg &nbsp;&nbsp;&nbsp;= as-fed kg × DM% ÷ 100</div>
                  <div>nutrient kg = DM kg × nutrient% ÷ 100</div>
                  <div>energy Mcal = DM kg × ME</div>
                  <div className="pt-1 border-t border-slate-100">final % &nbsp;&nbsp;= Σ nutrient kg ÷ Σ DM kg × 100</div>
                </div>
              </section>

              {/* Steps 1 + 2 — one wide table, horizontally scrollable */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{t.s1}</h3>
                <p className="mt-1 text-[11px] text-slate-500">{t.nutrientKgNote}</p>

                {/* One row spelled out with its real numbers. Column headings
                    alone don't teach the rule; substituting actual values does. */}
                {example && (
                  <div className="mt-2 mb-2 rounded-lg border border-slate-200 bg-white p-2.5 font-mono text-[10.5px] leading-relaxed text-slate-700 overflow-x-auto">
                    <div className="font-sans text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      {en ? `Worked example — ${example.name}` : `مثال — ${example.name}`}
                    </div>
                    <div>
                      DM kg = {num(example.qty)} × {example.dmPct}% ÷ 100 = <strong>{eq(example.dmKg)}</strong>
                    </div>
                    <div>
                      CP kg = {eq(example.dmKg)} × {example.pct.cp}% ÷ 100 = <strong>{eq(example.kg.cp)}</strong>
                    </div>
                    <div>
                      ME &nbsp;&nbsp;&nbsp; = {eq(example.dmKg)} × {example.mePerKgDm} = <strong>{eq(example.meMcal)}</strong> Mcal
                    </div>
                  </div>
                )}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-[11px] tabular-nums whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="text-left font-semibold px-2.5 py-2 sticky left-0 bg-slate-50">{t.ingredient}</th>
                        <th className="text-right font-semibold px-2 py-2">{t.asFed}</th>
                        <th className="text-right font-semibold px-2 py-2">{t.dmPct}</th>
                        <th className="text-right font-semibold px-2 py-2 border-r border-slate-200">{t.dmKg}</th>
                        {TRACE_NUTRIENTS.map((n) => (
                          <th key={n.key} className="text-right font-semibold px-2 py-2">{n.label} kg</th>
                        ))}
                        <th className="text-right font-semibold px-2 py-2 border-l border-slate-200">ME Mcal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {trace.rows.map((r) => (
                        <tr key={r.key}>
                          <td className="px-2.5 py-1.5 font-semibold text-slate-800 sticky left-0 bg-white">{r.name}</td>
                          <td className="px-2 py-1.5 text-right text-slate-700">{num(r.qty)}</td>
                          <td className="px-2 py-1.5 text-right text-slate-400">{r.dmPct}%</td>
                          <td className="px-2 py-1.5 text-right font-semibold text-slate-800 border-r border-slate-100">{eq(r.dmKg)}</td>
                          {TRACE_NUTRIENTS.map((n) => (
                            <td key={n.key} className="px-2 py-1.5 text-right text-slate-600">
                              {r.kg[n.key] === 0 ? <span className="text-slate-300">0</span> : eq(r.kg[n.key])}
                            </td>
                          ))}
                          <td className="px-2 py-1.5 text-right text-slate-600 border-l border-slate-100">{eq(r.meMcal)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-200">
                      <tr>
                        <td className="px-2.5 py-2 sticky left-0 bg-slate-50">{t.total}</td>
                        <td className="px-2 py-2 text-right">{num(trace.totals.qty)}</td>
                        <td className="px-2 py-2" />
                        <td className="px-2 py-2 text-right border-r border-slate-200">{eq(trace.totals.dmKg)}</td>
                        {TRACE_NUTRIENTS.map((n) => (
                          <td key={n.key} className="px-2 py-2 text-right">{eq(trace.totals.kg[n.key])}</td>
                        ))}
                        <td className="px-2 py-2 text-right border-l border-slate-200">{eq(trace.totals.meMcal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">{t.whyDm}</p>
                <p className="mt-1 text-[10px] text-slate-400 leading-relaxed">{t.roundingNote}</p>
              </section>

              {/* Step 3 — the division, with real numbers substituted */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{t.s3}</h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-[11px] tabular-nums">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="text-left font-semibold px-2.5 py-2">{t.ingredient === 'جزو' ? 'غذائی جزو' : 'Nutrient'}</th>
                        <th className="text-left font-semibold px-2.5 py-2 whitespace-nowrap">Σ kg ÷ Σ DM kg × 100</th>
                        <th className="text-right font-semibold px-2.5 py-2">{t.result}</th>
                        <th className="text-right font-semibold px-2.5 py-2 whitespace-nowrap">{t.target}</th>
                        <th className="text-right font-semibold px-2.5 py-2">{t.verdict}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {TRACE_NUTRIENTS.map((n) => {
                        const r = rangeFor(ranges, n.resultKey);
                        const val = result[n.resultKey] as number;
                        const ok = r ? val >= r.min && val <= r.max : null;
                        return (
                          <tr key={n.key}>
                            <td className="px-2.5 py-1.5 font-semibold text-slate-800">{n.label}</td>
                            <td className="px-2.5 py-1.5 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                              {eq(trace.totals.kg[n.key])} ÷ {eq(trace.totals.dmKg)} × 100
                            </td>
                            <td className="px-2.5 py-1.5 text-right font-bold text-slate-900">{val.toFixed(NUTRIENT_DP[n.resultKey])}%</td>
                            <td className="px-2.5 py-1.5 text-right text-slate-500 whitespace-nowrap">
                              {r ? `${r.min}–${r.max}%` : '—'}
                            </td>
                            <td className="px-2.5 py-1.5 text-right">
                              {ok === null
                                ? <span className="text-slate-400">{t.noT}</span>
                                : ok
                                  ? <span className="text-emerald-700 font-semibold">{t.onT}</span>
                                  : <span className="text-rose-700 font-semibold">
                                      {val < r!.min ? t.belowT : t.aboveT}
                                    </span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Step 4 — energy, and Step 5 — cost */}
              <div className="grid gap-3 sm:grid-cols-2">
                <section className="rounded-xl border border-slate-200 p-3.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">{t.s4}</h3>
                  <div className="font-mono text-[11px] text-slate-700 space-y-1">
                    <div>Σ Mcal = {eq(trace.totals.meMcal)}</div>
                    <div>Σ DM kg = {eq(trace.totals.dmKg)}</div>
                    <div className="pt-1 border-t border-slate-100 font-bold text-slate-900">
                      ME = {eq(trace.totals.meMcal)} ÷ {eq(trace.totals.dmKg)} = {result.energy.toFixed(3)} Mcal/kg DM
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">{t.meNote}</p>
                </section>

                <section className="rounded-xl border border-slate-200 p-3.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">{t.s5}</h3>
                  <div className="font-mono text-[11px] text-slate-700 space-y-1">
                    <div>Σ (kg × Rs/kg) = Rs {num(trace.totals.cost)}</div>
                    <div>Σ as-fed kg = {num(trace.totals.qty)}</div>
                    <div className="pt-1 border-t border-slate-100 font-bold text-slate-900">
                      Rs/kg = {num(trace.totals.cost)} ÷ {num(trace.totals.qty)} = {result.perKgPrice.toFixed(2)}
                    </div>
                    <div className="pt-1 border-t border-slate-100">
                      DM% = {eq(trace.totals.dmKg)} ÷ {eq(trace.totals.qty)} × 100 = {result.dm.toFixed(2)}%
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">{t.costNote}</p>
                </section>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 sm:px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between gap-2 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0e3b5e] to-[#155e75] hover:from-[#09253b] hover:to-[#0e3b5e] text-white px-3.5 py-2 text-[13px] font-bold transition-all shadow-sm shadow-[#0e3b5e]/20 tap-transparent"
                >
                  <Printer className="w-4 h-4" />
                  {t.print}
                </button>
                <button
                  onClick={handleDownloadText}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 px-3 py-2 text-[13px] font-bold transition-colors tap-transparent"
                >
                  <FileText className="w-4 h-4" />
                  {t.download}
                </button>
              </div>
              <button
                onClick={onClose}
                className="text-[13px] font-semibold text-slate-500 hover:text-slate-800 transition-colors tap-transparent flex-shrink-0"
              >
                {t.close}
              </button>
            </div>
          </div>
        </motion.div>
      </>
    </AnimatePresence>
  );
}
