'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Sparkles, AlertTriangle, Lock, Unlock, Coins, Beef, Zap, Target, Check } from 'lucide-react';
import {
  FormulaItem,
  calculateNutrients,
  calculateTotalCost,
  calculateTotalWeight,
} from '@/lib/calculations';
import { NutrientGrid } from './NutrientGrid';
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

/** Bilingual names for the 4 LP modes, used in the "showing X recipe" line. */
const MODE_LABEL: Record<OptimisationMode, { en: string; ur: string }> = {
  min_cost:    { en: 'Cheapest',    ur: 'سستا ترین (کم لاگت)' },
  balanced:    { en: 'Balanced',    ur: 'متوازن (بہترین توازن)' },
  max_protein: { en: 'Max Protein', ur: 'زیادہ پروٹین (بڑھوتری)' },
  max_energy:  { en: 'Max Energy',  ur: 'زیادہ توانائی (طاقت و دودھ)' },
};

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
    formulaEditor: language === 'en' ? 'Formula Editor' : 'فارمولا کی تیاری (کلو مقدار)',
    weight: language === 'en' ? 'Weight (kg)' : 'وزن (کلو)',
    price: language === 'en' ? 'Price/kg' : 'قیمت فی کلو (Rs)',
    total: language === 'en' ? 'Total' : 'کل',
    nutrients: language === 'en' ? 'Nutritional Summary' : 'غذائی خلاصہ',
    protein: language === 'en' ? 'Protein (CP)' : 'پروٹین',
    energy: language === 'en' ? 'Energy (ME)' : 'توانائی',
    fiber: language === 'en' ? 'Fiber (NDF)' : 'فائبر',
    adf: language === 'en' ? 'ADF' : 'ADF',
    fat: language === 'en' ? 'Fat' : 'چکنائی',
    dm: language === 'en' ? 'Dry Matter' : 'خشک مادہ (DM)',
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

      {/* Shared with Step 4 so the same numbers look the same in both screens. */}
      <NutrientGrid
        nutrients={nutrients}
        ranges={ranges}
        language={language}
        untargeted="open"
      />

      <div className="text-xs text-gray-500 -mt-2">
        {language === 'en'
          ? '*Concentrate mix only (fed with forage/hay/silage). All values on DM basis.'
          : '*صرف ونڈہ فارمولا (سبز چارے یا سائیلج کے ساتھ دیا جاتا ہے)۔'}
      </div>

      {/* Auto-Formulate — least-cost LP solver */}
      <div className="bg-gradient-to-br from-[#0e3b5e]/5 via-[#558b2f]/5 to-[#0e3b5e]/10 border-2 border-[#0e3b5e]/20 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0e3b5e] to-[#558b2f] text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-[#0e3b5e]/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-extrabold text-[#0e3b5e]">
                {language === 'en' ? 'Auto-Formulate' : 'خودکار فارمولا (سائز اور توازن)'}
              </h4>
              {(() => {
                const lockCount = formula.filter((f) => f.locked).length;
                if (lockCount === 0) return null;
                return (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    <Lock className="w-3 h-3 text-amber-700" />
                    {lockCount} {language === 'en' ? 'locked' : 'مقفل'}
                  </span>
                );
              })()}
            </div>
            <p className="text-[11px] text-[#0e3b5e]/80 leading-relaxed font-medium">
              {afMode
                ? (language === 'en'
                    ? <>Showing the <strong>{MODE_LABEL[afMode].en}</strong> recipe. Tap another to compare.</>
                    : <>یہ <strong>{MODE_LABEL[afMode].ur}</strong> فارمولا ہے۔ موازنے کے لیے دوسرا آپشن چنائیں۔</>)
                : formula.some((f) => f.locked)
                  ? (language === 'en'
                      ? 'Optimises unlocked ingredients while keeping locked ones fixed.'
                      : 'مقفل اجزاء ثابت رہیں گے اور باقی اجزاء خودکار متوازن ہوں گے۔')
                  : (language === 'en'
                      ? 'Pick how you want the mix optimised for this animal and stage.'
                      : 'جانور اور مرحلے کی ضرورت کے مطابق بہترین فارمولا منتخب کریں:')}
            </p>
          </div>
        </div>

        {/* 4 optimisation mode buttons */}
        <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {([
            { mode: 'min_cost',    icon: <Coins  className="w-4 h-4" />, labelEn: 'Cheapest',    labelUr: 'سستا ترین',      tipEn: 'Minimise cost',                       tipUr: 'کم ترین لاگت پر فارمولا بنائیں' },
            { mode: 'balanced',    icon: <Target className="w-4 h-4" />, labelEn: 'Balanced',    labelUr: 'متوازن',         tipEn: 'Centre every nutrient in its range',  tipUr: 'تمام ضرورتوں کو بہترین توازن دیں' },
            { mode: 'max_protein', icon: <Beef   className="w-4 h-4" />, labelEn: 'Max Protein', labelUr: 'زیادہ پروٹین',   tipEn: 'Richest in CP (kg)',                  tipUr: 'جانور کی تیزی سے بڑھوتری کے لیے' },
            { mode: 'max_energy',  icon: <Zap    className="w-4 h-4" />, labelEn: 'Max Energy',  labelUr: 'زیادہ توانائی',  tipEn: 'Highest ME (Mcal)',                   tipUr: 'زیادہ دودھ اور توانائی کے لیے' },
          ] as const).map((m) => {
            const busy = afBusyMode === m.mode;
            const anyBusy = afBusyMode !== null;
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
                className={`relative inline-flex flex-col items-center justify-center gap-1.5 text-[11px] font-bold px-2.5 py-3 rounded-xl transition-all disabled:cursor-not-allowed ${
                  busy
                    ? 'bg-gradient-to-br from-[#0e3b5e] to-[#155e75] text-white shadow-lg ring-2 ring-[#0e3b5e]/30'
                    : active
                      ? 'bg-gradient-to-br from-[#0e3b5e] to-[#155e75] text-white shadow-md ring-2 ring-[#0e3b5e]/40'
                      : anyBusy
                        ? 'bg-white/60 text-slate-400 border border-slate-200'
                        : 'bg-white text-[#0e3b5e] border border-slate-200 hover:border-[#558b2f] hover:bg-[#f4f8ee] shadow-xs'
                }`}
              >
                {active && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-white text-[#0e3b5e] flex items-center justify-center shadow-xs">
                    <Check className="w-3 h-3" strokeWidth={3} />
                  </span>
                )}
                {busy ? <Sparkles className="w-4 h-4 animate-pulse text-amber-300" /> : m.icon}
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
              className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-[11px] text-amber-900 leading-relaxed"
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
      <div className="bg-gradient-to-br from-[#0e3b5e]/5 via-[#558b2f]/5 to-[#0e3b5e]/10 rounded-2xl p-4 sm:p-5 border-2 border-[#0e3b5e]/20 space-y-3 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-slate-600 block mb-1 font-medium">
              {t.total} Weight
              <span className="ml-1 text-[10px] text-[#558b2f] font-bold">
                ({language === 'en' ? 'edit to scale' : 'سکیل کے لیے ترمیم کریں'})
              </span>
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={totalWeight || 0}
                onChange={(e) => handleTotalWeightChange(parseFloat(e.target.value) || 0)}
                disabled={totalWeight === 0}
                min="0"
                step="10"
                className="w-24 text-2xl font-extrabold text-[#0e3b5e] bg-white/80 border border-slate-300 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-[#558b2f] focus:border-[#558b2f] disabled:opacity-50 shadow-xs"
              />
              <span className="text-lg font-bold text-[#0e3b5e]">kg</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">as-fed</p>
          </div>
          <div>
            <p className="text-xs text-slate-600 font-medium">{t.total} DM</p>
            <p className="text-2xl font-extrabold text-[#0e3b5e] mt-1">{nutrients.totalDM.toFixed(2)} kg</p>
            <p className="text-xs text-[#558b2f] mt-1 font-bold">{nutrients.dm}% of as-fed</p>
          </div>
          <div>
            <p className="text-xs text-slate-600 font-medium">{t.total} Cost</p>
            <p className="text-2xl font-extrabold text-[#0e3b5e] mt-1">₨{totalCost.toLocaleString('en-PK')}</p>
            <p className="text-xs text-slate-500 mt-1 font-semibold">
              {t.costPerKg}: <span className="text-[#0e3b5e] font-bold">₨{nutrients.perKgPrice}</span>
            </p>
          </div>
        </div>

        {/* Quick batch-size presets — clicking scales the whole formula */}
        {totalWeight > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-2.5 border-t border-slate-200/80">
            <span className="text-[11px] font-bold text-[#0e3b5e]">
              {language === 'en' ? 'Scale to batch:' : 'بیچ سائز:'}
            </span>
            {QUICK_BATCH_SIZES.map((s) => {
              const isActive = Math.abs(totalWeight - s) < 0.5;
              return (
                <button
                  key={s}
                  onClick={() => handleTotalWeightChange(s)}
                  className={`text-xs font-bold px-3 py-1 rounded-full transition-all ${
                    isActive
                      ? 'bg-[#0e3b5e] text-white shadow-sm'
                      : 'bg-white/80 text-[#0e3b5e] hover:bg-white border border-[#0e3b5e]/20 hover:border-[#558b2f]'
                  }`}
                >
                  {s} kg
                </button>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
    </>
  );
}
