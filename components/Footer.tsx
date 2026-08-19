'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FooterProps {
  currentStep?: number;
  totalSteps?: number;
  language: 'en' | 'ur';
  canProceed?: boolean;
  onNext?: () => void;
  onBack?: () => void;
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

export function Footer({
  currentStep = 0,
  totalSteps = 5,
  language = 'en',
  canProceed = true,
  onNext,
  onBack,
  nextLabel,
  backLabel,
  stepNameEn,
  stepNameUr,
  stepIcon,
}: FooterProps) {
  const currentYear = new Date().getFullYear();
  const isNavigable = currentStep < totalSteps - 1 && onNext !== undefined;

  const info = DEFAULT_STEP_INFO[currentStep] || { icon: '📋', en: '', ur: '' };
  const currentTitle = language === 'en' ? (stepNameEn || info.en) : (stepNameUr || info.ur);
  const currentIcon = stepIcon || info.icon;

  const defaultNextText =
    currentStep === totalSteps - 2
      ? language === 'en' ? 'View Recipe' : 'فارمولا دیکھیں'
      : language === 'en' ? 'Next' : 'اگلا';

  const nextText = nextLabel || defaultNextText;
  const backText = backLabel || (language === 'en' ? 'Back' : 'واپس');

  const t = {
    poweredBy: language === 'en' ? 'Powered by' : 'پیشکش',
    channelName: language === 'en' ? 'Sabtain Animal Talk' : 'سبطین اینیمل ٹاک',
    rights: language === 'en' ? 'All rights reserved.' : 'جملہ حقوق محفوظ ہیں۔',
  };

  const socialLinks = [
    {
      name: 'YouTube',
      url: 'https://youtube.com/@sabtainanimaltalk',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      ),
      color: 'hover:text-[#FF0000] hover:bg-red-50 hover:border-red-200',
    },
    {
      name: 'TikTok',
      url: 'https://tiktok.com/@sabtainanimaltalk',
      icon: (
        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
        </svg>
      ),
      color: 'hover:text-black hover:bg-slate-100 hover:border-slate-300',
    },
    {
      name: 'Facebook',
      url: 'https://facebook.com/sabtainanimaltalk',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      color: 'hover:text-[#1877F2] hover:bg-blue-50 hover:border-blue-200',
    },
  ];

  return (
    <footer className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-5px_25px_rgba(14,59,94,0.09)] print:hidden">
      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 space-y-2">
        {/* Navigation Controls Row — shown on steps 1–4 */}
        {isNavigable && (
          <div className="flex items-center justify-between gap-2.5 sm:gap-4 pb-2 border-b border-slate-100">
            {/* Back Button */}
            <div className="flex-1 max-w-[130px] sm:max-w-[160px]">
              {currentStep > 0 && onBack ? (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    variant="outline"
                    onClick={onBack}
                    className="w-full h-10 sm:h-11 rounded-xl border-slate-300 hover:border-[#0e3b5e]/40 hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs tap-transparent"
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
                <div className="h-10 sm:h-11" />
              )}
            </div>

            {/* Center Step Context / Indicator */}
            <div className="flex flex-col items-center justify-center text-center px-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-[#0e3b5e] leading-tight truncate">
                <span>{currentIcon}</span>
                <span className="truncate">{currentTitle}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="flex gap-1">
                  {Array.from({ length: totalSteps }).map((_, idx) => (
                    <span
                      key={idx}
                      className={`h-1 rounded-full transition-all duration-300 ${
                        idx === currentStep
                          ? 'w-4 bg-[#558b2f]'
                          : idx < currentStep
                            ? 'w-1.5 bg-[#0e3b5e]/60'
                            : 'w-1.5 bg-slate-200'
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
            <div className="flex-1 max-w-[130px] sm:max-w-[180px]">
              <motion.div whileHover={{ scale: canProceed ? 1.02 : 1 }} whileTap={{ scale: canProceed ? 0.97 : 1 }}>
                <Button
                  onClick={onNext}
                  disabled={!canProceed}
                  className="w-full h-10 sm:h-11 rounded-xl font-extrabold text-xs sm:text-sm bg-gradient-to-r from-[#0e3b5e] to-[#155e75] hover:from-[#09253b] hover:to-[#0e3b5e] text-white shadow-md shadow-[#0e3b5e]/25 flex items-center justify-center gap-1.5 tap-transparent disabled:opacity-40 disabled:cursor-not-allowed"
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
        )}

        {/* Unified Branding & Social Media Strip */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          {/* Brand Info + Copyright */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-1.5 group">
              <img
                src="/rumicalc-logo.png"
                alt="RumiCalc Logo"
                className="w-6 h-6 sm:w-7 sm:h-7 object-contain rounded-lg shadow-xs group-hover:scale-105 transition-transform"
              />
              <span className="font-extrabold text-sm sm:text-base tracking-tight">
                <span className="text-[#0e3b5e]">Rumi</span>
                <span className="text-[#558b2f]">Calc</span>
              </span>
            </Link>
            <span className="text-slate-300">|</span>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium whitespace-nowrap">
              © {currentYear} {t.rights}
            </p>
          </div>

          {/* Powered by + Social Media */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0e3b5e]/5 border border-[#0e3b5e]/15 shadow-xs">
              <span className="text-[10px] sm:text-[11px] font-semibold text-slate-600">{t.poweredBy}</span>
              <span className="text-[11px] sm:text-xs font-extrabold text-[#0e3b5e] tracking-wide flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#558b2f] animate-pulse" />
                {t.channelName}
              </span>
            </div>

            {/* Social Media Links */}
            <div className="flex items-center gap-1">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ y: -1, scale: 1.08 }}
                  whileTap={{ scale: 0.93 }}
                  aria-label={social.name}
                  title={`${social.name} - Sabtain Animal Talk`}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-slate-200 bg-white text-slate-600 flex items-center justify-center transition-all shadow-xs ${social.color}`}
                >
                  {social.icon}
                </motion.a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
