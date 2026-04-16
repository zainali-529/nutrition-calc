'use client';

import { motion } from 'framer-motion';
import { ANIMALS, STAGES, getNutritionRange, NutrientRange } from '@/lib/constants';
import { Button } from '@/components/ui/button';

interface Step1AnimalProps {
  language: 'en' | 'ur';
  selectedAnimal: string | null;
  selectedStage: number;
  onAnimalSelect: (animal: string) => void;
  onStageSelect: (stage: number) => void;
  onNext: () => void;
  onBack?: () => void;
}

function formatRange(r: { min: number; max: number }, decimals: number, unit = '%'): string {
  return `${r.min.toFixed(decimals)}–${r.max.toFixed(decimals)}${unit}`;
}

function TargetCard({
  language,
  range,
}: {
  language: 'en' | 'ur';
  range: NutrientRange;
}) {
  const t = {
    title:     language === 'en' ? 'Concentrate Mix Targets' : 'کانسنٹریٹ ہدف',
    subtitle:  language === 'en'
      ? 'For the concentrate portion only — animal also receives forage, hay, or silage. All values on DM basis.'
      : 'صرف کانسنٹریٹ کے لیے — جانور کو سبز چارہ، گھاس یا سائیلج بھی ملے گا۔ تمام اقدار خشک مادہ پر۔',
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
  animal,
  selected,
  language,
  onSelect,
}: {
  animal: { id: string; icon: string; labelEn: string; labelUr: string };
  selected: boolean;
  language: 'en' | 'ur';
  onSelect: () => void;
}) {
  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ scale: 1.03, y: -3 }}
      whileTap={{ scale: 0.97 }}
      className={`relative overflow-hidden rounded-xl border-2 transition-all p-4 flex flex-col items-center justify-center gap-2 min-h-[120px] ${
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

export function Step1Animal({
  language,
  selectedAnimal,
  selectedStage,
  onAnimalSelect,
  onStageSelect,
  onNext,
  onBack,
}: Step1AnimalProps) {
  const isComplete = selectedAnimal !== null;

  const stages = selectedAnimal ? STAGES[selectedAnimal as keyof typeof STAGES] : null;
  const stageLabels = stages ? stages[language] : [];
  const activeRange = getNutritionRange(selectedAnimal, selectedStage);

  const t = {
    selectAnimal: language === 'en' ? 'Select Livestock Type' : 'مویشی کی قسم منتخب کریں',
    selectStage:  language === 'en' ? 'Select Production Stage' : 'پیداواری مرحلہ منتخب کریں',
    next:         language === 'en' ? 'Next' : 'اگلا',
    back:         language === 'en' ? 'Back' : 'واپس',
    concentrateBanner: language === 'en'
      ? 'Building a CONCENTRATE mix — fed with fresh forage, hay, or silage. (TMR support coming soon.)'
      : 'آپ ایک کانسنٹریٹ فارمولا بنا رہے ہیں — سبز چارہ، گھاس یا سائیلج کے ساتھ دیا جاتا ہے۔',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      {/* Concentrate-vs-TMR Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3">
        <span className="text-xl flex-shrink-0 leading-tight">🌾</span>
        <p className="text-xs text-amber-900 leading-relaxed">{t.concentrateBanner}</p>
      </div>

      {/* Animal Selection */}
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

      {/* Stage Selection */}
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
                whileHover={{ x: 8 }}
                className={`p-3 rounded-lg border-2 transition-all font-medium text-left ${
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

      {/* Target-Range Preview */}
      {activeRange && <TargetCard language={language} range={activeRange} />}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-8">
        {onBack && (
          <Button variant="outline" onClick={onBack} className="flex-1">
            {t.back}
          </Button>
        )}
        <Button
          onClick={onNext}
          disabled={!isComplete}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {t.next}
        </Button>
      </div>
    </motion.div>
  );
}
