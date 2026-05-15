import React, { useEffect, useState, useRef } from 'react';
import { Search, Plus, Settings, Trash, ChevronDown, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEditorStore } from '../../lib/store';
import { ThemeToggle } from '../ui/ThemeToggle';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import { PageTreeItem } from './PageTree';

export function Sidebar() {
  const { 
    workspaces, 
    activeWorkspaceId,
    pages,
    createPage,
    initDemoData,
    updateWorkspace,
    deleteWorkspace
  } = useEditorStore();
  const navigate = useNavigate();

  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [editingWorkspaceId, setEditingWorkspaceId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setWorkspaceMenuOpen(false);
        setShowCreateWorkspace(false);
      }
    };
    if (workspaceMenuOpen || showCreateWorkspace) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [workspaceMenuOpen, showCreateWorkspace]);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    return parseInt(localStorage.getItem('ocean-sidebar-width') || '256', 10);
  });
  const isResizing = useRef(false);

  useEffect(() => {
    initDemoData();
  }, [initDemoData]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = Math.min(Math.max(200, e.clientX), 480);
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => {
      if (isResizing.current) {
         isResizing.current = false;
         document.body.style.cursor = 'default';
         localStorage.setItem('ocean-sidebar-width', sidebarWidth.toString());
      }
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [sidebarWidth]);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const rootPages = Object.values(pages)
    .filter(p => p.workspaceId === activeWorkspaceId && p.parentId === null && !p.deleted)
    .sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0));

  const handleAddTopLevelPage = () => {
    if (!activeWorkspaceId) return;
    const newPage = createPage(activeWorkspaceId, null);
    navigate(`/app/${newPage.id}`);
  };

  return (
    <div 
      className="shrink-0 bg-ocean-panel border-r border-ocean-border flex flex-col h-screen relative select-none print:hidden"
      style={{ width: sidebarWidth }}
    >
      {/* Workspace Switcher */}
      <div className="p-3 relative" ref={menuRef}>
        <button 
          onMouseDown={(e) => {
            if (workspaceMenuOpen) e.stopPropagation();
          }}
          onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-ocean-border-soft transition-colors text-ocean-text group overflow-hidden"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-ocean-blue flex items-center justify-center flex-shrink-0 text-white shadow-lg shadow-ocean-blue/20 bg-gradient-to-br from-ocean-blue to-blue-600 relative overflow-hidden group-hover:scale-105 transition-transform">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span 
              className="font-medium tracking-tight truncate flex-1 text-left min-w-0 text-ocean-text/90"
            >
              {activeWorkspace?.name || 'Ocean'}
            </span>
          </div>
          <ChevronDown className={cn("w-4 h-4 text-ocean-muted transition-transform shrink-0 ml-1", workspaceMenuOpen && "rotate-180")} />
        </button>

        {workspaceMenuOpen && (
          <div className="absolute top-full left-3 right-3 mt-1 bg-ocean-panel border border-ocean-border rounded-lg shadow-lg z-[60] overflow-hidden flex flex-col min-w-[180px]">
            {!showCreateWorkspace ? (
              <>
                <div className="max-h-[300px] overflow-y-auto p-1 custom-scrollbar">
                  {workspaces.map(w => (
                    <div key={w.id} className="group/ws flex items-center gap-0.5 px-1">
                      {editingWorkspaceId === w.id ? (
                        <div className="flex-1 flex gap-1 items-center p-1">
                          <input 
                            autoFocus
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            onBlur={() => {
                              if (editName.trim()) updateWorkspace(w.id, { name: editName.trim() });
                              setEditingWorkspaceId(null);
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && editName.trim()) {
                                updateWorkspace(w.id, { name: editName.trim() });
                                setEditingWorkspaceId(null);
                              } else if (e.key === 'Escape') {
                                setEditingWorkspaceId(null);
                              }
                            }}
                            className="flex-1 bg-ocean-bg border border-ocean-blue/50 rounded px-2 py-1 text-sm text-ocean-text outline-none"
                          />
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              useEditorStore.getState().setActiveWorkspace(w.id);
                              setWorkspaceMenuOpen(false);
                              navigate('/app');
                            }}
                            className={cn(
                              "flex-1 flex items-center gap-2 p-2 rounded-md hover:bg-ocean-border-soft transition-colors text-sm text-left overflow-hidden min-w-0 flex-nowrap",
                              w.id === activeWorkspaceId ? "bg-ocean-surface text-ocean-text font-medium" : "text-ocean-muted"
                            )}
                          >
                             <div className="w-5 h-5 rounded bg-ocean-bg border border-ocean-border flex items-center justify-center flex-shrink-0 text-[10px] overflow-hidden">
                               {w.icon && w.icon.length <= 2 
                                 ? w.icon 
                                 : (w.name ? w.name.charAt(0).toUpperCase() : '🌊')}
                             </div>
                            <span className="truncate flex-1 min-w-0 block">{w.name}</span>
                          </button>
                          
                          <div className="flex items-center opacity-0 group-hover/ws:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingWorkspaceId(w.id);
                                setEditName(w.name);
                              }}
                              className="p-1.5 hover:bg-ocean-border-soft rounded-md text-ocean-muted hover:text-ocean-text transition-colors"
                              title="Rename workspace"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            {workspaces.length > 1 && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Are you sure you want to delete "${w.name}"? All pages within will be lost.`)) {
                                    deleteWorkspace(w.id);
                                  }
                                }}
                                className="p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded-md text-ocean-muted transition-colors"
                                title="Delete workspace"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                 <div className="p-1 border-t border-ocean-border">
                   <button
                     onClick={() => setShowCreateWorkspace(true)}
                     className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-ocean-border-soft transition-colors text-sm text-ocean-text"
                   >
                     <Plus className="w-4 h-4" />
                     <span>Create Workspace</span>
                   </button>
                 </div>
              </>
            ) : (
              <div className="p-3 flex flex-col gap-3">
                <span className="text-sm font-medium text-ocean-text">Create Workspace</span>
                <input 
                  autoFocus
                  type="text" 
                  value={newWorkspaceName}
                  onChange={e => setNewWorkspaceName(e.target.value)}
                  placeholder="Workspace Name"
                  className="w-full bg-ocean-surface border border-ocean-border rounded p-2 text-sm text-ocean-text outline-none focus:border-ocean-blue"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newWorkspaceName.trim()) {
                      const w = useEditorStore.getState().createWorkspace(newWorkspaceName.trim(), '✨');
                      useEditorStore.getState().setActiveWorkspace(w.id);
                      setNewWorkspaceName("");
                      setShowCreateWorkspace(false);
                      setWorkspaceMenuOpen(false);
                      navigate('/app');
                    }
                  }}
                />
                <div className="flex gap-2 justify-end">
                  <button 
                    onClick={() => {
                      setShowCreateWorkspace(false);
                      setNewWorkspaceName("");
                    }} 
                    className="px-3 py-1.5 text-xs font-medium text-ocean-muted hover:text-ocean-text"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                       if (newWorkspaceName.trim()) {
                        const w = useEditorStore.getState().createWorkspace(newWorkspaceName.trim(), '✨');
                        useEditorStore.getState().setActiveWorkspace(w.id);
                        setNewWorkspaceName("");
                        setShowCreateWorkspace(false);
                        setWorkspaceMenuOpen(false);
                        navigate('/app');
                       }
                    }} 
                    className="px-3 py-1.5 text-xs font-medium bg-ocean-blue text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    Create
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Global Actions */}
      <div className="px-3 mb-4 space-y-1">
        <button 
          onClick={() => navigate('/app/search')}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-xl hover:bg-ocean-border-soft transition-all text-ocean-text group/search border border-transparent hover:border-ocean-border/50"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-ocean-muted group-hover/search:text-ocean-blue transition-colors" />
            <span className="font-medium">Search</span>
          </div>
          <kbd className="px-1.5 py-0.5 rounded border border-ocean-border bg-ocean-bg text-[10px] text-ocean-muted font-mono opacity-60 group-hover/search:opacity-100 transition-opacity">
            ⌘K
          </kbd>
        </button>
        <button 
          onClick={() => navigate('/app/settings')}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-ocean-border-soft transition-colors text-ocean-text"
        >
          <Settings className="w-4 h-4 text-ocean-muted" />
          <span>Settings</span>
        </button>
      </div>

      {/* Page Tree */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        <div className="group flex items-center justify-between px-3 py-2 text-xs font-medium text-ocean-muted mb-1">
          <span>PAGES</span>
          <button 
            onClick={handleAddTopLevelPage}
            className="opacity-0 group-hover:opacity-100 hover:text-ocean-text transition-all"
            title="Add a page"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <div className="space-y-0.5">
          {rootPages.map((page) => (
            <PageTreeItem key={page.id} page={page} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-ocean-border flex items-center justify-between">
         <button className="flex items-center gap-2 px-2 py-1.5 text-sm text-ocean-muted hover:text-ocean-text rounded-lg hover:bg-ocean-border-soft transition-colors">
            <Trash className="w-4 h-4" />
            <span>Trash</span>
         </button>
         <ThemeToggle />
      </div>

      {/* Resize Handle */}
      <div 
        className="absolute right-[-3px] top-0 bottom-0 w-[6px] cursor-col-resize hover:bg-ocean-blue/50 z-50"
        onMouseDown={(e) => {
          e.preventDefault();
          isResizing.current = true;
          document.body.style.cursor = 'col-resize';
        }}
      />

      {/* Subtle animated wavy SVG border on the right */}
      <div className="absolute right-[-1px] top-0 bottom-0 w-[2px] overflow-hidden pointer-events-none">
        <motion.div 
          className="h-[200%] w-full bg-ocean-blue-glow opacity-30"
          animate={{ y: ["0%", "-50%"] }}
          transition={{ repeat: Infinity, ease: "linear", duration: 8 }}
        />
      </div>
    </div>
  );
}
