'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';
import { X, Bookmark, Trash2, FolderOpen, Calendar, Package, Beef, Zap, Coins } from 'lucide-react';
import {
  listSavedFormulas,
  deleteSavedFormula,
  type SavedFormula,
} from '@/lib/savedFormulas';
import { ANIMALS } from '@/lib/constants';

interface SavedFormulasModalProps {
  isOpen: boolean;
  language: 'en' | 'ur';
  onClose: () => void;
  onLoad: (entry: SavedFormula) => void;
}

export function SavedFormulasModal({ isOpen, language, onClose, onLoad }: SavedFormulasModalProps) {
  const [items, setItems] = useState<SavedFormula[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  // Re-read from localStorage whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setItems(listSavedFormulas());
      setConfirmDeleteId(null);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleDelete = useCallback((id: number) => {
    deleteSavedFormula(id);
    setItems(listSavedFormulas());
    setConfirmDeleteId(null);
  }, []);

  const handleLoad = useCallback(
    (entry: SavedFormula) => {
      onLoad(entry);
      onClose();
    },
    [onLoad, onClose]
  );

  const t = {
    title:        language === 'en' ? 'Saved Formulas' : 'محفوظ فارمولے',
    subtitle:     language === 'en' ? 'Pick up where you left off' : 'پہلے سے محفوظ فارمولے کھولیں',
    emptyTitle:   language === 'en' ? 'No saved formulas yet' : 'ابھی کوئی محفوظ فارمولا نہیں',
    emptyDesc:    language === 'en'
      ? 'Build a formula and tap "Save Formula" on the last step to see it here.'
      : 'فارمولا بنائیں اور آخری مرحلے پر "محفوظ کریں" دبائیں۔',
    load:         language === 'en' ? 'Load' : 'کھولیں',
    delete:       language === 'en' ? 'Delete' : 'مٹائیں',
    confirm:      language === 'en' ? 'Confirm delete?' : 'مٹانے کی تصدیق؟',
    cancel:       language === 'en' ? 'Cancel' : 'منسوخ',
    items:        language === 'en' ? 'items' : 'اجزاء',
    weight:       language === 'en' ? 'kg' : 'کلو',
    cp:           language === 'en' ? 'CP' : 'پروٹین',
    me:           language === 'en' ? 'ME' : 'توانائی',
    perKg:        language === 'en' ? '₨/kg' : 'فی کلو',
    close:        language === 'en' ? 'Close' : 'بند کریں',
  };

  const getAnimalIcon = (animalId: string | null): string => {
    if (!animalId) return '🐄';
    return ANIMALS.find((a) => a.id === animalId)?.icon ?? '🐄';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] sm:w-[80vw] lg:w-[70vw] max-w-3xl z-[71] max-h-[85vh] flex flex-col"
          >
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full">
              {/* Header */}
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
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  aria-label={t.close}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* List body */}
              <div className="flex-1 overflow-y-auto px-5 py-5 bg-gradient-to-b from-slate-50 to-white">
                {items.length === 0 ? (
                  <EmptyState title={t.emptyTitle} description={t.emptyDesc} />
                ) : (
                  <ul className="space-y-3">
                    {items.map((item, idx) => (
                      <FormulaCard
                        key={item.id}
                        item={item}
                        index={idx}
                        animalIcon={getAnimalIcon(item.animalId)}
                        confirmDelete={confirmDeleteId === item.id}
                        labels={t}
                        onLoad={() => handleLoad(item)}
                        onAskDelete={() => setConfirmDeleteId(item.id)}
                        onCancelDelete={() => setConfirmDeleteId(null)}
                        onConfirmDelete={() => handleDelete(item.id)}
                      />
                    ))}
                  </ul>
                )}
              </div>

              {/* Footer count */}
              {items.length > 0 && (
                <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 text-center flex-shrink-0">
                  {items.length} {items.length === 1
                    ? (language === 'en' ? 'saved formula' : 'محفوظ فارمولا')
                    : (language === 'en' ? 'saved formulas' : 'محفوظ فارمولے')}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// -----------------------------------------------------------------------------
// EmptyState
// -----------------------------------------------------------------------------
function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center text-center py-16 px-6"
    >
      <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
        <Bookmark className="w-10 h-10 text-emerald-400" strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-bold text-slate-800 mb-1.5">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm leading-relaxed">{description}</p>
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// Formula card
// -----------------------------------------------------------------------------
type LabelMap = ReturnType<typeof useT>; // not used, just for typing inline below
function useT() { return {} as Record<string, string>; }

function FormulaCard({
  item,
  index,
  animalIcon,
  confirmDelete,
  labels,
  onLoad,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  item: SavedFormula;
  index: number;
  animalIcon: string;
  confirmDelete: boolean;
  labels: Record<string, string>;
  onLoad: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all overflow-hidden"
    >
      <div className="p-4 flex items-start gap-4">
        {/* Animal icon */}
        <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200/60 flex items-center justify-center text-3xl shadow-sm">
          {animalIcon}
        </div>

        {/* Info column */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="min-w-0">
              <h4 className="font-bold text-slate-900 text-sm truncate">{item.animalLabel}</h4>
              <p className="text-xs text-slate-500 truncate">{item.stageLabel}</p>
            </div>
            <span className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-50 border border-slate-100 px-2 py-1 rounded-md">
              <Calendar className="w-3 h-3" />
              {item.date}
            </span>
          </div>

          {/* Stat chips */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            <Stat icon={<Package className="w-3 h-3" />} label={`${item.formula.length} ${labels.items}`} color="slate" />
            <Stat icon={<Beef className="w-3 h-3" />} label={`${labels.cp} ${item.totals.protein.toFixed(1)}%`} color="blue" />
            <Stat icon={<Zap className="w-3 h-3" />} label={`${labels.me} ${item.totals.energy.toFixed(2)}`} color="amber" />
            <Stat icon={<Coins className="w-3 h-3" />} label={`₨${item.totals.perKgPrice.toFixed(0)}/${labels.weight}`} color="emerald" />
          </div>

          {/* Actions */}
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-700 font-medium flex-1">{labels.confirm}</span>
              <button
                onClick={onCancelDelete}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              >
                {labels.cancel}
              </button>
              <button
                onClick={onConfirmDelete}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                {labels.delete}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onLoad}
                className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                {labels.load}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onAskDelete}
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors border border-slate-200 hover:border-red-200"
                aria-label={labels.delete}
                title={labels.delete}
              >
                <Trash2 className="w-4 h-4" />
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </motion.li>
  );
}

// Compact stat chip
function Stat({
  icon,
  label,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  color: 'slate' | 'blue' | 'amber' | 'emerald';
}) {
  const colorMap: Record<string, string> = {
    slate:   'bg-slate-50  text-slate-700  border-slate-200',
    blue:    'bg-blue-50   text-blue-700   border-blue-200',
    amber:   'bg-amber-50  text-amber-700  border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md border ${colorMap[color]}`}>
      {icon}
      {label}
    </span>
  );
}
