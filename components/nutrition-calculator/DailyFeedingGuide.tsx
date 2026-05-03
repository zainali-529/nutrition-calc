'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Utensils, Droplets, Info, Beef, Sprout, Baby, Scale } from 'lucide-react';
import { FormulaItem, calculateNutrients } from '@/lib/calculations';
import {
  calculateConcentrateGuide,
  getFeedingMode,
  getSuggestedBodyWeight,
  isLactatingStage,
  type FeedingMode,
  type ConcentrateBreakdownLine,
} from '@/lib/feedingGuide';

interface DailyFeedingGuideProps {
  language: 'en' | 'ur';
  animalId: string | null;
  stageIndex: number;
  formula: FormulaItem[];
}

// ---------------------------------------------------------------------------
// Per-mode visual identity — icon + a bundle of EXPLICIT Tailwind classes.
// (Dynamic class interpolation like `bg-${accent}-600` doesn't work with the
//  JIT compiler, so each look ships its own complete class strings.)
// ---------------------------------------------------------------------------
type ModeLook = {
  icon: React.ComponentType<{ className?: string }>;
  label: { en: string; ur: string };
  /** Outer card gradient + border */
  cardClass: string;
  /** Header pill (small badge next to title) */
  pillClass: string;
  /** Header icon-square (10×10 with white icon) */
  iconBoxClass: string;
  /** Title colour */
  titleClass: string;
  /** Subtle text on cards (input labels, body copy) */
  bodyTextClass: string;
  /** Headline result block — solid gradient block with white text */
  headlineClass: string;
  /** Input border + focus ring */
  inputClass: string;
  /** Breakdown card (white-on-soft) */
  breakdownCardClass: string;
  /** Notes wrapper */
  notesCardClass: string;
};

const MODE_LOOK: Record<FeedingMode, ModeLook> = {
  lactation: {
    icon: Sprout,
    label: { en: 'Lactating', ur: 'دودھیل' },
    cardClass:          'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200',
    pillClass:          'bg-amber-100 text-amber-800 border-amber-200',
    iconBoxClass:       'bg-amber-600 text-white',
    titleClass:         'text-amber-900',
    bodyTextClass:      'text-amber-700/80',
    headlineClass:      'bg-gradient-to-br from-amber-600 to-orange-500 text-white',
    inputClass:         'border-amber-200 focus:border-amber-500 focus:ring-amber-400/30 text-amber-900',
    breakdownCardClass: 'bg-white border-amber-200 text-amber-900',
    notesCardClass:     'bg-white/70 border-amber-200 text-amber-900',
  },
  fattening: {
    icon: Beef,
    label: { en: 'Fattening', ur: 'موٹا کرنا' },
    cardClass:          'bg-gradient-to-br from-rose-50 to-red-50 border-rose-200',
    pillClass:          'bg-rose-100 text-rose-800 border-rose-200',
    iconBoxClass:       'bg-rose-600 text-white',
    titleClass:         'text-rose-900',
    bodyTextClass:      'text-rose-700/80',
    headlineClass:      'bg-gradient-to-br from-rose-600 to-red-500 text-white',
    inputClass:         'border-rose-200 focus:border-rose-500 focus:ring-rose-400/30 text-rose-900',
    breakdownCardClass: 'bg-white border-rose-200 text-rose-900',
    notesCardClass:     'bg-white/70 border-rose-200 text-rose-900',
  },
  growth: {
    icon: Baby,
    label: { en: 'Growing', ur: 'بڑھنے والا' },
    cardClass:          'bg-gradient-to-br from-sky-50 to-blue-50 border-sky-200',
    pillClass:          'bg-sky-100 text-sky-800 border-sky-200',
    iconBoxClass:       'bg-sky-600 text-white',
    titleClass:         'text-sky-900',
    bodyTextClass:      'text-sky-700/80',
    headlineClass:      'bg-gradient-to-br from-sky-600 to-blue-500 text-white',
    inputClass:         'border-sky-200 focus:border-sky-500 focus:ring-sky-400/30 text-sky-900',
    breakdownCardClass: 'bg-white border-sky-200 text-sky-900',
    notesCardClass:     'bg-white/70 border-sky-200 text-sky-900',
  },
  maintenance: {
    icon: Scale,
    label: { en: 'Maintenance', ur: 'بحالی' },
    cardClass:          'bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200',
    pillClass:          'bg-violet-100 text-violet-800 border-violet-200',
    iconBoxClass:       'bg-violet-600 text-white',
    titleClass:         'text-violet-900',
    bodyTextClass:      'text-violet-700/80',
    headlineClass:      'bg-gradient-to-br from-violet-600 to-purple-500 text-white',
    inputClass:         'border-violet-200 focus:border-violet-500 focus:ring-violet-400/30 text-violet-900',
    breakdownCardClass: 'bg-white border-violet-200 text-violet-900',
    notesCardClass:     'bg-white/70 border-violet-200 text-violet-900',
  },
};

// Bilingual labels for each breakdown line type
const BREAKDOWN_LABEL: Record<ConcentrateBreakdownLine['kind'], { en: string; ur: string }> = {
  maintenance:    { en: 'Maintenance allowance',          ur: 'بحالی کی مقدار'        },
  milk:           { en: 'Milk-yield allowance',           ur: 'دودھ کی مقدار'         },
  fattening:      { en: 'Fattening allowance',            ur: 'موٹا کرنے کی مقدار'    },
  growth:         { en: 'Growth allowance',               ur: 'نشوونما کی مقدار'      },
  pregnancy_dry:  { en: 'Pregnancy / dry-period allowance', ur: 'حمل / خشک دور'        },
};

export function DailyFeedingGuide({
  language,
  animalId,
  stageIndex,
  formula,
}: DailyFeedingGuideProps) {
  const nutrients = useMemo(() => calculateNutrients(formula), [formula]);
  const lactating = isLactatingStage(animalId, stageIndex);
  const mode = getFeedingMode(animalId, stageIndex);

  // Body weight: pre-fill with a sensible default for the selected animal/stage
  const [bodyWeight, setBodyWeight] = useState<number>(() =>
    getSuggestedBodyWeight(animalId, stageIndex)
  );
  const [milkYield, setMilkYield] = useState<number>(lactating ? 15 : 0);

  // Re-seed body weight & reset milk whenever animal/stage changes
  useEffect(() => {
    setBodyWeight(getSuggestedBodyWeight(animalId, stageIndex));
    if (!isLactatingStage(animalId, stageIndex)) setMilkYield(0);
    else if (milkYield === 0) setMilkYield(15);
    // milkYield intentionally not in dep array — only re-seed on animal/stage change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animalId, stageIndex]);

  // Compute the concentrate-only feeding plan
  const guide = useMemo(
    () =>
      calculateConcentrateGuide(
        { animalId, stageIndex, bodyWeightKg: bodyWeight, milkYieldL: milkYield },
        nutrients.perKgPrice || 0
      ),
    [animalId, stageIndex, bodyWeight, milkYield, nutrients.perKgPrice]
  );

  // ── Localised labels ──────────────────────────────────────────────────────
  const t = {
    title:      language === 'en' ? 'Daily Concentrate Guide' : 'روزانہ کانسنٹریٹ گائیڈ',
    subtitle:   language === 'en'
      ? 'How much of THIS concentrate to feed per day'
      : 'اس کانسنٹریٹ کو روزانہ کتنا دینا ہے',
    bodyWt:     language === 'en' ? 'Body Weight (kg)' : 'جسمانی وزن (کلو)',
    milk:       language === 'en' ? 'Milk Yield (L/day)' : 'دودھ (لیٹر/دن)',
    feedDaily:  language === 'en' ? 'Feed per day' : 'روزانہ خوراک',
    perDay:     language === 'en' ? 'per day' : 'روزانہ',
    breakdown:  language === 'en' ? 'How we calculated it' : 'حساب کا طریقہ',
    dailyCost:  language === 'en' ? 'Daily cost' : 'روزانہ خرچ',
    atPrice:    language === 'en' ? 'at' : 'بقدر',
    perKg:      language === 'en' ? '/kg as-fed' : 'فی کلو',
    forageNote: language === 'en'
      ? 'Feed alongside fresh forage, hay, or silage as the farmer normally provides. TMR mode (concentrate + forage combined) is coming soon.'
      : 'تازہ چارہ، گھاس یا سائیلج کے ساتھ دیں جیسا کسان عام طور پر کرتا ہے۔ TMR موڈ (مکمل ملا ہوا راشن) جلد آ رہا ہے۔',
    water:      language === 'en'
      ? 'Always provide fresh clean water (≈50 L/day for dairy cow, 5 L per L of milk extra)'
      : 'ہمیشہ صاف پانی فراہم کریں (دودھیل گائے کے لیے ~50 لیٹر/دن، ہر لیٹر دودھ پر اضافی 5 لیٹر)',
    needAnimal: language === 'en'
      ? 'Select animal and stage in Step 1 to see the feeding guide'
      : 'خوراک گائیڈ کے لیے مرحلہ 1 میں جانور منتخب کریں',
  };

  if (!animalId) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center text-sm text-slate-500">
        <Utensils className="w-8 h-8 mx-auto mb-2 opacity-40" />
        {t.needAnimal}
      </div>
    );
  }

  // Mode-driven look (icon + accent colour) — pre-baked class strings
  const look = mode ? MODE_LOOK[mode] : MODE_LOOK.maintenance;
  const Icon = look.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border-2 rounded-xl p-4 sm:p-5 space-y-4 ${look.cardClass}`}
    >
      {/* ──────── Header ──────── */}
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${look.iconBoxClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`text-base font-bold ${look.titleClass}`}>{t.title}</h3>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${look.pillClass}`}>
              {language === 'en' ? look.label.en : look.label.ur}
            </span>
          </div>
          <p className={`text-xs ${look.bodyTextClass}`}>{t.subtitle}</p>
        </div>
      </div>

      {/* ──────── Inputs ──────── */}
      <div className={`grid ${lactating ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-3`}>
        <div>
          <label className={`block text-[11px] font-semibold mb-1 ${look.titleClass}`}>{t.bodyWt}</label>
          <input
            type="number"
            value={bodyWeight || ''}
            onChange={(e) => setBodyWeight(parseFloat(e.target.value) || 0)}
            min={1}
            step={5}
            className={`w-full px-3 py-2 rounded-lg border-2 outline-none text-base font-bold bg-white focus:ring-2 ${look.inputClass}`}
          />
        </div>
        {lactating && (
          <div>
            <label className={`block text-[11px] font-semibold mb-1 ${look.titleClass}`}>{t.milk}</label>
            <input
              type="number"
              value={milkYield || ''}
              onChange={(e) => setMilkYield(parseFloat(e.target.value) || 0)}
              min={0}
              step={0.5}
              className={`w-full px-3 py-2 rounded-lg border-2 outline-none text-base font-bold bg-white focus:ring-2 ${look.inputClass}`}
            />
          </div>
        )}
      </div>

      {/* ──────── Result + breakdown ──────── */}
      {guide && (
        <>
          {/* The headline number — what the farmer should ACTUALLY do */}
          <div className={`rounded-xl px-4 py-4 sm:px-5 sm:py-5 shadow-md ${look.headlineClass}`}>
            <div className="flex items-end justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs opacity-85 uppercase tracking-wider font-semibold">{t.feedDaily}</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl sm:text-4xl font-bold leading-none">
                    {guide.concentrateKgPerDay.toFixed(2)}
                  </span>
                  <span className="text-base sm:text-lg font-semibold opacity-90">kg</span>
                </div>
                <p className="text-[11px] opacity-80 mt-1">{t.perDay}</p>
              </div>
              {guide.dailyCostRs > 0 && (
                <div className="text-right">
                  <p className="text-xs opacity-85 uppercase tracking-wider font-semibold">{t.dailyCost}</p>
                  <p className="text-xl sm:text-2xl font-bold leading-tight">
                    Rs {guide.dailyCostRs.toLocaleString()}
                  </p>
                  <p className="text-[10px] opacity-80">
                    {t.atPrice} Rs {guide.perKgPriceRs.toFixed(2)}{t.perKg}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Breakdown — show the math so the farmer learns the rule */}
          <div className={`rounded-lg p-3 sm:p-4 border ${look.breakdownCardClass}`}>
            <p className={`text-[10px] font-semibold uppercase tracking-wider mb-2 ${look.titleClass}`}>
              {t.breakdown}
            </p>
            <ul className="space-y-1.5">
              {guide.breakdown.map((line, idx) => (
                <li key={idx} className="flex items-baseline justify-between gap-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <span className={`font-semibold ${look.titleClass}`}>
                      {language === 'en' ? BREAKDOWN_LABEL[line.kind].en : BREAKDOWN_LABEL[line.kind].ur}
                    </span>
                    <span className="text-gray-500 text-xs ml-2">{line.formula}</span>
                  </div>
                  <span className={`font-bold flex-shrink-0 ${look.titleClass}`}>
                    {line.kg.toFixed(2)} kg
                  </span>
                </li>
              ))}
              {guide.breakdown.length > 1 && (
                <li className="flex items-baseline justify-between gap-3 text-sm pt-1.5 border-t border-gray-200">
                  <span className="font-bold text-gray-900">
                    {language === 'en' ? 'Total' : 'کل'}
                  </span>
                  <span className={`font-bold ${look.titleClass}`}>
                    {guide.concentrateKgPerDay.toFixed(2)} kg
                  </span>
                </li>
              )}
            </ul>
            <p className={`mt-2 text-[11px] leading-relaxed italic ${look.bodyTextClass}`}>
              {language === 'en' ? guide.rationaleEn : guide.rationaleUr}
            </p>
          </div>

          {/* Practical farmer-side notes */}
          {guide.notesEn.length > 0 && (
            <div className={`backdrop-blur-sm rounded-lg p-3 space-y-1 border ${look.notesCardClass}`}>
              {(language === 'en' ? guide.notesEn : guide.notesUr).map((n, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px] leading-relaxed">
                  <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 opacity-70" />
                  <span>{n}</span>
                </div>
              ))}
            </div>
          )}

          {/* Concentrate-only reminder + TMR teaser */}
          <div className="flex items-start gap-2 text-[11px] text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3">
            <Sprout className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span>{t.forageNote}</span>
          </div>

          {/* Water reminder — universal */}
          <div className="flex items-start gap-2 text-[11px] text-blue-800 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <Droplets className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <span>{t.water}</span>
          </div>
        </>
      )}
    </motion.div>
  );
}
