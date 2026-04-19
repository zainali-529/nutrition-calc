'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Pencil, Eye } from 'lucide-react';
import { useState } from 'react';
import { getIngredient } from '@/lib/constants';
import { hasOverride } from '@/lib/ingredientOverrides';
import { IngredientNutritionEditor } from './IngredientNutritionEditor';

interface IngredientDetailModalProps {
  isOpen: boolean;
  ingredientKey: string | null;
  language: 'en' | 'ur';
  onClose: () => void;
}

const getIntensityColor = (level: string) => {
  switch (level) {
    case 'high':
      return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    case 'med':
      return 'bg-amber-100 text-amber-700 border-amber-300';
    case 'low':
      return 'bg-red-100 text-red-700 border-red-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

const getIntensityLabel = (level: string, language: 'en' | 'ur') => {
  const labels = {
    high: { en: 'High', ur: 'زیادہ' },
    med: { en: 'Medium', ur: 'درمیانی' },
    low: { en: 'Low', ur: 'کم' },
  };
  return labels[level as keyof typeof labels]?.[language] || level;
};

export function IngredientDetailModal({
  isOpen,
  ingredientKey,
  language,
  onClose,
}: IngredientDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Re-read ingredient on every render (picks up latest overrides after save)
  const ingredient = ingredientKey ? getIngredient(ingredientKey) ?? null : null;
  const modified = ingredientKey ? hasOverride(ingredientKey) : false;

  if (!ingredient) return null;

  const name = language === 'en' ? ingredient.nameEn : ingredient.nameUr;
  const notes = language === 'en' ? ingredient.notesEn : ingredient.notesUr;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 max-h-[90vh] overflow-y-auto"
          >
            <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-2xl border border-white/40 overflow-hidden">
              {/* Header */}
              <div className="relative bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-6 text-white">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-2">{name}</h2>
                    {/* Energy & Protein Badges */}
                    <div className="flex gap-2">
                      <div
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${getIntensityColor(
                          ingredient.energyLevel
                        )}`}
                      >
                        {language === 'en' ? 'Energy' : 'توانائی'}: {getIntensityLabel(ingredient.energyLevel, language)}
                      </div>
                      <div
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${getIntensityColor(
                          ingredient.proteinLevel
                        )}`}
                      >
                        {language === 'en' ? 'Protein' : 'پروٹین'}: {getIntensityLabel(ingredient.proteinLevel, language)}
                      </div>
                    </div>
                  </div>
                  <motion.button
                    onClick={onClose}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex-shrink-0 p-2 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 py-6 space-y-6">
                {/* Modified badge */}
                {modified && !isEditing && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 font-medium flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                    {language === 'en' ? 'You have custom nutrition values for this ingredient' : 'آپ نے اس جزو کی غذائیت میں تبدیلی کی ہے'}
                  </div>
                )}

                {isEditing && ingredientKey ? (
                  <IngredientNutritionEditor
                    key={refreshKey}
                    ingredientKey={ingredientKey}
                    language={language}
                    onSave={() => { setIsEditing(false); setRefreshKey((k) => k + 1); }}
                    onCancel={() => setIsEditing(false)}
                  />
                ) : (
                <>
                {/* Nutritional Facts */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="text-lg">📊</span>
                    {language === 'en' ? 'Nutritional Values' : 'غذائی اقدار'}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {/* CP */}
                    {ingredient.cp !== undefined && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg p-3 border border-blue-200/50"
                      >
                        <div className="text-xs font-semibold text-blue-600">CP</div>
                        <div className="text-xl font-bold text-blue-900">{ingredient.cp}%</div>
                        <div className="text-xs text-blue-600/70">
                          {language === 'en' ? 'Crude Protein' : 'خام پروٹین'}
                        </div>
                      </motion.div>
                    )}

                    {/* ME */}
                    {ingredient.me !== undefined && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 }}
                        className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-lg p-3 border border-amber-200/50"
                      >
                        <div className="text-xs font-semibold text-amber-600">ME</div>
                        <div className="text-xl font-bold text-amber-900">{ingredient.me}</div>
                        <div className="text-xs text-amber-600/70">Mcal/kg</div>
                      </motion.div>
                    )}

                    {/* DM */}
                    {ingredient.dm !== undefined && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 }}
                        className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-lg p-3 border border-slate-200/50"
                      >
                        <div className="text-xs font-semibold text-slate-600">DM</div>
                        <div className="text-xl font-bold text-slate-900">{ingredient.dm}%</div>
                        <div className="text-xs text-slate-600/70">
                          {language === 'en' ? 'Dry Matter' : 'خشک مادہ'}
                        </div>
                      </motion.div>
                    )}

                    {/* TDN */}
                    {ingredient.tdn !== undefined && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 }}
                        className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-lg p-3 border border-indigo-200/50"
                      >
                        <div className="text-xs font-semibold text-indigo-600">TDN</div>
                        <div className="text-xl font-bold text-indigo-900">{ingredient.tdn}%</div>
                        <div className="text-xs text-indigo-600/70">TDN</div>
                      </motion.div>
                    )}

                    {/* NDF */}
                    {ingredient.ndf !== undefined && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-lg p-3 border border-green-200/50"
                      >
                        <div className="text-xs font-semibold text-green-600">NDF</div>
                        <div className="text-xl font-bold text-green-900">{ingredient.ndf}%</div>
                        <div className="text-xs text-green-600/70">
                          {language === 'en' ? 'Neutral Detergent Fiber' : 'فائبر'}
                        </div>
                      </motion.div>
                    )}

                    {/* ADF */}
                    {ingredient.adf !== undefined && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25 }}
                        className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-lg p-3 border border-purple-200/50"
                      >
                        <div className="text-xs font-semibold text-purple-600">ADF</div>
                        <div className="text-xl font-bold text-purple-900">{ingredient.adf}%</div>
                        <div className="text-xs text-purple-600/70">
                          {language === 'en' ? 'Acid Detergent Fiber' : 'فائبر'}
                        </div>
                      </motion.div>
                    )}

                    {/* Fat */}
                    {ingredient.fat !== undefined && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-lg p-3 border border-orange-200/50"
                      >
                        <div className="text-xs font-semibold text-orange-600">
                          {language === 'en' ? 'Fat' : 'چکنائی'}
                        </div>
                        <div className="text-xl font-bold text-orange-900">{ingredient.fat}%</div>
                        <div className="text-xs text-orange-600/70">
                          {language === 'en' ? 'Crude Fat' : 'خام چکنائی'}
                        </div>
                      </motion.div>
                    )}

                    {/* Starch */}
                    {ingredient.starch !== undefined && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 rounded-lg p-3 border border-yellow-200/50"
                      >
                        <div className="text-xs font-semibold text-yellow-600">
                          {language === 'en' ? 'Starch' : 'نشاستہ'}
                        </div>
                        <div className="text-xl font-bold text-yellow-900">{ingredient.starch}%</div>
                        <div className="text-xs text-yellow-600/70">Starch</div>
                      </motion.div>
                    )}

                    {/* Calcium */}
                    {ingredient.ca !== undefined && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 }}
                        className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-lg p-3 border border-red-200/50"
                      >
                        <div className="text-xs font-semibold text-red-600">Ca</div>
                        <div className="text-xl font-bold text-red-900">{ingredient.ca}%</div>
                        <div className="text-xs text-red-600/70">
                          {language === 'en' ? 'Calcium' : 'کیلشیم'}
                        </div>
                      </motion.div>
                    )}

                    {/* Phosphorus */}
                    {ingredient.p !== undefined && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-gradient-to-br from-cyan-50 to-cyan-100/50 rounded-lg p-3 border border-cyan-200/50"
                      >
                        <div className="text-xs font-semibold text-cyan-600">P</div>
                        <div className="text-xl font-bold text-cyan-900">{ingredient.p}%</div>
                        <div className="text-xs text-cyan-600/70">
                          {language === 'en' ? 'Phosphorus' : 'فاسفورس'}
                        </div>
                      </motion.div>
                    )}

                    {/* Ash */}
                    {ingredient.ash !== undefined && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-3 border border-gray-200/50"
                      >
                        <div className="text-xs font-semibold text-gray-600">Ash</div>
                        <div className="text-xl font-bold text-gray-900">{ingredient.ash}%</div>
                        <div className="text-xs text-gray-600/70">
                          {language === 'en' ? 'Ash' : 'راکھ'}
                        </div>
                      </motion.div>
                    )}

                    {/* Price */}
                     {ingredient.price !== undefined && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.45 }}
                        className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-lg p-3 border border-emerald-200/50"
                      >
                        <div className="text-xs font-semibold text-emerald-600">Price</div>
                        <div className="text-xl font-bold text-emerald-900">₨ {ingredient.price}</div>
                        <div className="text-xs text-emerald-600/70">
                          {language === 'en' ? 'Per kg' : 'فی کلو'}
                        </div>
                      </motion.div>
                    )}

                    {/* Max Inclusion (practical cap used by Auto-Formulate) */}
                    {ingredient.maxInclusion !== undefined && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                        className="bg-gradient-to-br from-violet-50 to-violet-100/50 rounded-lg p-3 border border-violet-200/50"
                      >
                        <div className="text-xs font-semibold text-violet-600">
                          {language === 'en' ? 'Max Inclusion' : 'زیادہ سے زیادہ شمولیت'}
                        </div>
                        <div className="text-xl font-bold text-violet-900">
                          {ingredient.maxInclusion}%
                        </div>
                        <div className="text-xs text-violet-600/70">
                          {language === 'en' ? 'of concentrate mix' : 'کانسنٹریٹ کا'}
                        </div>
                      </motion.div>
                    )}

                  </div>
                </div>

                {/* Notes */}
                {notes && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3"
                  >
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-900 mb-1">
                        {language === 'en' ? 'Important Notes' : 'اہم نوٹس'}
                      </h4>
                      <p className="text-sm text-amber-800">{notes}</p>
                    </div>
                  </motion.div>
                )}
              </>
              )}
              </div>

              {/* Footer */}
              {!isEditing && (
              <div className="bg-slate-50/50 px-6 py-4 border-t border-slate-200/50 flex gap-2">
                <motion.button
                  onClick={() => setIsEditing(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 py-2.5 px-4 bg-amber-50 text-amber-800 font-semibold rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors inline-flex items-center justify-center gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  {language === 'en' ? 'Edit Nutrition' : 'غذائیت ترمیم'}
                </motion.button>
                <motion.button
                  onClick={() => { setIsEditing(false); onClose(); }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold rounded-lg hover:shadow-lg transition-shadow"
                >
                  {language === 'en' ? 'Close' : 'بند کریں'}
                </motion.button>
              </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
