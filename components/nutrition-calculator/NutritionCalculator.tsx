'use client';

import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Stepper } from './Stepper';
import { LanguageSwitch } from './LanguageSwitch';
import { Step1Animal } from './Step1Animal';
import { Step2Ingredients } from './Step2Ingredients';
import { Step3Formula } from './Step3Formula';
import { Step4Status } from './Step4Status';
import { Step5Actions } from './Step5Actions';
import { buildFormula, FormulaItem } from '@/lib/calculations';

export function NutritionCalculator() {
  const [language, setLanguage] = useState<'en' | 'ur'>('en');
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Step 1 State
  const [selectedAnimal, setSelectedAnimal] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
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

  const handleAnimalSelect = useCallback((animal: string) => {
    setSelectedAnimal(animal);
  }, []);

  const handleRegionSelect = useCallback((region: string) => {
    setSelectedRegion(region);
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
    setFormula(newFormula);
  }, []);

  const handleNextStep = useCallback(() => {
    // Build formula when moving from step 2 to step 3
    if (currentStep === 1) {
      const generatedFormula = buildFormula(chosenIngredients);
      setFormula(generatedFormula);
    }

    setCompletedSteps((prev) => [...new Set([...prev, currentStep])]);
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  }, [currentStep, chosenIngredients]);

  const handleBackStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleReset = useCallback(() => {
    setCurrentStep(0);
    setCompletedSteps([]);
    setSelectedAnimal(null);
    setSelectedRegion(null);
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
          <LanguageSwitch language={language} onChange={setLanguage} />
        </div>
      </motion.div>

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
        <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Step1Animal
                  language={language}
                  selectedAnimal={selectedAnimal}
                  selectedRegion={selectedRegion}
                  selectedStage={selectedStage}
                  onAnimalSelect={handleAnimalSelect}
                  onRegionSelect={handleRegionSelect}
                  onStageSelect={handleStageSelect}
                  onNext={handleNextStep}
                />
              </motion.div>
            )}

          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Step2Ingredients
                language={language}
                chosenIngredients={chosenIngredients}
                onIngredientToggle={handleIngredientToggle}
                onNext={handleNextStep}
                onBack={handleBackStep}
              />
            </motion.div>
          )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Step3Formula
                  language={language}
                  formula={formula}
                  selectedAnimal={selectedAnimal}
                  selectedStage={selectedStage}
                  onFormulaChange={handleFormulaChange}
                  onNext={handleNextStep}
                  onBack={handleBackStep}
                />
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Step4Status
                  language={language}
                  formula={formula}
                  selectedAnimal={selectedAnimal}
                  selectedStage={selectedStage}
                  onNext={handleNextStep}
                  onBack={handleBackStep}
                />
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Step5Actions
                  language={language}
                  formula={formula}
                  animal={animalLabel}
                  stage={selectedStage.toString()}
                  onReset={handleReset}
                />
              </motion.div>
            )}
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
