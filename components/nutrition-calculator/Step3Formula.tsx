'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Sparkles, AlertTriangle, Lock, Unlock, Coins, Beef, Zap, Target, Check } from 'lucide-react';
import {
  FormulaItem,
  calculateNutrients,
  calculateTotalCost,
  calculateTotalWeight,
  getNutrientStatus,
} from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NUTRITION_RANGES, getIngredientIcon, getNutritionRange } from '@/lib/constants';
import { hasOverride } from '@/lib/ingredientOverrides';
import { autoFormulate, type OptimisationMode, type Diagnostics } from '@/lib/autoFormulate';
import { WhyThisFormula } from './WhyThisFormula';
import { IngredientDetailModal } from './IngredientDetailModal';

interface Step3FormulaProps {
  language: 'en' | 'ur';
  formula: FormulaItem[];
  selectedAnimal: string | null;
  selectedStage: number;
  onFormulaChange: (formula: FormulaItem[]) => void;
  onNext: () => void;
  onBack: () => void;
  /** When true on mount, Step 3 auto-runs the Balanced LP once for a sensible
   *  starting recipe. The parent flips this to false via `onAutoBalanceConsumed`. */
  autoBalanceOnMount?: boolean;
  onAutoBalanceConsumed?: () => void;
}

/**
 * A nutrient tile.
 *
 * Two deliberate design decisions here:
 *
 * 1. NO SOLID FILL FOR "IN RANGE". Filling the whole card saturated green made
 *    the grid shout, and — worse — it made the in-range cards the loudest thing
 *    on screen when the ones that actually need attention are the out-of-range
 *    ones. Status is carried by a small dot, a tinted border and the value's
 *    colour instead, so the eye is drawn to problems, not to successes.
 *
 * 2. A MINI RANGE BAR instead of just "20-22%". The number alone doesn't say
 *    whether you're comfortably centred or clinging to the edge of the target.
 *    The bar shows the target band and a marker for where this formula actually
 *    sits, which is the thing a farmer needs to judge at a glance.
 */
function NutrientCard({
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
  language: 'en' | 'ur';
}) {
  const status = range ? getNutrientStatus(value, range.min, range.max) : null;

  const tone = {
    success: { border: 'border-emerald-200', dot: 'bg-emerald-500', value: 'text-emerald-700', band: 'bg-emerald-200', mark: 'bg-emerald-600' },
    warning: { border: 'border-amber-200',   dot: 'bg-amber-500',   value: 'text-amber-700',   band: 'bg-amber-200',   mark: 'bg-amber-600' },
    error:   { border: 'border-rose-200',    dot: 'bg-rose-500',    value: 'text-rose-700',    band: 'bg-rose-200',    mark: 'bg-rose-600' },
  }[status ?? 'success'];

  // Marker position. The view window is the target band plus 60% of its width
  // on each side, so the band sits in the middle and over/under-shoot is visible
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
          {/* target band + current-value marker */}
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
 * Display order for the nutrient grid.
 *
 * `TARGETED` are the 7 nutrients the LP constrains and the ranges cover, in the
 * order a farmer reasons about them: protein and energy first (what he's buying),
 * then digestibility and fibre, then fat, then the minerals. `UNTARGETED` are
 * informational readouts with no min/max to compare against.
 *
 * `key` indexes the `t` label map, `value` indexes NutrientCalculation, and
 * `range` indexes NutrientRange — keeping all three in one row is what stops
 * a label drifting away from the value it names.
 */
const TARGETED = [
  { key: 'protein',    value: 'protein',    range: 'protein',    unit: '%',    decimals: 1 },
  { key: 'energy',     value: 'energy',     range: 'energy',     unit: 'Mcal', decimals: 2 },
  { key: 'tdn',        value: 'tdn',        range: 'tdn',        unit: '%',    decimals: 1 },
  { key: 'fiber',      value: 'fiber',      range: 'fiber',      unit: '%',    decimals: 1 },
  { key: 'fat',        value: 'fat',        range: 'fat',        unit: '%',    decimals: 1 },
  { key: 'calcium',    value: 'calcium',    range: 'calcium',    unit: '%',    decimals: 2 },
  { key: 'phosphorus', value: 'phosphorus', range: 'phosphorus', unit: '%',    decimals: 2 },
] as const;

/** Bilingual names for the 4 LP modes, used in the "showing X recipe" line. */
const MODE_LABEL: Record<OptimisationMode, { en: string; ur: string }> = {
  min_cost:    { en: 'Cheapest',    ur: 'سستا' },
  balanced:    { en: 'Balanced',    ur: 'متوازن' },
  max_protein: { en: 'Max Protein', ur: 'زیادہ پروٹین' },
  max_energy:  { en: 'Max Energy',  ur: 'زیادہ توانائی' },
};

const UNTARGETED = [
  { key: 'adf',    value: 'adf',    unit: '%', decimals: 1 },
  { key: 'starch', value: 'starch', unit: '%', decimals: 1 },
  { key: 'ash',    value: 'ash',    unit: '%', decimals: 1 },
  { key: 'dm',     value: 'dm',     unit: '%', decimals: 1 },
] as const;

export function Step3Formula({
  language,
  formula,
  selectedAnimal,
  selectedStage,
  onFormulaChange,
  onNext,
  onBack,
  autoBalanceOnMount = false,
  onAutoBalanceConsumed,
}: Step3FormulaProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [overrideVer, setOverrideVer] = useState(0);

  // Auto-formulate state
  const [afError, setAfError] = useState<string | null>(null);
  const [afBusyMode, setAfBusyMode] = useState<OptimisationMode | null>(null); // which mode is currently running

  // Post-solve diagnostics (Phase 4)
  const [afDiag, setAfDiag] = useState<Diagnostics | null>(null);
  const [afMode, setAfMode] = useState<OptimisationMode | null>(null); // which mode produced current formula
  const [afPremium, setAfPremium] = useState<number | undefined>(undefined); // Rs/kg over min-cost baseline

  // overrideVer triggers recalc after nutrition edits via the modal
  void overrideVer;
  const nutrients = calculateNutrients(formula);
  const totalWeight = calculateTotalWeight(formula);
  const totalCost = calculateTotalCost(formula);

  // Get ranges for selected animal and stage
  const animalRanges = selectedAnimal ? NUTRITION_RANGES[selectedAnimal as keyof typeof NUTRITION_RANGES] : null;
  const ranges = animalRanges ? animalRanges[selectedStage] : null;

  // How many targeted nutrients are currently inside their window — the single
  // number that answers "is this formula good?" without reading 11 cards.
  const onTargetCount = ranges
    ? TARGETED.filter((n) => {
        const r = ranges[n.range];
        const v = nutrients[n.value];
        return v >= r.min && v <= r.max;
      }).length
    : 0;

  /**
   * Hand-editing a quantity means the numbers on screen are no longer any
   * mode's output, so drop the "active mode" marker and the diagnostics that
   * described that solve. Leaving them up would label a hand-tuned recipe as
   * "Balanced", which is simply untrue.
   */
  const clearSolveState = () => {
    setAfMode(null);
    setAfDiag(null);
    setAfPremium(undefined);
  };

  const handleWeightChange = (index: number, newWeight: number) => {
    const updated = [...formula];
    updated[index].kg = Math.max(0, newWeight);
    clearSolveState();
    onFormulaChange(updated);
  };

  const handlePriceChange = (index: number, newPrice: number) => {
    const updated = [...formula];
    updated[index].price = Math.max(0, newPrice);
    onFormulaChange(updated);
  };

  const handleRemove = (index: number) => {
    const updated = formula.filter((_, i) => i !== index);
    clearSolveState();
    onFormulaChange(updated);
  };

  /** Toggle the lock state of a single ingredient row. */
  const handleToggleLock = (index: number) => {
    const updated = [...formula];
    updated[index] = { ...updated[index], locked: !updated[index].locked };
    onFormulaChange(updated);
  };

  /**
   * Scale every ingredient's kg proportionally so that SUM(kg) == newTotal.
   * If the current total is 0 (fresh formula), there's nothing to scale from,
   * so we bail and let the user enter per-ingredient quantities first.
   */
  const handleTotalWeightChange = (newTotal: number) => {
    if (newTotal < 0 || !Number.isFinite(newTotal)) return;
    if (totalWeight === 0) return;
    const factor = newTotal / totalWeight;
    const updated = formula.map((item) => ({
      ...item,
      kg: Math.round(item.kg * factor * 100) / 100,  // round to 2 dp
    }));
    onFormulaChange(updated);
  };

  // Quick preset batch sizes
  const QUICK_BATCH_SIZES = [100, 200, 500, 1000, 2000];

  /**
   * ⚡ Auto-Formulate — solve the least-cost LP for the selected ingredients
   * against the current animal/stage target ranges. On success, replace every
   * ingredient's kg with the optimised values. On infeasibility, surface the
   * bottleneck nutrient so the farmer knows what to fix.
   */
  const handleAutoFormulate = (mode: OptimisationMode = 'min_cost') => {
    const targets = getNutritionRange(selectedAnimal, selectedStage);
    if (!targets) {
      setAfError(language === 'en'
        ? 'Select an animal and stage first (Step 1).'
        : 'پہلے جانور اور مرحلہ منتخب کریں (مرحلہ 1)۔');
      return;
    }
    if (formula.length === 0) {
      setAfError(language === 'en'
        ? 'Select some ingredients first.'
        : 'پہلے اجزاء منتخب کریں۔');
      return;
    }

    setAfBusyMode(mode);
    setAfError(null);

    // Keep the user's chosen batch size (current total, or default 100)
    const batchSize = totalWeight > 0 ? totalWeight : 100;

    // Collect locked ingredients → equality constraints for the LP
    const lockedQuantities: Record<string, number> = {};
    for (const item of formula) {
      if (item.locked) lockedQuantities[item.key] = item.kg;
    }

    const res = autoFormulate({
      ingredientKeys: formula.map((f) => f.key),
      ranges: targets,
      batchSize,
      lockedQuantities,
      mode,
    });

    setAfBusyMode(null);

    if (!res.success) {
      if (res.reason === 'no_ingredients') {
        setAfError(language === 'en' ? 'No ingredients to optimise.' : 'کوئی جزو موجود نہیں۔');
      } else if (res.reason === 'missing_data') {
        setAfError(language === 'en' ? 'Missing ingredient data.' : 'جزو کا ڈیٹا غائب ہے۔');
      } else {
        // Infeasible — show the bottleneck hint
        const lead = language === 'en'
          ? 'Targets can\'t be met with the selected ingredients'
          : 'منتخب اجزاء سے ہدف پورے نہیں ہو سکتے';
        setAfError(res.bottleneck ? `${lead}: ${res.bottleneck}` : lead);
      }
      setAfDiag(null);
      setAfMode(null);
      setAfPremium(undefined);
      return;
    }

    // Store diagnostics for the "Why this formula?" panel
    setAfDiag(res.diagnostics);
    setAfMode(mode);

    // For max_protein / max_energy modes, compute the cost premium over a
    // min_cost baseline so the farmer sees "this mode costs Rs X more/kg".
    if (mode !== 'min_cost') {
      const baseline = autoFormulate({
        ingredientKeys: formula.map((f) => f.key),
        ranges: targets,
        batchSize,
        lockedQuantities,
        mode: 'min_cost',
      });
      if (baseline.success) {
        setAfPremium(Math.max(0, res.perKgPrice - baseline.perKgPrice));
      } else {
        setAfPremium(undefined);
      }
    } else {
      setAfPremium(undefined);
    }

    // Apply optimised quantities — keep order, preserve any custom price overrides
    const updated = formula.map((item) => ({
      ...item,
      kg: res.quantities[item.key] ?? 0,
    }));
    onFormulaChange(updated);
  };

  // ── Auto-run Balanced on first mount when the parent has flagged this as
  // a fresh Step 3 entry. The ref guard ensures we only fire once per mount,
  // even if React re-renders the effect mid-flight; the parent immediately
  // clears the flag via onAutoBalanceConsumed so subsequent navigation back
  // to Step 3 won't re-fire.
  const didAutoBalance = useRef(false);
  useEffect(() => {
    if (!autoBalanceOnMount || didAutoBalance.current) return;
    didAutoBalance.current = true;
    handleAutoFormulate('balanced');
    onAutoBalanceConsumed?.();
    // handleAutoFormulate is intentionally excluded — capturing it as a dep
    // would re-fire on every render. The ref guard above is the real safety.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoBalanceOnMount]);

  const t = {
    formulaEditor: language === 'en' ? 'Formula Editor' : 'فارمولا ایڈیٹر',
    weight: language === 'en' ? 'Weight (kg)' : 'وزن (کلو)',
    price: language === 'en' ? 'Price/kg' : 'قیمت فی کلو',
    total: language === 'en' ? 'Total' : 'کل',
    nutrients: language === 'en' ? 'Nutritional Summary' : 'غذائی خلاصہ',
    protein: language === 'en' ? 'Protein (CP)' : 'پروٹین',
    energy: language === 'en' ? 'Energy (ME)' : 'توانائی (ME)',
    fiber: language === 'en' ? 'Fiber (NDF)' : 'فائبر (NDF)',
    adf: language === 'en' ? 'ADF' : 'ADF',
    fat: language === 'en' ? 'Fat' : 'چکنائی',
    dm: language === 'en' ? 'Dry Matter' : 'خشک مادہ',
    tdn: language === 'en' ? 'TDN' : 'TDN',
    starch: language === 'en' ? 'Starch' : 'نشاستہ',
    ash: language === 'en' ? 'Ash' : 'راکھ',
    calcium: language === 'en' ? 'Calcium' : 'کیلشیم',
    phosphorus: language === 'en' ? 'Phosphorus' : 'فاسفورس',
    next: language === 'en' ? 'Next' : 'اگلا',
    back: language === 'en' ? 'Back' : 'واپس',
    costPerKg: language === 'en' ? 'Cost/kg' : 'قیمت فی کلو',
  };

  return (
    <>
    {/* Ingredient detail / edit modal — same as Step 2's modal */}
    <IngredientDetailModal
      isOpen={editingKey !== null}
      ingredientKey={editingKey}
      language={language}
      onClose={() => {
        setEditingKey(null);
        setOverrideVer((v) => v + 1);
        // Shallow copy triggers parent re-render so calculateNutrients picks up changes
        onFormulaChange([...formula]);
      }}
    />

    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <span className="text-3xl">⚙️</span>
          {t.formulaEditor}
        </h2>
      </div>

      {/* ── Nutritional summary ──────────────────────────────────────────────
          Grouped, not interleaved. Previously the 7 nutrients that HAVE a target
          were mixed in among the 4 that don't (ADF between TDN and Fat, Starch
          between Fat and DM), so the grid had no readable order and the cards
          with a status sat next to cards that can't have one. Targets come
          first — those are the ones you act on — then a labelled divider, then
          the reference values. */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {language === 'en' ? 'Nutrient targets' : 'غذائی اہداف'}
            </h3>
            {ranges && (
              <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
                {onTargetCount}/{TARGETED.length} {language === 'en' ? 'on target' : 'ہدف پر'}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {TARGETED.map((n) => (
              <NutrientCard
                key={n.key}
                label={t[n.key]}
                value={nutrients[n.value]}
                unit={n.unit}
                decimals={n.decimals}
                range={ranges?.[n.range]}
                language={language}
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            {language === 'en' ? 'Other values (no target set)' : 'دیگر اقدار (کوئی ہدف نہیں)'}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {UNTARGETED.map((n) => (
              <NutrientCard
                key={n.key}
                label={t[n.key]}
                value={nutrients[n.value]}
                unit={n.unit}
                decimals={n.decimals}
                language={language}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="text-xs text-gray-500 -mt-2">
        {language === 'en'
          ? '*Concentrate mix only (fed with forage/hay/silage). All values on DM basis.'
          : '*صرف کانسنٹریٹ (چارہ/گھاس/سائیلج کے ساتھ)۔ تمام اقدار خشک مادہ پر۔'}
      </div>

      {/* Auto-Formulate — least-cost LP solver */}
      <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 border-2 border-violet-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-violet-900">
                {language === 'en' ? 'Auto-Formulate' : 'خودکار فارمولا'}
              </h4>
              {(() => {
                const lockCount = formula.filter((f) => f.locked).length;
                if (lockCount === 0) return null;
                return (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    <Lock className="w-3 h-3" />
                    {lockCount} {language === 'en' ? 'locked' : 'مقفل'}
                  </span>
                );
              })()}
            </div>
            <p className="text-[11px] text-violet-700/80 leading-relaxed">
              {afMode
                ? (language === 'en'
                    ? <>Showing the <strong>{MODE_LABEL[afMode].en}</strong> recipe. Tap another to compare.</>
                    : <>یہ <strong>{MODE_LABEL[afMode].ur}</strong> فارمولا ہے۔ موازنے کے لیے دوسرا دبائیں۔</>)
                : formula.some((f) => f.locked)
                  ? (language === 'en'
                      ? 'Optimises unlocked ingredients while keeping locked ones fixed.'
                      : 'غیر مقفل اجزاء کو بہتر کرتا ہے، مقفل اجزاء ثابت رہتے ہیں۔')
                  : (language === 'en'
                      ? 'Pick how you want the mix optimised for this animal and stage.'
                      : 'اس جانور اور مرحلے کے لیے فارمولا کیسے بنایا جائے، منتخب کریں۔')}
            </p>
          </div>
        </div>

        {/* 4 optimisation mode buttons — each triggers a different LP objective.
            Balanced doesn't optimise cost / CP / ME — it pulls every nutrient
            toward the MIDDLE of its target range, making the recipe robust to
            small ingredient variation. */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {([
            { mode: 'min_cost',    icon: <Coins  className="w-4 h-4" />, labelEn: 'Cheapest',    labelUr: 'سستا',          tipEn: 'Minimise cost',                       tipUr: 'کم قیمت' },
            { mode: 'balanced',    icon: <Target className="w-4 h-4" />, labelEn: 'Balanced',    labelUr: 'متوازن',         tipEn: 'Centre every nutrient in its range',  tipUr: 'ہر غذائی جزو کو حد کے درمیان رکھیں' },
            { mode: 'max_protein', icon: <Beef   className="w-4 h-4" />, labelEn: 'Max Protein', labelUr: 'زیادہ پروٹین',   tipEn: 'Richest in CP (kg)',                  tipUr: 'زیادہ پروٹین' },
            { mode: 'max_energy',  icon: <Zap    className="w-4 h-4" />, labelEn: 'Max Energy',  labelUr: 'زیادہ توانائی',  tipEn: 'Highest ME (Mcal)',                   tipUr: 'زیادہ توانائی' },
          ] as const).map((m) => {
            const busy = afBusyMode === m.mode;
            const anyBusy = afBusyMode !== null;
            // `afMode` is the mode that produced the numbers currently on screen.
            // Without this the user taps Balanced, the kg values change, and
            // nothing on the panel says which mode they're looking at.
            const active = afMode === m.mode && !anyBusy;
            return (
              <motion.button
                key={m.mode}
                whileHover={!anyBusy ? { scale: 1.02, y: -1 } : undefined}
                whileTap={!anyBusy ? { scale: 0.97 } : undefined}
                disabled={anyBusy}
                onClick={() => handleAutoFormulate(m.mode)}
                title={language === 'en' ? m.tipEn : m.tipUr}
                aria-pressed={active}
                className={`relative inline-flex flex-col items-center justify-center gap-1 text-[11px] font-bold px-2 py-2.5 rounded-xl transition-all disabled:cursor-not-allowed ${
                  busy
                    ? 'bg-violet-700 text-white shadow-lg ring-2 ring-violet-300'
                    : active
                      ? 'bg-violet-600 text-white shadow-md ring-2 ring-violet-300'
                      : anyBusy
                        ? 'bg-white/60 text-slate-400 border border-slate-200'
                        : 'bg-white text-violet-700 border border-violet-200 hover:border-violet-400 hover:bg-violet-50 shadow-sm'
                }`}
              >
                {active && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-white text-violet-700 flex items-center justify-center shadow-sm">
                    <Check className="w-3 h-3" strokeWidth={3} />
                  </span>
                )}
                {busy ? <Sparkles className="w-4 h-4 animate-pulse" /> : m.icon}
                <span className="leading-tight text-center">
                  {busy
                    ? (language === 'en' ? 'Optimising…' : 'حساب…')
                    : (language === 'en' ? m.labelEn : m.labelUr)}
                </span>
              </motion.button>
            );
          })}
        </div>
        <AnimatePresence>
          {afError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-[11px] text-amber-900 leading-relaxed"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
              <span className="flex-1">{afError}</span>
              <button
                onClick={() => setAfError(null)}
                className="text-amber-700 hover:text-amber-900 font-bold text-sm leading-none"
                aria-label="dismiss"
              >
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Why this formula? (Phase 4 diagnostics) */}
      {afDiag && (
        <WhyThisFormula
          language={language}
          diagnostics={afDiag}
          batchSize={totalWeight > 0 ? totalWeight : 100}
          costPremium={afMode !== 'min_cost' ? afPremium : undefined}
        />
      )}

      {/* Formula Items */}
      <div className="space-y-3">
        <h3 className="font-bold text-lg">{t.formulaEditor} Items</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {formula.map((item, idx) => (
            <motion.div
              key={idx}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
            >
              {/* Top row on mobile: icon + name + remove button (right-aligned) */}
              <div className="flex items-center gap-3 sm:contents">
                <span className="text-2xl flex-shrink-0">{getIngredientIcon(item.key)}</span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{item.name}</p>
                    {hasOverride(item.key) && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" title={language === 'en' ? 'Custom nutrition values' : 'ترمیم شدہ غذائیت'} />
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {item.kg > 0 && `₨${((item.price || 0) * item.kg).toFixed(0)}`}
                  </p>
                </div>

                {/* Mobile-only remove button — pushed to the right of the top row */}
                {item.key !== 'mineral_mix' && (
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => handleRemove(idx)}
                    className="sm:hidden text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors flex-shrink-0 tap-transparent"
                    title="Remove item"
                    aria-label="Remove item"
                  >
                    ✕
                  </motion.button>
                )}
              </div>

              {/* Bottom row on mobile: controls + inputs */}
              <div className="flex gap-2 items-end flex-wrap sm:flex-nowrap">
                {/* Edit nutrition — opens the detail modal */}
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setEditingKey(item.key)}
                  className="p-2 rounded transition-colors text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 tap-transparent"
                  title={language === 'en' ? 'Edit nutrition' : 'غذائیت ترمیم'}
                  aria-label={language === 'en' ? 'Edit nutrition' : 'غذائیت ترمیم'}
                >
                  <Pencil className="w-4 h-4" />
                </motion.button>

                {/* Lock toggle — when locked, Auto-Formulate keeps this kg fixed */}
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handleToggleLock(idx)}
                  className={`p-2 rounded transition-colors tap-transparent ${
                    item.locked
                      ? 'text-amber-700 bg-amber-100 hover:bg-amber-200'
                      : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                  }`}
                  title={
                    item.locked
                      ? (language === 'en' ? 'Unlock (let Auto-Formulate adjust)' : 'غیر مقفل')
                      : (language === 'en' ? 'Lock at this value (Auto-Formulate will preserve)' : 'اس قدر پر مقفل کریں')
                  }
                  aria-label={item.locked ? 'Unlock' : 'Lock'}
                >
                  {item.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </motion.button>

                <div className="flex flex-col gap-1 flex-1 sm:flex-none min-w-[80px]">
                  <label className={`text-xs ${item.locked ? 'text-amber-700 font-semibold' : 'text-gray-500'}`}>
                    {t.weight}{item.locked && ' 🔒'}
                  </label>
                  <Input
                    type="number"
                    value={item.kg}
                    onChange={(e) => handleWeightChange(idx, parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.1"
                    className={`w-full sm:w-24 text-sm h-10 ${item.locked ? 'bg-amber-50 border-amber-300 font-semibold text-amber-900' : ''}`}
                  />
                </div>

                <div className="flex flex-col gap-1 flex-1 sm:flex-none min-w-[80px]">
                  <label className="text-xs text-gray-500">{t.price}</label>
                  <Input
                    type="number"
                    value={item.price || ''}
                    onChange={(e) => handlePriceChange(idx, parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                    step="1"
                    className="w-full sm:w-24 text-sm h-10"
                  />
                </div>

                {/* Desktop-only remove button — keeps the dense single-row layout. */}
                {item.key !== 'mineral_mix' && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleRemove(idx)}
                    className="hidden sm:block text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors tap-transparent"
                    title="Remove item"
                    aria-label="Remove item"
                  >
                    ✕
                  </motion.button>
                )}
              </div>

            </motion.div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg p-4 border border-emerald-200 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-600 block mb-1">
              {t.total} Weight
              <span className="ml-1 text-[10px] text-emerald-600 font-medium">
                ({language === 'en' ? 'edit to scale' : 'سکیل کے لیے ترمیم کریں'})
              </span>
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={totalWeight || 0}
                onChange={(e) => handleTotalWeightChange(parseFloat(e.target.value) || 0)}
                disabled={totalWeight === 0}
                min="0"
                step="10"
                className="w-24 text-2xl font-bold text-emerald-700 bg-white/60 border border-emerald-200 rounded-md px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-500 disabled:opacity-50"
              />
              <span className="text-lg font-bold text-emerald-700">kg</span>
            </div>
            <p className="text-xs text-emerald-600 mt-1">as-fed</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">{t.total} DM</p>
            <p className="text-2xl font-bold text-emerald-700">{nutrients.totalDM.toFixed(2)} kg</p>
            <p className="text-xs text-emerald-600 mt-1">{nutrients.dm}% of as-fed</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">{t.total} Cost</p>
            <p className="text-2xl font-bold text-emerald-700">₨{totalCost.toLocaleString('en-PK')}</p>
            <p className="text-xs text-emerald-600 mt-1">
              {t.costPerKg}: ₨{nutrients.perKgPrice}
            </p>
          </div>
        </div>

        {/* Quick batch-size presets — clicking scales the whole formula */}
        {totalWeight > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-emerald-200/60">
            <span className="text-[11px] font-semibold text-emerald-800">
              {language === 'en' ? 'Scale to batch:' : 'بیچ سائز:'}
            </span>
            {QUICK_BATCH_SIZES.map((s) => {
              const isActive = Math.abs(totalWeight - s) < 0.5;
              return (
                <button
                  key={s}
                  onClick={() => handleTotalWeightChange(s)}
                  className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white/70 text-emerald-700 hover:bg-white border border-emerald-300'
                  }`}
                >
                  {s} kg
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Buttons — taller tap targets on mobile */}
      <div className="flex gap-3 pt-6 sm:pt-8">
        <Button variant="outline" onClick={onBack} className="flex-1 h-12 sm:h-10 tap-transparent">
          {t.back}
        </Button>
        <Button onClick={onNext} className="flex-1 h-12 sm:h-10 bg-emerald-600 hover:bg-emerald-700 text-white tap-transparent">
          {t.next}
        </Button>
      </div>
    </motion.div>
    </>
  );
}
