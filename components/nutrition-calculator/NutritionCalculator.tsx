'use client';

import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark } from 'lucide-react';
import { Stepper } from './Stepper';
import { LanguageSwitch } from './LanguageSwitch';
import { Step1Animal } from './Step1Animal';
import { Step2Ingredients } from './Step2Ingredients';
import { Step3Formula } from './Step3Formula';
import { Step4Status } from './Step4Status';
import { Step5Actions } from './Step5Actions';
import { SavedFormulasModal } from './SavedFormulasModal';
import { NutritionConflictModal, detectConflicts, type NutritionConflict } from './NutritionConflictModal';
import { buildFormula, FormulaItem } from '@/lib/calculations';
import { getIngredient, INGREDIENT_CATEGORIES, STAGES } from '@/lib/constants';
import { saveOverride, type IngredientOverride } from '@/lib/ingredientOverrides';
import type { SavedFormula } from '@/lib/savedFormulas';

/**
 * Merge an existing customised formula with the user's current ingredient
 * selection. Preserves kg/price overrides for items still selected, drops
 * deselected ones, and appends newly-selected ones (with default kg/price).
 */
function mergeFormulaWithSelection(
  existing: FormulaItem[],
  chosen: Record<string, string[]>
): FormulaItem[] {
  const selectedKeys = new Set<string>([
    ...(chosen.energy  || []),
    ...(chosen.protein || []),
    ...(chosen.fiber   || []),
    ...(chosen.fat     || []),
  ]);

  // If we have nothing yet (first time entering Step 3), build from scratch.
  if (existing.length === 0) return buildFormula(chosen);

  // Keep entries that are still selected (preserves their kg / price)
  const kept = existing.filter((item) => selectedKeys.has(item.key));
  const keptKeys = new Set(kept.map((i) => i.key));

  // Append any newly-selected keys that aren't yet in the formula
  const additions: FormulaItem[] = [];
  for (const key of selectedKeys) {
    if (keptKeys.has(key)) continue;
    const data = getIngredient(key);
    additions.push({
      name:    data?.nameEn || key.replace(/_/g, ' '),
      key,
      kg:      0,                  // user enters quantity
      price:   data?.price || 0,
      quality: 'average',
    });
  }

  return [...kept, ...additions];
}

/** Return the category key (e.g. 'energy') that owns this ingredient key. */
function categoryOf(ingredientKey: string): string | null {
  for (const [catKey, cat] of Object.entries(INGREDIENT_CATEGORIES)) {
    if (cat.ingredients.includes(ingredientKey)) return catKey;
  }
  return null;
}

export function NutritionCalculator() {
  const [language, setLanguage] = useState<'en' | 'ur'>('en');
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Step 1 State
  const [selectedAnimal, setSelectedAnimal] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState(0);

  // Step 2 State
  const [chosenIngredients, setChosenIngredients] = useState<Record<string, string[]>>({
    energy: [],
    protein: [],
    fiber: [],
    fat: [],
  });

  // Step 3 State
  const [formula, setFormula] = useState<FormulaItem[]>([]);

  // Saved-formulas modal
  const [savedOpen, setSavedOpen] = useState(false);

  // Nutrition conflict resolution
  const [conflictData, setConflictData] = useState<{
    entry: SavedFormula;
    conflicts: NutritionConflict[];
  } | null>(null);

  const handleAnimalSelect = useCallback((animal: string) => {
    setSelectedAnimal((prev) => {
      // Reset stage to 0 when switching animals — stage indices differ per species
      if (prev !== animal) setSelectedStage(0);
      return animal;
    });
  }, []);

  const handleStageSelect = useCallback((stage: number) => {
    setSelectedStage(stage);
  }, []);

  const handleIngredientToggle = useCallback((category: string, ingredient: string) => {
    setChosenIngredients((prev) => {
      const current = prev[category] || [];
      const isSelected = current.includes(ingredient);
      return {
        ...prev,
        [category]: isSelected ? current.filter((i) => i !== ingredient) : [...current, ingredient],
      };
    });
  }, []);

  const handleFormulaChange = useCallback((newFormula: FormulaItem[]) => {
    setFormula((prev) => {
      // Detect items that disappeared via Step3's X icon and also remove them
      // from chosenIngredients, so going Back to Step 2 reflects the same state.
      const newKeys = new Set(newFormula.map((i) => i.key));
      const removedKeys = prev.filter((i) => !newKeys.has(i.key)).map((i) => i.key);
      if (removedKeys.length > 0) {
        setChosenIngredients((sel) => {
          const next = { ...sel };
          for (const removed of removedKeys) {
            const cat = categoryOf(removed);
            if (cat && next[cat]) {
              next[cat] = next[cat].filter((k) => k !== removed);
            }
          }
          return next;
        });
      }
      return newFormula;
    });
  }, []);

  const handleNextStep = useCallback(() => {
    // When moving from Step 2 (ingredient selection) to Step 3 (formula editor),
    // sync the formula with the user's current ingredient selection:
    //   • KEEP existing entries (and their custom kg / price) that are still selected
    //   • ADD entries for any newly-selected ingredients
    //   • DROP entries the user deselected on Step 2
    // This preserves the user's customizations across Back/Forward navigation.
    if (currentStep === 1) {
      setFormula((prev) => mergeFormulaWithSelection(prev, chosenIngredients));
    }

    setCompletedSteps((prev) => [...new Set([...prev, currentStep])]);
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  }, [currentStep, chosenIngredients]);

  const handleBackStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  /** Actually apply a saved formula to state and jump to Step 3. */
  const applyLoadedFormula = useCallback((entry: SavedFormula) => {
    setSelectedAnimal(entry.animalId);
    setSelectedStage(entry.stageIndex);
    setChosenIngredients({
      energy:  entry.chosenIngredients.energy  ?? [],
      protein: entry.chosenIngredients.protein ?? [],
      fiber:   entry.chosenIngredients.fiber   ?? [],
      fat:     entry.chosenIngredients.fat     ?? [],
    });
    setFormula(entry.formula);
    setCompletedSteps([0, 1]);
    setCurrentStep(2);
  }, []);

  /**
   * Load handler called by SavedFormulasModal.
   * Checks for nutrition conflicts before applying.
   */
  const handleLoadSaved = useCallback((entry: SavedFormula) => {
    const formulaKeys = entry.formula.map((f) => f.key);
    const conflicts = detectConflicts(formulaKeys, entry.ingredientOverrides ?? {});

    if (conflicts.length === 0) {
      // No conflicts — load directly
      applyLoadedFormula(entry);
      return;
    }

    // Conflicts found — show the resolution modal
    setConflictData({ entry, conflicts });
  }, [applyLoadedFormula]);

  /** User chose "Use Current Values" — load recipe, keep current ingredient database. */
  const handleConflictUseCurrent = useCallback(() => {
    if (!conflictData) return;
    applyLoadedFormula(conflictData.entry);
    setConflictData(null);
  }, [conflictData, applyLoadedFormula]);

  /** User chose "Use Saved Values" — restore the overrides from save time, then load. */
  const handleConflictUseSaved = useCallback(() => {
    if (!conflictData) return;
    const savedOverrides = conflictData.entry.ingredientOverrides ?? {};

    // For each ingredient in the formula, apply the saved override
    // (or remove current override if ingredient had no override at save time)
    for (const item of conflictData.entry.formula) {
      const ovr = savedOverrides[item.key];
      if (ovr && Object.keys(ovr).length > 0) {
        const defaults = getIngredient(item.key);
        saveOverride(item.key, ovr as IngredientOverride, (defaults ?? {}) as IngredientOverride);
      }
    }

    applyLoadedFormula(conflictData.entry);
    setConflictData(null);
  }, [conflictData, applyLoadedFormula]);

  const handleReset = useCallback(() => {
    setCurrentStep(0);
    setCompletedSteps([]);
    setSelectedAnimal(null);
    setSelectedStage(0);
    setChosenIngredients({
      energy: [],
      protein: [],
      fiber: [],
      fat: [],
    });
    setFormula([]);
  }, []);

  const handleStepClick = (step: number) => {
    if (step <= Math.max(...completedSteps, currentStep)) {
      setCurrentStep(step);
    }
  };

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
    <div className="min-h-screen relative">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/70 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-40"
      >
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🌾</span>
            <div>
              <h1 className="font-bold text-xl text-gray-900">
                {language === 'en' ? 'Farm Nutrition' : 'فارم غذائیت'}
              </h1>
              <p className="text-xs text-gray-500">
                {language === 'en' ? 'Formula Calculator' : 'فارمولا کیلکولیٹر'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => setSavedOpen(true)}
              whileHover={{ scale: 1.08, y: -1 }}
              whileTap={{ scale: 0.95 }}
              className="relative w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-emerald-600 hover:text-emerald-700 hover:border-emerald-300 hover:shadow-md transition-all"
              title={language === 'en' ? 'Saved Formulas' : 'محفوظ فارمولے'}
              aria-label={language === 'en' ? 'Saved Formulas' : 'محفوظ فارمولے'}
            >
              <Bookmark className="w-5 h-5" />
            </motion.button>
            <LanguageSwitch language={language} onChange={setLanguage} />
          </div>
        </div>
      </motion.div>

      {/* Saved-Formulas Modal */}
      <SavedFormulasModal
        isOpen={savedOpen}
        language={language}
        onClose={() => setSavedOpen(false)}
        onLoad={handleLoadSaved}
      />

      {/* Nutrition Conflict Resolution Modal */}
      <NutritionConflictModal
        isOpen={conflictData !== null}
        language={language}
        conflicts={conflictData?.conflicts ?? []}
        onUseCurrent={handleConflictUseCurrent}
        onUseSaved={handleConflictUseSaved}
        onCancel={() => setConflictData(null)}
      />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 relative z-10">
        {/* Stepper */}
        <Stepper
          currentStep={currentStep}
          totalSteps={5}
          onStepClick={handleStepClick}
          completedSteps={completedSteps}
          language={language}
        />

        {/* Steps Content */}
        {/*
          AnimatePresence MUST receive exactly one direct child whose `key`
          changes when content changes — otherwise rapid back-and-forth between
          steps (after a state mutation like removing an ingredient) can leave
          the panel blank because exit/enter handshakes get out of sync.
        */}
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
            >
              {currentStep === 0 && (
                <Step1Animal
                  language={language}
                  selectedAnimal={selectedAnimal}
                  selectedStage={selectedStage}
                  onAnimalSelect={handleAnimalSelect}
                  onStageSelect={handleStageSelect}
                  onNext={handleNextStep}
                />
              )}
              {currentStep === 1 && (
                <Step2Ingredients
                  language={language}
                  chosenIngredients={chosenIngredients}
                  onIngredientToggle={handleIngredientToggle}
                  onNext={handleNextStep}
                  onBack={handleBackStep}
                />
              )}
              {currentStep === 2 && (
                <Step3Formula
                  language={language}
                  formula={formula}
                  selectedAnimal={selectedAnimal}
                  selectedStage={selectedStage}
                  onFormulaChange={handleFormulaChange}
                  onNext={handleNextStep}
                  onBack={handleBackStep}
                />
              )}
              {currentStep === 3 && (
                <Step4Status
                  language={language}
                  formula={formula}
                  selectedAnimal={selectedAnimal}
                  selectedStage={selectedStage}
                  onNext={handleNextStep}
                  onBack={handleBackStep}
                />
              )}
              {currentStep === 4 && (
                <Step5Actions
                  language={language}
                  formula={formula}
                  animal={animalLabel}
                  stage={stageLabel}
                  animalId={selectedAnimal}
                  stageIndex={selectedStage}
                  chosenIngredients={chosenIngredients}
                  onReset={handleReset}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      {/* <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-12 py-8 border-t border-gray-200 bg-gradient-to-br from-emerald-50 to-green-50"
      >
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-gray-600">
          <p>
            {language === 'en'
              ? 'Built for farmers, by farmers. Precision nutrition for healthy livestock.'
              : 'کسانوں کے لیے، کسانوں کے ذریعے تیار۔ صحت مند مویشی کے لیے درست غذائیت۔'}
          </p>
        </div>
      </motion.div> */}
    </div>
  );
}
