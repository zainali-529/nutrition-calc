'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronDown, ArrowRight, ArrowLeft } from 'lucide-react';
import { QUICK_START_TEMPLATES, type QuickStartTemplate } from '@/lib/templates';

interface QuickStartTemplatesProps {
  language: 'en' | 'ur';
  onUseTemplate: (template: QuickStartTemplate) => void;
}

/**
 * Quick-start gallery shown above the animal grid in Step 1.
 * Formatted as a collapsible Accordion (default: collapsed) designed for
 * non-educated livestock farmers with clear visual cues and large tap targets.
 */
export function QuickStartTemplates({ language, onUseTemplate }: QuickStartTemplatesProps) {
  const [isOpen, setIsOpen] = useState(false);

  const t = {
    title:    language === 'en' ? 'Quick Start — Ready-Made Recipes' : 'ریڈی میڈ تیار شدہ ونڈہ فارمولے',
    subtitle: language === 'en'
      ? 'Tap to view 9 pre-built recipes for Cow, Buffalo, Goat & Bull.'
      : 'گائے، بھینس، بکری اور بیل کے ۹ تیار فارمولے کھولنے کے لیے یہاں کلک کریں۔',
    badge:      language === 'en' ? '9 Ready Recipes' : '۹ تیار فارمولے',
    tapToOpen:  language === 'en' ? 'Tap to view recipes' : 'فارمولے کھولنے کے لیے دبائیں',
    tapToClose: language === 'en' ? 'Hide recipes' : 'فارمولے بند کریں',
    or:         language === 'en' ? 'Or pick your animal manually below ↓' : 'یا نیچے سے اپنے جانور کا انتخاب کریں ↓',
  };

  return (
    <div className="bg-gradient-to-br from-emerald-50/90 via-slate-50 to-emerald-100/60 border-2 border-emerald-400/70 rounded-2xl overflow-hidden shadow-sm transition-all duration-300">
      {/* Accordion Header Button — Collapsed by default */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full text-left px-4 py-3.5 sm:px-5 sm:py-4 flex items-center justify-between gap-3 bg-white/80 hover:bg-white transition-colors tap-transparent cursor-pointer group"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0e3b5e] to-[#558b2f] text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-[#0e3b5e]/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-extrabold text-[#0e3b5e] tracking-tight leading-tight">
                {t.title}
              </h3>
              <span className="text-[10px] sm:text-xs font-extrabold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full whitespace-nowrap shadow-2xs">
                {t.badge}
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed truncate mt-0.5">
              {t.subtitle}
            </p>
          </div>
        </div>

        {/* Action / Chevron indicator */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="hidden sm:inline text-xs font-extrabold text-[#0e3b5e]/80 group-hover:text-[#558b2f] transition-colors">
            {isOpen ? t.tapToClose : t.tapToOpen}
          </span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-emerald-100 text-[#0e3b5e] flex items-center justify-center border border-slate-200 group-hover:border-emerald-300 transition-colors"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </div>
      </button>

      {/* Accordion Content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden border-t border-emerald-200/80 bg-white/90"
          >
            <div className="p-3.5 sm:p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {QUICK_START_TEMPLATES.map((tpl) => (
                  <TemplateCard
                    key={tpl.id}
                    template={tpl}
                    language={language}
                    onPick={() => onUseTemplate(tpl)}
                  />
                ))}
              </div>

              {/* Hint to build manually */}
              <p className="text-center text-xs text-[#0e3b5e]/80 font-bold pt-1">
                {t.or}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TemplateCard({
  template,
  language,
  onPick,
}: {
  template: QuickStartTemplate;
  language: 'en' | 'ur';
  onPick: () => void;
}) {
  const name  = language === 'en' ? template.nameEn  : template.nameUr;
  const desc  = language === 'en' ? template.descEn  : template.descUr;
  const badge = language === 'en' ? template.badgeEn : template.badgeUr;

  return (
    <motion.button
      onClick={onPick}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.97 }}
      className="relative ltr:text-left rtl:text-right bg-white rounded-xl border-2 border-slate-200 hover:border-[#558b2f] hover:shadow-md hover:bg-[#f4f8ee]/40 p-3.5 transition-all flex flex-col justify-between gap-3 tap-transparent group cursor-pointer"
    >
      <div className="flex items-start gap-3 w-full">
        <span className="text-3xl flex-shrink-0 leading-none group-hover:scale-110 transition-transform duration-200">
          {template.icon}
        </span>
        <div className="flex-1 min-w-0 ltr:pr-6 rtl:pl-6">
          <p className="font-extrabold text-sm text-[#0e3b5e] leading-tight group-hover:text-[#558b2f] transition-colors">
            {name}
          </p>
          <p className="text-[11px] text-slate-500 font-medium leading-snug mt-1 line-clamp-2">
            {desc}
          </p>
        </div>
        {badge && (
          <span className="absolute top-3 ltr:right-3 rtl:left-3 text-[9px] font-extrabold uppercase tracking-wide bg-[#558b2f] text-white px-2 py-0.5 rounded-full border border-white shadow-xs whitespace-nowrap">
            {badge}
          </span>
        )}
      </div>

      {/* Large action button for easy tap by non-literate users */}
      <div className="w-full pt-1">
        <div className="w-full h-8 rounded-lg bg-emerald-50 group-hover:bg-[#558b2f] text-[#558b2f] group-hover:text-white border border-emerald-200 group-hover:border-[#558b2f] text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-2xs">
          <span>{language === 'en' ? 'Select This Formula' : 'یہ فارمولا منتخب کریں'}</span>
          {language === 'en' ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
        </div>
      </div>
    </motion.button>
  );
}
