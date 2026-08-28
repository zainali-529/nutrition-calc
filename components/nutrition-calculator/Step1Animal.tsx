'use client';

import { motion } from 'framer-motion';
import { ANIMALS, STAGES, getNutritionRange, NutrientRange } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { QuickStartTemplates } from './QuickStartTemplates';
import type { QuickStartTemplate } from '@/lib/templates';

interface Step1AnimalProps {
  language: 'en' | 'ur';
  selectedAnimal: string | null;
  selectedStage: number;
  onAnimalSelect: (animal: string) => void;
  onStageSelect: (stage: number) => void;
  onNext: () => void;
  onBack?: () => void;
  /** When provided, the Quick-Start gallery is shown above the animal grid. */
  onUseTemplate?: (template: QuickStartTemplate) => void;
}

function formatRange(r: { min: number; max: number }, decimals: number, unit = '%'): string {
  return `${r.min.toFixed(decimals)}–${r.max.toFixed(decimals)}${unit}`;
}

/** Split stage label into main title and parenthesized range e.g. "Early Lactation" and "(0–100 days)". */
function parseStageLabel(stage: string): { title: string; subtitle?: string } {
  const match = stage.match(/^(.*?)\s*(\(.*\))$/);
  if (match) {
    return { title: match[1].trim(), subtitle: match[2].trim() };
  }
  return { title: stage };
}

function TargetCard({
  language,
  range,
}: {
  language: 'en' | 'ur';
  range: NutrientRange;
}) {
  const t = {
    title:     language === 'en' ? 'Concentrate Mix Targets' : 'ونڈہ فارمولا کے غذائی اہداف',
    subtitle:  language === 'en'
      ? 'For the concentrate portion only — animal also receives forage, hay, or silage. All values on DM basis.'
      : 'صرف ونڈہ خوارک کے لیے — جانور کو پٹھا (سبز چارہ) یا توڑی علیحدہ دی جائے گی۔',
    protein:   language === 'en' ? 'Crude Protein' : 'پروٹین',
    energy:    language === 'en' ? 'Energy (ME)' : 'توانائی',
    tdn:       language === 'en' ? 'TDN' : 'TDN',
    fiber:     language === 'en' ? 'Fiber (NDF)' : 'فائبر',
    fat:       language === 'en' ? 'Fat' : 'چکنائی',
    calcium:   language === 'en' ? 'Calcium' : 'کیلشیم',
    phosphorus:language === 'en' ? 'Phosphorus' : 'فاسفورس',
  };

  const items = [
    { label: t.protein,    value: formatRange(range.protein,    0),           color: 'bg-blue-50    text-blue-900    border-blue-200' },
    { label: t.energy,     value: formatRange(range.energy,     2, ' Mcal'),  color: 'bg-amber-50   text-amber-900   border-amber-200' },
    { label: t.tdn,        value: formatRange(range.tdn,        0),           color: 'bg-purple-50  text-purple-900  border-purple-200' },
    { label: t.fiber,      value: formatRange(range.fiber,      0),           color: 'bg-green-50   text-green-900   border-green-200' },
    { label: t.fat,        value: formatRange(range.fat,        1),           color: 'bg-orange-50  text-orange-900  border-orange-200' },
    { label: t.calcium,    value: formatRange(range.calcium,    2),           color: 'bg-red-50     text-red-900     border-red-200' },
    { label: t.phosphorus, value: formatRange(range.phosphorus, 2),           color: 'bg-cyan-50    text-cyan-900    border-cyan-200' },
  ];

  return (
    <motion.div
      key={JSON.stringify(range)} // re-animate when range changes
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-[#0e3b5e]/5 via-[#558b2f]/5 to-[#0e3b5e]/10 border-2 border-[#0e3b5e]/20 rounded-xl p-4 sm:p-5 shadow-xs"
    >
      <h4 className="text-sm font-extrabold text-[#0e3b5e] mb-1 flex items-center gap-2">
        <span className="text-lg">🎯</span>
        {t.title}
      </h4>
      <p className="text-[11px] text-[#0e3b5e]/80 mb-3 leading-relaxed">{t.subtitle}</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {items.map((item) => (
          <div key={item.label} className={`border rounded-lg px-2.5 py-2 ${item.color}`}>
            <div className="text-[10px] font-semibold opacity-80">{item.label}</div>
            <div className="text-xs font-bold mt-0.5">{item.value}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function AnimalCard({
  animal,
  selected,
  language,
  onSelect,
}: {
  animal: { id: string; icon: string; image?: string; labelEn: string; labelUr: string };
  selected: boolean;
  language: 'en' | 'ur';
  onSelect: () => void;
}) {
  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ scale: 1.03, y: -3 }}
      whileTap={{ scale: 0.97 }}
      className={`relative overflow-hidden rounded-2xl border-2 transition-all p-3.5 sm:p-4 flex flex-col items-center justify-center gap-2.5 min-h-[135px] group ${
        selected
          ? 'border-[#558b2f] bg-[#f4f8ee] shadow-lg shadow-[#558b2f]/20 ring-1 ring-[#558b2f]'
          : 'border-slate-200 bg-white hover:border-[#0e3b5e]/40 hover:shadow-md'
      }`}
    >
      {animal.image ? (
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 shadow-xs flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
          <img
            src={animal.image}
            alt={animal.labelEn}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <span className="text-5xl leading-none">{animal.icon}</span>
      )}
      <span className={`text-xs font-bold text-center leading-tight ${selected ? 'text-[#0e3b5e]' : 'text-slate-800'}`}>
        {animal[language === 'en' ? 'labelEn' : 'labelUr']}
      </span>

      {selected && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          className="absolute top-2.5 right-2.5 w-6 h-6 bg-[#558b2f] text-white rounded-full flex items-center justify-center text-xs font-extrabold shadow-sm z-10"
        >
          ✓
        </motion.div>
      )}
    </motion.button>
  );
}

export function Step1Animal({
  language,
  selectedAnimal,
  selectedStage,
  onAnimalSelect,
  onStageSelect,
  onNext,
  onBack,
  onUseTemplate,
}: Step1AnimalProps) {
  const isComplete = selectedAnimal !== null;

  const stages = selectedAnimal ? STAGES[selectedAnimal as keyof typeof STAGES] : null;
  const stageLabels = stages ? stages[language] : [];
  const activeRange = getNutritionRange(selectedAnimal, selectedStage);

  const t = {
    selectAnimal: language === 'en' ? 'Select Livestock Type' : 'اپنے جانور کا انتخاب کریں',
    selectStage:  language === 'en' ? 'Select Production Stage' : 'جانور کی حالت / مرحلہ منتخب کریں',
    next:         language === 'en' ? 'Next' : 'اگلا',
    back:         language === 'en' ? 'Back' : 'واپس',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6 sm:space-y-8"
    >
      {/* Quick-start templates Accordion — Always visible on Step 1, collapsed by default */}
      {onUseTemplate && (
        <QuickStartTemplates language={language} onUseTemplate={onUseTemplate} />
      )}

      {/* Animal Selection */}
      <div>
        <h3 className="text-lg font-extrabold text-[#0e3b5e] mb-4 flex items-center gap-2">
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

      {/* Stage Selection */}
      {selectedAnimal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h3 className="text-lg font-extrabold text-[#0e3b5e] mb-4 flex items-center gap-2">
            <span className="text-2xl">📅</span>
            {t.selectStage}
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            {stageLabels.map((stage, idx) => {
              const { title, subtitle } = parseStageLabel(stage);
              return (
                <motion.button
                  key={idx}
                  onClick={() => onStageSelect(idx)}
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  className={`min-h-[58px] px-3 py-2.5 rounded-xl border-2 transition-all flex flex-col items-center justify-center text-center tap-transparent ${
                    selectedStage === idx
                      ? 'border-[#0e3b5e] bg-[#0e3b5e]/5 text-[#0e3b5e] font-extrabold shadow-xs ring-1 ring-[#0e3b5e]/20'
                      : 'border-slate-200 bg-white text-slate-700 font-semibold hover:border-[#0e3b5e]/40 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs sm:text-sm font-extrabold leading-tight">{title}</span>
                  {subtitle && (
                    <span className="text-[10px] sm:text-xs font-semibold text-slate-500 opacity-90 mt-0.5 leading-tight">
                      {subtitle}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Target-Range Preview */}
      {activeRange && <TargetCard language={language} range={activeRange} />}
    </motion.div>
  );
}
