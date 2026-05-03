'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Beef, Coins, Lock, Pencil, Sparkles, Target, Unlock, Zap, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { calculateTmrNutrients, calculateTotalCost, calculateTotalWeight, type TmrFormulaItem } from '@/lib/tmrCalculations';
import { tmrFormulate } from '@/lib/tmrFormulate';
import { getTmrNutritionRange } from '@/lib/tmrRanges';
import { getAnyIngredient, isForage } from '@/lib/forages';
import { hasOverride } from '@/lib/ingredientOverrides';
import { IngredientDetailModal } from '@/components/nutrition-calculator/IngredientDetailModal';
import type { OptimisationMode } from '@/lib/autoFormulate';

interface TmrStep3FormulaProps {
  language: 'en' | 'ur';
  selectedAnimal: string | null;
  selectedStage: number;
  forageDmPct: number;
  formula: TmrFormulaItem[];
  onFormulaChange: (formula: TmrFormulaItem[]) => void;
  onNext: () => void;
  onBack: () => void;
  /** When true on mount, Step 3 auto-runs the Balanced LP once for a sensible
   *  starting recipe. Parent flips this to false via `onAutoBalanceConsumed`. */
  autoBalanceOnMount?: boolean;
  onAutoBalanceConsumed?: () => void;
}

function NutrientBadge({
  label, value, unit, color, range,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
  range?: { min: number; max: number };
}) {
  const inRange = range ? value >= range.min && value <= range.max : false;
  const bg = inRange ? 'bg-green-500 text-white' : color;
  const labelClr = inRange ? 'text-green-50' : 'text-gray-600';
  const valClr   = inRange ? 'text-white'    : 'text-gray-900';
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`${bg} px-3 py-2.5 rounded-lg flex flex-col items-center gap-0.5 text-center transition-colors duration-300 border ${inRange ? 'border-green-600' : 'border-transparent'}`}
    >
      <span className={`text-xs font-semibold ${labelClr}`}>{label}</span>
      <span className={`text-base sm:text-lg font-bold ${valClr}`}>
        {value.toFixed(1)}<span className="text-xs ml-1">{unit}</span>
      </span>
      {range && (
        <span className={`text-[10px] ${inRange ? 'text-green-100' : 'text-gray-400'}`}>
          {range.min}–{range.max}{unit}
        </span>
      )}
    </motion.div>
  );
}

export function TmrStep3Formula({
  language,
  selectedAnimal,
  selectedStage,
  forageDmPct,
  formula,
  onFormulaChange,
  onNext,
  onBack,
  autoBalanceOnMount = false,
  onAutoBalanceConsumed,
}: TmrStep3FormulaProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [overrideVer, setOverrideVer] = useState(0);
  void overrideVer; // re-render trigger after editor saves

  const [afError, setAfError] = useState<string | null>(null);
  const [afBusyMode, setAfBusyMode] = useState<OptimisationMode | null>(null);

  const nutrients   = calculateTmrNutrients(formula);
  const totalWeight = calculateTotalWeight(formula);
  const totalCost   = calculateTotalCost(formula);
  const ranges      = getTmrNutritionRange(selectedAnimal, selectedStage);

  // ── Editing handlers ──────────────────────────────────────────────────────
  const handleWeight = (idx: number, kg: number) => {
    const next = [...formula];
    next[idx].kg = Math.max(0, kg);
    onFormulaChange(next);
  };
  const handlePrice = (idx: number, price: number) => {
    const next = [...formula];
    next[idx].price = Math.max(0, price);
    onFormulaChange(next);
  };
  const handleRemove = (idx: number) => {
    onFormulaChange(formula.filter((_, i) => i !== idx));
  };
  const handleToggleLock = (idx: number) => {
    const next = [...formula];
    next[idx] = { ...next[idx], locked: !next[idx].locked };
    onFormulaChange(next);
  };
  const handleTotalWeightChange = (newTotal: number) => {
    if (newTotal <= 0 || totalWeight === 0) return;
    const scale = newTotal / totalWeight;
    onFormulaChange(formula.map((it) => ({ ...it, kg: Math.round(it.kg * scale * 100) / 100 })));
  };

  // ── Auto-Formulate (the LP) ───────────────────────────────────────────────
  const handleAutoFormulate = (mode: OptimisationMode = 'min_cost') => {
    if (!ranges) {
      setAfError(language === 'en' ? 'Pick animal and stage in Step 1.' : 'پہلے مرحلہ 1 میں جانور منتخب کریں۔');
      return;
    }
    if (formula.length === 0) {
      setAfError(language === 'en' ? 'Select some ingredients first.' : 'پہلے اجزاء منتخب کریں۔');
      return;
    }

    setAfBusyMode(mode);
    setAfError(null);

    const batchSize = totalWeight > 0 ? totalWeight : 100;
    const lockedQuantities: Record<string, number> = {};
    for (const item of formula) {
      if (item.locked) lockedQuantities[item.key] = item.kg;
    }

    const result = tmrFormulate({
      ingredientKeys: formula.map((f) => f.key),
      ranges,
      batchSize,
      forageDmPct,
      lockedQuantities,
      mode,
    });

    setAfBusyMode(null);

    if (!result.success) {
      const lead =
        result.reason === 'no_forage'       ? (language === 'en' ? 'No forages selected — go back to Step 2.' : 'چارہ منتخب نہیں — مرحلہ 2 پر جائیں۔') :
        result.reason === 'no_concentrate'  ? (language === 'en' ? 'No concentrates selected — go back to Step 2.' : 'کانسنٹریٹ منتخب نہیں — مرحلہ 2 پر جائیں۔') :
        result.reason === 'missing_data'    ? (language === 'en' ? 'Missing ingredient data.' : 'جزو کا ڈیٹا غائب۔') :
        result.reason === 'no_ingredients'  ? (language === 'en' ? 'No ingredients to optimise.' : 'کوئی اجزاء نہیں۔') :
                                              (language === 'en' ? "Targets can't be met at this DM split" : 'اس DM تقسیم پر اہداف پورے نہیں ہو رہے');
      setAfError(result.bottleneck ? `${lead}: ${result.bottleneck}` : lead);
      return;
    }

    // Apply the optimised quantities to the formula (preserve locked + name)
    const updated = formula.map((item) => {
      if (item.locked) return item;
      const kg = result.quantities[item.key] ?? 0;
      return { ...item, kg: Math.round(kg * 100) / 100 };
    });
    onFormulaChange(updated);

    toast.success(
      language === 'en'
        ? `Auto-formulated — Rs ${result.cost} total, ${result.achievedForagePct}% forage / ${result.achievedConcentratePct}% concentrate.`
        : `فارمولا تیار — کل لاگت Rs ${result.cost}، ${result.achievedForagePct}% چارہ / ${result.achievedConcentratePct}% کانسنٹریٹ۔`,
      { id: 'tmr-af-success', duration: 4000 }
    );
  };

  // ── Auto-run Balanced once when the parent flags this as a fresh entry.
  // Same pattern as the concentrate Step 3 — ref guard prevents re-firing
  // and the parent's `onAutoBalanceConsumed` clears its flag immediately.
  const didAutoBalance = useRef(false);
  useEffect(() => {
    if (!autoBalanceOnMount || didAutoBalance.current) return;
    didAutoBalance.current = true;
    handleAutoFormulate('balanced');
    onAutoBalanceConsumed?.();
    // handleAutoFormulate excluded — re-creating per render would re-fire
    // the effect; the ref guard above is the real safety.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoBalanceOnMount]);

  const t = {
    formulaEditor: language === 'en' ? 'TMR Formula Editor' : 'TMR فارمولا ایڈیٹر',
    autoTitle:     language === 'en' ? 'Auto-Formulate (TMR)' : 'TMR خودکار فارمولا',
    autoSubtitle:  language === 'en'
      ? `Find the cheapest TMR that hits ${forageDmPct}% forage / ${100 - forageDmPct}% concentrate and meets all nutrient targets.`
      : `${forageDmPct}% چارہ / ${100 - forageDmPct}% کانسنٹریٹ تقسیم پر سب سے سستا قابلِ عمل TMR۔`,
    weight:        language === 'en' ? 'Kg' : 'کلو',
    price:         language === 'en' ? 'Rs/kg' : 'فی کلو',
    total:         language === 'en' ? 'Total' : 'کل',
    totalCost:     language === 'en' ? 'Total Cost' : 'کل لاگت',
    perKg:         language === 'en' ? 'Per Kg' : 'فی کلو',
    targetSplit:   language === 'en' ? 'Target DM split' : 'ہدف DM تقسیم',
    actualSplit:   language === 'en' ? 'Actual DM split' : 'موجودہ DM تقسیم',
    forageLabel:   language === 'en' ? 'forage' : 'چارہ',
    concLabel:     language === 'en' ? 'concentrate' : 'کانسنٹریٹ',
    next:          language === 'en' ? 'Next' : 'اگلا',
    back:          language === 'en' ? 'Back' : 'واپس',
    nutrient: {
      protein:    language === 'en' ? 'CP'    : 'پروٹین',
      energy:     language === 'en' ? 'ME'    : 'توانائی',
      tdn:        language === 'en' ? 'TDN'   : 'TDN',
      fiber:      language === 'en' ? 'NDF'   : 'فائبر',
      adf:        language === 'en' ? 'ADF'   : 'ADF',
      fat:        language === 'en' ? 'Fat'   : 'چکنائی',
      starch:     language === 'en' ? 'Starch': 'نشاستہ',
      dm:         language === 'en' ? 'DM'    : 'DM',
      calcium:    language === 'en' ? 'Ca'    : 'کیلشیم',
      phosphorus: language === 'en' ? 'P'     : 'فاسفورس',
      ash:        language === 'en' ? 'Ash'   : 'راکھ',
    },
  };

  // Achieved forage / concentrate split for the live readout
  const achievedForagePct = (nutrients.forageDmShare * 100);
  const achievedConcPct   = (nutrients.concentrateDmShare * 100);
  const splitMatch        = Math.abs(achievedForagePct - forageDmPct) < 0.5;

  return (
    <>
      <IngredientDetailModal
        isOpen={editingKey !== null}
        ingredientKey={editingKey}
        language={language}
        onClose={() => { setEditingKey(null); setOverrideVer((v) => v + 1); }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-5 sm:space-y-6"
      >
        <div>
          <h2 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2 flex items-center gap-2">
            <span className="text-2xl sm:text-3xl">🥗</span>
            {t.formulaEditor}
          </h2>
          <p className="text-gray-600 text-xs sm:text-sm">
            {language === 'en'
              ? 'Hand-edit kg / price, lock items, or run Auto-Formulate.'
              : 'دستی کلو/قیمت ترمیم، مقفل کریں، یا خودکار فارمولا چلائیں۔'}
          </p>
        </div>

        {/* DM-split readout — what the recipe ACTUALLY achieves */}
        <div className={`rounded-lg border-2 p-3 sm:p-4 ${splitMatch ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-700">{t.actualSplit}</p>
              <p className={`text-lg font-bold ${splitMatch ? 'text-emerald-900' : 'text-amber-900'}`}>
                🌿 {achievedForagePct.toFixed(1)}% {t.forageLabel}
                <span className="text-slate-400 mx-2">·</span>
                ⚙️ {achievedConcPct.toFixed(1)}% {t.concLabel}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-700">{t.targetSplit}</p>
              <p className="text-lg font-bold text-slate-900">
                🌿 {forageDmPct}% / ⚙️ {100 - forageDmPct}%
              </p>
            </div>
          </div>
          {!splitMatch && totalWeight > 0 && (
            <p className="mt-2 text-xs text-amber-800">
              {language === 'en'
                ? 'Tip: tap an Auto-Formulate button below to snap the recipe to the target split.'
                : 'اشارہ: نیچے آٹو فارمولیٹ دبائیں تاکہ ترکیب ہدف تقسیم پر آ جائے۔'}
            </p>
          )}
        </div>

        {/* Whole-diet nutrient grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <NutrientBadge label={t.nutrient.protein}    value={nutrients.protein}    unit="%"    color="bg-blue-50"   range={ranges?.protein} />
          <NutrientBadge label={t.nutrient.energy}     value={nutrients.energy}     unit="Mcal" color="bg-amber-50"  range={ranges?.energy} />
          <NutrientBadge label={t.nutrient.tdn}        value={nutrients.tdn}        unit="%"    color="bg-purple-50" range={ranges?.tdn} />
          <NutrientBadge label={t.nutrient.fiber}      value={nutrients.fiber}      unit="%"    color="bg-green-50"  range={ranges?.fiber} />
          <NutrientBadge label={t.nutrient.fat}        value={nutrients.fat}        unit="%"    color="bg-orange-50" range={ranges?.fat} />
          <NutrientBadge label={t.nutrient.calcium}    value={nutrients.calcium}    unit="%"    color="bg-red-50"    range={ranges?.calcium} />
          <NutrientBadge label={t.nutrient.phosphorus} value={nutrients.phosphorus} unit="%"    color="bg-cyan-50"   range={ranges?.phosphorus} />
          <NutrientBadge label={t.nutrient.dm}         value={nutrients.dm}         unit="%"    color="bg-slate-50" />
        </div>

        {/* Auto-Formulate panel */}
        <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 border-2 border-violet-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-violet-900">{t.autoTitle}</h4>
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
              <p className="text-[11px] text-violet-700/80 leading-relaxed">{t.autoSubtitle}</p>
            </div>
          </div>

          {/* 4 LP-objective buttons. Balanced doesn't optimise cost / CP / ME —
              it pulls every nutrient to the MIDDLE of its range, giving a recipe
              that's robust to small ingredient variation. */}
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {([
              { mode: 'min_cost',    icon: <Coins  className="w-4 h-4" />, en: 'Cheapest',    ur: 'سستا' },
              { mode: 'balanced',    icon: <Target className="w-4 h-4" />, en: 'Balanced',    ur: 'متوازن' },
              { mode: 'max_protein', icon: <Beef   className="w-4 h-4" />, en: 'Max Protein', ur: 'زیادہ پروٹین' },
              { mode: 'max_energy',  icon: <Zap    className="w-4 h-4" />, en: 'Max Energy',  ur: 'زیادہ توانائی' },
            ] as const).map((m) => {
              const busy = afBusyMode === m.mode;
              const anyBusy = afBusyMode !== null;
              return (
                <motion.button
                  key={m.mode}
                  whileTap={!anyBusy ? { scale: 0.97 } : undefined}
                  disabled={anyBusy}
                  onClick={() => handleAutoFormulate(m.mode)}
                  className={`inline-flex flex-col items-center justify-center gap-1 text-[11px] font-bold px-2 py-2.5 rounded-lg transition-all disabled:cursor-not-allowed tap-transparent ${
                    busy
                      ? 'bg-gradient-to-br from-violet-700 to-fuchsia-700 text-white shadow-lg ring-2 ring-violet-300'
                      : anyBusy
                        ? 'bg-slate-100 text-slate-400'
                        : 'bg-white text-violet-700 border-2 border-violet-300 hover:bg-gradient-to-br hover:from-violet-600 hover:to-fuchsia-600 hover:text-white hover:border-transparent shadow-sm'
                  }`}
                >
                  {busy ? <Sparkles className="w-4 h-4 animate-pulse" /> : m.icon}
                  <span className="leading-tight text-center">
                    {busy ? (language === 'en' ? 'Optimising…' : 'حساب…') : (language === 'en' ? m.en : m.ur)}
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
                >×</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Formula items (split into Forage block + Concentrate block) */}
        <div className="space-y-4">
          {(['forage', 'concentrate'] as const).map((section) => {
            const items = formula.map((f, idx) => ({ f, idx })).filter(({ f }) =>
              section === 'forage' ? isForage(f.key) : !isForage(f.key)
            );
            if (items.length === 0) return null;

            return (
              <div key={section} className="space-y-2">
                <h3 className="font-bold text-base flex items-center gap-2">
                  <span>{section === 'forage' ? '🌿' : '⚙️'}</span>
                  {section === 'forage'
                    ? (language === 'en' ? 'Forages' : 'چارہ')
                    : (language === 'en' ? 'Concentrates' : 'کانسنٹریٹ')}
                  <span className="text-xs text-gray-500 font-normal">({items.length})</span>
                </h3>
                <div className="space-y-2">
                  {items.map(({ f, idx }) => (
                    <FormulaRow
                      key={f.key}
                      item={f}
                      idx={idx}
                      language={language}
                      labels={{ weight: t.weight, price: t.price }}
                      onWeight={handleWeight}
                      onPrice={handlePrice}
                      onRemove={handleRemove}
                      onToggleLock={handleToggleLock}
                      onEdit={() => setEditingKey(f.key)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg p-4 border border-emerald-200 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-600 block mb-1">
                {t.total} {language === 'en' ? 'Weight' : 'وزن'}
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
                  className="w-24 px-2 py-1 text-sm font-bold rounded border-2 border-emerald-200 bg-white text-emerald-900 focus:border-emerald-500 outline-none"
                />
                <span className="text-sm font-semibold text-emerald-900">kg</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">{t.totalCost}</label>
              <p className="text-base sm:text-lg font-bold text-emerald-900">Rs {totalCost.toFixed(0)}</p>
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">{t.perKg}</label>
              <p className="text-base sm:text-lg font-bold text-emerald-900">Rs {nutrients.perKgPrice}/kg</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
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

// ────────────────────────────────────────────────────────────────────────────
// Single formula-item row — same layout convention as the concentrate calc.
// ────────────────────────────────────────────────────────────────────────────
function FormulaRow({
  item, idx, language, labels, onWeight, onPrice, onRemove, onToggleLock, onEdit,
}: {
  item: TmrFormulaItem;
  idx: number;
  language: 'en' | 'ur';
  labels: { weight: string; price: string };
  onWeight: (idx: number, kg: number) => void;
  onPrice: (idx: number, price: number) => void;
  onRemove: (idx: number) => void;
  onToggleLock: (idx: number) => void;
  onEdit: () => void;
}) {
  const data = getAnyIngredient(item.key);
  const icon = data?.icon ?? (isForage(item.key) ? '🌿' : '⚙️');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
    >
      {/* Top row on mobile: icon + name + remove */}
      <div className="flex items-center gap-3 sm:contents">
        <span className="text-2xl flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{item.name}</p>
            {hasOverride(item.key) && (
              <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" title="Custom nutrition values" />
            )}
          </div>
          <p className="text-xs text-gray-500">
            {item.kg > 0 && `Rs ${((item.price || 0) * item.kg).toFixed(0)}`}
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => onRemove(idx)}
          className="sm:hidden text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors flex-shrink-0 tap-transparent"
          aria-label="Remove item"
        >✕</motion.button>
      </div>

      {/* Bottom row on mobile: controls */}
      <div className="flex gap-2 items-end flex-wrap sm:flex-nowrap">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={onEdit}
          className="p-2 rounded transition-colors text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 tap-transparent"
          title={language === 'en' ? 'Edit nutrition' : 'غذائیت ترمیم'}
          aria-label="Edit nutrition"
        >
          <Pencil className="w-4 h-4" />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => onToggleLock(idx)}
          className={`p-2 rounded transition-colors tap-transparent ${
            item.locked
              ? 'text-amber-700 bg-amber-100 hover:bg-amber-200'
              : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
          }`}
          title={item.locked ? 'Unlock' : 'Lock'}
          aria-label={item.locked ? 'Unlock' : 'Lock'}
        >
          {item.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
        </motion.button>

        <div className="flex flex-col gap-1 flex-1 sm:flex-none min-w-[80px]">
          <label className={`text-xs ${item.locked ? 'text-amber-700 font-semibold' : 'text-gray-500'}`}>
            {labels.weight}{item.locked && ' 🔒'}
          </label>
          <Input
            type="number"
            value={item.kg}
            onChange={(e) => onWeight(idx, parseFloat(e.target.value) || 0)}
            min="0"
            step="0.1"
            className={`w-full sm:w-24 text-sm h-10 ${item.locked ? 'bg-amber-50 border-amber-300 font-semibold text-amber-900' : ''}`}
          />
        </div>

        <div className="flex flex-col gap-1 flex-1 sm:flex-none min-w-[80px]">
          <label className="text-xs text-gray-500">{labels.price}</label>
          <Input
            type="number"
            value={item.price || ''}
            onChange={(e) => onPrice(idx, parseFloat(e.target.value) || 0)}
            placeholder="0"
            min="0"
            step="1"
            className="w-full sm:w-24 text-sm h-10"
          />
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onRemove(idx)}
          className="hidden sm:block text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors tap-transparent"
          aria-label="Remove item"
        >✕</motion.button>
      </div>
    </motion.div>
  );
}
