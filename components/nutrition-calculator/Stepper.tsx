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
      {/* ──────── MOBILE: compact, slim stepper ──────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="sm:hidden mb-4"
      >
        <div className="bg-white/95 backdrop-blur-md rounded-xl px-4 py-3 border border-slate-200/80 shadow-md shadow-[#0e3b5e]/5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#0e3b5e] to-[#558b2f] text-white flex items-center justify-center text-base font-bold shadow-md shadow-[#0e3b5e]/20 flex-shrink-0">
                {STEP_ICONS[language][currentStep]}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-[#558b2f] uppercase tracking-wide leading-none">
                  Step {currentStep + 1} / {totalSteps}
                </p>
                <p className="text-sm font-bold text-[#0e3b5e] leading-tight truncate">
                  {STEP_LABELS[language][currentStep].title}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-[#0e3b5e] flex-shrink-0">{progressPercentage}%</span>
          </div>

          {/* Mini-dots row + progress bar */}
          <div className="mt-2.5 flex items-center gap-1.5">
            {Array.from({ length: totalSteps }).map((_, idx) => {
              const isActive = idx === currentStep;
              const isCompleted = completedSteps.includes(idx) || idx < currentStep;
              const isUpcoming = idx > currentStep && !isCompleted;
              return (
                <button
                  key={idx}
                  onClick={() => !isUpcoming && onStepClick?.(idx)}
                  disabled={isUpcoming}
                  className={`flex-1 h-1.5 rounded-full transition-all ${
                    isActive ? 'bg-[#558b2f]' : isCompleted ? 'bg-[#558b2f]/40' : 'bg-slate-200'
                  } ${isUpcoming ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  aria-label={`Go to step ${idx + 1}`}
                />
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ──────── DESKTOP: rich, decorated stepper ──────── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="hidden sm:block mb-10"
      >
        <div className="relative">
          {/* Main Container */}
          <div className="relative bg-white/95 backdrop-blur-md rounded-2xl p-7 border border-slate-200/80 shadow-lg shadow-[#0e3b5e]/5">
            {/* Step Indicators */}
            <div className="flex items-center justify-between mb-7">
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
                          <div className="w-full h-full bg-gradient-to-r from-[#0e3b5e] to-[#558b2f]" />
                        </motion.div>
                      )}

                      {/* Step Circle */}
                      <motion.button
                        onClick={() => !isUpcoming && onStepClick?.(idx)}
                        disabled={isUpcoming}
                        className={`relative w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold transition-all duration-300 cursor-pointer group mb-3 ${
                          isActive
                            ? 'bg-gradient-to-br from-[#0e3b5e] via-[#104770] to-[#558b2f] text-white shadow-xl shadow-[#0e3b5e]/30'
                            : isCompleted
                              ? 'bg-gradient-to-br from-[#f4f8ee] to-[#eef6ec] text-[#558b2f] border-2 border-[#558b2f]/50'
                              : isUpcoming
                                ? 'bg-slate-50 text-slate-300 border-2 border-slate-200 cursor-not-allowed'
                                : 'bg-white text-slate-600 border-2 border-slate-200 hover:border-[#558b2f]'
                        }`}
                        whileHover={!isUpcoming ? { scale: 1.12, y: -3 } : {}}
                        whileTap={!isUpcoming ? { scale: 0.95 } : {}}
                      >
                        {isCompleted && !isActive ? (
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 200 }}
                            className="flex items-center justify-center"
                          >
                            <Check className="w-8 h-8 text-[#558b2f]" strokeWidth={2.5} />
                          </motion.div>
                        ) : isUpcoming ? (
                          <Lock className="w-6 h-6" />
                        ) : (
                          <span>{STEP_ICONS.en[idx]}</span>
                        )}

                        {/* Animated Ring for Active Step */}
                        {isActive && (
                          <motion.div
                            className="absolute inset-0 rounded-full border-2 border-[#558b2f]"
                            initial={{ scale: 1, opacity: 0.6 }}
                            animate={{ scale: 1.25, opacity: 0 }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        )}
                      </motion.button>

                      {/* Step Info */}
                      <div className="text-center">
                        <h3
                          className={`text-sm font-bold transition-all duration-300 ${
                            isActive
                              ? 'text-[#0e3b5e] text-base'
                              : isCompleted
                                ? 'text-[#558b2f]'
                                : isUpcoming
                                  ? 'text-slate-300'
                                  : 'text-slate-700'
                          }`}
                        >
                          {STEP_LABELS[language][idx].title}
                        </h3>
                        <p
                          className={`text-xs mt-1 transition-colors duration-300 ${
                            isActive ? 'text-[#0e3b5e]/75 font-medium' : isCompleted ? 'text-[#558b2f]/80 font-medium' : 'text-slate-400'
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
                          className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-[#558b2f] rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md"
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
                <span className="text-xs font-semibold text-slate-500">Progress</span>
                <span className="text-xs font-bold text-[#0e3b5e]">{progressPercentage}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#0e3b5e] via-[#104770] to-[#558b2f] rounded-full shadow-sm"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Step Counter Badge - Floating (desktop only — mobile already shows it inline) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="hidden sm:flex justify-center mb-6"
      >
        <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-gradient-to-r from-[#0e3b5e]/5 via-white to-[#558b2f]/10 rounded-full border border-[#0e3b5e]/15 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-[#558b2f] rounded-full animate-pulse" />
            <span className="text-xs font-extrabold text-[#0e3b5e] tracking-wide">
              STEP {currentStep + 1} OF {totalSteps}
            </span>
          </div>
          <div className="w-0.5 h-3.5 bg-slate-300" />
          <span className="text-xs font-semibold text-slate-600">
            {Math.max(totalSteps - currentStep - 1, 0)} more step{Math.max(totalSteps - currentStep - 1, 0) !== 1 ? 's' : ''}
          </span>
        </div>
      </motion.div>
    </div>
  );
}
