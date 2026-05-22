'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  description, 
  confirmText = "Confirm", 
  cancelText = "Cancel" 
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-ocean-bg/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed inset-0 z-[101] m-auto w-full max-w-sm h-fit bg-ocean-surface border border-ocean-border shadow-2xl rounded-2xl overflow-hidden font-sans"
          >
            <div className="p-6 pb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold text-ocean-text mb-2">{title}</h3>
              <p className="text-ocean-muted text-sm leading-relaxed">{description}</p>
            </div>
            
            <div className="p-4 bg-ocean-bg/50 border-t border-ocean-border flex gap-3 justify-end items-center">
              <button 
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-ocean-muted hover:text-ocean-text hover:bg-ocean-border-soft rounded-lg transition-colors"
              >
                {cancelText}
              </button>
              <button 
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors shadow-sm"
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
