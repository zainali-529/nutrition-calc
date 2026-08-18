'use client';

// ============================================================================
// SHARED NUTRIENT GRID
// ============================================================================
// Used by BOTH Step 3 (formula editor) and Step 4 (nutrition status). They used
// to render the same seven numbers in two different visual languages — Step 3
// with range bars, Step 4 with green tick tiles — which made the wizard feel
// like two different apps and duplicated the label strings and ordering.
//
// Design decisions worth preserving:
//
// 1. NO SOLID FILL FOR "IN RANGE". Filling the whole card saturated green made
//    the grid shout, and made the PASSING nutrients the loudest thing on screen
//    when the ones needing attention are the failures. Status is a small dot, a
//    tinted border and the value's colour, so the eye lands on problems.
//
// 2. A MINI RANGE BAR instead of just "20-22%". The number alone doesn't say
//    whether you're comfortably centred or clinging to the edge of the target.
//
// 3. TARGETED AND UNTARGETED NUTRIENTS ARE NEVER INTERLEAVED. The seven the LP
//    constrains come first; ADF / Starch / Ash / DM have no min-max to compare
//    against and are demoted (optionally collapsed, to save scroll on mobile).
// ============================================================================

import { motion } from 'framer-motion';
import { getNutrientStatus, type NutrientCalculation } from '@/lib/calculations';
import type { NutrientRange } from '@/lib/constants';

type Lang = 'en' | 'ur';

/**
 * The seven nutrients with targets, in the order a farmer reasons about them:
 * protein and energy first (what he's paying for), then digestibility and
 * fibre, then fat, then the minerals.
 *
 * `value` indexes NutrientCalculation and `range` indexes NutrientRange —
 * keeping both in one row is what stops a label drifting off its value.
 */
export const TARGETED = [
  { value: 'protein',    range: 'protein',    unit: '%',    decimals: 1, en: 'Protein (CP)', ur: 'پروٹین' },
  { value: 'energy',     range: 'energy',     unit: 'Mcal', decimals: 2, en: 'Energy (ME)',  ur: 'توانائی' },
  { value: 'tdn',        range: 'tdn',        unit: '%',    decimals: 1, en: 'TDN',          ur: 'TDN' },
  { value: 'fiber',      range: 'fiber',      unit: '%',    decimals: 1, en: 'Fiber (NDF)',  ur: 'فائبر' },
  { value: 'fat',        range: 'fat',        unit: '%',    decimals: 1, en: 'Fat',          ur: 'چکنائی' },
  { value: 'calcium',    range: 'calcium',    unit: '%',    decimals: 2, en: 'Calcium',      ur: 'کیلشیم' },
  { value: 'phosphorus', range: 'phosphorus', unit: '%',    decimals: 2, en: 'Phosphorus',   ur: 'فاسفورس' },
] as const satisfies ReadonlyArray<{
  value: keyof NutrientCalculation;
  range: keyof NutrientRange;
  unit: string;
  decimals: number;
  en: string;
  ur: string;
}>;

/** Informational readouts with no target to compare against. */
export const UNTARGETED = [
  { value: 'adf',    unit: '%', decimals: 1, en: 'ADF',        ur: 'ADF' },
  { value: 'starch', unit: '%', decimals: 1, en: 'Starch',     ur: 'نشاستہ' },
  { value: 'ash',    unit: '%', decimals: 1, en: 'Ash',        ur: 'راکھ' },
  { value: 'dm',     unit: '%', decimals: 1, en: 'Dry Matter', ur: 'خشک مادہ' },
] as const satisfies ReadonlyArray<{
  value: keyof NutrientCalculation;
  unit: string;
  decimals: number;
  en: string;
  ur: string;
}>;

/** How many targeted nutrients currently sit inside their window. */
export function countOnTarget(
  nutrients: NutrientCalculation,
  ranges: NutrientRange | null,
): number {
  if (!ranges) return 0;
  return TARGETED.filter((n) => {
    const r = ranges[n.range];
    const v = nutrients[n.value];
    return v >= r.min && v <= r.max;
  }).length;
}

export function NutrientCard({
  label,
  value,
  unit,
  decimals = 1,
  range,
  language,
}: {
  label: string;
  value: number;
  unit: string;
  decimals?: number;
  range?: { min: number; max: number };
  language: Lang;
}) {
  const status = range ? getNutrientStatus(value, range.min, range.max) : null;

  const tone = {
    success: { border: 'border-emerald-200', dot: 'bg-emerald-500', value: 'text-emerald-700', band: 'bg-emerald-200', mark: 'bg-emerald-600' },
    warning: { border: 'border-amber-200',   dot: 'bg-amber-500',   value: 'text-amber-700',   band: 'bg-amber-200',   mark: 'bg-amber-600' },
    error:   { border: 'border-rose-200',    dot: 'bg-rose-500',    value: 'text-rose-700',    band: 'bg-rose-200',    mark: 'bg-rose-600' },
  }[status ?? 'success'];

  // Marker position. The view window is the target band plus 60% of its width
  // on each side, so the band sits mid-card and over/under-shoot stays visible
  // without the marker running off the end.
  let bandLeft = 0, bandWidth = 0, markLeft = 0;
  if (range) {
    const span = (range.max - range.min) || Math.max(Math.abs(range.max), 1) * 0.2;
    const viewLo = range.min - span * 0.6;
    const viewHi = range.max + span * 0.6;
    const pct = (v: number) => Math.min(100, Math.max(0, ((v - viewLo) / (viewHi - viewLo)) * 100));
    bandLeft = pct(range.min);
    bandWidth = pct(range.max) - bandLeft;
    markLeft = pct(value);
  }

  const hint = !range
    ? (language === 'en' ? 'no target' : 'ہدف نہیں')
    : status === 'success'
      ? (language === 'en' ? 'on target' : 'ہدف پر')
      : value < range.min
        ? (language === 'en' ? 'below target' : 'ہدف سے کم')
        : (language === 'en' ? 'above target' : 'ہدف سے زیادہ');

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border bg-white px-3 py-2.5 transition-colors duration-300 ${
        range ? tone.border : 'border-slate-200'
      }`}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {range && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${tone.dot}`} />}
        <span className="text-[11px] font-semibold text-slate-500 truncate">{label}</span>
      </div>

      <div className="mt-0.5 flex items-baseline gap-1">
        <span className={`text-xl font-bold tabular-nums leading-none ${range ? tone.value : 'text-slate-800'}`}>
          {value.toFixed(decimals)}
        </span>
        <span className="text-[11px] font-medium text-slate-400">{unit}</span>
      </div>

      {range ? (
        <>
          <div className="mt-2 relative h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`absolute inset-y-0 rounded-full ${tone.band}`}
              style={{ left: `${bandLeft}%`, width: `${bandWidth}%` }}
            />
          </div>
          <div className="relative h-0">
            <span
              className={`absolute -top-[9px] w-[3px] h-3 rounded-full ${tone.mark}`}
              style={{ left: `calc(${markLeft}% - 1.5px)` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-1">
            <span className="text-[10px] text-slate-400 tabular-nums">
              {range.min}–{range.max}{unit}
            </span>
            <span className={`text-[10px] font-medium ${tone.value}`}>{hint}</span>
          </div>
        </>
      ) : (
        <div className="mt-2 text-[10px] text-slate-400">{hint}</div>
      )}
    </motion.div>
  );
}

/**
 * The full grid: targeted nutrients with an on-target counter, then the
 * untargeted ones.
 *
 * `untargeted` controls the second group — 'open' for the editor where the
 * extra numbers are useful while tuning, 'collapsed' for the review screen
 * where they'd only add scroll on a phone, 'hidden' to drop them entirely.
 */
export function NutrientGrid({
  nutrients,
  ranges,
  language,
  untargeted = 'open',
}: {
  nutrients: NutrientCalculation;
  ranges: NutrientRange | null;
  language: Lang;
  untargeted?: 'open' | 'collapsed' | 'hidden';
}) {
  const onTarget = countOnTarget(nutrients, ranges);
  const allGood = ranges != null && onTarget === TARGETED.length;

  const untargetedCards = (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      {UNTARGETED.map((n) => (
        <NutrientCard
          key={n.value}
          label={language === 'en' ? n.en : n.ur}
          value={nutrients[n.value]}
          unit={n.unit}
          decimals={n.decimals}
          language={language}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {language === 'en' ? 'Nutrient targets' : 'غذائی اہداف'}
          </h3>
          {ranges && (
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums ${
                allGood ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {onTarget}/{TARGETED.length} {language === 'en' ? 'on target' : 'ہدف پر'}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {TARGETED.map((n) => (
            <NutrientCard
              key={n.value}
              label={language === 'en' ? n.en : n.ur}
              value={nutrients[n.value]}
              unit={n.unit}
              decimals={n.decimals}
              range={ranges?.[n.range]}
              language={language}
            />
          ))}
        </div>
      </div>

      {untargeted === 'open' && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            {language === 'en' ? 'Other values (no target set)' : 'دیگر اقدار (کوئی ہدف نہیں)'}
          </h3>
          {untargetedCards}
        </div>
      )}

      {untargeted === 'collapsed' && (
        <details className="group">
          <summary className="cursor-pointer list-none text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 select-none flex items-center gap-1">
            <span className="transition-transform group-open:rotate-90">▸</span>
            {language === 'en' ? 'Other values (ADF, Starch, Ash, DM)' : 'دیگر اقدار (ADF، نشاستہ، راکھ، DM)'}
          </summary>
          <div className="mt-2">{untargetedCards}</div>
        </details>
      )}
    </div>
  );
}
