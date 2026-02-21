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
          className={`px-4 py-2 rounded-full font-semibold text-sm transition-all ${
            language === lang
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {lang === 'en' ? 'English' : 'اردو'}
        </button>
      ))}
    </motion.div>
  );
}
