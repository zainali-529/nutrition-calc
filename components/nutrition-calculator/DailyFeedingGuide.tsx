'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Utensils, Droplets, Info } from 'lucide-react';
import { FormulaItem, calculateNutrients } from '@/lib/calculations';
import {
  calculateFeedingGuide,
  getSuggestedBodyWeight,
  isLactatingStage,
} from '@/lib/feedingGuide';

interface DailyFeedingGuideProps {
  language: 'en' | 'ur';
  animalId: string | null;
  stageIndex: number;
  formula: FormulaItem[];
}

export function DailyFeedingGuide({
  language,
  animalId,
  stageIndex,
  formula,
}: DailyFeedingGuideProps) {
  const nutrients = useMemo(() => calculateNutrients(formula), [formula]);
  const lactating = isLactatingStage(animalId, stageIndex);

  // Body weight: pre-fill with a sensible default for the selected animal/stage
  const [bodyWeight, setBodyWeight] = useState<number>(() =>
    getSuggestedBodyWeight(animalId, stageIndex)
  );
  const [milkYield, setMilkYield] = useState<number>(lactating ? 15 : 0);

  // Re-seed body weight whenever animal/stage changes
  useEffect(() => {
    setBodyWeight(getSuggestedBodyWeight(animalId, stageIndex));
    if (!isLactatingStage(animalId, stageIndex)) setMilkYield(0);
  }, [animalId, stageIndex]);

  const guide = useMemo(
    () =>
      calculateFeedingGuide(
        { animalId, stageIndex, bodyWeightKg: bodyWeight, milkYieldL: milkYield },
        nutrients.dm || 88 // concentrate DM%
      ),
    [animalId, stageIndex, bodyWeight, milkYield, nutrients.dm]
  );

  const t = {
    title:     language === 'en' ? 'Daily Feeding Guide' : 'روزانہ خوراک گائیڈ',
    subtitle:  language === 'en'
      ? 'How much to feed this animal per day'
      : 'اس جانور کو روزانہ کتنا دینا ہے',
    bodyWt:    language === 'en' ? 'Body Weight (kg)' : 'جسمانی وزن (کلو)',
    milk:      language === 'en' ? 'Milk Yield (L/day)' : 'دودھ (لیٹر/دن)',
    dmi:       language === 'en' ? 'Total DM Intake' : 'کل خشک مادہ',
    concentrate: language === 'en' ? 'Concentrate (this formula)' : 'کانسنٹریٹ (یہ فارمولا)',
    forage:    language === 'en' ? 'Green Fodder' : 'سبز چارہ',
    hay:       language === 'en' ? 'or Dry Hay' : 'یا خشک گھاس',
    perDay:    language === 'en' ? 'per day' : 'روزانہ',
    split:     language === 'en' ? 'Ration split' : 'خوراک تقسیم',
    water:     language === 'en'
      ? 'Always provide fresh clean water (~50 L/day for dairy cow, 5 L per L milk)'
      : 'ہمیشہ صاف پانی فراہم کریں (~50 لیٹر/دن)',
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-4 sm:p-5 space-y-4"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-600 text-white flex items-center justify-center flex-shrink-0">
          <Utensils className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-bold text-amber-900">{t.title}</h3>
          <p className="text-xs text-amber-700/80">{t.subtitle}</p>
        </div>
      </div>

      {/* Inputs */}
      <div className={`grid ${lactating ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
        <div>
          <label className="block text-[11px] font-semibold text-amber-900 mb-1">{t.bodyWt}</label>
          <input
            type="number"
            value={bodyWeight || ''}
            onChange={(e) => setBodyWeight(parseFloat(e.target.value) || 0)}
            min={1}
            step={5}
            className="w-full px-3 py-2 rounded-lg border-2 border-amber-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-400/30 outline-none text-base font-bold text-amber-900"
          />
        </div>
        {lactating && (
          <div>
            <label className="block text-[11px] font-semibold text-amber-900 mb-1">{t.milk}</label>
            <input
              type="number"
              value={milkYield || ''}
              onChange={(e) => setMilkYield(parseFloat(e.target.value) || 0)}
              min={0}
              step={0.5}
              className="w-full px-3 py-2 rounded-lg border-2 border-amber-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-400/30 outline-none text-base font-bold text-amber-900"
            />
          </div>
        )}
      </div>

      {/* Results grid */}
      {guide && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <ResultCard
              icon="🍽️"
              label={t.dmi}
              value={`${guide.totalDmiKg.toFixed(1)} kg`}
              sublabel={t.perDay}
              tone="slate"
            />
            <ResultCard
              icon="⚙️"
              label={t.concentrate}
              value={`${guide.concentrateAsFedKg.toFixed(1)} kg`}
              sublabel={`${guide.concentratePct}% ${language === 'en' ? 'of DMI' : 'کا'}`}
              tone="emerald"
            />
            <ResultCard
              icon="🌿"
              label={t.forage}
              value={`${guide.forageAsFedKg.toFixed(1)} kg`}
              sublabel={`${t.hay}: ${guide.hayAsFedKg.toFixed(1)} kg`}
              tone="green"
            />
          </div>

          {/* Ration split visual */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider">{t.split}</span>
              <span className="text-[10px] text-amber-700/70">DM basis</span>
            </div>
            <div className="flex h-6 rounded-full overflow-hidden border border-amber-200 bg-white">
              <div
                className="bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white transition-all"
                style={{ width: `${guide.concentratePct}%` }}
                title="Concentrate"
              >
                {guide.concentratePct}%
              </div>
              <div
                className="bg-green-600 flex items-center justify-center text-[10px] font-bold text-white transition-all"
                style={{ width: `${guide.foragePct}%` }}
                title="Forage"
              >
                {guide.foragePct}%
              </div>
            </div>
          </div>

          {/* Practical notes */}
          {guide.notes.length > 0 && (
            <div className="bg-white/60 backdrop-blur-sm border border-amber-200 rounded-lg p-3 space-y-1">
              {guide.notes.map((n, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px] text-amber-900 leading-relaxed">
                  <Info className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <span>{n}</span>
                </div>
              ))}
            </div>
          )}

          {/* Water reminder */}
          <div className="flex items-start gap-2 text-[11px] text-blue-800 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <Droplets className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <span>{t.water}</span>
          </div>
        </>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Result card
// ---------------------------------------------------------------------------
function ResultCard({
  icon,
  label,
  value,
  sublabel,
  tone,
}: {
  icon: string;
  label: string;
  value: string;
  sublabel: string;
  tone: 'slate' | 'emerald' | 'green';
}) {
  const tones: Record<string, string> = {
    slate:   'bg-white border-slate-200',
    emerald: 'bg-emerald-50 border-emerald-200',
    green:   'bg-green-50 border-green-200',
  };
  const textTones: Record<string, string> = {
    slate:   'text-slate-900',
    emerald: 'text-emerald-900',
    green:   'text-green-900',
  };
  return (
    <div className={`border rounded-lg px-3 py-2.5 ${tones[tone]}`}>
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-base">{icon}</span>
        <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider truncate">{label}</span>
      </div>
      <div className={`text-lg font-bold ${textTones[tone]}`}>{value}</div>
      <div className="text-[10px] text-slate-500">{sublabel}</div>
    </div>
  );
}
