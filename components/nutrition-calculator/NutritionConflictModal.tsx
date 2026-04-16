'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { getIngredient, getIngredientIcon, getDefaultIngredient } from '@/lib/constants';

/** One ingredient whose nutrition values differ between saved and current state. */
export interface NutritionConflict {
  key: string;
  name: string;
  /** Fields that differ: fieldName → { saved, current } */
  diffs: { field: string; saved: number; current: number }[];
}

// Nutrition fields we compare (the user-editable ones)
const CMP_FIELDS: { key: string; label: string }[] = [
  { key: 'dm', label: 'DM' }, { key: 'cp', label: 'CP' }, { key: 'me', label: 'ME' },
  { key: 'tdn', label: 'TDN' }, { key: 'ndf', label: 'NDF' }, { key: 'adf', label: 'ADF' },
  { key: 'fat', label: 'Fat' }, { key: 'starch', label: 'Starch' },
  { key: 'ca', label: 'Ca' }, { key: 'p', label: 'P' }, { key: 'ash', label: 'Ash' },
  { key: 'price', label: 'Price' },
];

/**
 * Detect conflicts between saved overrides and current ingredient state.
 * Returns a list of conflicts (empty = no conflicts).
 */
export function detectConflicts(
  formulaKeys: string[],
  savedOverrides: Record<string, Record<string, number>>
): NutritionConflict[] {
  const conflicts: NutritionConflict[] = [];

  for (const key of formulaKeys) {
    const current = getIngredient(key);
    if (!current) continue;

    const defaults = getDefaultIngredient(key);
    if (!defaults) continue;

    // Reconstruct what the ingredient looked like at save time:
    // default values merged with the saved overrides
    const savedOvr = savedOverrides[key] ?? {};
    const savedEffective = { ...defaults, ...savedOvr };

    const diffs: { field: string; saved: number; current: number }[] = [];
    for (const f of CMP_FIELDS) {
      const sv = (savedEffective as any)[f.key] ?? 0;
      const cv = (current as any)[f.key] ?? 0;
      // Use a small epsilon for floating-point comparisons
      if (Math.abs(sv - cv) > 0.0001) {
        diffs.push({ field: f.label, saved: sv, current: cv });
      }
    }
    if (diffs.length > 0) {
      conflicts.push({
        key,
        name: current.nameEn,
        diffs,
      });
    }
  }
  return conflicts;
}

// ---------------------------------------------------------------------------
// Modal component
// ---------------------------------------------------------------------------

interface NutritionConflictModalProps {
  isOpen: boolean;
  language: 'en' | 'ur';
  conflicts: NutritionConflict[];
  onUseCurrent: () => void;
  onUseSaved: () => void;
  onCancel: () => void;
}

export function NutritionConflictModal({
  isOpen,
  language,
  conflicts,
  onUseCurrent,
  onUseSaved,
  onCancel,
}: NutritionConflictModalProps) {
  const t = {
    title:       language === 'en' ? 'Nutrition Values Changed' : 'غذائی اقدار تبدیل ہو گئیں',
    subtitle:    language === 'en'
      ? 'Some ingredients have different nutrition values than when this formula was saved.'
      : 'کچھ اجزاء کی غذائی اقدار محفوظ فارمولے سے مختلف ہیں۔',
    saved:       language === 'en' ? 'Saved' : 'محفوظ',
    current:     language === 'en' ? 'Current' : 'موجودہ',
    useCurrent:  language === 'en' ? 'Use Current Values' : 'موجودہ اقدار استعمال کریں',
    useCurrentDesc: language === 'en'
      ? 'Keep your current ingredient database. Results may differ from when the formula was saved.'
      : 'موجودہ ڈیٹابیس رکھیں۔ نتائج محفوظ فارمولے سے مختلف ہو سکتے ہیں۔',
    useSaved:    language === 'en' ? 'Use Saved Values' : 'محفوظ اقدار واپس لائیں',
    useSavedDesc: language === 'en'
      ? 'Restore the nutrition values from when the formula was saved. Results will match exactly.'
      : 'محفوظ وقت کی غذائی اقدار واپس لائیں۔ نتائج بالکل وہی ہوں گے۔',
    cancel:      language === 'en' ? 'Cancel' : 'منسوخ',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-lg z-[61] max-h-[85vh] flex flex-col"
          >
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              {/* Header */}
              <div className="bg-amber-50 border-b border-amber-200 px-5 py-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-amber-900">{t.title}</h2>
                  <p className="text-xs text-amber-700/80 mt-0.5 leading-relaxed">{t.subtitle}</p>
                </div>
              </div>

              {/* Conflict list */}
              <div className="flex-1 overflow-y-auto px-5 py-4 max-h-[40vh]">
                <div className="space-y-3">
                  {conflicts.map((c) => (
                    <div key={c.key} className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{getIngredientIcon(c.key)}</span>
                        <span className="text-sm font-bold text-slate-900">{c.name}</span>
                      </div>
                      <div className="space-y-1">
                        {c.diffs.map((d) => (
                          <div key={d.field} className="flex items-center gap-2 text-xs">
                            <span className="font-semibold text-slate-600 w-12">{d.field}</span>
                            <span className="font-mono text-red-600 bg-red-50 px-1.5 py-0.5 rounded">{d.saved}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span className="font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{d.current}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="px-5 py-4 border-t border-slate-200 space-y-2">
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={onUseSaved}
                  className="w-full text-left px-4 py-3 rounded-xl bg-amber-50 border-2 border-amber-200 hover:border-amber-400 transition-colors group"
                >
                  <div className="text-sm font-bold text-amber-900">{t.useSaved}</div>
                  <div className="text-[11px] text-amber-700/80 mt-0.5">{t.useSavedDesc}</div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={onUseCurrent}
                  className="w-full text-left px-4 py-3 rounded-xl bg-emerald-50 border-2 border-emerald-200 hover:border-emerald-400 transition-colors group"
                >
                  <div className="text-sm font-bold text-emerald-900">{t.useCurrent}</div>
                  <div className="text-[11px] text-emerald-700/80 mt-0.5">{t.useCurrentDesc}</div>
                </motion.button>

                <button
                  onClick={onCancel}
                  className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-700 py-2 transition-colors"
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
