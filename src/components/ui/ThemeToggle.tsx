'use client';

import { Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useThemeStore } from '../../lib/store';
import React from 'react';
import { cn } from '../../lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useThemeStore();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    toggleTheme();
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "relative p-2 rounded-full overflow-hidden transition-colors hover:bg-ocean-blue-dim text-ocean-muted hover:text-ocean-blue",
        className
      )}
      aria-label="Toggle theme"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={theme}
          initial={{ opacity: 0, y: -20, rotate: -90 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          exit={{ opacity: 0, y: 20, rotate: 90 }}
          transition={{ type: 'spring', stiffness: 100, damping: 15 }}
        >
          {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </motion.div>
      </AnimatePresence>
    </button>
  );
}
