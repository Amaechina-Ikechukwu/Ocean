import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateKeyBetween } from 'fractional-indexing';
import { v4 as uuidv4 } from 'uuid';
import { auth } from './firebase';

function currentUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  return uid;
}

type ThemeState = {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
    }),
    {
      name: 'ocean-theme',
    }
  )
);

export type WorkspaceType = 'blog' | 'work';

export type Workspace = {
  id: string;
  name: string;
  icon: string | null;
  ownerId: string;
  createdAt: number;
  type: WorkspaceType;
};

export type PageSeo = {
  title?: string;
  description?: string;
  ogImage?: string;
};

export type Page = {
  id: string;
  workspaceId: string;
  parentId: string | null;
  title: string;
  icon: string | null;
  coverImage: string | null;
  order: string;
  timestamp: number;
  deleted: boolean;
  published?: boolean;
  slug?: string | null;
  publishedAt?: number | null;
  seo?: PageSeo | null;
  ownerId: string;
};

export type BlockType =
  | "text" | "heading1" | "heading2" | "heading3"
  | "bulletList" | "numberedList" | "todo" | "toggle"
  | "quote" | "callout" | "code" | "divider"
  | "image" | "audio" | "video" | "file"
  | "table" | "columns" | "subpage"
  | "aiGenerate" | "aiMinutes";

export interface Block {
  id: string;
  type: BlockType;
  order: string;
  parentId: string | null;
  content: string;
  attrs: Record<string, any>;
  ownerId: string;
}

export type EditorState = {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  sidebarExpanded: boolean;
  setSidebarExpanded: (expanded: boolean) => void;
  pages: Record<string, Page>; // flat map by id
  activePageId: string | null;
  blocks: Record<string, Block[]>; // pageId -> blocks
  dirtyPages: Set<string>;
  dirtyBlocks: Set<{ pageId: string; blockId: string }>;
  expandedPages: Set<string>; // sidebar expanded state

  // Actions
  createWorkspace: (name: string, icon: string | null, type?: WorkspaceType) => Workspace;
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void;
  deleteWorkspace: (id: string) => void;
  setActiveWorkspace: (id: string) => void;
  setActivePage: (id: string) => void;
  updateBlock: (pageId: string, block: Block) => void;
  insertBlock: (pageId: string, block: Block, afterId: string | null) => void;
  deleteBlock: (pageId: string, blockId: string) => void;
  reorderBlocks: (pageId: string, orderedIds: string[]) => void;
  createPage: (workspaceId: string, parentId: string | null) => Page;
  updatePage: (pageId: string, updates: Partial<Page>) => void;
  deletePage: (pageId: string) => void;
  toggleSidebarPage: (pageId: string) => void;
  initDemoData: () => void;
};

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      workspaces: [],
      activeWorkspaceId: null,
      sidebarExpanded: true,
      setSidebarExpanded: (expanded) => set({ sidebarExpanded: expanded }),
      pages: {},
      activePageId: null,
      blocks: {},
      dirtyPages: new Set(),
      dirtyBlocks: new Set(),
      expandedPages: new Set(),

      createWorkspace: (name, icon, type = 'blog') => {
        const ownerId = currentUid();

        const newWorkspace: Workspace = {
          id: uuidv4(),
          name,
          icon,
          ownerId,
          createdAt: Date.now(),
          type,
        };

        const newPageId = uuidv4();
        const firstPage: Page = {
          id: newPageId,
          workspaceId: newWorkspace.id,
          parentId: null,
          title: 'Getting Started',
          icon: '✨',
          coverImage: null,
          order: generateKeyBetween(null, null),
          timestamp: Date.now(),
          deleted: false,
          ownerId,
        };

        const firstBlock: Block = {
          id: uuidv4(),
          type: 'text',
          order: generateKeyBetween(null, null),
          parentId: null,
          content: 'Welcome to your new workspace!',
          attrs: {},
          ownerId,
        };

        set((state) => ({
          workspaces: [...state.workspaces, newWorkspace],
          pages: { ...state.pages, [newPageId]: firstPage },
          blocks: { ...state.blocks, [newPageId]: [firstBlock] },
          activeWorkspaceId: newWorkspace.id,
          activePageId: newPageId,
          dirtyPages: new Set(state.dirtyPages).add(newPageId),
          dirtyBlocks: new Set(state.dirtyBlocks).add({ pageId: newPageId, blockId: firstBlock.id })
        }));

        return newWorkspace;
      },

      updateWorkspace: (id, updates) => set((state) => ({
        workspaces: state.workspaces.map((w) => (w.id === id ? { ...w, ...updates } : w)),
      })),

      deleteWorkspace: (id) => set((state) => {
        const remainingWorkspaces = state.workspaces.filter(w => w.id !== id);
        let newActiveId = state.activeWorkspaceId;
        
        if (newActiveId === id) {
          newActiveId = remainingWorkspaces.length > 0 ? remainingWorkspaces[0].id : null;
        }

        return {
          workspaces: remainingWorkspaces,
          activeWorkspaceId: newActiveId
        };
      }),

      setActiveWorkspace: (id) => {
        set({ activeWorkspaceId: id });
        const { pages } = get();
        const workspacePages = Object.values(pages).filter((p) => p.workspaceId === id && !p.deleted && p.parentId === null);
        if (workspacePages.length > 0) {
          set({ activePageId: workspacePages[0].id });
        } else {
          set({ activePageId: null });
        }
      },
      setActivePage: (id) => set({ activePageId: id }),

      updateBlock: (pageId, updatedBlock) => set((state) => {
        const pageBlocks = state.blocks[pageId] || [];
        return {
          blocks: {
            ...state.blocks,
            [pageId]: pageBlocks.map((b) => (b.id === updatedBlock.id ? updatedBlock : b)),
          },
          dirtyPages: new Set(state.dirtyPages).add(pageId),
          dirtyBlocks: new Set(state.dirtyBlocks).add({ pageId, blockId: updatedBlock.id }),
        };
      }),

      insertBlock: (pageId, block, afterId) => set((state) => {
        const pageBlocks = [...(state.blocks[pageId] || [])];
        
        let newOrder = block.order;
        if (!newOrder) {
          if (afterId === null) {
            newOrder = pageBlocks.length > 0 ? generateKeyBetween(null, pageBlocks[0].order) : generateKeyBetween(null, null);
          } else {
            const index = pageBlocks.findIndex(b => b.id === afterId);
            if (index !== -1) {
              const afterOrder = pageBlocks[index].order;
              const nextOrder = index < pageBlocks.length - 1 ? pageBlocks[index + 1].order : null;
              
              // Handle potential corrupted state where afterOrder >= nextOrder
              if (nextOrder && afterOrder >= nextOrder) {
                // If we hit this, the state is corrupted. We should probably re-order everything 
                // but for now let's just push to end or something safer.
                newOrder = generateKeyBetween(afterOrder, null);
              } else {
                newOrder = generateKeyBetween(afterOrder, nextOrder);
              }
            } else {
              newOrder = generateKeyBetween(null, null);
            }
          }
        }

        const newBlock = { ...block, order: newOrder };
        const newBlocks = [...pageBlocks, newBlock].sort((a, b) => {
          const ordA = a.order || '';
          const ordB = b.order || '';
          return ordA < ordB ? -1 : ordA > ordB ? 1 : 0;
        });

        return {
          blocks: { ...state.blocks, [pageId]: newBlocks },
          dirtyPages: new Set(state.dirtyPages).add(pageId),
          dirtyBlocks: new Set(state.dirtyBlocks).add({ pageId, blockId: newBlock.id }),
        };
      }),

      deleteBlock: (pageId, blockId) => set((state) => {
        const pageBlocks = state.blocks[pageId] || [];
        return {
          blocks: {
            ...state.blocks,
            [pageId]: pageBlocks.filter(b => b.id !== blockId),
          },
          dirtyPages: new Set(state.dirtyPages).add(pageId),
        };
      }),

      reorderBlocks: (pageId, orderedIds) => set((state) => {
        const pageBlocks = state.blocks[pageId] || [];
        const blockMap = new Map();
        pageBlocks.forEach(b => blockMap.set(b.id, b));
        
        let lastOrder: string | null = null;
        const newBlocks: Block[] = [];
        
        for (const id of orderedIds) {
          const block = blockMap.get(id);
          if (block) {
            const nextOrder = generateKeyBetween(lastOrder, null);
            newBlocks.push({ ...block, order: nextOrder });
            lastOrder = nextOrder;
          }
        }
        
        return {
          blocks: {
            ...state.blocks,
            [pageId]: newBlocks
          },
          dirtyPages: new Set(state.dirtyPages).add(pageId)
        };
      }),

      createPage: (workspaceId, parentId) => {
        const ownerId = currentUid();
        const pages = get().pages;
        const siblings = Object.values(pages).filter(p => p.parentId === parentId && p.workspaceId === workspaceId && !p.deleted);
        const lastSibling = siblings.sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0)).pop();

        const newPage: Page = {
          id: uuidv4(),
          workspaceId,
          parentId,
          title: '',
          icon: null,
          coverImage: null,
          order: generateKeyBetween(lastSibling?.order || null, null),
          timestamp: Date.now(),
          deleted: false,
          ownerId,
        };

        const initialBlock: Block = {
          id: uuidv4(),
          type: 'text',
          order: generateKeyBetween(null, null),
          parentId: null,
          content: '',
          attrs: {},
          ownerId,
        };

        set((state) => ({
          pages: { ...state.pages, [newPage.id]: newPage },
          blocks: { ...state.blocks, [newPage.id]: [initialBlock] },
          activePageId: newPage.id,
          expandedPages: parentId ? new Set(state.expandedPages).add(parentId) : state.expandedPages,
          dirtyPages: new Set(state.dirtyPages).add(newPage.id),
          dirtyBlocks: new Set(state.dirtyBlocks).add({ pageId: newPage.id, blockId: initialBlock.id }),
        }));

        return newPage;
      },

      updatePage: (pageId, updates) => set((state) => {
        const page = state.pages[pageId];
        if (!page) return state;
        return {
          pages: {
            ...state.pages,
            [pageId]: { ...page, ...updates, timestamp: Date.now() },
          },
          dirtyPages: new Set(state.dirtyPages).add(pageId),
        };
      }),

      deletePage: (pageId) => set((state) => {
        const page = state.pages[pageId];
        if (!page) return state;
        
        let newActivePageId = state.activePageId;
        if (newActivePageId === pageId) {
          const workspacePages = Object.values(state.pages).filter(p => p.workspaceId === page.workspaceId && p.id !== pageId && !p.deleted);
          newActivePageId = workspacePages.length > 0 ? workspacePages[0].id : null;
        }

        return {
          pages: {
            ...state.pages,
            [pageId]: { ...page, deleted: true, timestamp: Date.now() }
          },
          activePageId: newActivePageId,
          dirtyPages: new Set(state.dirtyPages).add(pageId),
        };
      }),

      toggleSidebarPage: (pageId) => set((state) => {
        const newExpanded = new Set(state.expandedPages);
        if (newExpanded.has(pageId)) {
          newExpanded.delete(pageId);
        } else {
          newExpanded.add(pageId);
        }
        return { expandedPages: newExpanded };
      }),

      initDemoData: () => {
        const state = get();
        if (state.workspaces.length > 0) return;

        const ownerId = auth.currentUser?.uid;
        if (!ownerId) return;

        const defaultWorkspace: Workspace = {
          id: uuidv4(),
          name: 'Personal Workspace',
          icon: '🌊',
          ownerId,
          createdAt: Date.now(),
          type: 'blog',
        };

        const newPageId = uuidv4();
        const demoPage: Page = {
          id: newPageId,
          workspaceId: defaultWorkspace.id,
          parentId: null,
          title: 'Welcome to Ocean',
          icon: '🌊',
          coverImage: null,
          order: generateKeyBetween(null, null),
          timestamp: Date.now(),
          deleted: false,
          ownerId,
        };

        const demoBlock: Block = {
          id: uuidv4(),
          type: 'text',
          order: generateKeyBetween(null, null),
          parentId: null,
          content: 'Dive deep into your thoughts. Type / for commands.',
          attrs: {},
          ownerId,
        };

        set({
          workspaces: [defaultWorkspace],
          activeWorkspaceId: defaultWorkspace.id,
          pages: { [newPageId]: demoPage },
          activePageId: newPageId,
          blocks: { [newPageId]: [demoBlock] }
        });
      }
    }),
    {
      name: 'ocean-editor-storage',
      partialize: (state) => ({ 
        workspaces: state.workspaces, 
        pages: state.pages, 
        blocks: state.blocks,
        expandedPages: Array.from(state.expandedPages),
        activeWorkspaceId: state.activeWorkspaceId,
      }),
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        ...persistedState,
        expandedPages: new Set(persistedState.expandedPages || []),
      })
    }
  )
);
