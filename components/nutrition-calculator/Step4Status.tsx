'use client';

import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { FormulaItem, calculateNutrients, generateRecommendations } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { NUTRITION_RANGES } from '@/lib/constants';
import { DailyFeedingGuide } from './DailyFeedingGuide';
import { NutrientGrid, TARGETED, countOnTarget } from './NutrientGrid';

interface Step4StatusProps {
  language: 'en' | 'ur';
  formula: FormulaItem[];
  selectedAnimal: string | null;
  selectedStage: number;
  onNext: () => void;
  onBack: () => void;
}

/**
 * One row of actionable advice. Only rendered for nutrients that are actually
 * off target — see the note in Step4Status on why the passing ones are dropped.
 */
function FixRow({
  status,
  title,
  description,
  index,
}: {
  status: 'warning' | 'error';
  title: string;
  description: string;
  index: number;
}) {
  const tone = status === 'error'
    ? { box: 'bg-rose-50 border-rose-200', text: 'text-rose-900', icon: 'text-rose-600' }
    : { box: 'bg-amber-50 border-amber-200', text: 'text-amber-900', icon: 'text-amber-600' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`${tone.box} ${tone.text} rounded-xl border px-3 py-2.5 flex gap-2.5 items-start`}
    >
      <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${tone.icon}`} />
      <div className="min-w-0">
        <span className="text-[13px] font-bold">{title}</span>
        <p className="text-xs opacity-90 leading-snug">{description}</p>
      </div>
    </motion.div>
  );
}

export function Step4Status({ 
  language, 
  formula, 
  selectedAnimal, 
  selectedStage, 
  onNext, 
  onBack 
}: Step4StatusProps) {
  const nutrients = calculateNutrients(formula);
  
  // Get ranges for selected animal and stage
  const animalRanges = selectedAnimal ? NUTRITION_RANGES[selectedAnimal as keyof typeof NUTRITION_RANGES] : null;
  const ranges = animalRanges ? animalRanges[selectedStage] : null;

  /**
   * ONLY the nutrients that need action.
   *
   * `generateRecommendations` returns a row for all seven, and for a passing one
   * that row just says "Protein (CP) is within optimal range" — which the card
   * above it already showed with a green dot and an "on target" label. That made
   * the screen say everything twice and, on a phone, doubled the scrolling for
   * zero information. The passing nutrients collapse into one summary line.
   */
  const fixes = generateRecommendations(nutrients, ranges, language)
    .filter((r): r is typeof r & { status: 'warning' | 'error' } => r.status !== 'success')
    // errors before warnings — worst first
    .sort((a, b) => (a.status === b.status ? 0 : a.status === 'error' ? -1 : 1));

  const onTarget = countOnTarget(nutrients, ranges);
  const allGood = ranges != null && fixes.length === 0;

  const t = {
    nutritionStatus: language === 'en' ? 'Nutrition Status' : 'غذائی تجزیہ اور توازن کی رپورٹ',
    next: language === 'en' ? 'Next' : 'اگلا',
    back: language === 'en' ? 'Back' : 'واپس',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-5"
    >
      {/* Header carries the verdict, so the answer is visible before any scrolling */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <span className="text-2xl sm:text-3xl">📊</span>
            {t.nutritionStatus}
          </h2>
          <p className="text-gray-600 text-xs sm:text-sm font-medium mt-0.5">
            {language === 'en'
              ? 'How your formula compares to this animal’s targets.'
              : 'آپ کے فارمولے کی غذائیت اور جانور کی ضرورت کی مکمل جانچ:'}
          </p>
        </div>
        {ranges && (
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-extrabold px-3.5 py-1.5 rounded-full flex-shrink-0 border shadow-2xs ${
              allGood ? 'bg-[#558b2f]/15 text-[#3d650b] border-[#558b2f]/40' : 'bg-amber-100 text-amber-950 border-amber-300'
            }`}
          >
            {allGood
              ? <><CheckCircle2 className="w-4 h-4 text-[#558b2f]" />{language === 'en' ? 'All targets met' : '✓ ۱۰۰٪ متوازن فارمولا'}</>
              : <><AlertTriangle className="w-4 h-4 text-amber-700" />{onTarget}/{TARGETED.length} {language === 'en' ? 'on target' : 'ضرورتیں پوری'}</>}
          </span>
        )}
      </div>

      {/* Same grid component as Step 3 — the untargeted values collapse here to
          keep the review screen short on a phone. */}
      <NutrientGrid
        nutrients={nutrients}
        ranges={ranges}
        language={language}
        untargeted="collapsed"
      />

      {/* Actionable advice only. When everything passes this is a single line
          instead of seven rows repeating what the cards already said. */}
      {allGood ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-[#558b2f]/40 bg-[#f4f8ee] px-4 py-3.5 shadow-2xs">
          <CheckCircle2 className="w-5 h-5 text-[#558b2f] flex-shrink-0" />
          <p className="text-xs sm:text-sm font-extrabold text-[#0e3b5e]">
            {language === 'en'
              ? 'Every nutrient is within its target range — this formula is ready to feed.'
              : 'تمام غذائی اجزاء جانور کے ہدف کے مطابق ہیں — یہ فارمولا بالکل متوازن اور تیار ہے۔'}
          </p>
        </div>
      ) : fixes.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <span>💡</span>
            {language === 'en'
              ? `What to fix (${fixes.length})`
              : `تجویز کردہ ترمیم (فارمولا بہتر بنانے کے لیے ${fixes.length} تبدیلیاں)`}
          </h3>
          {fixes.map((rec, idx) => (
            <FixRow
              key={rec.nutrient}
              status={rec.status}
              title={rec.nutrient}
              description={rec.recommendation}
              index={idx}
            />
          ))}
        </div>
      )}

      {/* Daily Feeding Guide — how much to feed per day */}
      <DailyFeedingGuide
        language={language}
        animalId={selectedAnimal}
        stageIndex={selectedStage}
        formula={formula}
      />

      <p className="text-[11px] text-slate-600 leading-relaxed flex gap-1.5 font-medium bg-slate-50 border border-slate-200 rounded-xl p-3">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-slate-500" />
        <span>
          {language === 'en'
            ? 'Targets are for the CONCENTRATE mix only — the animal also gets fresh forage, hay or silage on top. Ask a vet for farm-specific adjustments.'
            : 'یہ اہداف صرف ونڈہ فارمولا کے لیے ہیں — جانور کو حسبِ ضرورت سبز چارہ، توڑی یا سائیلج بھی فراہم کریں۔'}
        </span>
      </p>
    </motion.div>
  );
}
