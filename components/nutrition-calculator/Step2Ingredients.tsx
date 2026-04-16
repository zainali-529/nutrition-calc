'use client';

import { motion } from 'framer-motion';
import { INGREDIENT_CATEGORIES, getIngredient, getIngredientIcon } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Info } from 'lucide-react';
import { IngredientDetailModal } from './IngredientDetailModal';

interface Step2IngredientsProps {
  language: 'en' | 'ur';
  chosenIngredients: Record<string, string[]>;
  onIngredientToggle: (category: string, ingredient: string) => void;
  onNext: () => void;
  onBack: () => void;
}

interface IngredientCardProps {
  id: string;
  name: string;
  icon: string;
  energyLevel: string;
  proteinLevel: string;
  isSelected: boolean;
  onSelect: () => void;
  onInfo: () => void;
}

function IngredientCard({
  id,
  name,
  icon,
  energyLevel,
  proteinLevel,
  isSelected,
  onSelect,
  onInfo,
}: IngredientCardProps) {
  const getIntensityColor = (level: string) => {
    const colors: Record<string, string> = {
      high: 'bg-red-100 text-red-700 border-red-300',
      med: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      low: 'bg-green-100 text-green-700 border-green-300',
    };
    return colors[level] || colors.med;
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={`relative p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 text-center cursor-pointer group ${
        isSelected
          ? 'border-emerald-500 bg-emerald-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-emerald-300'
      }`}
    >
      {/* Info Button */}
      <motion.button
        onClick={(e) => {
          e.stopPropagation();
          onInfo();
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="absolute top-2 right-2 p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-md"
        title="View details"
      >
        <Info className="w-4 h-4" />
      </motion.button>

      {/* Main Card Content */}
      <motion.button
        onClick={onSelect}
        whileTap={{ scale: 0.98 }}
        className="w-full flex flex-col items-center gap-2"
      >
        <span className="text-3xl">{getIngredientIcon(id)}</span>
        <span className={`text-sm font-semibold ${isSelected ? 'text-emerald-900' : 'text-gray-900'}`}>
          {name}
        </span>

        {/* Quality Badges */}
        <div className="flex gap-1 mt-2 flex-wrap justify-center">
          <span className={`text-xs font-medium px-2 py-1 rounded border ${getIntensityColor(energyLevel)}`}>
            E
          </span>
          <span className={`text-xs font-medium px-2 py-1 rounded border ${getIntensityColor(proteinLevel)}`}>
            P
          </span>
        </div>

        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="mt-2 text-emerald-600 font-bold text-lg"
          >
            ✓
          </motion.div>
        )}
      </motion.button>
    </motion.div>
  );
}

function IngredientGroup({
  categoryKey,
  title,
  language,
  ingredients,
  selected,
  minRequired,
  onToggle,
  onIngredientInfo,
}: {
  categoryKey: string;
  title: string;
  language: 'en' | 'ur';
  ingredients: string[];
  selected: string[];
  minRequired: number;
  onToggle: (ingredient: string) => void;
  onIngredientInfo: (ingredientKey: string) => void;
}) {
  const isValid = selected.length >= minRequired;
  const status =
    selected.length === 0
      ? 'Need at least ' + minRequired
      : selected.length >= minRequired
        ? '✓ Valid'
        : 'Need ' + (minRequired - selected.length) + ' more';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">{title}</h3>
        <span
          className={`text-sm font-semibold px-3 py-1 rounded-full ${
            isValid
              ? 'bg-green-100 text-green-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}
        >
          {status}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {ingredients.map((ingredientKey) => {
          const data = getIngredient(ingredientKey);
          if (!data) return null;

          return (
            <IngredientCard
              key={ingredientKey}
              id={ingredientKey}
              name={data[language === 'en' ? 'nameEn' : 'nameUr']}
              icon=""
              energyLevel={data.energyLevel}
              proteinLevel={data.proteinLevel}
              isSelected={selected.includes(ingredientKey)}
              onSelect={() => onToggle(ingredientKey)}
              onInfo={() => onIngredientInfo(ingredientKey)}
            />
          );
        })}
      </div>
    </motion.div>
  );
}

export function Step2Ingredients({
  language,
  chosenIngredients,
  onIngredientToggle,
  onNext,
  onBack,
}: Step2IngredientsProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedIngredientInfo, setSelectedIngredientInfo] = useState<string | null>(null);

  const isComplete = Object.entries(chosenIngredients).every(([category, selected]) => {
    const cat = INGREDIENT_CATEGORIES[category as keyof typeof INGREDIENT_CATEGORIES];
    return !cat || selected.length >= cat.min;
  });

  const t = {
    ingredientSelection: language === 'en' ? 'Select Ingredients' : 'اجزاء منتخب کریں',
    next: language === 'en' ? 'Next' : 'اگلا',
    back: language === 'en' ? 'Back' : 'واپس',
  };

  return (
    <>
      <IngredientDetailModal
        isOpen={selectedIngredientInfo !== null}
        ingredientKey={selectedIngredientInfo}
        language={language}
        onClose={() => setSelectedIngredientInfo(null)}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="space-y-8"
      >
        <div>
          <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <span className="text-3xl">🌾</span>
            {t.ingredientSelection}
          </h2>
          <p className="text-gray-600 text-sm">
            {language === 'en'
              ? 'Select at least one ingredient from each category'
              : 'ہر زمرے سے کم از کم ایک جزو منتخب کریں'}
          </p>
        </div>

        <div className="space-y-8">
          {Object.entries(INGREDIENT_CATEGORIES).map(([categoryKey, category]) => (
            <IngredientGroup
              key={categoryKey}
              categoryKey={categoryKey}
              title={category[language === 'en' ? 'titleEn' : 'titleUr']}
              language={language}
              ingredients={category.ingredients}
              selected={chosenIngredients[categoryKey] || []}
              minRequired={category.min}
              onToggle={(ingredient) => onIngredientToggle(categoryKey, ingredient)}
              onIngredientInfo={setSelectedIngredientInfo}
            />
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-8">
          <Button variant="outline" onClick={onBack} className="flex-1">
            {t.back}
          </Button>
          <Button
            onClick={onNext}
            disabled={!isComplete}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {t.next}
          </Button>
        </div>
      </motion.div>
    </>
  );
}
