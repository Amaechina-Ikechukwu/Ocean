import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Block, BlockType, useEditorStore } from '../../lib/store';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import TextareaAutosize from 'react-textarea-autosize';
import { useFloating, autoUpdate, offset, flip, shift } from '@floating-ui/react';
import { SlashCommandMenu } from './SlashCommandMenu';
import { BlockToolbar } from './BlockToolbar';
import { FileText, Trash2, Check, AlignLeft, AlignCenter, AlignRight, ChevronRight, ChevronDown, MoreHorizontal, Crop, Move, Maximize2, Minimize2 } from 'lucide-react';
import { SubpageMenu } from './SubpageMenu';
import { ImageCropModal } from './ImageCropModal';

export const BlockNode = ({ 
  block, 
  onUpdate,
  insertBlock,
  deleteBlock
}: { 
  block: Block, 
  onUpdate: (b: Block) => void,
  insertBlock: (afterId: string) => void,
  deleteBlock: (blockId: string) => void
}) => {
  const navigate = useNavigate();
  const pages = useEditorStore(state => state.pages);
  const [slashState, setSlashState] = useState<{ isOpen: boolean, query: string, top: number, left: number } | null>(null);
  const [toolbarState, setToolbarState] = useState<{ isOpen: boolean, top: number, left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [openImagePopover, setOpenImagePopover] = useState<'ratio' | 'position' | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);

  const { refs: slashRefs, floatingStyles: slashStyles } = useFloating({
    open: slashState?.isOpen,
    whileElementsMounted: autoUpdate,
    placement: 'bottom-start',
    middleware: [offset(5), flip(), shift({ padding: 10 })]
  });

  const { refs: toolbarRefs, floatingStyles: toolbarStyles } = useFloating({
    open: toolbarState?.isOpen,
    whileElementsMounted: autoUpdate,
    placement: 'top',
    middleware: [offset(5), flip(), shift({ padding: 10 })]
  });

  // Whenever textareaRef mounts, we'll use it as reference element for floating UI
  useEffect(() => {
    if (textareaRef.current) {
      slashRefs.setReference(textareaRef.current);
      toolbarRefs.setReference(textareaRef.current);
    }
  }, [textareaRef.current, slashRefs, toolbarRefs]);

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    if (target.selectionStart !== target.selectionEnd) {
      setToolbarState({ isOpen: true, top: 0, left: 0 });
    } else {
      setToolbarState(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onUpdate({ ...block, content: val });
    setToolbarState(null); // hide toolbar on type

    const lastSlashIdx = val.lastIndexOf('/');
    if (lastSlashIdx !== -1 && lastSlashIdx === val.length - 1 || (lastSlashIdx !== -1 && val.slice(lastSlashIdx+1).match(/^[a-zA-Z]*$/))) {
       const query = val.slice(lastSlashIdx + 1);
       setSlashState({
          isOpen: true,
          query,
          top: 0, left: 0
       });
    } else {
       setSlashState(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (slashState?.isOpen) {
      if (['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(e.key)) {
         return; 
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      insertBlock(block.id);
    }
  };

  const handleSelectCommand = (type: BlockType) => {
    setSlashState(null);
    const lastSlashIdx = block.content.lastIndexOf('/');
    const newContent = lastSlashIdx !== -1 ? block.content.slice(0, lastSlashIdx) : block.content;
    onUpdate({ ...block, type, content: newContent });
    setTimeout(() => {
       textareaRef.current?.focus();
    }, 50);
  };
  
  const handleChangeType = (type: BlockType) => {
    onUpdate({ ...block, type });
    setToolbarState(null);
    setTimeout(() => {
       textareaRef.current?.focus();
    }, 50);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text/plain');
    if (text.includes('\n') || text.match(/^(#|-|\*|\d+\.|>|\[\]|\[v\]|\[x\])\s/m)) {
      e.preventDefault();
      
      const rawLines = text.split(/\r?\n/);
      const parsedBlocks: { type: BlockType, content: string, attrs?: any }[] = [];
      let inCodeBlock = false;
      let codeLanguage = '';
      let codeContent: string[] = [];
      let currentTextContent: string[] = [];

      const flushText = () => {
         if (currentTextContent.length > 0) {
            parsedBlocks.push({ type: 'text', content: currentTextContent.join('\n') });
            currentTextContent = [];
         }
      };

      for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i];
        
        if (line.startsWith('```')) {
          if (!inCodeBlock) {
             flushText();
             inCodeBlock = true;
             codeLanguage = line.slice(3).trim();
             codeContent = [];
          } else {
             inCodeBlock = false;
             parsedBlocks.push({ type: 'code', content: codeContent.join('\n'), attrs: { language: codeLanguage } });
          }
          continue;
        }
        
        if (inCodeBlock) {
          codeContent.push(line);
          continue;
        }

        if (line.trim() === '') {
           flushText();
           continue;
        }

        let type: BlockType = 'text';
        let content = line;
        let attrs: any = {};
        let matched = true;
        
        if (line.trim() === '---') { type = 'divider'; content = ''; }
        else if (line.startsWith('# ')) { type = 'heading1'; content = line.slice(2); }
        else if (line.startsWith('## ')) { type = 'heading2'; content = line.slice(3); }
        else if (line.startsWith('### ')) { type = 'heading3'; content = line.slice(4); }
        else if (line.match(/^[-*]\s/)) { type = 'bulletList'; content = line.replace(/^[-*]\s/, ''); }
        else if (line.match(/^\d+\.\s/)) { type = 'numberedList'; content = line.replace(/^\d+\.\s/, ''); }
        else if (line.startsWith('> ')) { type = 'quote'; content = line.slice(2); }
        else if (line.startsWith('[] ')) { type = 'todo'; content = line.slice(3); attrs = { checked: false }; }
        else if (line.startsWith('[x] ') || line.startsWith('[v] ')) { type = 'todo'; content = line.slice(4); attrs = { checked: true }; }
        else {
           matched = false;
        }

        if (matched) {
           flushText();
           parsedBlocks.push({ type, content, attrs });
        } else {
           currentTextContent.push(line);
        }
      }
      
      flushText();
      
      if (parsedBlocks.length === 0) return;

      const firstParsed = parsedBlocks[0];
      const currentPrefix = block.content.slice(0, textareaRef.current?.selectionStart || 0);
      const currentSuffix = block.content.slice(textareaRef.current?.selectionEnd || 0);
      onUpdate({ ...block, type: block.content.trim() === '' ? firstParsed.type : block.type, content: currentPrefix + firstParsed.content + currentSuffix, attrs: firstParsed.attrs ? { ...block.attrs, ...firstParsed.attrs } : block.attrs });
      
      if (parsedBlocks.length > 1) {
         const store = useEditorStore.getState();
         const pageId = Object.keys(store.blocks).find(pid => store.blocks[pid].some(b => b.id === block.id));
         if (pageId) {
            let currentAfterId = block.id;
            for (let i = 1; i < parsedBlocks.length; i++) {
              const parsed = parsedBlocks[i];
              const newBlock: Block = {
                id: crypto.randomUUID(),
                type: parsed.type,
                content: parsed.content,
                parentId: null,
                attrs: parsed.attrs || {},
                order: '',
                ownerId: block.ownerId
              };
              store.insertBlock(pageId, newBlock, currentAfterId);
              currentAfterId = newBlock.id;
            }
         }
      }
    }
  };

  const commonProps = {
    ref: textareaRef,
    value: block.content,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    onSelect: handleSelect,
    onPaste: handlePaste,
    onBlur: () => {
      // Delay closing to allow clicks on toolbar
      setTimeout(() => setToolbarState(null), 200);
    }
  };

  const renderContent = () => {
    switch (block.type) {
      case 'heading1':
        return (
          <TextareaAutosize
            {...commonProps}
            placeholder="Heading 1"
            className="w-full text-4xl font-serif text-ocean-text bg-transparent border-none outline-none resize-none placeholder:text-ocean-faint focus:ring-0 mt-8 mb-4 leading-tight"
          />
        );
      case 'heading2':
        return (
          <TextareaAutosize
            {...commonProps}
            placeholder="Heading 2"
            className="w-full text-3xl font-serif text-ocean-text bg-transparent border-none outline-none resize-none placeholder:text-ocean-faint focus:ring-0 mt-6 mb-2 leading-snug"
          />
        );
      case 'heading3':
        return (
          <TextareaAutosize
            {...commonProps}
            placeholder="Heading 3"
            className="w-full text-xl font-medium text-ocean-text bg-transparent border-none outline-none resize-none placeholder:text-ocean-faint focus:ring-0 mt-4 mb-2"
          />
        );
      case 'quote':
        return (
          <div className="flex bg-ocean-blue-dim rounded-r-lg my-2 w-full">
            <div className="w-1 bg-ocean-blue shrink-0 rounded-l-sm" />
            <TextareaAutosize
              {...commonProps}
              placeholder="Quote..."
              className="w-full p-4 italic text-ocean-text/90 bg-transparent border-none outline-none resize-none placeholder:text-ocean-faint focus:ring-0"
            />
          </div>
        );
      case 'table':
        const rows = block.content ? block.content.split('\n') : ['Col 1, Col 2, Col 3', 'Val 1, Val 2, Val 3'];
        const numCols = rows[0].split(',').length;
        
        return (
          <div className="w-full my-4 overflow-x-auto border border-ocean-border rounded-lg bg-ocean-surface">
             <table className="w-full text-left border-collapse text-sm text-ocean-text table-fixed">
               <thead>
                 <tr>
                   {rows[0].split(',').map((header, i) => (
                     <th key={i} className="border-b border-ocean-border p-2 font-medium bg-ocean-blue-dim/30 relative group/th">
                       <input 
                         type="text" 
                         defaultValue={header.trim()}
                         className="bg-transparent border-none outline-none w-full text-ocean-text focus:bg-ocean-surface focus:ring-1 focus:ring-ocean-border rounded px-1"
                         onBlur={(e) => {
                            const newRows = [...rows];
                            const headers = newRows[0].split(',');
                            headers[i] = e.target.value;
                            newRows[0] = headers.join(',');
                            onUpdate({ ...block, content: newRows.join('\n') });
                         }}
                       />
                     </th>
                   ))}
                 </tr>
               </thead>
               <tbody>
                 {rows.slice(1).map((row, i) => (
                   <tr key={i} className="hover:bg-ocean-border-soft transition-colors border-b border-ocean-border last:border-b-0 group/tr">
                     {row.split(',').map((cell, j) => (
                        <td key={j} className="p-2 relative border-r border-ocean-border last:border-r-0">
                           <input 
                              type="text" 
                              defaultValue={cell.trim()}
                              className="bg-transparent border-none outline-none w-full text-ocean-text focus:bg-ocean-bg focus:ring-1 focus:ring-ocean-border rounded px-1"
                              onBlur={(e) => {
                                 const newRows = [...rows];
                                 const cells = newRows[i+1].split(',');
                                 cells[j] = e.target.value;
                                 newRows[i+1] = cells.join(',');
                                 onUpdate({ ...block, content: newRows.join('\n') });
                              }}
                           />
                        </td>
                     ))}
                   </tr>
                 ))}
               </tbody>
             </table>
             <div className="p-2 text-xs text-ocean-muted flex gap-4 bg-ocean-bg rounded-b-lg border-t border-ocean-border">
                <button 
                  onClick={() => {
                    const newRows = [...rows];
                    newRows.push(Array(numCols).fill('New').join(','));
                    onUpdate({ ...block, content: newRows.join('\n') });
                  }}
                  className="hover:text-ocean-text transition-colors flex items-center gap-1"
                >
                  + Add Row
                </button>
                <button 
                  onClick={() => {
                    const newRows = rows.map(r => r + ',New');
                    onUpdate({ ...block, content: newRows.join('\n') });
                  }}
                  className="hover:text-ocean-text transition-colors flex items-center gap-1"
                >
                  + Add Col
                </button>
             </div>
          </div>
        );
      case 'image': {
        const alignment = block.attrs?.align || 'center';
        const width = block.attrs?.width || 'full';
        const ratio = block.attrs?.ratio || 'auto';
        const fit = block.attrs?.fit || 'cover';
        const position = block.attrs?.position || 'center';

        const widthClasses = {
          small: 'w-1/3',
          medium: 'w-2/3',
          full: 'w-full'
        };

        const alignClasses = {
          left: 'justify-start',
          center: 'justify-center',
          right: 'justify-end'
        };

        const ratioOptions: { id: string; label: string; tw: string }[] = [
          { id: 'auto',  label: 'Auto / Original', tw: 'aspect-auto' },
          { id: '21:9',  label: '21:9 — Cinematic', tw: 'aspect-[21/9]' },
          { id: '16:9',  label: '16:9 — Widescreen', tw: 'aspect-[16/9]' },
          { id: '3:2',   label: '3:2 — Photo', tw: 'aspect-[3/2]' },
          { id: '4:3',   label: '4:3 — Classic', tw: 'aspect-[4/3]' },
          { id: '1:1',   label: '1:1 — Square', tw: 'aspect-square' },
          { id: '3:4',   label: '3:4 — Portrait', tw: 'aspect-[3/4]' },
          { id: '2:3',   label: '2:3 — Portrait', tw: 'aspect-[2/3]' },
          { id: '9:16',  label: '9:16 — Vertical', tw: 'aspect-[9/16]' },
        ];

        // Map legacy values ('video', 'square') to the new ids.
        const normalizedRatio = ratio === 'video' ? '16:9' : ratio === 'square' ? '1:1' : ratio;
        const currentRatio = ratioOptions.find(r => r.id === normalizedRatio) || ratioOptions[0];

        const positionOptions: { id: string; label: string; obj: string }[] = [
          { id: 'top-left',     label: '↖',  obj: 'object-left-top' },
          { id: 'top',          label: '↑',  obj: 'object-top' },
          { id: 'top-right',    label: '↗',  obj: 'object-right-top' },
          { id: 'left',         label: '←',  obj: 'object-left' },
          { id: 'center',       label: '·',  obj: 'object-center' },
          { id: 'right',        label: '→',  obj: 'object-right' },
          { id: 'bottom-left',  label: '↙',  obj: 'object-left-bottom' },
          { id: 'bottom',       label: '↓',  obj: 'object-bottom' },
          { id: 'bottom-right', label: '↘',  obj: 'object-right-bottom' },
        ];
        const currentPosition = positionOptions.find(p => p.id === position) || positionOptions[4];

        // Position picker only relevant when image is being cropped (cover + a fixed ratio)
        const canCrop = fit === 'cover' && normalizedRatio !== 'auto';

        return (
          <div className="w-full my-6 relative group/image">
            <div className={cn("flex w-full", alignClasses[alignment as keyof typeof alignClasses])}>
              <div className={cn("relative transition-all duration-300", widthClasses[width as keyof typeof widthClasses])}>
                {block.content ? (
                  <img
                    src={block.content}
                    alt="Uploaded block"
                    className={cn(
                      "w-full rounded-xl border border-ocean-border shadow-sm bg-ocean-surface transition-all duration-300",
                      currentRatio.tw,
                      fit === 'cover' ? 'object-cover' : 'object-contain',
                      canCrop && currentPosition.obj
                    )}
                  />
                ) : (
                  <div className="w-full h-32 bg-ocean-surface border-2 border-ocean-border border-dashed rounded-xl flex items-center justify-center text-ocean-muted relative hover:border-ocean-blue/50 transition-colors">
                    Drop an image here...
                  </div>
                )}

                <div className={cn(
                  "absolute top-2 left-1/2 -translate-x-1/2 px-1 py-1 bg-ocean-surface/90 backdrop-blur-md border border-ocean-border shadow-lg rounded-lg flex items-center gap-0.5 transition-all duration-200 z-30",
                  openImagePopover
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-1 group-hover/image:opacity-100 group-hover/image:translate-y-0"
                )}>
                  <button
                    onClick={() => onUpdate({ ...block, attrs: { ...block.attrs, align: 'left' } })}
                    className={cn("p-1.5 rounded hover:bg-ocean-border-soft transition-colors", alignment === 'left' ? "text-ocean-blue bg-ocean-blue-dim" : "text-ocean-muted")}
                    title="Align left"
                  >
                    <AlignLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onUpdate({ ...block, attrs: { ...block.attrs, align: 'center' } })}
                    className={cn("p-1.5 rounded hover:bg-ocean-border-soft transition-colors", alignment === 'center' ? "text-ocean-blue bg-ocean-blue-dim" : "text-ocean-muted")}
                    title="Align center"
                  >
                    <AlignCenter className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onUpdate({ ...block, attrs: { ...block.attrs, align: 'right' } })}
                    className={cn("p-1.5 rounded hover:bg-ocean-border-soft transition-colors", alignment === 'right' ? "text-ocean-blue bg-ocean-blue-dim" : "text-ocean-muted")}
                    title="Align right"
                  >
                    <AlignRight className="w-4 h-4" />
                  </button>

                  <div className="w-px h-4 bg-ocean-border mx-1" />

                  <button
                    onClick={() => onUpdate({ ...block, attrs: { ...block.attrs, width: 'small' } })}
                    className={cn("px-2 py-1 rounded text-[10px] font-bold hover:bg-ocean-border-soft transition-colors", width === 'small' ? "text-ocean-blue bg-ocean-blue-dim" : "text-ocean-muted")}
                    title="Small"
                  >
                    S
                  </button>
                  <button
                    onClick={() => onUpdate({ ...block, attrs: { ...block.attrs, width: 'medium' } })}
                    className={cn("px-2 py-1 rounded text-[10px] font-bold hover:bg-ocean-border-soft transition-colors", width === 'medium' ? "text-ocean-blue bg-ocean-blue-dim" : "text-ocean-muted")}
                    title="Medium"
                  >
                    M
                  </button>
                  <button
                    onClick={() => onUpdate({ ...block, attrs: { ...block.attrs, width: 'full' } })}
                    className={cn("px-2 py-1 rounded text-[10px] font-bold hover:bg-ocean-border-soft transition-colors", width === 'full' ? "text-ocean-blue bg-ocean-blue-dim" : "text-ocean-muted")}
                    title="Large"
                  >
                    L
                  </button>

                  <div className="w-px h-4 bg-ocean-border mx-1" />

                  {/* Ratio dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setOpenImagePopover(openImagePopover === 'ratio' ? null : 'ratio')}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold hover:bg-ocean-border-soft transition-colors",
                        normalizedRatio !== 'auto' ? "text-ocean-blue bg-ocean-blue-dim" : "text-ocean-muted"
                      )}
                      title="Aspect ratio"
                    >
                      {currentRatio.id === 'auto' ? 'Auto' : currentRatio.id}
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {openImagePopover === 'ratio' && (
                      <div className="absolute top-full mt-1 left-0 bg-ocean-surface border border-ocean-border shadow-xl rounded-lg p-1 flex flex-col min-w-[180px] z-40">
                        {ratioOptions.map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => {
                              onUpdate({ ...block, attrs: { ...block.attrs, ratio: opt.id } });
                              setOpenImagePopover(null);
                            }}
                            className={cn(
                              "flex items-center justify-between px-3 py-1.5 rounded text-xs text-left hover:bg-ocean-border-soft transition-colors",
                              opt.id === currentRatio.id ? "text-ocean-blue bg-ocean-blue-dim font-medium" : "text-ocean-text"
                            )}
                          >
                            <span>{opt.label}</span>
                            {opt.id === currentRatio.id && <Check className="w-3.5 h-3.5" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Fit toggle */}
                  <button
                    onClick={() => onUpdate({ ...block, attrs: { ...block.attrs, fit: fit === 'cover' ? 'contain' : 'cover' } })}
                    className={cn(
                      "p-1.5 rounded hover:bg-ocean-border-soft transition-colors",
                      fit === 'cover' ? "text-ocean-blue bg-ocean-blue-dim" : "text-ocean-muted"
                    )}
                    title={fit === 'cover' ? 'Crop to fill (Cover)' : 'Show full image (Contain)'}
                  >
                    {fit === 'cover' ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                  </button>

                  {/* Crop-position picker — only meaningful when image is being cropped */}
                  {canCrop && (
                    <div className="relative">
                      <button
                        onClick={() => setOpenImagePopover(openImagePopover === 'position' ? null : 'position')}
                        className={cn(
                          "flex items-center gap-1 p-1.5 rounded hover:bg-ocean-border-soft transition-colors",
                          position !== 'center' ? "text-ocean-blue bg-ocean-blue-dim" : "text-ocean-muted"
                        )}
                        title="Crop anchor point"
                      >
                        <Move className="w-4 h-4" />
                      </button>
                      {openImagePopover === 'position' && (
                        <div className="absolute top-full mt-1 right-0 bg-ocean-surface border border-ocean-border shadow-xl rounded-lg p-2 z-40">
                          <p className="text-[10px] text-ocean-muted px-1 pb-1.5 font-medium tracking-wide uppercase">Anchor</p>
                          <div className="grid grid-cols-3 gap-0.5 w-[96px]">
                            {positionOptions.map(opt => (
                              <button
                                key={opt.id}
                                onClick={() => {
                                  onUpdate({ ...block, attrs: { ...block.attrs, position: opt.id } });
                                  setOpenImagePopover(null);
                                }}
                                className={cn(
                                  "w-7 h-7 rounded flex items-center justify-center text-sm font-bold hover:bg-ocean-border-soft transition-colors",
                                  opt.id === position ? "text-ocean-blue bg-ocean-blue-dim" : "text-ocean-muted"
                                )}
                                title={opt.id}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="w-px h-4 bg-ocean-border mx-1" />

                  <button
                    onClick={() => setShowCropModal(true)}
                    disabled={!block.content}
                    className="p-1.5 hover:bg-ocean-border-soft rounded transition-colors text-ocean-muted hover:text-ocean-blue disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ocean-muted"
                    title="Crop image…"
                  >
                    <Crop className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded transition-colors text-ocean-muted"
                    title="Delete image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {showCropModal && block.content && (
              <ImageCropModal
                src={block.attrs?.originalSrc || block.content}
                onSave={(croppedDataUrl) => {
                  onUpdate({
                    ...block,
                    content: croppedDataUrl,
                    attrs: {
                      ...block.attrs,
                      originalSrc: block.attrs?.originalSrc || block.content,
                    },
                  });
                  setShowCropModal(false);
                }}
                onClose={() => setShowCropModal(false)}
              />
            )}

            {showDeleteConfirm && (
               <div className="fixed inset-0 bg-ocean-bg/60 backdrop-blur-sm flex items-center justify-center z-[100]">
                  <div className="bg-ocean-surface border border-ocean-border shadow-2xl rounded-xl p-6 flex flex-col items-center gap-4 max-w-sm w-full mx-4">
                     <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                        <Trash2 className="w-6 h-6" />
                     </div>
                     <div className="text-center">
                        <h3 className="text-ocean-text font-semibold text-lg">Delete image?</h3>
                        <p className="text-ocean-muted text-sm mt-1">This action cannot be undone.</p>
                     </div>
                     <div className="flex gap-3 w-full">
                        <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 rounded-lg bg-ocean-bg text-ocean-text hover:bg-ocean-border-soft transition-colors font-medium">Cancel</button>
                        <button onClick={() => deleteBlock(block.id)} className="flex-1 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors font-medium">Delete</button>
                     </div>
                  </div>
               </div>
            )}

            <TextareaAutosize
              {...commonProps}
              placeholder="Add a caption..."
              className="w-full mt-3 text-sm text-left text-ocean-muted bg-transparent border-none outline-none resize-none placeholder:text-ocean-faint focus:ring-0 italic"
              value={block.attrs?.caption || ''}
              onChange={(e) => onUpdate({ ...block, attrs: { ...block.attrs, caption: e.target.value } })}
            />
          </div>
        );
      }
      case 'subpage':
        const linkedPage = block.attrs.linkedPageId ? pages[block.attrs.linkedPageId] : null;
        return (
          <div className="flex w-full items-center gap-3 p-3 my-2 rounded-2xl bg-ocean-surface border border-ocean-border hover:border-ocean-blue/30 hover:bg-ocean-blue-dim/10 transition-all group relative shadow-sm">
             <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-ocean-blue/5 text-ocean-blue shrink-0 group-hover:scale-110 transition-transform text-2xl shadow-inner-soft">
                {linkedPage?.icon || <FileText className="w-6 h-6 opacity-40 shrink-0" />}
             </div>
             <div className="flex-1 min-w-0">
               <input
                  type="text"
                  value={linkedPage?.title || ''}
                  onChange={(e) => {
                     if (linkedPage && !linkedPage.deleted) {
                        useEditorStore.getState().updatePage(linkedPage.id, { title: e.target.value });
                     }
                  }}
                  className="bg-transparent border-none outline-none w-full text-ocean-text font-bold text-lg m-0 p-0 placeholder:text-ocean-faint focus:ring-0 truncate"
                  placeholder="Untitled Page"
               />
               <button 
                  onClick={() => {
                     if (linkedPage && !linkedPage.deleted) {
                        navigate(`/app/${linkedPage.id}`);
                     }
                  }}
                  className="text-xs text-ocean-muted hover:text-ocean-blue transition-colors flex items-center gap-1 mt-0.5 opacity-60 group-hover:opacity-100"
               >
                  Open Page <ChevronRight className="w-3 h-3" />
               </button>
             </div>
             <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-1 group-hover:translate-x-0">
               {linkedPage && <SubpageMenu page={linkedPage} onRemove={() => deleteBlock(block.id)} />}
               {!linkedPage && (
                 <button 
                    onClick={() => deleteBlock(block.id)}
                    className="p-2 text-ocean-muted hover:text-red-500 transition-all rounded-lg hover:bg-red-500/10"
                    title="Remove subpage link"
                 >
                    <Trash2 className="w-4 h-4" />
                 </button>
               )}
             </div>
          </div>
        );
      case 'bulletList':
      case 'numberedList':
      case 'todo':
      case 'toggle':
        const prefix = block.type === 'bulletList' ? '•' : block.type === 'numberedList' ? '1.' : block.type === 'todo' ? '☐' : '▶';
        const isChecked = block.type === 'todo' && block.attrs?.checked;

        return (
          <div className="flex w-full items-start gap-2 my-1">
             {block.type === 'todo' ? (
               <button 
                 onClick={(e) => {
                   e.preventDefault();
                   onUpdate({ ...block, attrs: { ...block.attrs, checked: !isChecked } });
                 }}
                 className={cn(
                   "mt-1.5 w-4 h-4 rounded border flex items-center justify-center transition-all duration-200 shrink-0",
                   isChecked 
                     ? "bg-ocean-blue border-ocean-blue text-white" 
                     : "border-ocean-muted/50 hover:border-ocean-blue bg-transparent"
                 )}
               >
                 {isChecked && (
                   <motion.div
                     initial={{ scale: 0, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                   >
                     <Check className="w-3 h-3 stroke-[3]" />
                   </motion.div>
                 )}
               </button>
             ) : (
               <span className="text-ocean-muted mt-1 select-none font-mono text-sm w-4 shrink-0 text-center">{prefix}</span>
             )}
             <TextareaAutosize
                {...commonProps}
                placeholder={block.type === 'todo' ? "To-do item..." : "List item..."}
                className={cn(
                  "flex-1 text-lg leading-relaxed text-ocean-text bg-transparent border-none outline-none resize-none placeholder:text-ocean-faint focus:ring-0 transition-opacity duration-300",
                  isChecked && "opacity-50 line-through decoration-ocean-muted"
                )}
             />
          </div>
        )
      case 'text':
      default:
        return (
          <TextareaAutosize
            {...commonProps}
            placeholder="Type '/' for commands"
            className="w-full text-lg leading-relaxed text-ocean-text bg-transparent border-none outline-none resize-none placeholder:text-ocean-faint focus:ring-0 min-h-[30px]"
          />
        );
    }
  };

  return (
    <div ref={containerRef} className={cn("relative w-full group", (slashState?.isOpen || toolbarState?.isOpen) ? "z-50" : "z-10")}>
       {renderContent()}
       
       <AnimatePresence mode="wait">
         {slashState?.isOpen && (
           <SlashCommandMenu 
             key={`slash-${block.id}`}
             ref={slashRefs.setFloating}
             style={slashStyles}
             isOpen={slashState.isOpen}
             query={slashState.query}
             onSelect={handleSelectCommand}
             onClose={() => setSlashState(null)}
           />
         )}
       </AnimatePresence>

       <AnimatePresence mode="wait">
         {toolbarState?.isOpen && (
           <BlockToolbar 
             key={`toolbar-${block.id}`}
             ref={toolbarRefs.setFloating}
             style={{...toolbarStyles, transformOrigin: 'bottom'}}
             isOpen={toolbarState.isOpen}
             onClose={() => setToolbarState(null)}
             blockType={block.type}
             onChangeType={handleChangeType}
           />
         )}
       </AnimatePresence>
    </div>
  );
};
