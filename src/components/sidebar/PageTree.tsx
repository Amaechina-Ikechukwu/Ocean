import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, FileText, Plus, MoreHorizontal, Trash2, Link, Pencil, Copy, ArrowRightLeft } from 'lucide-react';
import { useEditorStore, Page } from '../../lib/store';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useFloating, autoUpdate, offset, flip, shift, FloatingPortal } from '@floating-ui/react';
import { ConfirmModal } from '../ui/ConfirmModal';

export const PageTreeItem: React.FC<{ page: Page; depth?: number }> = ({ 
  page, 
  depth = 0 
}) => {
  const navigate = useNavigate();
  const { 
    pages, 
    activePageId, 
    expandedPages, 
    toggleSidebarPage, 
    createPage, 
    setActivePage,
    deletePage
  } = useEditorStore();
  
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const { refs, floatingStyles } = useFloating({
    open: showMenu,
    onOpenChange: setShowMenu,
    whileElementsMounted: autoUpdate,
    placement: 'bottom-start',
    middleware: [
      offset(5),
      flip(),
      shift({ padding: 10 })
    ]
  });

  const isExpanded = expandedPages.has(page.id);
  const childPages = Object.values(pages)
    .filter(p => p.parentId === page.id && !p.deleted)
    .sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0));
    
  const isActive = activePageId === page.id;
  const hasChildren = childPages.length > 0;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSidebarPage(page.id);
  };

  const handleAddChild = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newPage = createPage(page.workspaceId, page.id);
    navigate(`/app/${newPage.id}`);
  };

  const handleClick = () => {
    setActivePage(page.id);
    navigate(`/app/${page.id}`);
  };

  return (
    <div>
      <div
        className={cn(
          "group flex items-center pr-2 py-1 relative text-sm cursor-pointer rounded-lg transition-colors border-l-2",
          isActive 
            ? "bg-ocean-blue-dim text-ocean-blue border-ocean-blue" 
            : "text-ocean-text hover:bg-ocean-border-soft border-transparent",
          depth > 0 && "ml-4"
        )}
        style={{ paddingLeft: depth === 0 ? '8px' : '4px' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { setIsHovered(false); }}
        onClick={handleClick}
      >
        {/* Indent connector line for children */}
        {depth > 0 && (
          <div className="absolute left-[-10px] top-0 bottom-0 w-[1px] bg-ocean-border-soft opacity-50" />
        )}

        {/* Toggle Arrow */}
        <button 
          onClick={handleToggle}
          className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-ocean-blue-dim text-ocean-muted flex-shrink-0"
          style={{ opacity: hasChildren || isHovered ? 1 : 0 }}
        >
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </motion.div>
        </button>

        {/* Dynamic Icon */}
        <div className="flex-shrink-0 ml-0.5 mr-2">
          {page.icon && page.icon.length <= 2 ? (
            <span className="text-sm leading-none">{page.icon}</span>
          ) : (
            <FileText className={cn("w-4 h-4", isActive ? "text-ocean-blue" : "text-ocean-muted")} />
          )}
        </div>

        {/* Title */}
        <span className="truncate flex-1 font-medium select-none min-w-0">
          {page.title || 'Untitled'}
        </span>

        {/* Hover Actions */}
        {(isHovered || showMenu) && (
          <div className="flex items-center flex-shrink-0 gap-0.5 ml-1">
            <button
              onClick={handleAddChild}
              className="p-1 rounded text-ocean-muted hover:bg-ocean-blue-dim hover:text-ocean-text transition-colors"
              title="Add a page inside"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <div>
              <button
                ref={refs.setReference}
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                className={cn(
                  "p-1 rounded transition-colors",
                  showMenu ? "bg-ocean-blue-dim text-ocean-text" : "text-ocean-muted hover:bg-ocean-blue-dim hover:text-ocean-text"
                )}
                title="More actions"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
              
              {/* Context Menu Dropdown */}
              <AnimatePresence>
                {showMenu && (
                  <FloatingPortal>
                    <div ref={refs.setFloating} style={{ ...floatingStyles, zIndex: 100 }}>
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: -5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -5 }}
                        className="w-48 bg-ocean-surface border border-ocean-border shadow-lg rounded-xl py-1 text-ocean-text font-sans"
                        onClick={e => e.stopPropagation()}
                      >
                        <button className="w-full text-left px-3 py-1.5 text-sm hover:bg-ocean-blue-dim flex items-center gap-2 group">
                           <Pencil className="w-3.5 h-3.5 text-ocean-muted group-hover:text-orange-500 transition-colors" /> Rename
                        </button>
                        <button className="w-full text-left px-3 py-1.5 text-sm hover:bg-ocean-blue-dim flex items-center gap-2 group">
                           <Copy className="w-3.5 h-3.5 text-ocean-muted group-hover:text-blue-500 transition-colors" /> Duplicate
                        </button>
                        <button className="w-full text-left px-3 py-1.5 text-sm hover:bg-ocean-blue-dim flex items-center gap-2 group">
                           <ArrowRightLeft className="w-3.5 h-3.5 text-ocean-muted group-hover:text-blue-600 transition-colors" /> Move to...
                        </button>
                        <button className="w-full text-left px-3 py-1.5 text-sm hover:bg-ocean-blue-dim flex items-center gap-2 group mb-1">
                           <Link className="w-3.5 h-3.5 text-ocean-muted group-hover:text-slate-400 transition-colors" /> Copy link
                        </button>
                        <div className="border-t border-ocean-border my-1" />
                        <button 
                          onClick={() => {
                            setShowConfirmDelete(true);
                            setShowMenu(false);
                          }}
                          className="w-full text-left px-3 py-1.5 text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-2"
                        >
                           <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </motion.div>
                    </div>
                  </FloatingPortal>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {showMenu && <div className="fixed inset-0 z-[90]" onClick={() => setShowMenu(false)} />}

      <ConfirmModal 
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={() => deletePage(page.id)}
        title="Delete Page"
        description={`Are you sure you want to delete "${page.title || 'Untitled'}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />

      <AnimatePresence initial={false}>
        {isExpanded && childPages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className="overflow-hidden"
          >
            {childPages.map(child => (
              <PageTreeItem key={child.id} page={child} depth={depth + 1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
