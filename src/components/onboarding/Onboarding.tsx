import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Check } from 'lucide-react';
import { useThemeStore } from '../../lib/store';

type Step = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  image: string;
  imageAlt: string;
  cta: string;
};

// Add more steps here as features and images are introduced.
const steps: Step[] = [
  {
    id: 'welcome',
    eyebrow: 'Welcome aboard',
    title: 'A calmer place to think and write.',
    body: 'Ocean is your workspace for ideas, notes, and long-form writing. Built for focus — minimal, fluid, and yours.',
    image: '/assets/images/man-working.png',
    imageAlt: 'A focused workspace',
    cta: 'Get started',
  },
];

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const theme = useThemeStore(s => s.theme);
  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setStepIndex(i => i + 1);
    }
  };

  return (
    <div className="relative w-full h-screen flex overflow-hidden bg-ocean-bg text-ocean-text font-sans">

      {/* Left — image panel */}
      <div className="hidden md:block relative w-1/2 h-full overflow-hidden border-r border-ocean-border">
        <AnimatePresence mode="wait">
          <motion.img
            key={step.id}
            src={step.image}
            alt={step.imageAlt}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Subtle theme-aware fade on the inner edge so image blends with the right panel */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-ocean-bg/30" />
        </AnimatePresence>
        <div className="absolute top-10 left-10 z-10">
          <img
            src={theme === 'dark' ? '/assets/logo-white.png' : '/assets/logo-dark.png'}
            alt="Ocean"
            className="h-7 w-auto"
          />
        </div>
      </div>

      {/* Right — content panel */}
      <div className="relative flex-1 flex flex-col px-12 md:px-16 py-12 bg-ocean-bg">

        {/* Mobile logo */}
        <div className="md:hidden mb-10">
          <img
            src={theme === 'dark' ? '/assets/logo-white.png' : '/assets/logo-dark.png'}
            alt="Ocean"
            className="h-7 w-auto"
          />
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-auto">
          {steps.map((s, i) => (
            <div
              key={s.id}
              className={
                i === stepIndex
                  ? 'w-8 h-1 rounded-full bg-ocean-blue transition-all'
                  : i < stepIndex
                    ? 'w-2 h-1 rounded-full bg-ocean-blue/60 transition-all'
                    : 'w-2 h-1 rounded-full bg-ocean-border transition-all'
              }
            />
          ))}
          <span className="ml-3 text-xs text-ocean-muted">
            Step {stepIndex + 1} of {steps.length}
          </span>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
            className="max-w-md"
          >
            <p className="text-xs font-semibold tracking-[0.2em] text-ocean-blue uppercase mb-5">
              {step.eyebrow}
            </p>
            <h1 className="text-5xl font-serif text-ocean-text leading-tight mb-5">
              {step.title}
            </h1>
            <p className="text-ocean-muted text-base leading-relaxed">
              {step.body}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Actions */}
        <div className="mt-auto pt-10 flex items-center gap-4">
          <button
            onClick={handleNext}
            className="group flex items-center gap-2.5 py-3 px-6 bg-ocean-blue text-white rounded-full font-medium text-sm hover:bg-ocean-blue/90 transition-all shadow-lg shadow-ocean-blue/20"
          >
            {step.cta}
            {isLast ? (
              <Check className="w-4 h-4" />
            ) : (
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            )}
          </button>

          {!isLast && (
            <button
              onClick={onComplete}
              className="text-sm text-ocean-muted hover:text-ocean-text transition-colors"
            >
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
