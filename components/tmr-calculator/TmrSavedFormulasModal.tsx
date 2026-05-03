'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';
import { X, Bookmark, Trash2, FolderOpen, Beef, Zap, Coins } from 'lucide-react';
import {
  listSavedTmrFormulas,
  deleteSavedTmrFormula,
  type SavedTmrFormula,
} from '@/lib/tmrSavedFormulas';
import { ANIMALS } from '@/lib/constants';

interface TmrSavedFormulasModalProps {
  isOpen: boolean;
  language: 'en' | 'ur';
  onClose: () => void;
  onLoad: (entry: SavedTmrFormula) => void;
}

export function TmrSavedFormulasModal({
  isOpen, language, onClose, onLoad,
}: TmrSavedFormulasModalProps) {
  const [items, setItems] = useState<SavedTmrFormula[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setItems(listSavedTmrFormulas());
      setConfirmDeleteId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleDelete = useCallback((id: number) => {
    deleteSavedTmrFormula(id);
    setItems(listSavedTmrFormulas());
    setConfirmDeleteId(null);
  }, []);

  const t = {
    title:      language === 'en' ? 'Saved TMR Formulas' : 'محفوظ TMR فارمولے',
    subtitle:   language === 'en' ? 'Resume any TMR you saved before' : 'پہلے سے محفوظ TMR کھولیں',
    emptyTitle: language === 'en' ? 'No saved TMR formulas yet' : 'ابھی کوئی محفوظ TMR نہیں',
    emptyDesc:  language === 'en'
      ? 'Build a TMR and tap "Save TMR Formula" on the last step to see it here.'
      : 'TMR بنائیں اور آخری مرحلے پر "محفوظ کریں" دبائیں۔',
    load:       language === 'en' ? 'Load' : 'کھولیں',
    delete:     language === 'en' ? 'Delete' : 'مٹائیں',
    confirm:    language === 'en' ? 'Confirm delete?' : 'مٹانے کی تصدیق؟',
    cancel:     language === 'en' ? 'Cancel' : 'منسوخ',
    items:      language === 'en' ? 'items' : 'اجزاء',
    cp:         language === 'en' ? 'CP'    : 'پروٹین',
    me:         language === 'en' ? 'ME'    : 'توانائی',
    perKg:      language === 'en' ? '₨/kg'  : 'فی کلو',
    forage:     language === 'en' ? 'forage' : 'چارہ',
    close:      language === 'en' ? 'Close' : 'بند کریں',
  };

  const getAnimalIcon = (animalId: string | null): string => {
    if (!animalId) return '🐄';
    return ANIMALS.find((a) => a.id === animalId)?.icon ?? '🐄';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70]"
          />

          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-x-0 bottom-0 sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:inset-x-auto sm:-translate-x-1/2 sm:-translate-y-1/2 w-full sm:w-[80vw] lg:w-[70vw] max-w-3xl z-[71] max-h-[92vh] sm:max-h-[85vh] flex flex-col pb-safe-bottom sm:pb-0"
          >
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full">
              <div className="relative bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-5 text-white flex items-start justify-between flex-shrink-0">
                <div className="flex items-start gap-3">
                  <div className="bg-white/15 backdrop-blur-sm p-2.5 rounded-xl">
                    <Bookmark className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{t.title}</h2>
                    <p className="text-sm text-emerald-50/90 mt-0.5">{t.subtitle}</p>
                  </div>
                </div>
                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors tap-transparent"
                  aria-label={t.close}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5 bg-gradient-to-b from-slate-50 to-white">
                {items.length === 0 ? (
                  <div className="text-center py-10 text-slate-500">
                    <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="font-bold mb-1">{t.emptyTitle}</p>
                    <p className="text-sm">{t.emptyDesc}</p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {items.map((entry) => (
                      <li key={entry.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start gap-3">
                          <span className="text-3xl">{getAnimalIcon(entry.animalId)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 truncate">{entry.animalLabel} — {entry.stageLabel}</p>
                            <p className="text-xs text-slate-500">{entry.date}</p>
                            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                              <Pill icon={<span>🌿</span>}>{entry.totals.forageDmPct.toFixed(0)}% {t.forage}</Pill>
                              <Pill icon={<Beef className="w-3 h-3" />}>{entry.totals.protein.toFixed(1)}% {t.cp}</Pill>
                              <Pill icon={<Zap className="w-3 h-3" />}>{entry.totals.energy.toFixed(2)} {t.me}</Pill>
                              <Pill icon={<Coins className="w-3 h-3" />}>Rs {entry.totals.perKgPrice.toFixed(0)} {t.perKg}</Pill>
                              <Pill>{entry.formula.length} {t.items}</Pill>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            <button
                              onClick={() => onLoad(entry)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg tap-transparent"
                            >
                              {t.load}
                            </button>
                            {confirmDeleteId === entry.id ? (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleDelete(entry.id)}
                                  className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded tap-transparent"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-xs font-bold rounded tap-transparent"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(entry.id)}
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg flex items-center gap-1 tap-transparent"
                              >
                                <Trash2 className="w-3 h-3" />
                                {t.delete}
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Pill({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full font-medium">
      {icon}
      {children}
    </span>
  );
}
