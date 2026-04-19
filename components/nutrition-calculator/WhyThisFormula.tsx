'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, ChevronDown, ArrowDown, ArrowUp, Lock as LockIcon, Info } from 'lucide-react';
import type { Diagnostics } from '@/lib/autoFormulate';
import { getIngredient, getIngredientIcon } from '@/lib/constants';

interface WhyThisFormulaProps {
  language: 'en' | 'ur';
  diagnostics: Diagnostics;
  /** Total batch size (kg as-fed) — used to convert caps to kg */
  batchSize: number;
  /** Optional: cost difference vs min-cost mode, in Rs/kg. Shown if provided. */
  costPremium?: number;
}

// Nutrient label maps (user-friendly names + short labels)
const NUTRIENT_LABELS: Record<string, { en: string; ur: string; unit: string }> = {
  protein:    { en: 'Protein (CP)',   ur: 'پروٹین',    unit: '%' },
  energy:     { en: 'Energy (ME)',    ur: 'توانائی',   unit: ' Mcal' },
  tdn:        { en: 'TDN',            ur: 'TDN',       unit: '%' },
  fiber:      { en: 'Fiber (NDF)',    ur: 'فائبر',     unit: '%' },
  fat:        { en: 'Fat',            ur: 'چکنائی',   unit: '%' },
  calcium:    { en: 'Calcium',        ur: 'کیلشیم',   unit: '%' },
  phosphorus: { en: 'Phosphorus',     ur: 'فاسفورس',  unit: '%' },
};

export function WhyThisFormula({ language, diagnostics, batchSize, costPremium }: WhyThisFormulaProps) {
  const [open, setOpen] = useState(true); // default open so farmer learns immediately
  const { bindingNutrients, bindingCaps, unused } = diagnostics;

  const hasAnything = bindingNutrients.length > 0 || bindingCaps.length > 0 || unused.length > 0;
  if (!hasAnything) return null;

  const t = {
    title:      language === 'en' ? 'Why this formula?' : 'یہ فارمولا کیوں؟',
    subtitle:   language === 'en' ? 'The constraints that shaped the recipe' : 'فارمولا کی وجہ',
    atMin:      language === 'en' ? 'at minimum' : 'کم از کم پر',
    atMax:      language === 'en' ? 'at maximum' : 'زیادہ سے زیادہ پر',
    target:     language === 'en' ? 'target' : 'ہدف',
    atCap:      language === 'en' ? 'at its cap' : 'حد پر',
    of:         language === 'en' ? 'of' : 'کا',
    batch:      language === 'en' ? 'batch' : 'بیچ',
    nutrientsHead: language === 'en' ? 'Nutrient bounds hit' : 'ہدف کی حدود',
    capsHead:      language === 'en' ? 'Ingredient caps maxed' : 'اجزاء کی زیادہ سے زیادہ حد',
    unusedHead:    language === 'en' ? 'Not used (not cost-effective)' : 'استعمال نہیں ہوا',
    costPremiumLabel: language === 'en' ? 'Premium over cheapest:' : 'سستے سے زائد قیمت:',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 border-2 border-amber-200 rounded-xl overflow-hidden"
    >
      {/* Header — collapsible toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-amber-100/40 transition-colors text-left"
      >
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-400 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
          <Lightbulb className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-bold text-amber-900">{t.title}</h4>
            {costPremium !== undefined && costPremium > 0.01 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                +₨{costPremium.toFixed(2)}/kg
              </span>
            )}
          </div>
          <p className="text-[11px] text-amber-700/80">{t.subtitle}</p>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-5 h-5 text-amber-700" />
        </motion.div>
      </button>

      {/* Expandable body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">

              {/* Binding nutrients */}
              {bindingNutrients.length > 0 && (
                <DiagSection title={t.nutrientsHead}>
                  {bindingNutrients.map((b) => {
                    const lbl = NUTRIENT_LABELS[b.nutrient] ?? { en: b.nutrient, ur: b.nutrient, unit: '' };
                    const name = language === 'en' ? lbl.en : lbl.ur;
                    const isMin = b.bound === 'min';
                    return (
                      <div
                        key={b.nutrient}
                        className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${
                          isMin ? 'bg-blue-50 border-blue-200' : 'bg-purple-50 border-purple-200'
                        }`}
                      >
                        {isMin
                          ? <ArrowDown className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                          : <ArrowUp   className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs font-bold ${isMin ? 'text-blue-900' : 'text-purple-900'}`}>
                            {name} {isMin ? t.atMin : t.atMax}
                          </div>
                          <div className={`text-[10px] ${isMin ? 'text-blue-700/80' : 'text-purple-700/80'}`}>
                            {b.value}{lbl.unit} ({t.target} {b.target}{lbl.unit})
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </DiagSection>
              )}

              {/* Binding caps */}
              {bindingCaps.length > 0 && (
                <DiagSection title={t.capsHead}>
                  {bindingCaps.map((b) => {
                    const ing = getIngredient(b.ingredientKey);
                    const name = ing ? (language === 'en' ? ing.nameEn : ing.nameUr) : b.ingredientKey;
                    return (
                      <div
                        key={b.ingredientKey}
                        className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-100/60 px-2.5 py-1.5"
                      >
                        <span className="text-lg flex-shrink-0">{getIngredientIcon(b.ingredientKey)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-amber-900 truncate">
                            {name} — {t.atCap}
                          </div>
                          <div className="text-[10px] text-amber-700/80">
                            {b.actualKg} kg ({b.capPercent}% {t.of} {batchSize} kg {t.batch})
                          </div>
                        </div>
                        <LockIcon className="w-3 h-3 text-amber-600 flex-shrink-0" />
                      </div>
                    );
                  })}
                </DiagSection>
              )}

              {/* Unused ingredients */}
              {unused.length > 0 && (
                <DiagSection title={t.unusedHead}>
                  <div className="flex flex-wrap gap-1.5">
                    {unused.map((key) => {
                      const ing = getIngredient(key);
                      const name = ing ? (language === 'en' ? ing.nameEn : ing.nameUr) : key;
                      return (
                        <span
                          key={key}
                          className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200"
                        >
                          <span>{getIngredientIcon(key)}</span>
                          <span>{name}</span>
                        </span>
                      );
                    })}
                  </div>
                </DiagSection>
              )}

              {/* Explainer tail */}
              <div className="flex items-start gap-2 text-[10px] text-amber-900/80 bg-white/50 rounded-md px-2 py-1.5 mt-2">
                <Info className="w-3 h-3 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  {language === 'en'
                    ? 'Binding constraints are the "bottlenecks". Relaxing them (e.g. raising a cap) could change the recipe — often cheaper.'
                    : 'بائنڈنگ پابندیاں وہ چیزیں ہیں جو فارمولے کو محدود کرتی ہیں۔'}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Section wrapper ─────────────────────────────────────────────────────────
function DiagSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h5 className="text-[10px] font-bold text-amber-900/80 uppercase tracking-wider mb-1.5">{title}</h5>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
