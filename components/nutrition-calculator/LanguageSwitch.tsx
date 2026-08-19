'use client';

import { motion } from 'framer-motion';

interface LanguageSwitchProps {
  language: 'en' | 'ur';
  onChange: (lang: 'en' | 'ur') => void;
}

export function LanguageSwitch({ language, onChange }: LanguageSwitchProps) {
  return (
    <motion.div
      className="inline-flex gap-1 bg-white rounded-full p-1 border border-gray-200 shadow-sm"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {(['en', 'ur'] as const).map((lang) => (
        <button
          key={lang}
          onClick={() => onChange(lang)}
          className={`px-3.5 py-1.5 rounded-full font-bold text-xs sm:text-sm transition-all ${
            language === lang
              ? 'bg-[#0e3b5e] text-white shadow-sm'
              : 'text-slate-600 hover:text-[#0e3b5e]'
          }`}
        >
          {lang === 'en' ? 'English' : 'اردو'}
        </button>
      ))}
    </motion.div>
  );
}
