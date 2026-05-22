'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Block, BlockType } from '../../lib/store';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { BlockNode } from './BlockNode';
import { SlashCommandMenu } from './SlashCommandMenu';

export const SortableBlock: React.FC<{ 
  block: Block; 
  onUpdate: (b: Block) => void; 
  insertBlock: (afterId: string, type?: BlockType) => void; 
  onDropImage?: (file: File, afterId: string) => void;
  deleteBlock: (blockId: string) => void;
}> = ({ block, onUpdate, insertBlock, onDropImage, deleteBlock }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const [isDragOver, setIsDragOver] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div 
      ref={(node) => {
        setNodeRef(node);
        // @ts-ignore
        containerRef.current = node;
      }} 
      style={style} 
      className={cn(
        "group/block relative flex items-start -ml-12 pl-12 pr-4 py-1 transition-colors duration-200", 
        isDragging && "opacity-30",
        isDragOver && "bg-ocean-blue-dim/30"
      )}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(true);
        }
      }}
      onDragLeave={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          setIsDragOver(false);
        }
      }}
      onDrop={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOver(false);
          const file = Array.from(e.dataTransfer.files as Iterable<File>).find((f: File) => f.type.startsWith('image/'));
          if (file && onDropImage) {
            onDropImage(file, block.id);
          }
        }
      }}
    >
      <div className="absolute left-0 top-1.5 w-10 flex items-center justify-end opacity-0 group-hover/block:opacity-100 transition-opacity">
        <button 
          onClick={() => {
            insertBlock(block.id);
          }}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-ocean-border-soft text-ocean-muted"
        >
          <Plus className="w-4 h-4" />
        </button>
        <div 
          {...attributes} 
          {...listeners}
          className="w-5 h-5 flex items-center justify-center cursor-grab hover:bg-ocean-border-soft rounded active:cursor-grabbing text-ocean-muted"
          contentEditable={false}
        >
          <GripVertical className="w-4 h-4" />
        </div>
      </div>

      <div className="flex-1 w-full relative">
         {isDragOver && (
            <div className="absolute -bottom-1 left-0 right-0 h-1 bg-ocean-blue z-50 rounded" />
         )}
         <BlockNode block={block} onUpdate={onUpdate} insertBlock={insertBlock} deleteBlock={deleteBlock} />
      </div>
    </div>
  );
};

export const BlockList = ({ 
  pageId, 
  blocks, 
  onReorder,
  onUpdateBlock,
  onInsertBlock,
  onDropImage,
  onDeleteBlock
}: { 
  pageId: string;
  blocks: Block[];
  onReorder: (activeId: string, overId: string) => void;
  onUpdateBlock: (block: Block) => void;
  onInsertBlock: (afterId: string, type?: BlockType) => void;
  onDropImage?: (file: File, afterId: string) => void;
  onDeleteBlock: (blockId: string) => void;
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => {
      const { active, over } = e;
      if (over && active.id !== over.id) {
        onReorder(active.id as string, over.id as string);
      }
    }}>
      <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col w-full">
          {blocks.map((block) => (
            <SortableBlock key={block.id} block={block} onUpdate={onUpdateBlock} insertBlock={onInsertBlock} onDropImage={onDropImage} deleteBlock={onDeleteBlock} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};
