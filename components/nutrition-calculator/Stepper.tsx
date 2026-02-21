'use client';

import { motion } from 'framer-motion';
import { Check, Lock } from 'lucide-react';

interface StepperProps {
  currentStep: number;
  totalSteps: number;
  onStepClick?: (step: number) => void;
  completedSteps?: number[];
  language?: 'en' | 'ur';
}

const STEP_ICONS = {
  en: ['🐄', '🌾', '⚙️', '📊', '✅'],
  ur: ['🐄', '🌾', '⚙️', '📊', '✅'],
};

const STEP_LABELS = {
  en: [
    { title: 'Select Animal', desc: 'Choose livestock type & region' },
    { title: 'Choose Ingredients', desc: 'Select feed ingredients' },
    { title: 'Build Formula', desc: 'Create balanced recipe' },
    { title: 'Review Status', desc: 'Check nutritional values' },
    { title: 'Download', desc: 'Export & share formula' },
  ],
  ur: [
    { title: 'جانور منتخب کریں', desc: 'مویشی کی قسم منتخب کریں' },
    { title: 'اجزاء منتخب کریں', desc: 'چارے کے اجزاء منتخب کریں' },
    { title: 'فارمولا بنائیں', desc: 'متوازن ریسپی بنائیں' },
    { title: 'حالت دیکھیں', desc: 'غذائی اقدار چیک کریں' },
    { title: 'ڈاؤن لوڈ کریں', desc: 'فارمولا محفوظ کریں' },
  ],
};

export function Stepper({
  currentStep,
  totalSteps,
  onStepClick,
  completedSteps = [],
  language = 'en',
}: StepperProps) {
  const progressPercentage = Math.round(((currentStep + 1) / totalSteps) * 100);

  return (
    <div className="w-full">
      {/* Professional Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <div className="relative">
          {/* Gradient Background - Removed for cleaner look */}
          {/* <div className="absolute inset-0 bg-gradient-to-r from-emerald-50 via-blue-50 to-emerald-50 rounded-2xl blur-xl opacity-40" /> */}

          {/* Main Container */}
          <div className="relative bg-white/90 backdrop-blur-md rounded-2xl p-8 border border-gray-100 shadow-xl shadow-gray-200/50">
            {/* Step Indicators */}
            <div className="flex items-center justify-between mb-8">
              {Array.from({ length: totalSteps }).map((_, idx) => {
                const isActive = idx === currentStep;
                const isCompleted = completedSteps.includes(idx);
                const isUpcoming = idx > currentStep;

                return (
                  <motion.div
                    key={idx}
                    className="flex-1 relative"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <div className="flex flex-col items-center">
                      {/* Connector Line */}
                      {idx < totalSteps - 1 && (
                        <motion.div
                          className="absolute -right-1/2 top-8 w-full h-1 origin-left"
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: isCompleted || currentStep > idx ? 1 : 0 }}
                          transition={{ duration: 0.6, ease: 'easeInOut' }}
                        >
                          <div className="w-full h-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
                        </motion.div>
                      )}

                      {/* Step Circle */}
                      <motion.button
                        onClick={() => !isUpcoming && onStepClick?.(idx)}
                        disabled={isUpcoming}
                        className={`relative w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold transition-all duration-300 cursor-pointer group mb-3 ${
                          isActive
                            ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-2xl shadow-emerald-400/40'
                            : isCompleted
                              ? 'bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600 border-2 border-emerald-300'
                              : isUpcoming
                                ? 'bg-gray-50 text-gray-300 border-2 border-gray-200 cursor-not-allowed'
                                : 'bg-white text-slate-600 border-2 border-gray-200 hover:border-emerald-300'
                        }`}
                        whileHover={!isUpcoming ? { scale: 1.15, y: -4 } : {}}
                        whileTap={!isUpcoming ? { scale: 0.95 } : {}}
                      >
                        {isCompleted && !isActive ? (
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 200 }}
                            className="flex items-center justify-center"
                          >
                            <Check className="w-8 h-8" />
                          </motion.div>
                        ) : isUpcoming ? (
                          <Lock className="w-6 h-6" />
                        ) : (
                          <span>{STEP_ICONS.en[idx]}</span>
                        )}

                        {/* Animated Ring for Active Step */}
                        {isActive && (
                          <motion.div
                            className="absolute inset-0 rounded-full border-2 border-emerald-300"
                            initial={{ scale: 1, opacity: 0.5 }}
                            animate={{ scale: 1.3, opacity: 0 }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        )}
                      </motion.button>

                      {/* Step Info */}
                      <div className="text-center">
                        <h3
                          className={`text-sm font-bold transition-all duration-300 ${
                            isActive
                              ? 'text-emerald-600 text-base'
                              : isCompleted
                                ? 'text-emerald-600'
                                : isUpcoming
                                  ? 'text-gray-300'
                                  : 'text-slate-700'
                          }`}
                        >
                          {STEP_LABELS[language][idx].title}
                        </h3>
                        <p
                          className={`text-xs mt-1 transition-colors duration-300 ${
                            isActive || isCompleted ? 'text-emerald-500/80' : 'text-gray-400'
                          }`}
                        >
                          {STEP_LABELS[language][idx].desc}
                        </p>
                      </div>

                      {/* Completion Indicator */}
                      {isCompleted && !isActive && (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg"
                        >
                          ✓
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Progress Bar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-gray-600">Progress</span>
                <span className="text-xs font-bold text-emerald-600">{progressPercentage}%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 rounded-full shadow-lg shadow-emerald-400/50"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Step Counter Badge - Floating */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex justify-center mb-6"
      >
        <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-full border border-emerald-200 shadow-lg shadow-emerald-100/30 backdrop-blur-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-emerald-700 tracking-wide">
              STEP {currentStep + 1} OF {totalSteps}
            </span>
          </div>
          <div className="w-0.5 h-4 bg-emerald-300/40" />
          <span className="text-xs font-semibold text-slate-600">
            {Math.max(totalSteps - currentStep - 1, 0)} more step{Math.max(totalSteps - currentStep - 1, 0) !== 1 ? 's' : ''}
          </span>
        </div>
      </motion.div>
    </div>
  );
}
