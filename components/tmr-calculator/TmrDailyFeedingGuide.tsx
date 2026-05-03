'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Utensils, Droplets, Scale } from 'lucide-react';
import { calculateTmrNutrients, type TmrFormulaItem } from '@/lib/tmrCalculations';
import { getSuggestedBodyWeight, isLactatingStage } from '@/lib/feedingGuide';

interface TmrDailyFeedingGuideProps {
  language: 'en' | 'ur';
  animalId: string | null;
  stageIndex: number;
  formula: TmrFormulaItem[];
  forageDmPct: number;
}

/**
 * For TMR, daily intake is driven by total DMI (% body weight) — the user
 * eats the COMPLETE ration, not just concentrate. So:
 *   • DMI    = BW × dmiPct/100  (+ milk yield bump for lactation)
 *   • TMR    = DMI / DM_of_TMR   (kg of as-fed mix)
 *   • Of that, forage_DM_kg / conc_DM_kg are split per the achieved DM ratio
 *
 * Reference DMI %:
 *   Dairy cow lactating: 3.5-4.0 % BW + 0.4 kg DMI per L milk
 *   Buffalo lactating:   3.5-4.0 % BW + 0.45 kg DMI per L milk
 *   Goat lactating:      4.0-4.5 % BW + 0.2 kg DMI per L milk
 *   Heifer growing:      2.5-3.0 % BW
 *   Fattening bull:      2.5-3.0 % BW
 *   Fattening goat:      3.5-4.0 % BW
 *   Dry cow:             1.8-2.2 % BW
 */

const DMI_PCT: Record<string, number[]> = {
  dairy_cow:      [4.0, 3.7, 3.3, 2.0],   // early/mid/late/dry
  dairy_buffalo:  [4.0, 3.7, 3.3, 2.0],
  heifer:         [3.5, 2.8, 2.2],        // calf/growing/pregnant
  fattening_bull: [3.0, 2.7, 2.5],        // starter/grower/finisher
  dairy_goat:     [4.5, 4.0, 3.5, 2.5],
  fattening_goat: [4.0, 3.5],
};

const MILK_DMI_KG_PER_L: Record<string, number> = {
  dairy_cow:     0.40,
  dairy_buffalo: 0.45,
  dairy_goat:    0.20,
};

export function TmrDailyFeedingGuide({
  language,
  animalId,
  stageIndex,
  formula,
  forageDmPct,
}: TmrDailyFeedingGuideProps) {
  const nutrients = useMemo(() => calculateTmrNutrients(formula), [formula]);
  const lactating = isLactatingStage(animalId, stageIndex);

  const [bodyWeight, setBodyWeight] = useState<number>(() =>
    getSuggestedBodyWeight(animalId, stageIndex)
  );
  const [milkYield, setMilkYield] = useState<number>(lactating ? 15 : 0);

  useEffect(() => {
    setBodyWeight(getSuggestedBodyWeight(animalId, stageIndex));
    if (!isLactatingStage(animalId, stageIndex)) setMilkYield(0);
    else if (milkYield === 0) setMilkYield(15);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animalId, stageIndex]);

  const guide = useMemo(() => {
    if (!animalId || bodyWeight <= 0) return null;
    const dmiPct = DMI_PCT[animalId]?.[stageIndex];
    if (dmiPct == null) return null;

    let totalDmiKg = bodyWeight * (dmiPct / 100);
    const milkBump = MILK_DMI_KG_PER_L[animalId] ?? 0;
    if (lactating && milkYield > 0) totalDmiKg += milkYield * milkBump;

    // Convert TOTAL DMI to as-fed using the TMR's own DM% (not just concentrate's)
    const tmrDmPct = nutrients.dm > 0 ? nutrients.dm : 50;
    const tmrAsFedKg = totalDmiKg / (tmrDmPct / 100);

    // Daily cost — per-kg as-fed × kg of TMR
    const dailyCostRs = Math.round(tmrAsFedKg * (nutrients.perKgPrice || 0));

    // Split of that TMR into forage / concentrate (using achieved share)
    const forageDmKg     = totalDmiKg * (forageDmPct / 100);
    const concentrateDmKg = totalDmiKg - forageDmKg;

    return {
      totalDmiKg:    Math.round(totalDmiKg * 100) / 100,
      tmrAsFedKg:    Math.round(tmrAsFedKg * 100) / 100,
      forageDmKg:    Math.round(forageDmKg * 100) / 100,
      concentrateDmKg: Math.round(concentrateDmKg * 100) / 100,
      dailyCostRs,
      tmrDmPct:      Math.round(tmrDmPct * 10) / 10,
    };
  }, [animalId, stageIndex, bodyWeight, milkYield, lactating, nutrients.dm, nutrients.perKgPrice, forageDmPct]);

  const t = {
    title:        language === 'en' ? 'Daily TMR Intake Guide' : 'روزانہ TMR گائیڈ',
    subtitle:     language === 'en'
      ? 'How much of THIS TMR mix to feed per day, on a complete-diet basis.'
      : 'اس TMR کا روزانہ کتنا کھلایا جائے۔',
    bodyWt:       language === 'en' ? 'Body Weight (kg)' : 'جسمانی وزن (کلو)',
    milk:         language === 'en' ? 'Milk Yield (L/day)' : 'دودھ (لیٹر/دن)',
    feedDaily:    language === 'en' ? 'Feed per day (TMR as-fed)' : 'روزانہ TMR (تازہ وزن)',
    perDay:       language === 'en' ? 'per day' : 'روزانہ',
    breakdown:    language === 'en' ? 'Breakdown (DM basis)' : 'تقسیم (خشک مادہ پر)',
    forage:       language === 'en' ? 'Forage' : 'چارہ',
    concentrate:  language === 'en' ? 'Concentrate' : 'کانسنٹریٹ',
    totalDmi:     language === 'en' ? 'Total DM intake' : 'کل خشک مادہ',
    dailyCost:    language === 'en' ? 'Daily cost' : 'روزانہ خرچ',
    water:        language === 'en'
      ? 'Always provide fresh clean water (≈50 L/day for dairy cow + 5 L per L of milk)'
      : 'ہمیشہ صاف پانی فراہم کریں (دودھیل گائے ~50 لیٹر/دن، ہر لیٹر دودھ پر 5 لیٹر اضافی)',
    needAnimal:   language === 'en'
      ? 'Select animal in Step 1 to see the feeding guide.'
      : 'فیڈنگ گائیڈ کے لیے مرحلہ 1 میں جانور منتخب کریں۔',
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
      className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl p-4 sm:p-5 space-y-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
          <Scale className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-emerald-900">{t.title}</h3>
          <p className="text-xs text-emerald-700/80">{t.subtitle}</p>
        </div>
      </div>

      <div className={`grid ${lactating ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-3`}>
        <div>
          <label className="block text-[11px] font-semibold text-emerald-900 mb-1">{t.bodyWt}</label>
          <input
            type="number"
            value={bodyWeight || ''}
            onChange={(e) => setBodyWeight(parseFloat(e.target.value) || 0)}
            min={1} step={5}
            className="w-full px-3 py-2 rounded-lg border-2 border-emerald-200 bg-white text-base font-bold text-emerald-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-300 outline-none"
          />
        </div>
        {lactating && (
          <div>
            <label className="block text-[11px] font-semibold text-emerald-900 mb-1">{t.milk}</label>
            <input
              type="number"
              value={milkYield || ''}
              onChange={(e) => setMilkYield(parseFloat(e.target.value) || 0)}
              min={0} step={0.5}
              className="w-full px-3 py-2 rounded-lg border-2 border-emerald-200 bg-white text-base font-bold text-emerald-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-300 outline-none"
            />
          </div>
        )}
      </div>

      {guide && (
        <>
          {/* Headline number — kg of TMR as-fed per day */}
          <div className="bg-gradient-to-br from-emerald-600 to-green-500 text-white rounded-xl px-4 py-4 sm:px-5 sm:py-5 shadow-md">
            <div className="flex items-end justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs opacity-85 uppercase tracking-wider font-semibold">{t.feedDaily}</p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl sm:text-4xl font-bold leading-none">
                    {guide.tmrAsFedKg.toFixed(1)}
                  </span>
                  <span className="text-base sm:text-lg font-semibold opacity-90">kg</span>
                </div>
                <p className="text-[11px] opacity-80 mt-1">
                  {t.perDay} • {guide.totalDmiKg.toFixed(2)} kg DM • TMR is {guide.tmrDmPct}% DM
                </p>
              </div>
              {guide.dailyCostRs > 0 && (
                <div className="text-right">
                  <p className="text-xs opacity-85 uppercase tracking-wider font-semibold">{t.dailyCost}</p>
                  <p className="text-xl sm:text-2xl font-bold leading-tight">Rs {guide.dailyCostRs.toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>

          {/* Forage / Concentrate breakdown (DM basis) */}
          <div className="bg-white border border-emerald-200 rounded-lg p-3 sm:p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 mb-2">
              {t.breakdown}
            </p>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">🌿 {t.forage}</p>
                <p className="text-base font-bold text-emerald-900">{guide.forageDmKg.toFixed(2)} kg DM</p>
                <p className="text-[10px] text-emerald-600">{forageDmPct}%</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">⚙️ {t.concentrate}</p>
                <p className="text-base font-bold text-amber-900">{guide.concentrateDmKg.toFixed(2)} kg DM</p>
                <p className="text-[10px] text-amber-600">{100 - forageDmPct}%</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">{t.totalDmi}</p>
                <p className="text-base font-bold text-slate-900">{guide.totalDmiKg.toFixed(2)} kg DM</p>
                <p className="text-[10px] text-slate-500">100%</p>
              </div>
            </div>
          </div>

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
