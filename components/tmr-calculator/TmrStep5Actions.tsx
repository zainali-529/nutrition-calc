'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { calculateTmrNutrients, exportTmrAsText, type TmrFormulaItem } from '@/lib/tmrCalculations';
import { saveTmrFormula } from '@/lib/tmrSavedFormulas';
import { getOverride } from '@/lib/ingredientOverrides';

interface TmrStep5ActionsProps {
  language: 'en' | 'ur';
  formula: TmrFormulaItem[];
  animal: string;
  stage: string;
  animalId: string | null;
  stageIndex: number;
  forageDmPct: number;
  selectedForages: string[];
  selectedConcentrates: string[];
  onReset: () => void;
}

function ActionButton({
  icon, title, description, onClick, loading,
}: {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <motion.button
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={loading}
      className="w-full text-left bg-white rounded-lg border-2 border-gray-200 p-4 hover:border-emerald-500 hover:shadow-lg transition-all tap-transparent"
    >
      <div className="flex items-start gap-4">
        <span className="text-3xl">{icon}</span>
        <div className="flex-1">
          <h4 className="font-bold text-gray-900">{title}</h4>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        <motion.span animate={{ x: loading ? -5 : 0 }} className="text-xl text-gray-400">→</motion.span>
      </div>
    </motion.button>
  );
}

export function TmrStep5Actions({
  language,
  formula,
  animal,
  stage,
  animalId,
  stageIndex,
  forageDmPct,
  selectedForages,
  selectedConcentrates,
  onReset,
}: TmrStep5ActionsProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  const t = {
    complete:        language === 'en' ? 'TMR Formula Complete!' : 'TMR فارمولا مکمل!',
    congrats:        language === 'en' ? 'Your Total Mixed Ration is ready to feed.' : 'آپ کا TMR تیار ہے۔',
    summary:         language === 'en' ? 'TMR Summary' : 'TMR خلاصہ',
    animal:          language === 'en' ? 'Animal' : 'جانور',
    stage:           language === 'en' ? 'Stage' : 'مرحلہ',
    items:           language === 'en' ? 'Items' : 'اجزاء',
    targetSplit:     language === 'en' ? 'Target DM split' : 'ہدف DM تقسیم',
    achievedSplit:   language === 'en' ? 'Achieved DM split' : 'حاصل DM تقسیم',
    date:            language === 'en' ? 'Date' : 'تاریخ',
    saveFormula:     language === 'en' ? 'Save TMR Formula' : 'TMR فارمولا محفوظ کریں',
    saveDesc:        language === 'en' ? 'Save for future reference (separate from concentrate formulas)' : 'مستقبل کے لیے محفوظ کریں',
    shareWA:         language === 'en' ? 'Share on WhatsApp' : 'واٹس ایپ پر شیئر',
    shareDesc:       language === 'en' ? 'Send the TMR formula via WhatsApp' : 'TMR فارمولا واٹس ایپ پر بھیجیں',
    download:        language === 'en' ? 'Download Text Report' : 'ٹیکسٹ رپورٹ',
    downloadDesc:    language === 'en' ? 'Get a plain-text TMR report' : 'سادہ ٹیکسٹ TMR رپورٹ',
    createNew:       language === 'en' ? 'Create New TMR' : 'نیا TMR بنائیں',
    createDesc:      language === 'en' ? 'Start a fresh TMR formulation' : 'نیا TMR شروع کریں',
    saved:           language === 'en' ? 'TMR saved successfully!' : 'TMR محفوظ ہو گیا!',
  };

  const nutrients = calculateTmrNutrients(formula);

  const handleSave = () => {
    setBusy('save');
    try {
      const overrides: Record<string, Record<string, number>> = {};
      for (const item of formula) {
        const ovr = getOverride(item.key);
        if (ovr) overrides[item.key] = ovr as Record<string, number>;
      }
      saveTmrFormula({
        animalId,
        animalLabel: animal,
        stageIndex,
        stageLabel:  stage,
        forageDmPct,
        selectedForages,
        selectedConcentrates,
        formula,
        totals: {
          weight:      nutrients.totalAsFed,
          perKgPrice:  nutrients.perKgPrice,
          protein:     nutrients.protein,
          energy:      nutrients.energy,
          forageDmPct: nutrients.forageDmShare * 100,
        },
        ingredientOverrides: overrides,
      });
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 3000);
    } finally {
      setBusy(null);
    }
  };

  const handleShare = () => {
    setBusy('share');
    try {
      const text = exportTmrAsText(formula, forageDmPct, language);
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } finally {
      setBusy(null);
    }
  };

  const handleDownload = () => {
    setBusy('download');
    try {
      const text = exportTmrAsText(formula, forageDmPct, language);
      const a = document.createElement('a');
      a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(text);
      a.download = `tmr-formula-${Date.now()}.txt`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setBusy(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6 sm:space-y-8"
    >
      {/* Success banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-r from-emerald-500 to-green-500 rounded-lg p-5 sm:p-8 text-white text-center"
      >
        <div className="text-4xl sm:text-5xl mb-2 sm:mb-4">🎉</div>
        <h2 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">{t.complete}</h2>
        <p className="text-emerald-100 text-sm sm:text-base">{t.congrats}</p>
      </motion.div>

      {/* Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
        <h3 className="font-bold text-lg mb-4">{t.summary}</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-gray-600">{t.animal}:</span> <span className="font-semibold">{animal}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">{t.stage}:</span> <span className="font-semibold">{stage}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">{t.items}:</span> <span className="font-semibold">{formula.length}</span></div>
          <div className="flex justify-between"><span className="text-gray-600">{t.targetSplit}:</span> <span className="font-semibold">🌿 {forageDmPct}% / ⚙️ {100 - forageDmPct}%</span></div>
          <div className="flex justify-between"><span className="text-gray-600">{t.achievedSplit}:</span> <span className="font-semibold">🌿 {(nutrients.forageDmShare * 100).toFixed(1)}% / ⚙️ {(nutrients.concentrateDmShare * 100).toFixed(1)}%</span></div>
          <div className="flex justify-between"><span className="text-gray-600">{t.date}:</span> <span className="font-semibold">{new Date().toLocaleDateString()}</span></div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-3">
        <ActionButton icon="💾" title={t.saveFormula} description={t.saveDesc} onClick={handleSave}     loading={busy === 'save'} />
        <ActionButton icon="💬" title={t.shareWA}     description={t.shareDesc} onClick={handleShare}    loading={busy === 'share'} />
        <ActionButton icon="📄" title={t.download}    description={t.downloadDesc} onClick={handleDownload} loading={busy === 'download'} />
        <ActionButton icon="✨" title={t.createNew}   description={t.createDesc} onClick={onReset} />
      </div>

      {/* Saved toast */}
      {savedOk && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6 bg-green-500 text-white rounded-lg p-4 shadow-lg z-50 mb-safe-bottom"
        >
          ✓ {t.saved}
        </motion.div>
      )}
    </motion.div>
  );
}
