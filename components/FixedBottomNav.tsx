'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FixedBottomNavProps {
  currentStep: number;
  totalSteps?: number;
  language: 'en' | 'ur';
  canProceed: boolean;
  onNext: () => void;
  onBack: () => void;
  nextLabel?: string;
  backLabel?: string;
  stepNameEn?: string;
  stepNameUr?: string;
  stepIcon?: string;
}

const DEFAULT_STEP_INFO: Record<
  number,
  { icon: string; en: string; ur: string }
> = {
  0: { icon: '🐄', en: 'Select Animal', ur: 'جانور منتخب کریں' },
  1: { icon: '🌾', en: 'Choose Ingredients', ur: 'اجزاء منتخب کریں' },
  2: { icon: '⚙️', en: 'Build Formula', ur: 'فارمولا بنائیں' },
  3: { icon: '📊', en: 'Review Status', ur: 'حالت دیکھیں' },
  4: { icon: '✅', en: 'Download & Share', ur: 'محفوظ و ڈاؤن لوڈ کریں' },
};

export function FixedBottomNav({
  currentStep,
  totalSteps = 5,
  language,
  canProceed,
  onNext,
  onBack,
  nextLabel,
  backLabel,
  stepNameEn,
  stepNameUr,
  stepIcon,
}: FixedBottomNavProps) {
  // If on the final step (Step 5 / index 4), the page has its own dedicated export/reset actions
  if (currentStep >= totalSteps - 1) return null;

  const info = DEFAULT_STEP_INFO[currentStep] || { icon: '📋', en: '', ur: '' };
  const currentTitle = language === 'en' ? (stepNameEn || info.en) : (stepNameUr || info.ur);
  const currentIcon = stepIcon || info.icon;

  const defaultNextText =
    currentStep === totalSteps - 2
      ? language === 'en' ? 'View Recipe' : 'فارمولا دیکھیں'
      : language === 'en' ? 'Next' : 'اگلا';

  const nextText = nextLabel || defaultNextText;
  const backText = backLabel || (language === 'en' ? 'Back' : 'واپس');

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-5px_25px_rgba(14,59,94,0.09)] py-2.5 sm:py-3 px-3 sm:px-6"
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2.5 sm:gap-4">
        {/* Back Button */}
        <div className="flex-1 max-w-[140px] sm:max-w-[180px]">
          {currentStep > 0 ? (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Button
                variant="outline"
                onClick={onBack}
                className="w-full h-11 sm:h-12 rounded-xl border-slate-300 hover:border-[#0e3b5e]/40 hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs tap-transparent"
              >
                {language === 'en' ? (
                  <>
                    <ChevronLeft className="w-4 h-4" />
                    <span>{backText}</span>
                  </>
                ) : (
                  <>
                    <span>{backText}</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </motion.div>
          ) : (
            <div className="h-11 sm:h-12" />
          )}
        </div>

        {/* Center Step Context / Indicator */}
        <div className="hidden xs:flex flex-col items-center justify-center text-center px-2 min-w-0">
          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-[#0e3b5e] leading-tight truncate">
            <span>{currentIcon}</span>
            <span className="truncate">{currentTitle}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="flex gap-1">
              {Array.from({ length: totalSteps }).map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStep
                      ? 'w-5 bg-[#558b2f]'
                      : idx < currentStep
                        ? 'w-2 bg-[#0e3b5e]/60'
                        : 'w-2 bg-slate-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-[10px] font-bold text-slate-400 font-mono ml-1">
              {currentStep + 1}/{totalSteps}
            </span>
          </div>
        </div>

        {/* Next Button */}
        <div className="flex-1 max-w-[140px] sm:max-w-[200px]">
          <motion.div whileHover={{ scale: canProceed ? 1.02 : 1 }} whileTap={{ scale: canProceed ? 0.97 : 1 }}>
            <Button
              onClick={onNext}
              disabled={!canProceed}
              className="w-full h-11 sm:h-12 rounded-xl font-extrabold text-xs sm:text-sm bg-gradient-to-r from-[#0e3b5e] to-[#155e75] hover:from-[#09253b] hover:to-[#0e3b5e] text-white shadow-md shadow-[#0e3b5e]/25 flex items-center justify-center gap-1.5 tap-transparent disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {language === 'en' ? (
                <>
                  <span>{nextText}</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4" />
                  <span>{nextText}</span>
                </>
              )}
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
