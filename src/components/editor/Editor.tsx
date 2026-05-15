import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditorStore, Block, BlockType } from '../../lib/store';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ChevronRight, Plus, FileText, Smile } from 'lucide-react';
import { cn } from '../../lib/utils';
import TextareaAutosize from 'react-textarea-autosize';
import { BlockList } from './BlockList';
import { PageShareMenu } from './PageShareMenu';
import { PageMenu } from './PageMenu';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { toast } from 'sonner';
import EmojiPicker from 'emoji-picker-react';
import { useFloating, autoUpdate, offset, flip, shift, FloatingPortal } from '@floating-ui/react';

export function Editor() {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const { pages, blocks, updatePage, updateBlock, insertBlock, reorderBlocks, activeWorkspaceId, createPage, activePageId, setActivePage } = useEditorStore();
  
  const pageArray = Object.values(pages);
  const page = pageId ? pages[pageId] : (activePageId && pages[activePageId] && !pages[activePageId].deleted && pages[activePageId].workspaceId === activeWorkspaceId ? pages[activePageId] : (pageArray.find(p => p.workspaceId === activeWorkspaceId && !p.deleted) || null));
  
  const [title, setTitle] = useState(page?.title || '');
  const [isHovering, setIsHovering] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const { refs, floatingStyles } = useFloating({
    open: showEmojiPicker,
    onOpenChange: setShowEmojiPicker,
    whileElementsMounted: autoUpdate,
    placement: 'bottom-start',
    middleware: [
      offset(10),
      flip(),
      shift({ padding: 10 })
    ]
  });

  useEffect(() => {
    if (page) {
      setTitle(page.title);
      if (page.id !== activePageId) {
        setActivePage(page.id);
      }
      if (page.id !== pageId) {
        navigate(`/app/${page.id}`, { replace: true });
      }
    } else {
      const workspacePages = pageArray.filter(p => p.workspaceId === activeWorkspaceId && !p.deleted);
      if (workspacePages.length > 0) {
        navigate(`/app/${workspacePages[0].id}`, { replace: true });
      }
    }
  }, [page, navigate, activeWorkspaceId, pageArray, activePageId, pageId, setActivePage]);

  useEffect(() => {
    const handleOnline = () => toast.success('Back online! Syncing changes...');
    const handleOffline = () => toast.info('You are offline. Changes will save locally.');
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!page) return null;

  const pageBlocks = blocks[page.id] || [];

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    updatePage(page.id, { title: e.target.value });
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // focus first block or create one
      if (pageBlocks.length === 0) {
        insertBlock(page.id, { id: uuidv4(), type: 'text', content: '', parentId: null, attrs: {}, order: '', ownerId: page.ownerId }, null);
      }
      // Actually we'd focus it, but for simplicity we rely on React rendering
      setTimeout(() => {
        const textareas = document.querySelectorAll('textarea');
        if (textareas[0]) {
          (textareas[0] as HTMLTextAreaElement).focus();
        }
      }, 50);
    }
  };

  const handleInsertBlock = (afterId: string, type?: BlockType) => {
    const newBlock: Block = { id: uuidv4(), type: type || 'text', content: '', parentId: null, attrs: {}, order: '', ownerId: page.ownerId };
    insertBlock(page.id, newBlock, afterId);
  };

  const handleReorder = (activeId: string, overId: string) => {
    const activeIndex = pageBlocks.findIndex(b => b.id === activeId);
    const overIndex = pageBlocks.findIndex(b => b.id === overId);
    if (activeIndex !== -1 && overIndex !== -1) {
      const newArray = [...pageBlocks];
      const [movedItem] = newArray.splice(activeIndex, 1);
      newArray.splice(overIndex, 0, movedItem);
      
      const orderedIds = newArray.map(b => b.id);
      reorderBlocks(page.id, orderedIds);
    }
  };

  const handleFileDrop = (file: File, afterId: string | null) => {
    const toastId = toast.loading(`Uploading ${file.name}...`);
    try {
      const storageRef = ref(storage, `workspaces/${activeWorkspaceId}/images/${uuidv4()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          toast.loading(`Uploading ${file.name}... ${progress}%`, { id: toastId });
        }, 
        (error) => {
          console.error("Upload failed... falling back to local URL", error);
          const localUrl = URL.createObjectURL(file);
          toast.success(`Used local image for ${file.name}`, { id: toastId });
          const newBlock: Block = { id: uuidv4(), type: 'image', content: localUrl, parentId: null, attrs: {}, order: '', ownerId: page!.ownerId };
          insertBlock(page!.id, newBlock, afterId);
        }, 
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          toast.success(`Uploaded ${file.name}`, { id: toastId });
          
          const newBlock: Block = { id: uuidv4(), type: 'image', content: downloadURL, parentId: null, attrs: {}, order: '', ownerId: page!.ownerId };
          insertBlock(page!.id, newBlock, afterId);
        }
      );
    } catch (e) {
      console.error("Storage error... falling back to local URL", e);
      const localUrl = URL.createObjectURL(file);
      toast.success(`Used local image for ${file.name}`, { id: toastId });
      const newBlock: Block = { id: uuidv4(), type: 'image', content: localUrl, parentId: null, attrs: {}, order: '', ownerId: page!.ownerId };
      insertBlock(page!.id, newBlock, afterId);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHovering(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHovering(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsHovering(false);
    
    const file = Array.from(e.dataTransfer.files as Iterable<File>).find(f => f.type.startsWith('image/'));
    if (!file) return;

    handleFileDrop(file, null);
  };

  // Breadcrumbs
  let currentParent = page.parentId ? pages[page.parentId] : null;
  const breadcrumbs = [];
  while (currentParent && !currentParent.deleted) {
    breadcrumbs.unshift(currentParent);
    currentParent = currentParent.parentId ? pages[currentParent.parentId] : null;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="flex-1 overflow-y-auto bg-ocean-bg relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-5">
        <motion.div
           animate={{
            background: [
              "radial-gradient(circle at 0% 0%, var(--ocean-blue) 0%, transparent 50%)",
              "radial-gradient(circle at 100% 100%, var(--ocean-blue) 0%, transparent 50%)",
              "radial-gradient(circle at 0% 100%, var(--ocean-blue) 0%, transparent 50%)",
              "radial-gradient(circle at 0% 0%, var(--ocean-blue) 0%, transparent 50%)",
            ]
           }}
           transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
           className="w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 filter blur-[100px]"
        />
      </div>

      <div id="editor-content" className="max-w-3xl mx-auto py-12 px-12 relative flex flex-col min-h-full">
        
        {/* Breadcrumbs & Share */}
        <div className="flex items-center justify-between pl-12 pr-4 mb-16 relative z-10">
          <div className="flex items-center gap-2 text-sm text-ocean-muted group overflow-hidden">
            <span className="hover:text-ocean-text cursor-pointer transition-colors pt-0.5 shrink-0">Workspace</span>
            {breadcrumbs.map((crumb) => (
              <React.Fragment key={crumb.id}>
                <ChevronRight className="w-3.5 h-3.5 opacity-50 shrink-0" />
                <span 
                  className="hover:text-ocean-text cursor-pointer transition-colors pt-0.5 truncate min-w-0"
                  onClick={() => navigate(`/app/${crumb.id}`)}
                >
                  {crumb.title || 'Untitled'}
                </span>
              </React.Fragment>
            ))}
            <ChevronRight className="w-3.5 h-3.5 opacity-50 shrink-0" />
            <span className="text-ocean-text font-medium pt-0.5 truncate min-w-0">{page.title || 'Untitled'}</span>
          </div>

          <div className="flex items-center gap-2">
            <PageShareMenu page={page} pageBlocks={pageBlocks} />
            <PageMenu page={page} />
          </div>
        </div>

        <div className="w-full h-8 mb-8 opacity-20 pointer-events-none pl-12 pr-6">
          <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-full stroke-ocean-blue fill-none" strokeWidth="0.5">
            <path d="M0 10 Q 25 20, 50 10 T 100 10" />
          </svg>
        </div>

        <div className="pl-12 w-full mb-8 group/page-icon">
          <div className="flex items-center gap-4 mb-4 relative w-fit">
            <div 
              ref={refs.setReference}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="w-16 h-16 rounded-2xl bg-ocean-blue/5 border border-ocean-border flex items-center justify-center text-4xl group-hover/page-icon:scale-105 transition-transform cursor-pointer hover:bg-ocean-blue/10"
            >
              {page.icon || (
                <div className="text-ocean-faint group-hover/page-icon:text-ocean-blue transition-colors flex items-center justify-center">
                   <Smile className="w-8 h-8 opacity-50" />
                </div>
              )}
            </div>
          </div>
          
          <AnimatePresence>
            {showEmojiPicker && (
              <FloatingPortal>
                <div ref={refs.setFloating} style={{ ...floatingStyles, zIndex: 100 }}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    className="shadow-2xl rounded-xl overflow-hidden"
                  >
                    <EmojiPicker 
                      onEmojiClick={(emojiData) => {
                        updatePage(page.id, { icon: emojiData.emoji });
                        setShowEmojiPicker(false);
                      }}
                      lazyLoadEmojis={true}
                    />
                  </motion.div>
                </div>
              </FloatingPortal>
            )}
          </AnimatePresence>
          {showEmojiPicker && <div className="fixed inset-0 z-[90]" onClick={() => setShowEmojiPicker(false)} />}

          <TextareaAutosize
            value={title}
            onChange={handleTitleChange}
            onKeyDown={handleTitleKeyDown}
            placeholder="Untitled"
            autoFocus={!title}
            className="w-full text-6xl font-serif text-ocean-text bg-transparent border-none outline-none placeholder:text-ocean-faint focus:ring-0 leading-tight resize-none"
          />
        </div>

        <div className="relative mt-8 group flex-1 pb-32 pl-12">
          {pageBlocks.length === 0 ? (
            <div 
              className="text-ocean-faint text-lg cursor-text py-2 font-sans"
              onClick={() => handleInsertBlock(null as any)}
            >
              Start typing deeply, or type '/' for AI commands...
            </div>
          ) : (
            <BlockList 
              pageId={page.id} 
              blocks={pageBlocks} 
              onReorder={handleReorder}
              onUpdateBlock={(b) => {
                if (b.type === 'subpage' && !b.attrs.linkedPageId) {
                  const newPage = createPage(activeWorkspaceId!, page.id);
                  b.attrs.linkedPageId = newPage.id;
                  b.content = '';
                  // Open the new page automatically if we want, or let user click
                }
                updateBlock(page.id, b);
              }}
              onInsertBlock={handleInsertBlock}
              onDropImage={handleFileDrop}
              onDeleteBlock={(bId) => {
                 const deleteBlockStore = useEditorStore.getState().deleteBlock;
                 deleteBlockStore(page.id, bId);
              }}
            />
          )}
        </div>
      </div>

      <AnimatePresence>
        {isHovering && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-ocean-blue-dim/20 backdrop-blur-[2px] flex items-center justify-center pointer-events-none"
          >
            <div className="bg-ocean-surface p-8 rounded-2xl shadow-xl border border-ocean-blue font-serif text-2xl text-ocean-blue shadow-ocean-blue-dim">
              Drop image here...
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
