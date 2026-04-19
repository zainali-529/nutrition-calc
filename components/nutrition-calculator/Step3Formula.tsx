'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Sparkles, AlertTriangle, Lock, Unlock, Coins, Beef, Zap } from 'lucide-react';
import { FormulaItem, calculateNutrients, calculateTotalCost, calculateTotalWeight } from '@/lib/calculations';
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
}

function NutrientBadge({
  label,
  value,
  unit,
  color,
  range,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
  range?: { min: number; max: number };
}) {
  const isInRange = range ? value >= range.min && value <= range.max : false;
  const bgColor = isInRange ? 'bg-green-500 text-white' : color;
  const labelColor = isInRange ? 'text-green-50' : 'text-gray-600';
  const valueColor = isInRange ? 'text-white' : 'text-gray-900';

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`${bgColor} px-4 py-3 rounded-lg flex flex-col items-center gap-1 text-center transition-colors duration-300 border ${isInRange ? 'border-green-600' : 'border-transparent'}`}
    >
      <span className={`text-xs font-semibold ${labelColor}`}>{label}</span>
      <span className={`text-lg font-bold ${valueColor}`}>
        {value.toFixed(1)}
        <span className="text-xs ml-1">{unit}</span>
      </span>
      {range && (
        <span className={`text-[10px] ${isInRange ? 'text-green-100' : 'text-gray-400'}`}>
          {range.min}-{range.max}{unit}
        </span>
      )}
    </motion.div>
  );
}

export function Step3Formula({
  language,
  formula,
  selectedAnimal,
  selectedStage,
  onFormulaChange,
  onNext,
  onBack,
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

  const handleWeightChange = (index: number, newWeight: number) => {
    const updated = [...formula];
    updated[index].kg = Math.max(0, newWeight);
    onFormulaChange(updated);
  };

  const handlePriceChange = (index: number, newPrice: number) => {
    const updated = [...formula];
    updated[index].price = Math.max(0, newPrice);
    onFormulaChange(updated);
  };

  const handleRemove = (index: number) => {
    const updated = formula.filter((_, i) => i !== index);
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

      {/* Nutritional Summary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        <NutrientBadge label={t.protein} value={nutrients.protein} unit="%" color="bg-blue-50" range={ranges?.protein} />
        <NutrientBadge label={t.energy} value={nutrients.energy} unit="Mcal" color="bg-amber-50" range={ranges?.energy} />
        <NutrientBadge label={t.tdn} value={nutrients.tdn} unit="%" color="bg-purple-50" range={ranges?.tdn} />
        <NutrientBadge label={t.fiber} value={nutrients.fiber} unit="%" color="bg-green-50" range={ranges?.fiber} />

        <NutrientBadge label={t.adf} value={nutrients.adf} unit="%" color="bg-indigo-50" />
        <NutrientBadge label={t.fat} value={nutrients.fat} unit="%" color="bg-orange-50" range={ranges?.fat} />
        <NutrientBadge label={t.starch} value={nutrients.starch} unit="%" color="bg-yellow-50" />
        <NutrientBadge label={t.dm} value={nutrients.dm} unit="%" color="bg-slate-50" />

        <NutrientBadge label={t.calcium} value={nutrients.calcium} unit="%" color="bg-red-50" range={ranges?.calcium} />
        <NutrientBadge label={t.phosphorus} value={nutrients.phosphorus} unit="%" color="bg-cyan-50" range={ranges?.phosphorus} />
        <NutrientBadge label={t.ash} value={nutrients.ash} unit="%" color="bg-gray-50" />
      </motion.div>
      
      <div className="text-center text-xs text-gray-500 -mt-2">
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
              {formula.some((f) => f.locked)
                ? (language === 'en'
                    ? 'Optimises unlocked ingredients while keeping locked ones fixed.'
                    : 'غیر مقفل اجزاء کو بہتر کرتا ہے، مقفل اجزاء ثابت رہتے ہیں۔')
                : (language === 'en'
                    ? 'Find the cheapest mix that meets all nutrient targets for this animal/stage.'
                    : 'اس جانور/مرحلے کے لیے سب سے سستا فارمولا خود تلاش کریں۔')}
            </p>
          </div>
        </div>

        {/* 3 optimisation mode buttons — each triggers a different LP objective */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {([
            { mode: 'min_cost',    icon: <Coins className="w-4 h-4" />, labelEn: 'Cheapest',    labelUr: 'سستا',      tipEn: 'Minimise cost',        tipUr: 'کم قیمت' },
            { mode: 'max_protein', icon: <Beef  className="w-4 h-4" />, labelEn: 'Max Protein', labelUr: 'زیادہ پروٹین', tipEn: 'Richest in CP (kg)',  tipUr: 'زیادہ پروٹین' },
            { mode: 'max_energy',  icon: <Zap   className="w-4 h-4" />, labelEn: 'Max Energy',  labelUr: 'زیادہ توانائی', tipEn: 'Highest ME (Mcal)',   tipUr: 'زیادہ توانائی' },
          ] as const).map((m) => {
            const busy = afBusyMode === m.mode;
            const anyBusy = afBusyMode !== null;
            return (
              <motion.button
                key={m.mode}
                whileHover={!anyBusy ? { scale: 1.03, y: -1 } : undefined}
                whileTap={!anyBusy ? { scale: 0.97 } : undefined}
                disabled={anyBusy}
                onClick={() => handleAutoFormulate(m.mode)}
                title={language === 'en' ? m.tipEn : m.tipUr}
                className={`inline-flex flex-col items-center justify-center gap-1 text-[11px] font-bold px-2 py-2.5 rounded-lg transition-all disabled:cursor-not-allowed ${
                  busy
                    ? 'bg-gradient-to-br from-violet-700 to-fuchsia-700 text-white shadow-lg ring-2 ring-violet-300'
                    : anyBusy
                      ? 'bg-slate-100 text-slate-400'
                      : 'bg-white text-violet-700 border-2 border-violet-300 hover:bg-gradient-to-br hover:from-violet-600 hover:to-fuchsia-600 hover:text-white hover:border-transparent shadow-sm'
                }`}
              >
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
              className="bg-white rounded-lg p-4 border border-gray-200 flex items-center gap-4"
            >
              <span className="text-2xl">{getIngredientIcon(item.key)}</span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                  {hasOverride(item.key) && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" title={language === 'en' ? 'Custom nutrition values' : 'ترمیم شدہ غذائیت'} />
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {item.kg > 0 && `₨${((item.price || 0) * item.kg).toFixed(0)}`}
                </p>
              </div>

              <div className="flex gap-2 items-center">
                {/* Edit nutrition — opens the detail modal */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setEditingKey(item.key)}
                  className="p-2 rounded transition-colors text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                  title={language === 'en' ? 'Edit nutrition' : 'غذائیت ترمیم'}
                >
                  <Pencil className="w-4 h-4" />
                </motion.button>

                {/* Lock toggle — when locked, Auto-Formulate keeps this kg fixed */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleToggleLock(idx)}
                  className={`p-2 rounded transition-colors ${
                    item.locked
                      ? 'text-amber-700 bg-amber-100 hover:bg-amber-200'
                      : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                  }`}
                  title={
                    item.locked
                      ? (language === 'en' ? 'Unlock (let Auto-Formulate adjust)' : 'غیر مقفل')
                      : (language === 'en' ? 'Lock at this value (Auto-Formulate will preserve)' : 'اس قدر پر مقفل کریں')
                  }
                >
                  {item.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                </motion.button>

                <div className="flex flex-col gap-1">
                  <label className={`text-xs ${item.locked ? 'text-amber-700 font-semibold' : 'text-gray-500'}`}>
                    {t.weight}{item.locked && ' 🔒'}
                  </label>
                  <Input
                    type="number"
                    value={item.kg}
                    onChange={(e) => handleWeightChange(idx, parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.1"
                    className={`w-24 text-sm ${item.locked ? 'bg-amber-50 border-amber-300 font-semibold text-amber-900' : ''}`}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">{t.price}</label>
                  <Input
                    type="number"
                    value={item.price || ''}
                    onChange={(e) => handlePriceChange(idx, parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                    step="1"
                    className="w-24 text-sm"
                  />
                </div>

                {item.key !== 'mineral_mix' && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleRemove(idx)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors"
                    title="Remove item"
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

      {/* Action Buttons */}
      <div className="flex gap-3 pt-8">
        <Button variant="outline" onClick={onBack} className="flex-1">
          {t.back}
        </Button>
        <Button onClick={onNext} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
          {t.next}
        </Button>
      </div>
    </motion.div>
    </>
  );
}
