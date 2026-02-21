'use client';

import { motion } from 'framer-motion';
import { ANIMALS, REGIONS, STAGES } from '@/lib/constants';
import { Button } from '@/components/ui/button';

interface Step1AnimalProps {
  language: 'en' | 'ur';
  selectedAnimal: string | null;
  selectedRegion: string | null;
  selectedStage: number;
  onAnimalSelect: (animal: string) => void;
  onRegionSelect: (region: string) => void;
  onStageSelect: (stage: number) => void;
  onNext: () => void;
  onBack?: () => void;
}

export function Step1Animal({
  language,
  selectedAnimal,
  selectedRegion,
  selectedStage,
  onAnimalSelect,
  onRegionSelect,
  onStageSelect,
  onNext,
  onBack,
}: Step1AnimalProps) {
  const isComplete = selectedAnimal && selectedRegion;

  const stages = selectedAnimal ? STAGES[selectedAnimal as keyof typeof STAGES] : null;
  const stageLabels = stages ? stages[language] : [];

  const t = {
    selectAnimal: language === 'en' ? 'Select Livestock Type' : 'مویشی کی قسم منتخب کریں',
    selectRegion: language === 'en' ? 'Select Your Region' : 'اپنا علاقہ منتخب کریں',
    selectStage: language === 'en' ? 'Select Production Stage' : 'پیداواری مرحلہ منتخب کریں',
    next: language === 'en' ? 'Next' : 'اگلا',
    back: language === 'en' ? 'Back' : 'واپس',
    selectFirst: language === 'en' ? 'Please select animal first' : 'براہ کرم پہلے مویشی منتخب کریں',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
       {/* Region Selection */}
      <div>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span className="text-2xl">📍</span>
          {t.selectRegion}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {REGIONS.map((region) => (
            <motion.button
              key={region.id}
              onClick={() => onRegionSelect(region.id)}
              whileHover={{ scale: 1.02 }}
              className={`p-3 rounded-lg border-2 transition-all font-medium text-sm ${
                selectedRegion === region.id
                  ? 'border-amber-500 bg-amber-50 text-amber-900'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-amber-300'
              }`}
            >
              {region[language === 'en' ? 'labelEn' : 'labelUr']}
            </motion.button>
          ))}
        </div>
      </div>
      
      {/* Animal Selection */}
      <div>
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span className="text-2xl">🐄</span>
          {t.selectAnimal}
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {ANIMALS.map((animal) => (
            <motion.button
              key={animal.id}
              onClick={() => onAnimalSelect(animal.id)}
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.97 }}
              className={`relative overflow-hidden rounded-xl border-2 transition-all h-40 group ${
                selectedAnimal === animal.id
                  ? 'border-emerald-500 shadow-lg shadow-emerald-200'
                  : 'border-gray-200 hover:border-emerald-300 hover:shadow-md'
              }`}
            >
              {/* Background Image */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20">
                <img
                  src={animal.image}
                  alt={animal[language === 'en' ? 'labelEn' : 'labelUr']}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

              {/* Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-end p-3">
                <span className="text-xs font-bold text-white text-center leading-tight">
                  {animal[language === 'en' ? 'labelEn' : 'labelUr']}
                </span>
              </div>

              {/* Selection Badge */}
              {selectedAnimal === animal.id && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="absolute top-2 right-2 w-7 h-7 bg-emerald-500 text-white rounded-full flex items-center justify-center text-lg font-bold shadow-lg"
                >
                  ✓
                </motion.div>
              )}
            </motion.button>
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
