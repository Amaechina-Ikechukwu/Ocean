'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Type, Heading1, Heading2, Heading3, Quote, Code, List, ListOrdered, CheckSquare, ListTree, Image as ImageIcon, Sparkles, LayoutList, Table as TableIcon, FileText } from 'lucide-react';
import { BlockType } from '../../lib/store';
import { cn } from '../../lib/utils';

interface MenuItem {
  type: BlockType;
  label: string;
  desc: string;
  icon: React.ReactNode;
}

const commands: { group: string; items: MenuItem[] }[] = [
  {
    group: 'BASIC BLOCKS',
    items: [
      { type: 'text', label: 'Text', desc: 'Plain paragraph text', icon: <Type className="w-4 h-4" /> },
      { type: 'heading1', label: 'Heading 1', desc: 'Large heading (H1)', icon: <Heading1 className="w-4 h-4" /> },
      { type: 'heading2', label: 'Heading 2', desc: 'Medium heading (H2)', icon: <Heading2 className="w-4 h-4" /> },
      { type: 'heading3', label: 'Heading 3', desc: 'Small heading (H3)', icon: <Heading3 className="w-4 h-4" /> },
      { type: 'quote', label: 'Quote', desc: 'Indented quote block', icon: <Quote className="w-4 h-4" /> },
      { type: 'code', label: 'Code', desc: 'Monospace code block', icon: <Code className="w-4 h-4" /> },
    ]
  },
  {
    group: 'LISTS',
    items: [
      { type: 'bulletList', label: 'Bullet List', desc: 'Unordered list', icon: <List className="w-4 h-4" /> },
      { type: 'numberedList', label: 'Numbered List', desc: 'Ordered list', icon: <ListOrdered className="w-4 h-4" /> },
      { type: 'todo', label: 'Todo List', desc: 'Checkbox list items', icon: <CheckSquare className="w-4 h-4" /> },
      { type: 'toggle', label: 'Toggle List', desc: 'Collapsible bullet', icon: <ListTree className="w-4 h-4" /> },
    ]
  },
  {
    group: 'MEDIA',
    items: [
      { type: 'image', label: 'Image', desc: 'Upload or paste URL', icon: <ImageIcon className="w-4 h-4" /> },
    ]
  },
  {
    group: 'STRUCTURE',
    items: [
      { type: 'table', label: 'Table', desc: 'Insert inline table', icon: <TableIcon className="w-4 h-4" /> },
      { type: 'columns', label: 'Columns', desc: 'Split current line', icon: <LayoutList className="w-4 h-4" /> },
      { type: 'subpage', label: 'Subpage', desc: 'Create a nested page', icon: <FileText className="w-4 h-4" /> },
    ]
  },
  {
    group: 'AI',
    items: [
      { type: 'aiGenerate', label: 'AI Write', desc: 'Generate text from a prompt', icon: <Sparkles className="w-4 h-4 text-ocean-blue" /> },
    ]
  }
];

export const SlashCommandMenu = React.forwardRef<HTMLDivElement, { 
  isOpen: boolean;
  query: string;
  onSelect: (type: BlockType) => void;
  onClose: () => void;
  style?: React.CSSProperties;
}>(({ 
  isOpen, 
  query,
  onSelect, 
  onClose,
  style
}, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const internalRef = useRef<HTMLDivElement>(null);

  const flatItems = commands.flatMap(g => g.items).filter(item => 
    item.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % flatItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => (i - 1 + flatItems.length) % flatItems.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (flatItems[selectedIndex]) {
          onSelect(flatItems[selectedIndex].type);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const el = internalRef.current;
      if (el && !el.contains(e.target as Node)) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, flatItems, selectedIndex, onSelect, onClose]);

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
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      style={style}
      className="absolute z-50 w-72 max-h-[400px] overflow-y-auto bg-ocean-surface border border-ocean-border shadow-xl rounded-xl custom-scrollbar"
    >
        <div className="sticky top-0 bg-ocean-surface p-2 border-b border-ocean-border text-xs text-ocean-muted font-medium bg-opacity-90 backdrop-blur-sm z-10">
          Searching for "{query}"...
        </div>
        <div className="p-1">
          {commands.map(group => {
            const filteredItems = group.items.filter(item => 
              item.label.toLowerCase().includes(query.toLowerCase())
            );
            
            if (filteredItems.length === 0) return null;

            return (
              <div key={group.group} className="mb-2">
                <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-ocean-faint font-semibold">
                  {group.group}
                </div>
                {filteredItems.map(item => {
                  const isSelected = flatItems[selectedIndex] === item;
                  return (
                    <button
                      key={item.label}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                        isSelected ? "bg-ocean-blue-dim text-ocean-blue" : "hover:bg-ocean-border-soft text-ocean-text"
                      )}
                      onMouseEnter={() => setSelectedIndex(flatItems.indexOf(item))}
                      onClick={() => onSelect(item.type)}
                    >
                      <div className={cn("p-1.5 rounded-md border transition-colors", isSelected ? "border-ocean-blue/30 bg-ocean-blue/10 text-ocean-blue" : "border-ocean-border bg-ocean-bg text-ocean-muted")}>
                        {item.icon}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{item.label}</div>
                        <div className="text-xs text-ocean-muted">{item.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </motion.div>
  );
});

SlashCommandMenu.displayName = "SlashCommandMenu";
