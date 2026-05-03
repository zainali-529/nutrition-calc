'use client';

import { motion } from 'framer-motion';
import { ANIMALS, STAGES, type NutrientRange } from '@/lib/constants';
import { getTmrNutritionRange } from '@/lib/tmrRanges';
import { Button } from '@/components/ui/button';

interface TmrStep1AnimalSplitProps {
  language: 'en' | 'ur';
  selectedAnimal: string | null;
  selectedStage: number;
  forageDmPct: number;
  onAnimalSelect: (animal: string) => void;
  onStageSelect: (stage: number) => void;
  onForageDmPctChange: (pct: number) => void;
  onNext: () => void;
}

function formatRange(r: { min: number; max: number }, decimals: number, unit = '%'): string {
  return `${r.min.toFixed(decimals)}–${r.max.toFixed(decimals)}${unit}`;
}

function WholeDietTargetCard({ language, range }: { language: 'en' | 'ur'; range: NutrientRange }) {
  const t = {
    title:    language === 'en' ? 'Whole-Diet Targets (TMR)' : 'مکمل خوراک کے ہدف (TMR)',
    subtitle: language === 'en'
      ? 'These are for the COMPLETE ration (forage + concentrate combined). All values on DM basis.'
      : 'یہ مکمل راشن (چارہ + کانسنٹریٹ) کے لیے ہیں۔ تمام اقدار خشک مادہ پر۔',
    protein: language === 'en' ? 'Crude Protein' : 'پروٹین',
    energy:  language === 'en' ? 'Energy (ME)'   : 'توانائی',
    tdn:     language === 'en' ? 'TDN'           : 'TDN',
    fiber:   language === 'en' ? 'Fiber (NDF)'   : 'فائبر',
    fat:     language === 'en' ? 'Fat'           : 'چکنائی',
    calcium: language === 'en' ? 'Calcium'       : 'کیلشیم',
    phos:    language === 'en' ? 'Phosphorus'    : 'فاسفورس',
  };
  const items = [
    { label: t.protein, value: formatRange(range.protein,    0),          color: 'bg-blue-50    text-blue-900    border-blue-200' },
    { label: t.energy,  value: formatRange(range.energy,     2, ' Mcal'), color: 'bg-amber-50   text-amber-900   border-amber-200' },
    { label: t.tdn,     value: formatRange(range.tdn,        0),          color: 'bg-purple-50  text-purple-900  border-purple-200' },
    { label: t.fiber,   value: formatRange(range.fiber,      0),          color: 'bg-green-50   text-green-900   border-green-200' },
    { label: t.fat,     value: formatRange(range.fat,        1),          color: 'bg-orange-50  text-orange-900  border-orange-200' },
    { label: t.calcium, value: formatRange(range.calcium,    2),          color: 'bg-red-50     text-red-900     border-red-200' },
    { label: t.phos,    value: formatRange(range.phosphorus, 2),          color: 'bg-cyan-50    text-cyan-900    border-cyan-200' },
  ];

  return (
    <motion.div
      key={JSON.stringify(range)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl p-4"
    >
      <h4 className="text-sm font-bold text-emerald-900 mb-1 flex items-center gap-2">
        <span className="text-lg">🎯</span>
        {t.title}
      </h4>
      <p className="text-[11px] text-emerald-700/80 mb-3 leading-relaxed">{t.subtitle}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {items.map((item) => (
          <div key={item.label} className={`border rounded-md px-2 py-1.5 ${item.color}`}>
            <div className="text-[10px] font-semibold opacity-80">{item.label}</div>
            <div className="text-xs font-bold">{item.value}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function AnimalCard({
  animal, selected, language, onSelect,
}: {
  animal: { id: string; icon: string; labelEn: string; labelUr: string };
  selected: boolean;
  language: 'en' | 'ur';
  onSelect: () => void;
}) {
  return (
    <motion.button
      onClick={onSelect}
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -3 }}
      className={`relative overflow-hidden rounded-xl border-2 transition-all p-4 flex flex-col items-center justify-center gap-2 min-h-[120px] tap-transparent ${
        selected
          ? 'border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-200'
          : 'border-gray-200 bg-white hover:border-emerald-300 hover:shadow-md'
      }`}
    >
      <span className="text-5xl leading-none">{animal.icon}</span>
      <span className={`text-xs font-semibold text-center leading-tight ${selected ? 'text-emerald-900' : 'text-gray-800'}`}>
        {animal[language === 'en' ? 'labelEn' : 'labelUr']}
      </span>
      {selected && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          className="absolute top-2 right-2 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow"
        >
          ✓
        </motion.div>
      )}
    </motion.button>
  );
}

/**
 * The DM-split slider — the defining feature of TMR formulation. The user
 * picks how much of the diet (on Dry-Matter basis) should come from forage
 * and how much from concentrate. The LP enforces this exactly in Step 3.
 */
function ForageSplitSlider({
  language,
  forageDmPct,
  onChange,
}: {
  language: 'en' | 'ur';
  forageDmPct: number;
  onChange: (pct: number) => void;
}) {
  const concPct = 100 - forageDmPct;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-violet-50 to-fuchsia-50 border-2 border-violet-200 rounded-xl p-4 sm:p-5"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white flex items-center justify-center flex-shrink-0">
          <span className="text-xl">⚖️</span>
        </div>
        <div>
          <h3 className="text-base font-bold text-violet-900">
            {language === 'en' ? 'DM Split (Forage : Concentrate)' : 'DM تقسیم (چارہ : کانسنٹریٹ)'}
          </h3>
          <p className="text-[11px] text-violet-700/80 leading-relaxed">
            {language === 'en'
              ? 'How much of the dry matter should come from each side. Auto-Formulate will hit this exactly.'
              : 'خشک مادے کا کتنا حصہ کس طرف سے آئے۔ آٹو فارمولیٹ بالکل اسی تناسب پر کام کرے گا۔'}
          </p>
        </div>
      </div>

      {/* Visual ratio bar */}
      <div className="flex h-8 rounded-full overflow-hidden border border-violet-300 bg-white shadow-inner mb-3">
        <div
          className="bg-gradient-to-r from-emerald-500 to-emerald-400 flex items-center justify-center text-xs font-bold text-white transition-all duration-200"
          style={{ width: `${forageDmPct}%`, minWidth: forageDmPct > 0 ? '32px' : 0 }}
          title={language === 'en' ? 'Forage' : 'چارہ'}
        >
          🌿 {forageDmPct}%
        </div>
        <div
          className="bg-gradient-to-r from-amber-500 to-amber-400 flex items-center justify-center text-xs font-bold text-white transition-all duration-200"
          style={{ width: `${concPct}%`, minWidth: concPct > 0 ? '32px' : 0 }}
          title={language === 'en' ? 'Concentrate' : 'کانسنٹریٹ'}
        >
          ⚙️ {concPct}%
        </div>
      </div>

      {/* Slider */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-emerald-700 flex-shrink-0">
          {language === 'en' ? 'Forage' : 'چارہ'} 0%
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={forageDmPct}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="flex-1 accent-violet-600 h-2"
          aria-label={language === 'en' ? 'Forage percentage on DM basis' : 'چارے کا فیصد'}
        />
        <span className="text-xs font-bold text-emerald-700 flex-shrink-0">100%</span>
      </div>

      {/* Numeric input for precision */}
      <div className="mt-3 flex items-center gap-2">
        <label className="text-xs font-semibold text-violet-900">
          {language === 'en' ? 'Forage % (DM):' : 'چارہ % (DM):'}
        </label>
        <input
          type="number"
          min={0}
          max={100}
          step={1}
          value={forageDmPct}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-20 h-9 px-2 rounded-md border-2 border-violet-200 bg-white text-sm font-bold text-violet-900 focus:border-violet-500 focus:ring-2 focus:ring-violet-300 outline-none"
        />
        <span className="text-xs text-violet-700">
          {language === 'en' ? `→ Concentrate ${concPct}%` : `→ کانسنٹریٹ ${concPct}%`}
        </span>
      </div>

      {/* Common-default chips */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {[40, 50, 60, 70, 80].map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            className={`text-[11px] px-2.5 py-1 rounded-full border font-semibold transition-all tap-transparent ${
              forageDmPct === preset
                ? 'bg-violet-600 text-white border-violet-700'
                : 'bg-white text-violet-700 border-violet-200 hover:border-violet-400'
            }`}
          >
            {preset}% {language === 'en' ? 'forage' : 'چارہ'}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

export function TmrStep1AnimalSplit({
  language,
  selectedAnimal,
  selectedStage,
  forageDmPct,
  onAnimalSelect,
  onStageSelect,
  onForageDmPctChange,
  onNext,
}: TmrStep1AnimalSplitProps) {
  const isComplete = selectedAnimal !== null;

  const stages = selectedAnimal ? STAGES[selectedAnimal as keyof typeof STAGES] : null;
  const stageLabels = stages ? stages[language] : [];
  const activeRange = getTmrNutritionRange(selectedAnimal, selectedStage);

  const t = {
    selectAnimal: language === 'en' ? 'Select Livestock Type' : 'مویشی کی قسم منتخب کریں',
    selectStage:  language === 'en' ? 'Select Production Stage' : 'پیداواری مرحلہ منتخب کریں',
    next:         language === 'en' ? 'Next' : 'اگلا',
    tmrBanner:    language === 'en'
      ? 'Building a TMR (Total Mixed Ration) — single combined diet with forage AND concentrate, fed together.'
      : 'TMR (مکمل ملا ہوا راشن) بنا رہے ہیں — چارہ اور کانسنٹریٹ ایک ساتھ ملا کر۔',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6 sm:space-y-8"
    >
      {/* TMR-vs-Concentrate banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 flex items-start gap-3">
        <span className="text-xl flex-shrink-0 leading-tight">🥗</span>
        <p className="text-xs text-emerald-900 leading-relaxed">{t.tmrBanner}</p>
      </div>

      {/* Animal selection */}
      <div>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span className="text-2xl">🐄</span>
          {t.selectAnimal}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {ANIMALS.map((animal) => (
            <AnimalCard
              key={animal.id}
              animal={animal}
              selected={selectedAnimal === animal.id}
              language={language}
              onSelect={() => onAnimalSelect(animal.id)}
            />
          ))}
        </div>
      </div>

      {/* Stage selection */}
      {selectedAnimal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">📅</span>
            {t.selectStage}
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {stageLabels.map((stage, idx) => (
              <motion.button
                key={idx}
                onClick={() => onStageSelect(idx)}
                whileTap={{ scale: 0.98 }}
                whileHover={{ x: 4 }}
                className={`min-h-[48px] px-4 py-3 rounded-lg border-2 transition-all font-medium text-left text-sm sm:text-base tap-transparent ${
                  selectedStage === idx
                    ? 'border-violet-500 bg-violet-50 text-violet-900'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-violet-300'
                }`}
              >
                {stage}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* DM split slider — only meaningful after an animal is picked */}
      {selectedAnimal && (
        <ForageSplitSlider language={language} forageDmPct={forageDmPct} onChange={onForageDmPctChange} />
      )}

      {/* Whole-diet target preview */}
      {activeRange && <WholeDietTargetCard language={language} range={activeRange} />}

      {/* Action buttons */}
      <div className="flex gap-3 pt-6 sm:pt-8">
        <Button
          onClick={onNext}
          disabled={!isComplete}
          className="flex-1 h-12 sm:h-10 bg-emerald-600 hover:bg-emerald-700 text-white tap-transparent"
        >
          {t.next}
        </Button>
      </div>
    </motion.div>
  );
}
