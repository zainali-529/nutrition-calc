'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil } from 'lucide-react';
import { FormulaItem, calculateNutrients, calculateTotalCost, calculateTotalWeight } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NUTRITION_RANGES, getIngredientIcon } from '@/lib/constants';
import { hasOverride } from '@/lib/ingredientOverrides';
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

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">{t.weight}</label>
                  <Input
                    type="number"
                    value={item.kg}
                    onChange={(e) => handleWeightChange(idx, parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.1"
                    className="w-24 text-sm"
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
      <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg p-4 border border-emerald-200">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-600">{t.total} Weight</p>
            <p className="text-2xl font-bold text-emerald-700">{totalWeight.toFixed(1)} kg</p>
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
