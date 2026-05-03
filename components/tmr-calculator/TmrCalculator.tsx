'use client';

import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Stepper } from '@/components/nutrition-calculator/Stepper';
import { LanguageSwitch } from '@/components/nutrition-calculator/LanguageSwitch';
import { STAGES } from '@/lib/constants';
import { buildTmrFormula, type TmrFormulaItem } from '@/lib/tmrCalculations';
import { getAnyIngredient, isForage } from '@/lib/forages';
import { getDefaultForagePct } from '@/lib/tmrRanges';
import { TmrStep1AnimalSplit } from './TmrStep1AnimalSplit';
import { TmrStep2Ingredients } from './TmrStep2Ingredients';
import { TmrStep3Formula } from './TmrStep3Formula';
import { TmrStep4Status } from './TmrStep4Status';
import { TmrStep5Actions } from './TmrStep5Actions';
import { TmrSavedFormulasModal } from './TmrSavedFormulasModal';
import type { SavedTmrFormula } from '@/lib/tmrSavedFormulas';

/**
 * Merge an existing TMR formula with the user's current selection.
 * Mirrors mergeFormulaWithSelection in NutritionCalculator.tsx — keeps the
 * user's kg / price overrides when they navigate back to Step 2 and toggle.
 */
function mergeTmrFormulaWithSelection(
  existing: TmrFormulaItem[],
  selectedForages: string[],
  selectedConcentrates: string[],
): TmrFormulaItem[] {
  const allKeys = new Set([...selectedForages, ...selectedConcentrates]);
  if (existing.length === 0) return buildTmrFormula(selectedForages, selectedConcentrates);

  const kept = existing.filter((i) => allKeys.has(i.key));
  const keptKeys = new Set(kept.map((i) => i.key));

  const additions: TmrFormulaItem[] = [];
  for (const key of allKeys) {
    if (keptKeys.has(key)) continue;
    const data = getAnyIngredient(key);
    additions.push({
      name:  data?.nameEn || key.replace(/_/g, ' '),
      key,
      kg:    0,
      price: data?.price || 0,
    });
  }
  return [...kept, ...additions];
}

export function TmrCalculator() {
  const [language, setLanguage] = useState<'en' | 'ur'>('en');
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Step 1 state — animal/stage + DM split (forage % on DM basis)
  const [selectedAnimal, setSelectedAnimal] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState(0);
  const [forageDmPct, setForageDmPct] = useState(60); // user-editable; default depends on animal/stage

  // Step 2 state — tabbed selection of forages + concentrates
  const [selectedForages, setSelectedForages] = useState<string[]>([]);
  const [selectedConcentrates, setSelectedConcentrates] = useState<string[]>([]);

  // Step 3 state — the actual recipe (kg / price per ingredient)
  const [formula, setFormula] = useState<TmrFormulaItem[]>([]);

  // Transient flag: when the user enters Step 3 with a freshly-built formula
  // (not a back-navigation, not a loaded save), we auto-run the Balanced LP
  // so they see a sensible TMR starting recipe instead of even-distribution.
  const [autoBalanceOnMount, setAutoBalanceOnMount] = useState(false);

  // Saved formulas modal
  const [savedOpen, setSavedOpen] = useState(false);

  // ── Step 1 handlers ───────────────────────────────────────────────────────
  const handleAnimalSelect = useCallback((animal: string) => {
    setSelectedAnimal((prev) => {
      if (prev !== animal) {
        setSelectedStage(0);
        setForageDmPct(getDefaultForagePct(animal, 0));
      }
      return animal;
    });
  }, []);

  const handleStageSelect = useCallback((stage: number) => {
    setSelectedStage(stage);
    if (selectedAnimal) setForageDmPct(getDefaultForagePct(selectedAnimal, stage));
  }, [selectedAnimal]);

  const handleForageDmPctChange = useCallback((pct: number) => {
    setForageDmPct(Math.max(0, Math.min(100, Math.round(pct))));
  }, []);

  // ── Step 2 handlers ───────────────────────────────────────────────────────
  const handleForageToggle = useCallback((key: string) => {
    setSelectedForages((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  const handleConcentrateToggle = useCallback((key: string) => {
    setSelectedConcentrates((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  // ── Step 3 handler ────────────────────────────────────────────────────────
  // When the user removes an item via the X icon in Step 3, sync it back to
  // the Step 2 selection so going Back doesn't show an inconsistent state.
  const handleFormulaChange = useCallback((next: TmrFormulaItem[]) => {
    setFormula((prev) => {
      const newKeys = new Set(next.map((i) => i.key));
      const removed = prev.filter((i) => !newKeys.has(i.key)).map((i) => i.key);
      if (removed.length > 0) {
        for (const key of removed) {
          if (isForage(key)) {
            setSelectedForages((s) => s.filter((k) => k !== key));
          } else {
            setSelectedConcentrates((s) => s.filter((k) => k !== key));
          }
        }
      }
      return next;
    });
  }, []);

  // ── Wizard navigation ─────────────────────────────────────────────────────
  const handleNextStep = useCallback(() => {
    // Step 2 → Step 3: build / merge formula from current selection.
    // On a TRULY-fresh Step 3 entry (no prior formula), set the auto-balance
    // flag so Step 3 auto-runs the Balanced LP for a sensible starting TMR.
    if (currentStep === 1) {
      const wasEmpty = formula.length === 0;
      setFormula((prev) => mergeTmrFormulaWithSelection(prev, selectedForages, selectedConcentrates));
      if (wasEmpty) setAutoBalanceOnMount(true);
    }
    setCompletedSteps((prev) => [...new Set([...prev, currentStep])]);
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  }, [currentStep, selectedForages, selectedConcentrates, formula.length]);

  const handleBackStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleStepClick = useCallback((step: number) => {
    if (step <= Math.max(...completedSteps, currentStep)) {
      setCurrentStep(step);
    }
  }, [completedSteps, currentStep]);

  // ── Reset / Load saved ────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setCurrentStep(0);
    setCompletedSteps([]);
    setSelectedAnimal(null);
    setSelectedStage(0);
    setForageDmPct(60);
    setSelectedForages([]);
    setSelectedConcentrates([]);
    setFormula([]);
    setAutoBalanceOnMount(false);
  }, []);

  const handleLoadSaved = useCallback((entry: SavedTmrFormula) => {
    setSelectedAnimal(entry.animalId);
    setSelectedStage(entry.stageIndex);
    setForageDmPct(entry.forageDmPct);
    setSelectedForages(entry.selectedForages);
    setSelectedConcentrates(entry.selectedConcentrates);
    setFormula(entry.formula);
    setCompletedSteps([0, 1]);
    setCurrentStep(2);
    setSavedOpen(false);
    // Loading a saved TMR — don't run Balanced over it.
    setAutoBalanceOnMount(false);
  }, []);

  // Display helpers for Step 5
  const animalLabel =
    selectedAnimal
      ?.replace(/_/g, ' ')
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
      .trim() || '';

  const stageLabel =
    selectedAnimal && STAGES[selectedAnimal as keyof typeof STAGES]
      ? STAGES[selectedAnimal as keyof typeof STAGES][language][selectedStage] ?? ''
      : '';

  return (
    <div className="min-h-screen relative pb-safe-bottom">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-40 pt-safe-top px-safe"
      >
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href="/"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-slate-600 hover:text-emerald-700 hover:border-emerald-300 transition-all flex-shrink-0 tap-transparent"
              aria-label="Back to concentrate calculator"
              title="Back to concentrate calculator"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Link>
            <span className="text-2xl sm:text-3xl flex-shrink-0">🥗</span>
            <div className="min-w-0">
              <h1 className="font-bold text-base sm:text-xl text-gray-900 leading-tight truncate">
                {language === 'en' ? 'TMR Calculator' : 'TMR کیلکولیٹر'}
              </h1>
              <p className="hidden sm:block text-xs text-gray-500">
                {language === 'en' ? 'Total Mixed Ration — Concentrate + Forage' : 'مکمل ملا ہوا راشن — کانسنٹریٹ + چارہ'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <motion.button
              onClick={() => setSavedOpen(true)}
              whileHover={{ scale: 1.08, y: -1 }}
              whileTap={{ scale: 0.95 }}
              className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-emerald-600 hover:text-emerald-700 hover:border-emerald-300 transition-all tap-transparent"
              title={language === 'en' ? 'Saved TMR formulas' : 'محفوظ TMR فارمولے'}
              aria-label={language === 'en' ? 'Saved TMR formulas' : 'محفوظ TMR فارمولے'}
            >
              <Bookmark className="w-4 h-4 sm:w-5 sm:h-5" />
            </motion.button>
            <LanguageSwitch language={language} onChange={setLanguage} />
          </div>
        </div>
      </motion.div>

      {/* Saved-formulas modal */}
      <TmrSavedFormulasModal
        isOpen={savedOpen}
        language={language}
        onClose={() => setSavedOpen(false)}
        onLoad={handleLoadSaved}
      />

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8 relative z-10 px-safe">
        <Stepper
          currentStep={currentStep}
          totalSteps={5}
          onStepClick={handleStepClick}
          completedSteps={completedSteps}
          language={language}
        />

        <div className="bg-white rounded-xl sm:rounded-lg shadow-md sm:shadow-lg p-4 sm:p-6 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
            >
              {currentStep === 0 && (
                <TmrStep1AnimalSplit
                  language={language}
                  selectedAnimal={selectedAnimal}
                  selectedStage={selectedStage}
                  forageDmPct={forageDmPct}
                  onAnimalSelect={handleAnimalSelect}
                  onStageSelect={handleStageSelect}
                  onForageDmPctChange={handleForageDmPctChange}
                  onNext={handleNextStep}
                />
              )}
              {currentStep === 1 && (
                <TmrStep2Ingredients
                  language={language}
                  selectedAnimal={selectedAnimal}
                  selectedStage={selectedStage}
                  forageDmPct={forageDmPct}
                  selectedForages={selectedForages}
                  selectedConcentrates={selectedConcentrates}
                  onForageToggle={handleForageToggle}
                  onConcentrateToggle={handleConcentrateToggle}
                  onNext={handleNextStep}
                  onBack={handleBackStep}
                />
              )}
              {currentStep === 2 && (
                <TmrStep3Formula
                  language={language}
                  selectedAnimal={selectedAnimal}
                  selectedStage={selectedStage}
                  forageDmPct={forageDmPct}
                  formula={formula}
                  onFormulaChange={handleFormulaChange}
                  onNext={handleNextStep}
                  onBack={handleBackStep}
                  autoBalanceOnMount={autoBalanceOnMount}
                  onAutoBalanceConsumed={() => setAutoBalanceOnMount(false)}
                />
              )}
              {currentStep === 3 && (
                <TmrStep4Status
                  language={language}
                  selectedAnimal={selectedAnimal}
                  selectedStage={selectedStage}
                  forageDmPct={forageDmPct}
                  formula={formula}
                  onNext={handleNextStep}
                  onBack={handleBackStep}
                />
              )}
              {currentStep === 4 && (
                <TmrStep5Actions
                  language={language}
                  formula={formula}
                  animal={animalLabel}
                  stage={stageLabel}
                  animalId={selectedAnimal}
                  stageIndex={selectedStage}
                  forageDmPct={forageDmPct}
                  selectedForages={selectedForages}
                  selectedConcentrates={selectedConcentrates}
                  onReset={handleReset}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
