'use client';

import React, { useState } from 'react';
import { MoreHorizontal, Copy, ArrowRightLeft, Link, Trash2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Page } from '../../lib/store';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useFloating, autoUpdate, offset, flip, shift, FloatingPortal } from '@floating-ui/react';

export function SubpageMenu({ page, onRemove }: { page: Page, onRemove: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const { refs, floatingStyles } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    whileElementsMounted: autoUpdate,
    placement: 'bottom-end',
    middleware: [
      offset(8),
      flip({ fallbackPlacements: ['top-end', 'bottom-start'] }),
      shift({ padding: 10 })
    ]
  });

  const handleCopyLink = () => {
    const url = `${window.location.origin}/app/${page.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
    setIsOpen(false);
  };

  return (
    <>
      <button 
        ref={refs.setReference}
        onClick={(e) => {
           e.stopPropagation();
           setIsOpen(!isOpen);
        }}
        className="p-2 text-ocean-muted hover:text-ocean-blue transition-all rounded-lg hover:bg-ocean-blue-dim/50"
        title="Subpage settings"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <FloatingPortal>
            <div 
              ref={refs.setFloating}
              style={{ ...floatingStyles, zIndex: 100 }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-48 bg-ocean-surface border border-ocean-border shadow-xl rounded-xl py-1 overflow-hidden font-sans origin-top-right backdrop-blur-md"
              >
                <div className="px-3 py-1 text-[9px] uppercase font-bold text-ocean-faint tracking-wider">Subpage</div>
                
                <button 
                  onClick={() => {
                    router.push(`/app/${page.id}`);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-ocean-text hover:bg-ocean-blue-dim transition-colors text-left group"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-ocean-muted group-hover:text-blue-500 transition-colors" />
                  <span>Full Page View</span>
                </button>
                
                <button className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-ocean-text hover:bg-ocean-blue-dim transition-colors text-left group">
                  <Copy className="w-3.5 h-3.5 text-ocean-muted group-hover:text-blue-400 transition-colors" />
                  <span>Duplicate</span>
                </button>

                <button className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-ocean-text hover:bg-ocean-blue-dim transition-colors text-left group">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-ocean-muted group-hover:text-blue-500 transition-colors" />
                  <span>Move to...</span>
                </button>

                <div className="h-px bg-ocean-border my-1" />

                <button 
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-ocean-text hover:bg-ocean-blue-dim transition-colors text-left group"
                >
                  <Link className="w-3.5 h-3.5 text-ocean-muted group-hover:text-slate-400 transition-colors" />
                  <span>Copy link</span>
                </button>

                <div className="h-px bg-ocean-border my-1" />

                <button 
                  onClick={() => {
                    onRemove();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/10 transition-colors text-left"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove link</span>
                </button>
              </motion.div>
            </div>
          </FloatingPortal>
        )}
      </AnimatePresence>
      
      {isOpen && <div className="fixed inset-0 z-[90]" onClick={() => setIsOpen(false)} />}
    </>
  );
}
