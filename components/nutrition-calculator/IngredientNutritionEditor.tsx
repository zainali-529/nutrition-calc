'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Save, X } from 'lucide-react';
import { getIngredient, getDefaultIngredient, type Ingredient } from '@/lib/constants';
import { saveOverride, removeOverride, hasOverride, type IngredientOverride } from '@/lib/ingredientOverrides';

// ---------------------------------------------------------------------------
// Editable field descriptors
// ---------------------------------------------------------------------------
const FIELDS: {
  key: keyof IngredientOverride;
  labelEn: string;
  labelUr: string;
  unit: string;
  step: number;
  color: string;
}[] = [
  { key: 'dm',     labelEn: 'DM',         labelUr: 'خشک مادہ',  unit: '%',      step: 0.1,  color: 'border-slate-300' },
  { key: 'cp',     labelEn: 'CP',         labelUr: 'پروٹین',   unit: '%',      step: 0.1,  color: 'border-blue-300' },
  { key: 'me',     labelEn: 'ME',         labelUr: 'توانائی',   unit: 'Mcal',   step: 0.01, color: 'border-amber-300' },
  { key: 'tdn',    labelEn: 'TDN',        labelUr: 'TDN',       unit: '%',      step: 0.1,  color: 'border-purple-300' },
  { key: 'ndf',    labelEn: 'NDF',        labelUr: 'NDF',       unit: '%',      step: 0.1,  color: 'border-green-300' },
  { key: 'adf',    labelEn: 'ADF',        labelUr: 'ADF',       unit: '%',      step: 0.1,  color: 'border-indigo-300' },
  { key: 'fat',    labelEn: 'Fat',        labelUr: 'چکنائی',   unit: '%',      step: 0.1,  color: 'border-orange-300' },
  { key: 'starch', labelEn: 'Starch',     labelUr: 'نشاستہ',   unit: '%',      step: 0.1,  color: 'border-yellow-300' },
  { key: 'ca',     labelEn: 'Calcium',    labelUr: 'کیلشیم',   unit: '%',      step: 0.01, color: 'border-red-300' },
  { key: 'p',      labelEn: 'Phosphorus', labelUr: 'فاسفورس',  unit: '%',      step: 0.01, color: 'border-cyan-300' },
  { key: 'ash',    labelEn: 'Ash',        labelUr: 'راکھ',     unit: '%',      step: 0.1,  color: 'border-gray-300' },
  { key: 'price',  labelEn: 'Price',      labelUr: 'قیمت',     unit: 'Rs/kg',  step: 1,    color: 'border-emerald-300' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface IngredientNutritionEditorProps {
  ingredientKey: string;
  language: 'en' | 'ur';
  onSave: () => void;
  onCancel: () => void;
  compact?: boolean;      // true = inline (Step 3), false = full (modal)
}

export function IngredientNutritionEditor({
  ingredientKey,
  language,
  onSave,
  onCancel,
  compact = false,
}: IngredientNutritionEditorProps) {
  const defaults = useMemo(() => getDefaultIngredient(ingredientKey), [ingredientKey]);
  const current  = useMemo(() => getIngredient(ingredientKey),        [ingredientKey]);
  const isModified = hasOverride(ingredientKey);

  // Local form state — initialised from current (includes existing overrides)
  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const f of FIELDS) {
      init[f.key] = (current as any)?.[f.key] ?? 0;
    }
    return init;
  });

  if (!defaults || !current) return null;

  const handleChange = (key: string, raw: string) => {
    const num = parseFloat(raw);
    setValues((prev) => ({ ...prev, [key]: isNaN(num) ? 0 : num }));
  };

  const handleSave = () => {
    const override: IngredientOverride = {};
    for (const f of FIELDS) {
      (override as any)[f.key] = values[f.key];
    }
    saveOverride(ingredientKey, override, defaults as any);
    onSave();
  };

  const handleReset = () => {
    removeOverride(ingredientKey);
    // Reset local form to defaults
    const reset: Record<string, number> = {};
    for (const f of FIELDS) {
      reset[f.key] = (defaults as any)[f.key] ?? 0;
    }
    setValues(reset);
  };

  const isDirty = (key: string): boolean => {
    return values[key] !== (defaults as any)[key];
  };

  const t = {
    save:    language === 'en' ? 'Save Changes' : 'تبدیلیاں محفوظ کریں',
    reset:   language === 'en' ? 'Reset to Default' : 'ڈیفالٹ پر واپس',
    cancel:  language === 'en' ? 'Cancel' : 'منسوخ',
    dmBasis: language === 'en' ? 'All values on DM basis' : 'تمام اقدار خشک مادہ پر',
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className={compact ? 'pt-3' : ''}
    >
      {/* Hint */}
      <p className="text-[10px] text-slate-500 mb-2">{t.dmBasis}</p>

      {/* Fields grid */}
      <div className={`grid gap-2 ${compact ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
        {FIELDS.map((f) => {
          const changed = isDirty(f.key);
          return (
            <div key={f.key} className="relative">
              <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                {f[language === 'en' ? 'labelEn' : 'labelUr']}
                <span className="text-[9px] text-slate-400 ml-1">{f.unit}</span>
                {changed && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" title="Modified" />}
              </label>
              <input
                type="number"
                value={values[f.key]}
                onChange={(e) => handleChange(f.key, e.target.value)}
                step={f.step}
                min={0}
                className={`w-full text-sm font-medium rounded-md border px-2 py-1.5 outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all ${
                  changed
                    ? `${f.color} bg-amber-50/50`
                    : 'border-slate-200 bg-white'
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className={`flex items-center gap-2 mt-3 ${compact ? 'flex-wrap' : ''}`}>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Save className="w-3.5 h-3.5" />
          {t.save}
        </motion.button>

        {(isModified || FIELDS.some((f) => isDirty(f.key))) && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t.reset}
          </motion.button>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          {t.cancel}
        </motion.button>
      </div>
    </motion.div>
  );
}
