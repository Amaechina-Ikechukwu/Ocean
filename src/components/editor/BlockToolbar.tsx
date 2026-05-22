'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bold, Italic, Underline, Strikethrough, Code, Link, MessageSquare, Sparkles, ChevronDown, Type, Heading1, Heading2, Heading3, Quote, List, ListOrdered, CheckSquare, MessageSquareIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { BlockType } from '../../lib/store';

export const BlockToolbar = React.forwardRef<HTMLDivElement, {
  isOpen: boolean;
  onClose: () => void;
  blockType: BlockType;
  onChangeType: (t: BlockType) => void;
  style?: React.CSSProperties;
}>(({
  isOpen,
  onClose,
  blockType,
  onChangeType,
  style
}, ref) => {
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const internalRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setShowTypeMenu(false);
      return;
    }

    const handleClickOutside = (e: MouseEvent) => {
      const el = internalRef.current;
      if (el && !el.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const formatting = [
    { icon: <Bold className="w-3.5 h-3.5" />, label: 'Bold' },
    { icon: <Italic className="w-3.5 h-3.5" />, label: 'Italic' },
    { icon: <Underline className="w-3.5 h-3.5" />, label: 'Underline' },
    { icon: <Strikethrough className="w-3.5 h-3.5" />, label: 'Strikethrough' },
    { icon: <Code className="w-3.5 h-3.5" />, label: 'Code' },
  ];

  const types: { label: string, type: BlockType, icon: React.ReactNode }[] = [
    { label: 'Text', type: 'text', icon: <Type className="w-4 h-4" /> },
    { label: 'Heading 1', type: 'heading1', icon: <Heading1 className="w-4 h-4" /> },
    { label: 'Heading 2', type: 'heading2', icon: <Heading2 className="w-4 h-4" /> },
    { label: 'Heading 3', type: 'heading3', icon: <Heading3 className="w-4 h-4" /> },
    { label: 'Quote', type: 'quote', icon: <Quote className="w-4 h-4" /> },
    { label: 'Bullet List', type: 'bulletList', icon: <List className="w-4 h-4" /> },
    { label: 'Numbered List', type: 'numberedList', icon: <ListOrdered className="w-4 h-4" /> },
    { label: 'Todo', type: 'todo', icon: <CheckSquare className="w-4 h-4" /> },
    { label: 'Code', type: 'code', icon: <Code className="w-4 h-4" /> },
    { label: 'Callout', type: 'callout', icon: <MessageSquareIcon className="w-4 h-4" /> },
  ];

  if (!isOpen) return null;

  return (
    <motion.div
      ref={(node) => {
        // @ts-ignore
        internalRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          // @ts-ignore
          ref.current = node;
        }
      }}
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      style={style}
      className="absolute z-50 flex items-center bg-ocean-surface border border-ocean-border shadow-xl rounded-lg p-1 text-ocean-text font-sans h-10"
      onMouseDown={e => e.preventDefault()} // Prevent losing selection
    >
        <div className="relative">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowTypeMenu(!showTypeMenu); }}
            className="flex items-center gap-1.5 px-2 hover:bg-ocean-border-soft rounded h-8 text-sm font-medium transition-colors"
          >
            {types.find(t => t.type === blockType)?.icon}
            <ChevronDown className="w-3 h-3 text-ocean-muted" />
          </button>
          
          <AnimatePresence>
            {showTypeMenu && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute top-10 left-0 w-48 bg-ocean-surface border border-ocean-border shadow-lg rounded-xl py-1 z-50 text-sm h-72 overflow-y-auto custom-scrollbar"
              >
                <div className="px-3 py-1 text-[10px] text-ocean-faint font-bold uppercase tracking-wider">Turn into</div>
                {types.map(t => (
                  <button 
                    key={t.type}
                    onClick={() => { onChangeType(t.type); setShowTypeMenu(false); }}
                    className={cn(
                      "w-full text-left px-3 py-2 hover:bg-ocean-blue-dim transition-colors flex items-center gap-2",
                      blockType === t.type ? "text-ocean-blue bg-ocean-blue-dim/50" : "text-ocean-text"
                    )}
                  >
                    <div className={cn("p-1 rounded border", blockType === t.type ? "border-ocean-blue/30 bg-ocean-blue/10" : "border-ocean-border bg-ocean-bg")}>
                      {t.icon}
                    </div>
                    {t.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="w-[1px] h-5 bg-ocean-border mx-1" />

        {formatting.map((f, i) => (
          <button key={i} className="w-8 h-8 flex items-center justify-center hover:bg-ocean-border-soft rounded transition-colors text-ocean-text">
            {f.icon}
          </button>
        ))}

        <div className="w-[1px] h-5 bg-ocean-border mx-1" />
        
        <button className="w-8 h-8 flex items-center justify-center hover:bg-ocean-border-soft rounded transition-colors text-ocean-text">
          <Link className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-5 bg-ocean-border mx-1" />

        {/* Text color and highlight color would go here */}
        <div className="px-2 text-xs font-semibold uppercase text-ocean-muted cursor-pointer hover:text-ocean-text flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-ocean-text opacity-80" />
          <ChevronDown className="w-3 h-3" />
        </div>
        
        <div className="px-2 text-xs font-semibold uppercase text-ocean-muted cursor-pointer hover:text-ocean-text flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-ocean-blue-glow border border-ocean-blue" />
          <ChevronDown className="w-3 h-3" />
        </div>

        <div className="w-[1px] h-5 bg-ocean-border mx-1" />

        <button className="w-8 h-8 flex items-center justify-center hover:bg-ocean-border-soft rounded transition-colors text-ocean-text">
          <MessageSquare className="w-3.5 h-3.5" />
        </button>

        <button className="flex items-center gap-1.5 px-2 ml-1 text-ocean-blue hover:bg-ocean-blue-dim h-8 rounded transition-colors text-sm font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          Rewrite
          <ChevronDown className="w-3 h-3 opacity-70" />
        </button>

      </motion.div>
  );
});

BlockToolbar.displayName = "BlockToolbar";
