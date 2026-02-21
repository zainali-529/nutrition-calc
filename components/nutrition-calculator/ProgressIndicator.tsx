'use client';

import { motion } from 'framer-motion';

interface ProgressIndicatorProps {
  current: number;
  total: number;
  language: 'en' | 'ur';
}

export function ProgressIndicator({
  current,
  total,
  language,
}: ProgressIndicatorProps) {
  const percentage = ((current + 1) / total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-gray-600">
          {language === 'en' ? 'Progress' : 'ترقی'}
        </span>
        <span className="text-xs font-bold text-emerald-600">
          {current + 1} / {total}
        </span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"
        />
      </div>
    </div>
  );
}
