import React from 'react';
import { Block } from '../../lib/store';
import { cn } from '../../lib/utils';

export function PublicBlock({ block }: { block: Block }) {
  switch (block.type) {
    case 'heading1':
      return <h1 className="text-4xl font-serif text-ocean-text mt-8 mb-4 leading-tight">{block.content}</h1>;
    case 'heading2':
      return <h2 className="text-3xl font-serif text-ocean-text mt-6 mb-2 leading-snug">{block.content}</h2>;
    case 'heading3':
      return <h3 className="text-xl font-medium text-ocean-text mt-4 mb-2">{block.content}</h3>;
    case 'quote':
      return (
        <blockquote className="flex bg-ocean-blue-dim rounded-r-lg my-3">
          <div className="w-1 bg-ocean-blue shrink-0 rounded-l-sm" />
          <p className="p-4 italic text-ocean-text/90 whitespace-pre-wrap">{block.content}</p>
        </blockquote>
      );
    case 'code':
      return (
        <pre className="my-3 rounded-lg bg-ocean-surface border border-ocean-border p-4 overflow-x-auto">
          <code className="text-sm text-ocean-text font-mono whitespace-pre">{block.content}</code>
        </pre>
      );
    case 'divider':
      return <hr className="my-6 border-t border-ocean-border" />;
    case 'bulletList':
      return (
        <div className="flex items-start gap-2 my-1">
          <span className="text-ocean-muted mt-1 select-none w-4 shrink-0 text-center">•</span>
          <p className="flex-1 text-lg leading-relaxed text-ocean-text whitespace-pre-wrap">{block.content}</p>
        </div>
      );
    case 'numberedList':
      return (
        <div className="flex items-start gap-2 my-1">
          <span className="text-ocean-muted mt-1 select-none font-mono text-sm w-4 shrink-0 text-center">1.</span>
          <p className="flex-1 text-lg leading-relaxed text-ocean-text whitespace-pre-wrap">{block.content}</p>
        </div>
      );
    case 'todo': {
      const checked = !!block.attrs?.checked;
      return (
        <div className="flex items-start gap-2 my-1">
          <span
            className={cn(
              'mt-1.5 w-4 h-4 rounded border flex items-center justify-center shrink-0',
              checked ? 'bg-ocean-blue border-ocean-blue text-white' : 'border-ocean-muted/50'
            )}
            aria-hidden
          >
            {checked && '✓'}
          </span>
          <p className={cn('flex-1 text-lg leading-relaxed text-ocean-text whitespace-pre-wrap', checked && 'opacity-50 line-through')}>
            {block.content}
          </p>
        </div>
      );
    }
    case 'callout':
      return (
        <div className="my-3 rounded-lg border border-ocean-border bg-ocean-surface p-4 text-ocean-text whitespace-pre-wrap">
          {block.content}
        </div>
      );
    case 'image': {
      if (!block.content) return null;
      const align = block.attrs?.align || 'center';
      const width = block.attrs?.width || 'full';
      const alignClass = align === 'left' ? 'justify-start' : align === 'right' ? 'justify-end' : 'justify-center';
      const widthClass = width === 'small' ? 'w-1/3' : width === 'medium' ? 'w-2/3' : 'w-full';
      return (
        <figure className={cn('flex my-6', alignClass)}>
          <div className={widthClass}>
            <img
              src={block.content}
              alt={block.attrs?.caption || ''}
              className={cn(
                'w-full rounded-xl border border-ocean-border object-cover bg-ocean-surface',
                block.attrs?.ratio === 'video' && 'aspect-video',
                block.attrs?.ratio === 'square' && 'aspect-square'
              )}
            />
            {block.attrs?.caption && (
              <figcaption className="mt-2 text-sm text-center text-ocean-muted italic">{block.attrs.caption}</figcaption>
            )}
          </div>
        </figure>
      );
    }
    case 'text':
    default:
      return <p className="text-lg leading-relaxed text-ocean-text my-2 whitespace-pre-wrap">{block.content}</p>;
  }
}
