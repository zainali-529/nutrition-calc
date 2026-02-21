'use client';

import { motion } from 'framer-motion';
import { FormulaItem, calculateNutrients, generateRecommendations } from '@/lib/calculations';
import { Button } from '@/components/ui/button';

interface Step4StatusProps {
  language: 'en' | 'ur';
  formula: FormulaItem[];
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

export function Step4Status({ language, formula, onNext, onBack }: Step4StatusProps) {
  const nutrients = calculateNutrients(formula);
  const recommendations = generateRecommendations(nutrients);

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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: t.optimal,
            icon: '✅',
            value: `${nutrients.protein.toFixed(1)}%`,
            sublabel: 'Protein',
          },
          {
            label: t.optimal,
            icon: '⚡',
            value: `${nutrients.energy.toFixed(1)} MJ`,
            sublabel: 'Energy',
          },
          {
            label: t.optimal,
            icon: '🌾',
            value: `${nutrients.fiber.toFixed(1)}%`,
            sublabel: 'Fiber',
          },
          {
            label: t.optimal,
            icon: '🛢️',
            value: `${nutrients.fat.toFixed(1)}%`,
            sublabel: 'Fat',
          },
        ].map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white rounded-lg p-3 border border-gray-200 flex flex-col items-center gap-1"
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="text-lg font-bold text-gray-900">{item.value}</span>
            <span className="text-xs text-gray-600">{item.sublabel}</span>
          </motion.div>
        ))}
      </div>

      {/* Recommendations */}
      <div>
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <span className="text-2xl">💡</span>
          {t.recommendations}
        </h3>
        <div className="space-y-3">
          {recommendations.map((rec, idx) => {
            const statusIcons = {
              success: '✅',
              warning: '⚠️',
              error: '🛑',
            };

            return (
              <StatusCard
                key={idx}
                status={rec.status as any}
                title={rec.nutrient}
                description={rec.recommendation}
                icon={statusIcons[rec.status as any]}
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
            ? 'These recommendations are based on typical dairy cattle nutrition requirements. Consult with a veterinarian for farm-specific adjustments.'
            : 'یہ سفارشات بیل کی عام غذائی ضروریات پر مبنی ہیں۔ فارم کی مخصوص ترمیمات کے لیے ڈاکٹر سے مشورہ لیں۔'}
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
