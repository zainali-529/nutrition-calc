'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { INGREDIENT_CATEGORIES, getIngredient } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Info, X } from 'lucide-react';

interface Step2IngredientsProps {
  language: 'en' | 'ur';
  chosenIngredients: Record<string, string[]>;
  onIngredientToggle: (category: string, ingredient: string) => void;
  onNext: () => void;
  onBack: () => void;
}

interface IngredientQuality {
  [key: string]: 'excellent' | 'average' | 'poor' | null;
}

interface IngredientInfoModalProps {
  ingredient: string | null;
  data: any;
  language: 'en' | 'ur';
  onClose: () => void;
}

function IngredientInfoModal({ ingredient, data, language, onClose }: IngredientInfoModalProps) {
  if (!ingredient || !data) return null;

  const nutrients = [
    { label: 'CP', value: data.cp, unit: '%' },
    { label: 'ME', value: data.me, unit: 'MJ/kg' },
    { label: 'NDF', value: data.ndf, unit: '%' },
    { label: 'ADF', value: data.adf, unit: '%' },
    { label: 'Fat', value: data.fat, unit: '%' },
    { label: 'Ca', value: data.ca, unit: '%' },
    { label: 'P', value: data.p, unit: '%' },
  ].filter(n => n.value !== null);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4 flex items-center justify-between text-white">
            <div>
              <h3 className="font-bold text-lg">{data.nameEn}</h3>
              <p className="text-emerald-100 text-sm">{data.nameUr}</p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-emerald-500 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Energy & Protein Badges */}
          <div className="px-6 py-4 border-b border-gray-200 flex gap-3">
            <div className={`flex-1 p-3 rounded-lg text-center text-sm font-semibold ${
              data.energyLevel === 'high' ? 'bg-red-100 text-red-700' :
              data.energyLevel === 'med' ? 'bg-yellow-100 text-yellow-700' :
              'bg-green-100 text-green-700'
            }`}>
              Energy: {data.energyLevel?.toUpperCase()}
            </div>
            <div className={`flex-1 p-3 rounded-lg text-center text-sm font-semibold ${
              data.proteinLevel === 'high' ? 'bg-blue-100 text-blue-700' :
              data.proteinLevel === 'med' ? 'bg-indigo-100 text-indigo-700' :
              'bg-cyan-100 text-cyan-700'
            }`}>
              Protein: {data.proteinLevel?.toUpperCase()}
            </div>
          </div>

          {/* Nutritional Facts */}
          <div className="px-6 py-4">
            <h4 className="font-semibold text-gray-900 mb-3">Nutritional Content</h4>
            <div className="space-y-2">
              {nutrients.map((nutrient) => (
                <div key={nutrient.label} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700 text-sm">{nutrient.label}</span>
                  <span className="font-bold text-emerald-600 text-sm">
                    {nutrient.value} {nutrient.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {(data.notesEn || data.notesUr) && (
            <div className="px-6 py-4 bg-blue-50 border-t border-blue-100">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> {language === 'en' ? data.notesEn : data.notesUr}
              </p>
            </div>
          )}

          {/* Close Button */}
          <div className="px-6 py-4 border-t border-gray-200">
            <Button onClick={onClose} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              Close
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function IngredientCard({
  id,
  data,
  isSelected,
  quality,
  onSelect,
  onQualityChange,
  onInfoClick,
  language,
}: {
  id: string;
  data: any;
  isSelected: boolean;
  quality: 'excellent' | 'average' | 'poor' | null;
  onSelect: () => void;
  onQualityChange: (q: 'excellent' | 'average' | 'poor' | null) => void;
  onInfoClick: () => void;
  language: 'en' | 'ur';
}) {
  const qualityIcons: Record<string, string> = {
    excellent: '✨',
    average: '👌',
    poor: '📉',
  };

  const qualityColors: Record<string, string> = {
    excellent: 'bg-emerald-100 border-emerald-300 text-emerald-700',
    average: 'bg-yellow-100 border-yellow-300 text-yellow-700',
    poor: 'bg-red-100 border-red-300 text-red-700',
  };

  return (
    <motion.div
      onClick={onSelect}
      whileHover={{ y: -2 }}
      className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
        isSelected
          ? 'border-emerald-500 bg-emerald-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-emerald-300'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="font-semibold text-sm text-gray-900">{data.nameEn}</h4>
          <p className="text-xs text-gray-500">{data.nameUr}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.15 }}
          onClick={(e) => {
            e.stopPropagation();
            onInfoClick();
          }}
          className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
          title="View details"
        >
          <Info className="w-4 h-4 text-gray-500 hover:text-emerald-600" />
        </motion.button>
      </div>

      {/* Energy & Protein Mini Badges */}
      <div className="flex gap-1 mb-3">
        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
          data.energyLevel === 'high' ? 'bg-red-100 text-red-700' :
          data.energyLevel === 'med' ? 'bg-yellow-100 text-yellow-700' :
          'bg-green-100 text-green-700'
        }`}>E</span>
        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
          data.proteinLevel === 'high' ? 'bg-blue-100 text-blue-700' :
          data.proteinLevel === 'med' ? 'bg-indigo-100 text-indigo-700' :
          'bg-cyan-100 text-cyan-700'
        }`}>P</span>
      </div>

      {/* Quality Selection */}
      {isSelected && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="flex gap-1 pt-2 border-t border-gray-200"
        >
          {(['excellent', 'average', 'poor'] as const).map((q) => (
            <motion.button
              key={q}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                onQualityChange(quality === q ? null : q);
              }}
              className={`flex-1 text-xs font-semibold py-1.5 px-1 rounded border transition-all ${
                quality === q
                  ? qualityColors[q]
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="block">{qualityIcons[q]}</span>
              <span className="text-xs">{q === 'excellent' ? '✓' : q === 'average' ? '~' : '✕'}</span>
            </motion.button>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

export function Step2IngredientsPro({
  language,
  chosenIngredients,
  onIngredientToggle,
  onNext,
  onBack,
}: Step2IngredientsProps) {
  const [selectedInfoIngredient, setSelectedInfoIngredient] = useState<string | null>(null);
  const [ingredientQualities, setIngredientQualities] = useState<IngredientQuality>({});

  const handleQualityChange = (ingredientId: string, quality: 'excellent' | 'average' | 'poor' | null) => {
    setIngredientQualities(prev => ({
      ...prev,
      [ingredientId]: quality,
    }));
  };

  // Check if at least one ingredient is selected from each category
  const isComplete = Object.entries(INGREDIENT_CATEGORIES).every(([key, category]) => {
    const selected = chosenIngredients[key] || [];
    return selected.length >= category.min;
  });

  const t = {
    selectIngredients: language === 'en' ? 'Select Feed Ingredients' : 'چارے کے اجزاء منتخب کریں',
    selectQuality: language === 'en' ? 'Select quality after choosing ingredient' : 'اجزاء منتخب کرنے کے بعد معیار منتخب کریں',
    next: language === 'en' ? 'Next' : 'اگلا',
    back: language === 'en' ? 'Back' : 'واپس',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
          <span className="text-3xl">🌾</span>
          {t.selectIngredients}
        </h2>
        <p className="text-sm text-gray-600">{t.selectQuality}</p>
      </div>

      {/* Ingredients by Category */}
      {Object.entries(INGREDIENT_CATEGORIES).map(([categoryKey, category]) => {
        const selected = chosenIngredients[categoryKey] || [];
        const isValid = selected.length >= category.min;

        const categoryTitle = language === 'en' ? category.titleEn : category.titleUr;

        return (
          <motion.div
            key={categoryKey}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {/* Category Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">{categoryTitle}</h3>
              <motion.div
                animate={{ scale: isValid ? 1 : 0.9 }}
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  isValid
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                    : 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                }`}
              >
                {selected.length}/{category.min} {isValid ? '✓' : 'needed'}
              </motion.div>
            </div>

            {/* Ingredients Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {category.ingredients.map((ingredientKey) => {
                const data = getIngredient(ingredientKey);
                const isSelected = selected.includes(ingredientKey);
                const quality = ingredientQualities[ingredientKey] || null;

                return (
                  <IngredientCard
                    key={ingredientKey}
                    id={ingredientKey}
                    data={data}
                    isSelected={isSelected}
                    quality={quality}
                    onSelect={() => onIngredientToggle(categoryKey, ingredientKey)}
                    onQualityChange={(q) => handleQualityChange(ingredientKey, q)}
                    onInfoClick={() => setSelectedInfoIngredient(ingredientKey)}
                    language={language}
                  />
                );
              })}
            </div>
          </motion.div>
        );
      })}

      {/* Info Modal */}
      <IngredientInfoModal
        ingredient={selectedInfoIngredient}
        data={selectedInfoIngredient ? getIngredient(selectedInfoIngredient) ?? null : null}
        language={language}
        onClose={() => setSelectedInfoIngredient(null)}
      />

      {/* Action Buttons */}
      <div className="flex gap-3 pt-8">
        <Button variant="outline" onClick={onBack} className="flex-1">
          {t.back}
        </Button>
        <Button
          onClick={onNext}
          disabled={!isComplete}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t.next}
        </Button>
      </div>
    </motion.div>
  );
}
