'use client';

import { motion } from 'framer-motion';
import { FormulaItem, calculateNutrients, calculateTotalCost, calculateTotalWeight } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Step3FormulaProps {
  language: 'en' | 'ur';
  formula: FormulaItem[];
  onFormulaChange: (formula: FormulaItem[]) => void;
  onNext: () => void;
  onBack: () => void;
}

function NutrientBadge({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`${color} px-4 py-3 rounded-lg flex flex-col items-center gap-1 text-center`}
    >
      <span className="text-xs font-semibold text-gray-600">{label}</span>
      <span className="text-lg font-bold text-gray-900">
        {value.toFixed(1)}
        <span className="text-xs ml-1">{unit}</span>
      </span>
    </motion.div>
  );
}

export function Step3Formula({
  language,
  formula,
  onFormulaChange,
  onNext,
  onBack,
}: Step3FormulaProps) {
  const nutrients = calculateNutrients(formula);
  const totalWeight = calculateTotalWeight(formula);
  const totalCost = calculateTotalCost(formula);

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

  const iconMap: Record<string, string> = {
    corn: '🌽',
    barley: '🌾',
    millet: '🟡',
    rice_polish: '⚪',
    sbm: '🟫',
    csm: '🟨',
    guar: '📦',
    sfm: '🟠',
    rsm: '🟤',
    straw: '🟫',
    hay: '🟩',
    silage: '🟢',
    bypassFat: '🛢️',
    molasses: '🍯',
    wheat_bran: '📦',
    mineral_mix: '💊',
  };

  const t = {
    formulaEditor: language === 'en' ? 'Formula Editor' : 'فارمولا ایڈیٹر',
    weight: language === 'en' ? 'Weight (kg)' : 'وزن (کلو)',
    price: language === 'en' ? 'Price/kg' : 'قیمت فی کلو',
    total: language === 'en' ? 'Total' : 'کل',
    nutrients: language === 'en' ? 'Nutritional Summary' : 'غذائی خلاصہ',
    protein: language === 'en' ? 'Protein' : 'پروٹین',
    energy: language === 'en' ? 'Energy' : 'توانائی',
    fiber: language === 'en' ? 'Fiber' : 'فائبر',
    fat: language === 'en' ? 'Fat' : 'چکنائی',
    next: language === 'en' ? 'Next' : 'اگلا',
    back: language === 'en' ? 'Back' : 'واپس',
  };

  return (
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
        <NutrientBadge label={t.protein} value={nutrients.protein} unit="%" color="bg-blue-50" />
        <NutrientBadge label={t.energy} value={nutrients.energy} unit="MJ/kg" color="bg-amber-50" />
        <NutrientBadge label={t.fiber} value={nutrients.fiber} unit="%" color="bg-green-50" />
        <NutrientBadge label={t.fat} value={nutrients.fat} unit="%" color="bg-orange-50" />
      </motion.div>

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
              <span className="text-2xl">{iconMap[item.key] || '🌾'}</span>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                <p className="text-xs text-gray-500">
                  {item.kg > 0 && `₨${((item.price || 0) * item.kg).toFixed(0)}`}
                </p>
              </div>

              <div className="flex gap-2 items-center">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">{t.weight}</label>
                  <Input
                    type="number"
                    value={item.kg}
                    onChange={(e) => handleWeightChange(idx, parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.1"
                    className="w-16 text-sm"
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
                    className="w-16 text-sm"
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-600">{t.total} Weight</p>
            <p className="text-2xl font-bold text-emerald-700">{totalWeight.toFixed(1)} kg</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">{t.total} Cost</p>
            <p className="text-2xl font-bold text-emerald-700">₨{totalCost.toLocaleString('en-PK')}</p>
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
  );
}
