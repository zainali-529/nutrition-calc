'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { QUICK_START_TEMPLATES, type QuickStartTemplate } from '@/lib/templates';

interface QuickStartTemplatesProps {
  language: 'en' | 'ur';
  onUseTemplate: (template: QuickStartTemplate) => void;
}

/**
 * Quick-start gallery shown above the animal grid in Step 1. Lets the user
 * skip the wizard's "decision tree" by picking a pre-built recipe — first-time
 * users especially benefit from this since they don't yet know which
 * ingredients to combine.
 */
export function QuickStartTemplates({ language, onUseTemplate }: QuickStartTemplatesProps) {
  const t = {
    title:    language === 'en' ? 'Quick Start' : 'فوری شروعات',
    subtitle: language === 'en'
      ? 'Pick a ready-made recipe and tweak from there — fastest way to get started.'
      : 'تیار شدہ فارمولا چنیں اور اپنی ضرورت کے مطابق تبدیل کریں — شروع کرنے کا تیز ترین طریقہ۔',
    or:       language === 'en' ? 'Or build from scratch ↓' : 'یا اپنا فارمولا بنائیں ↓',
    use:      language === 'en' ? 'Use this' : 'یہی استعمال کریں',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-violet-50 via-fuchsia-50 to-violet-50 border-2 border-violet-200 rounded-xl p-4 sm:p-5 space-y-4"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-bold text-violet-900">{t.title}</h3>
          <p className="text-xs text-violet-700/85 leading-relaxed">{t.subtitle}</p>
        </div>
      </div>

      {/* Template grid — 1 col on mobile, 2 on sm, 3 on lg */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {QUICK_START_TEMPLATES.map((tpl) => (
          <TemplateCard key={tpl.id} template={tpl} language={language} onPick={() => onUseTemplate(tpl)} />
        ))}
      </div>

      {/* Divider hint that user can also build manually */}
      <p className="text-center text-xs text-violet-700/70 font-medium pt-1">{t.or}</p>
    </motion.div>
  );
}

function TemplateCard({
  template, language, onPick,
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
      whileTap={{ scale: 0.98 }}
      className="relative text-left bg-white rounded-lg border-2 border-violet-200 hover:border-violet-500 hover:shadow-md p-3 transition-all flex items-start gap-3 tap-transparent"
    >
      <span className="text-3xl flex-shrink-0 leading-none">{template.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-violet-900 leading-tight">{name}</p>
        <p className="text-[11px] text-gray-600 leading-snug mt-0.5 line-clamp-2">{desc}</p>
      </div>
      {badge && (
        <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold uppercase tracking-wide bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded-full border border-amber-500 shadow-sm whitespace-nowrap">
          {badge}
        </span>
      )}
    </motion.button>
  );
}
