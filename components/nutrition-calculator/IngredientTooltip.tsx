'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { NUTRITION_DATA } from '@/lib/constants';

interface IngredientTooltipProps {
  ingredientKey: string;
  children: React.ReactNode;
  language: 'en' | 'ur';
}

export function IngredientTooltip({
  ingredientKey,
  children,
  language,
}: IngredientTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const data = NUTRITION_DATA[ingredientKey as keyof typeof NUTRITION_DATA];

  if (!data) return <>{children}</>;

  return (
    <div className="relative inline-block group">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {children}
      </div>

      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-3 z-50 pointer-events-none"
          >
            <div className="bg-gray-900 text-white rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-lg">
              <div className="font-bold mb-1">
                {data[language === 'en' ? 'nameEn' : 'nameUr']}
              </div>
              <div className="text-gray-300 space-y-1">
                {data.cp && <div>Protein: {data.cp}%</div>}
                {data.me && <div>Energy: {data.me} MJ/kg</div>}
                {data.ndf && <div>Fiber: {data.ndf}%</div>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
