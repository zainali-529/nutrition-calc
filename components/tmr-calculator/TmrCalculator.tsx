'use client';

import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, ArrowLeft, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { Stepper } from '@/components/nutrition-calculator/Stepper';
import { LanguageSwitch } from '@/components/nutrition-calculator/LanguageSwitch';
import { GlossaryModal } from '@/components/nutrition-calculator/GlossaryModal';
import { Footer } from '@/components/Footer';
import { STAGES } from '@/lib/constants';
import { buildTmrFormula, type TmrFormulaItem } from '@/lib/tmrCalculations';
import { getAnyIngredient, isForage } from '@/lib/forages';
import { tmrFormulate } from '@/lib/tmrFormulate';
import { getDefaultForagePct, getTmrNutritionRange } from '@/lib/tmrRanges';
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
  const [forageDmPct, setForageDmPct] = useState(60);

  // Step 2 state — tabbed selection of forages + concentrates
  const [selectedForages, setSelectedForages] = useState<string[]>([]);
  const [selectedConcentrates, setSelectedConcentrates] = useState<string[]>([]);

  // Step 3 state — the actual recipe (kg / price per ingredient)
  const [formula, setFormula] = useState<TmrFormulaItem[]>([]);

  const [autoBalanceOnMount, setAutoBalanceOnMount] = useState(false);

  // Saved formulas modal
  const [savedOpen, setSavedOpen] = useState(false);

  // Glossary modal — accessible from Help icon
  const [glossaryOpen, setGlossaryOpen] = useState(false);

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

  const canProceedCurrentStep = (() => {
    if (currentStep === 0) return selectedAnimal !== null;
    if (currentStep === 1) {
      if (!selectedAnimal) return false;
      const ranges = getTmrNutritionRange(selectedAnimal, selectedStage);
      if (!ranges) return false;

      const needForage = forageDmPct > 0 && selectedForages.length === 0;
      const needConcentrate = forageDmPct < 100 && selectedConcentrates.length === 0;
      if (needForage || needConcentrate) return false;

      const result = tmrFormulate({
        ingredientKeys: [...selectedForages, ...selectedConcentrates],
        ranges,
        forageDmPct,
      });
      return result.success;
    }
    if (currentStep === 2) return formula.length > 0;
    if (currentStep === 3) return true;
    return true;
  })();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-xs px-safe"
      >
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex justify-between items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href="/"
              className="p-1.5 -ml-1 text-slate-500 hover:text-[#0e3b5e] hover:bg-slate-100 rounded-full transition-colors flex-shrink-0 tap-transparent"
              title={language === 'en' ? 'Back to Concentrate Calculator' : 'ونڈہ کیلکولیٹر پر واپس جائیں'}
              aria-label={language === 'en' ? 'Back to Concentrate Calculator' : 'ونڈہ کیلکولیٹر پر واپس جائیں'}
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Link
              href="/tmr"
              className="flex items-center gap-2 sm:gap-3 group tap-transparent min-w-0"
              title={language === 'en' ? 'RumiCalc TMR' : 'رومی کیلک TMR'}
            >
              <img
                src="/rumicalc-logo.png"
                alt="RumiCalc Logo"
                className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 object-contain rounded-xl flex-shrink-0 group-hover:scale-105 transition-transform"
              />
              <div className="hidden sm:block min-w-0">
                <h1 className="font-extrabold text-base sm:text-xl text-gray-900 leading-tight tracking-tight truncate flex items-center gap-1.5">
                  <span className="inline-flex items-baseline tracking-tight font-extrabold"><span className="text-[#0e3b5e]">Rumi</span><span className="text-[#558b2f]">Calc</span></span>
                  <span className="text-[10px] sm:text-xs font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                    TMR • {language === 'en' ? 'Coming Soon' : 'عنقریب'}
                  </span>
                </h1>
                <p className="text-[11px] font-semibold text-slate-500 truncate">
                  {language === 'en' ? 'Total Mixed Ration (Forage + Wanda)' : 'مکمل راشن (سبز چارہ + ونڈہ)'}
                </p>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <motion.button
              onClick={() => setGlossaryOpen(true)}
              whileHover={{ scale: 1.08, y: -1 }}
              whileTap={{ scale: 0.95 }}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center text-[#0e3b5e] hover:text-[#558b2f] hover:border-[#558b2f]/50 transition-all tap-transparent"
              title={language === 'en' ? 'What do these mean?' : 'ان کا کیا مطلب ہے؟'}
              aria-label={language === 'en' ? 'Glossary' : 'لغت'}
            >
              <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </motion.button>
            <motion.button
              onClick={() => setSavedOpen(true)}
              whileHover={{ scale: 1.08, y: -1 }}
              whileTap={{ scale: 0.95 }}
              className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center text-[#0e3b5e] hover:text-[#558b2f] hover:border-[#558b2f]/50 transition-all tap-transparent"
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

      {/* Bilingual nutrient glossary */}
      <GlossaryModal
        isOpen={glossaryOpen}
        language={language}
        onClose={() => setGlossaryOpen(false)}
      />

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8 relative z-10 px-safe pb-32 sm:pb-36">
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

      {/* Unified Fixed Bottom Navigation & Footer */}
      <Footer
        currentStep={currentStep}
        totalSteps={5}
        language={language}
        canProceed={canProceedCurrentStep}
        onNext={handleNextStep}
        onBack={handleBackStep}
      />
    </div>
  );
}
