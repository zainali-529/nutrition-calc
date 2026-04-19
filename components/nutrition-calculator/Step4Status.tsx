'use client';

import { motion } from 'framer-motion';
import { FormulaItem, calculateNutrients, generateRecommendations } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { NUTRITION_RANGES } from '@/lib/constants';
import { DailyFeedingGuide } from './DailyFeedingGuide';

interface Step4StatusProps {
  language: 'en' | 'ur';
  formula: FormulaItem[];
  selectedAnimal: string | null;
  selectedStage: number;
  onNext: () => void;
  onBack: () => void;
}

function StatusCard({
  status,
  title,
  description,
  icon,
  index,
}: {
  status: 'success' | 'warning' | 'error';
  title: string;
  description: string;
  icon: string;
  index: number;
}) {
  const statusColors = {
    success: 'bg-green-50 border-green-300 text-green-900',
    warning: 'bg-yellow-50 border-yellow-300 text-yellow-900',
    error: 'bg-red-50 border-red-300 text-red-900',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`${statusColors[status]} rounded-lg border-2 p-4 flex gap-4 items-start`}
    >
      <span className="text-3xl flex-shrink-0">{icon}</span>
      <div className="flex-1">
        <h4 className="font-bold">{title}</h4>
        <p className="text-sm opacity-90">{description}</p>
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

  const recommendations = generateRecommendations(nutrients, ranges);

  const t = {
    nutritionStatus: language === 'en' ? 'Nutrition Status' : 'غذائی حالت',
    recommendations: language === 'en' ? 'Recommendations' : 'سفارشات',
    next: language === 'en' ? 'Next' : 'اگلا',
    back: language === 'en' ? 'Back' : 'واپس',
    optimal: language === 'en' ? 'Optimal' : 'بہترین',
    needAdjustment: language === 'en' ? 'Needs Adjustment' : 'ترمیم کی ضرورت',
    outOfRange: language === 'en' ? 'Out of Range' : 'حد سے باہر',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <span className="text-3xl">📊</span>
          {t.nutritionStatus}
        </h2>
        <p className="text-gray-600 text-sm">
          {language === 'en'
            ? 'Review the nutritional status of your formula'
            : 'اپنے فارمولے کی غذائی حالت کا جائزہ لیں'}
        </p>
      </div>

      {/* Current Nutrient Levels */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          {
            label: 'protein',
            icon: '✅',
            value: `${nutrients.protein.toFixed(1)}%`,
            sublabel: 'Protein (DM)',
            range: ranges?.protein,
          },
          {
            label: 'energy',
            icon: '⚡',
            value: `${nutrients.energy.toFixed(2)} Mcal`,
            sublabel: 'Energy (ME) (DM)',
            range: ranges?.energy,
          },
          {
            label: 'tdn',
            icon: '📈',
            value: `${nutrients.tdn.toFixed(1)}%`,
            sublabel: 'TDN (DM)',
            range: ranges?.tdn,
          },
          {
            label: 'fiber',
            icon: '🌾',
            value: `${nutrients.fiber.toFixed(1)}%`,
            sublabel: 'NDF (DM)',
            range: ranges?.fiber,
          },
          {
            label: 'fat',
            icon: '🥑',
            value: `${nutrients.fat.toFixed(1)}%`,
            sublabel: 'Fat (DM)',
            range: ranges?.fat,
          },
          {
            label: 'calcium',
            icon: '🦴',
            value: `${nutrients.calcium.toFixed(2)}%`,
            sublabel: 'Calcium (DM)',
            range: ranges?.calcium,
          },
          {
            label: 'phosphorus',
            icon: '🧪',
            value: `${nutrients.phosphorus.toFixed(2)}%`,
            sublabel: 'Phosphorus (DM)',
            range: ranges?.phosphorus,
          },
        ].map((item, idx) => {
          const isInRange = item.range ? nutrients[item.label as keyof typeof nutrients] >= item.range.min && nutrients[item.label as keyof typeof nutrients] <= item.range.max : true;
          
          return (
            <motion.div
              key={idx}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: idx * 0.1 }}
              className={`rounded-lg p-3 border flex flex-col items-center gap-1 transition-colors ${
                isInRange 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-white border-gray-200'
              }`}
            >
              <span className="text-2xl">{isInRange ? '✅' : item.icon}</span>
              <span className={`text-lg font-bold ${isInRange ? 'text-green-900' : 'text-gray-900'}`}>{item.value}</span>
              <span className={`text-xs ${isInRange ? 'text-green-700' : 'text-gray-600'}`}>{item.sublabel}</span>
              {item.range && (
                <span className={`text-[10px] ${isInRange ? 'text-green-600' : 'text-gray-400'}`}>
                  {item.range.min}-{item.range.max}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Daily Feeding Guide — how much to feed per day */}
      <DailyFeedingGuide
        language={language}
        animalId={selectedAnimal}
        stageIndex={selectedStage}
        formula={formula}
      />

      {/* Recommendations */}
      <div>
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <span className="text-2xl">💡</span>
          {t.recommendations}
        </h3>
        <div className="space-y-3">
          {recommendations.map((rec, idx) => {
            const statusIcons: Record<'success' | 'warning' | 'error', string> = {
              success: '✅',
              warning: '⚠️',
              error: '🛑',
            };

            return (
              <StatusCard
                key={idx}
                status={rec.status}
                title={rec.nutrient}
                description={rec.recommendation}
                icon={statusIcons[rec.status] || '❓'}
                index={idx}
              />
            );
          })}
        </div>
      </div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-blue-50 border border-blue-200 rounded-lg p-4"
      >
        <p className="text-sm text-blue-900">
          {language === 'en'
            ? 'Targets are for the CONCENTRATE mix only. The animal also receives fresh forage, hay, or silage on top of this. Consult a veterinarian for farm-specific adjustments.'
            : 'یہ ہدف صرف کانسنٹریٹ کے لیے ہیں۔ جانور کو سبز چارہ، گھاس یا سائیلج بھی ساتھ ملے گا۔ فارم کی مخصوص ترمیم کے لیے ڈاکٹر سے رجوع کریں۔'}
        </p>
      </motion.div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-8">
        <Button variant="outline" onClick={onBack} className="flex-1">
          {t.back}
        </Button>
        <Button onClick={onNext} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
          {t.next}
        </Button>
      </div>
    </motion.div>
  );
}
