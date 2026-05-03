'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { calculateTmrNutrients, type TmrFormulaItem } from '@/lib/tmrCalculations';
import { getTmrNutritionRange } from '@/lib/tmrRanges';
import { TmrDailyFeedingGuide } from './TmrDailyFeedingGuide';

interface TmrStep4StatusProps {
  language: 'en' | 'ur';
  selectedAnimal: string | null;
  selectedStage: number;
  forageDmPct: number;
  formula: TmrFormulaItem[];
  onNext: () => void;
  onBack: () => void;
}

function StatusRow({
  label, value, unit, range, decimals = 1,
}: {
  label: string;
  value: number;
  unit: string;
  range?: { min: number; max: number };
  decimals?: number;
}) {
  const inRange = range ? value >= range.min && value <= range.max : false;
  const status: 'success' | 'warning' | 'error' = !range ? 'success' :
    inRange                                    ? 'success' :
    value >= range.min * 0.85 && value <= range.max * 1.15 ? 'warning' : 'error';

  const bg =
    status === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
    status === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-900' :
                           'bg-red-50 border-red-200 text-red-900';
  const dot =
    status === 'success' ? 'bg-emerald-500' :
    status === 'warning' ? 'bg-amber-500'   :
                           'bg-red-500';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded-lg px-3 py-2.5 ${bg} flex items-center justify-between gap-3`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
        <span className="text-sm font-semibold truncate">{label}</span>
      </div>
      <div className="text-right flex-shrink-0">
        <span className="text-base font-bold">{value.toFixed(decimals)}{unit}</span>
        {range && (
          <span className="block text-[10px] opacity-70">
            target {range.min}–{range.max}{unit}
          </span>
        )}
      </div>
    </motion.div>
  );
}

export function TmrStep4Status({
  language,
  selectedAnimal,
  selectedStage,
  forageDmPct,
  formula,
  onNext,
  onBack,
}: TmrStep4StatusProps) {
  const nutrients = calculateTmrNutrients(formula);
  const ranges = getTmrNutritionRange(selectedAnimal, selectedStage);

  const achievedForage = nutrients.forageDmShare * 100;
  const achievedConc   = nutrients.concentrateDmShare * 100;
  const splitMatch     = Math.abs(achievedForage - forageDmPct) < 0.5;

  const t = {
    title:        language === 'en' ? 'Whole-Diet Review' : 'مکمل خوراک کا جائزہ',
    subtitle:     language === 'en'
      ? 'How the complete TMR (forage + concentrate combined) compares to the targets.'
      : 'مکمل TMR (چارہ + کانسنٹریٹ) کا اہداف سے موازنہ۔',
    splitTitle:   language === 'en' ? 'DM Split (achieved)' : 'DM تقسیم (حاصل شدہ)',
    splitTarget:  language === 'en' ? 'target' : 'ہدف',
    nutrientsTitle: language === 'en' ? 'Whole-Diet Nutrients (DM basis)' : 'مکمل خوراک کے غذائی اجزاء (DM)',
    next:         language === 'en' ? 'Next' : 'اگلا',
    back:         language === 'en' ? 'Back' : 'واپس',
    cp:           language === 'en' ? 'Crude Protein'  : 'پروٹین',
    me:           language === 'en' ? 'Energy (ME)'    : 'توانائی',
    tdn:          language === 'en' ? 'TDN'            : 'TDN',
    ndf:          language === 'en' ? 'Fiber (NDF)'    : 'فائبر',
    fat:          language === 'en' ? 'Fat'            : 'چکنائی',
    ca:           language === 'en' ? 'Calcium'        : 'کیلشیم',
    p:            language === 'en' ? 'Phosphorus'     : 'فاسفورس',
    dm:           language === 'en' ? 'Dry Matter'     : 'خشک مادہ',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2 flex items-center gap-2">
          <span className="text-2xl sm:text-3xl">📊</span>
          {t.title}
        </h2>
        <p className="text-gray-600 text-xs sm:text-sm">{t.subtitle}</p>
      </div>

      {/* DM-split status */}
      <div className={`rounded-xl border-2 p-4 ${splitMatch ? 'bg-emerald-50 border-emerald-300' : 'bg-amber-50 border-amber-300'}`}>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">{t.splitTitle}</p>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className={`text-2xl font-bold ${splitMatch ? 'text-emerald-900' : 'text-amber-900'}`}>
              🌿 {achievedForage.toFixed(1)}% / ⚙️ {achievedConc.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              {t.splitTarget}: 🌿 {forageDmPct}% / ⚙️ {100 - forageDmPct}%
            </p>
          </div>
          {!splitMatch && (
            <p className="text-xs text-amber-800 max-w-xs">
              {language === 'en'
                ? 'Tip: re-run Auto-Formulate in Step 3 to lock the split.'
                : 'مرحلہ 3 میں آٹو فارمولیٹ دوبارہ چلائیں۔'}
            </p>
          )}
        </div>
      </div>

      {/* Whole-diet nutrient list */}
      <div>
        <h3 className="font-bold text-base mb-2">{t.nutrientsTitle}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <StatusRow label={t.cp}  value={nutrients.protein}    unit="%"        range={ranges?.protein}    decimals={1} />
          <StatusRow label={t.me}  value={nutrients.energy}     unit=" Mcal/kg" range={ranges?.energy}     decimals={2} />
          <StatusRow label={t.tdn} value={nutrients.tdn}        unit="%"        range={ranges?.tdn}        decimals={1} />
          <StatusRow label={t.ndf} value={nutrients.fiber}      unit="%"        range={ranges?.fiber}      decimals={1} />
          <StatusRow label={t.fat} value={nutrients.fat}        unit="%"        range={ranges?.fat}        decimals={1} />
          <StatusRow label={t.ca}  value={nutrients.calcium}    unit="%"        range={ranges?.calcium}    decimals={2} />
          <StatusRow label={t.p}   value={nutrients.phosphorus} unit="%"        range={ranges?.phosphorus} decimals={2} />
          <StatusRow label={t.dm}  value={nutrients.dm}         unit="%"        decimals={1} />
        </div>
      </div>

      {/* Daily Feeding Guide (TMR variant — uses total DM not concentrate) */}
      <TmrDailyFeedingGuide
        language={language}
        animalId={selectedAnimal}
        stageIndex={selectedStage}
        formula={formula}
        forageDmPct={forageDmPct}
      />

      {/* Action buttons */}
      <div className="flex gap-3 pt-6 sm:pt-8">
        <Button variant="outline" onClick={onBack} className="flex-1 h-12 sm:h-10 tap-transparent">
          {t.back}
        </Button>
        <Button onClick={onNext} className="flex-1 h-12 sm:h-10 bg-emerald-600 hover:bg-emerald-700 text-white tap-transparent">
          {t.next}
        </Button>
      </div>
    </motion.div>
  );
}
