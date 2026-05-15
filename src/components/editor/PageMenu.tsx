import React, { useState } from 'react';
import { MoreHorizontal, Pencil, Copy, ArrowRightLeft, Link, Trash2, Star, Clock, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Page, useEditorStore } from '../../lib/store';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useFloating, autoUpdate, offset, flip, shift, FloatingPortal } from '@floating-ui/react';
import { ConfirmModal } from '../ui/ConfirmModal';

export function PageMenu({ page }: { page: Page }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const { deletePage } = useEditorStore();
  const navigate = useNavigate();

  const { refs, floatingStyles } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    whileElementsMounted: autoUpdate,
    placement: 'bottom-end',
    middleware: [
      offset(10),
      flip({ fallbackPlacements: ['top-end', 'bottom-start'] }),
      shift({ padding: 10 })
    ]
  });

  const handleDelete = () => {
    deletePage(page.id);
    navigate('/app');
    toast.success('Page moved to trash');
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
    setIsOpen(false);
  };

  return (
    <>
      <button 
        ref={refs.setReference}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-8 h-8 text-ocean-muted hover:text-ocean-text rounded-lg hover:bg-ocean-border-soft transition-colors"
      >
        <MoreHorizontal className="w-5 h-5" />
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
                className="w-56 bg-ocean-surface border border-ocean-border shadow-xl rounded-xl py-1 overflow-hidden font-sans origin-top-right backdrop-blur-md"
              >
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-ocean-faint tracking-wider">Page Actions</div>
                
                <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-ocean-text hover:bg-ocean-blue-dim transition-colors text-left group">
                  <Star className="w-4 h-4 text-ocean-muted group-hover:text-yellow-500 transition-colors" />
                  <span>Add to Favorites</span>
                </button>
                
                <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-ocean-text hover:bg-ocean-blue-dim transition-colors text-left group">
                  <Pencil className="w-4 h-4 text-ocean-muted group-hover:text-orange-500 transition-colors" />
                  <span>Rename</span>
                </button>

                <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-ocean-text hover:bg-ocean-blue-dim transition-colors text-left group">
                  <Copy className="w-4 h-4 text-ocean-muted group-hover:text-blue-500 transition-colors" />
                  <span>Duplicate</span>
                </button>

                <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-ocean-text hover:bg-ocean-blue-dim transition-colors text-left group">
                  <ArrowRightLeft className="w-4 h-4 text-ocean-muted group-hover:text-blue-600 transition-colors" />
                  <span>Move to...</span>
                </button>

                <div className="h-px bg-ocean-border my-1" />

                <button 
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-ocean-text hover:bg-ocean-blue-dim transition-colors text-left group"
                >
                  <Link className="w-4 h-4 text-ocean-muted group-hover:text-slate-400 transition-colors" />
                  <span>Copy link</span>
                </button>

                <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-ocean-text hover:bg-ocean-blue-dim transition-colors text-left group">
                  <Clock className="w-4 h-4 text-ocean-muted group-hover:text-indigo-400 transition-colors" />
                  <span>View history</span>
                </button>

                <button className="w-full flex items-center justify-between px-3 py-2 text-sm text-ocean-text hover:bg-ocean-blue-dim transition-colors text-left group">
                  <div className="flex items-center gap-2.5">
                    <Lock className="w-4 h-4 text-ocean-muted group-hover:text-purple-500 transition-colors" />
                    <span>Lock page</span>
                  </div>
                  <div className="w-8 h-4 rounded-full bg-ocean-border group-hover:bg-ocean-blue/20 p-0.5 relative transition-colors">
                    <div className="w-3 h-3 rounded-full bg-white shadow-sm absolute left-0.5 top-0.5" />
                  </div>
                </button>

                <div className="h-px bg-ocean-border my-1" />

                <button 
                  onClick={() => {
                    setShowConfirmDelete(true);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors text-left"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Page</span>
                </button>
              </motion.div>
            </div>
          </FloatingPortal>
        )}
      </AnimatePresence>

      {/* Global click handler to close menu */}
      {isOpen && <div className="fixed inset-0 z-[90]" onClick={() => setIsOpen(false)} />}

      <ConfirmModal 
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete Page"
        description={`Are you sure you want to delete "${page.title || 'Untitled'}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  );
}
