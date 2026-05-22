'use client';

import { motion } from 'motion/react';
import { Search as SearchIcon } from 'lucide-react';
import { useState } from 'react';
import { useEditorStore } from '../../lib/store';
import { useRouter } from 'next/navigation';

export function Search() {
  const [query, setQuery] = useState('');
  const { pages, blocks, setActivePage } = useEditorStore();
  const router = useRouter();

  const results = Object.values(pages).filter(p => !p.deleted).map(page => {
    const pageBlocks = blocks[page.id] || [];
    const titleMatch = page.title.toLowerCase().includes(query.toLowerCase());
    const matchingBlocks = pageBlocks.filter(b => b.content.toLowerCase().includes(query.toLowerCase()));
    
    if (titleMatch || matchingBlocks.length > 0) {
      return {
        ...page,
        matchCount: (titleMatch ? 1 : 0) + matchingBlocks.length,
        preview: matchingBlocks.length > 0 ? matchingBlocks[0].content : (pageBlocks[0]?.content || 'Empty page')
      };
    }
    return null;
  }).filter(r => r !== null).sort((a, b) => (b as any).matchCount - (a as any).matchCount);

  return (
    <motion.div 
      initial={{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }}
      animate={{ opacity: 1, clipPath: 'inset(0 0% 0 0)' }}
      exit={{ opacity: 0, clipPath: 'inset(0 0% 0 100%)' }}
      transition={{ type: 'spring', stiffness: 90, damping: 20 }}
      className="flex-1 overflow-y-auto bg-ocean-bg p-8"
    >
      <div className="max-w-2xl mx-auto mt-12">
        <div className="relative mb-12">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-ocean-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages..."
            autoFocus
            className="w-full bg-ocean-surface border border-ocean-border rounded-xl py-4 pl-14 pr-4 text-xl text-ocean-text outline-none focus:border-ocean-blue focus:ring-4 focus:ring-ocean-blue-glow transition-all"
          />
        </div>

        {query && (
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-ocean-muted px-2">Results</h2>
            {results.length === 0 ? (
              <p className="text-ocean-faint px-2">No pages found.</p>
            ) : (
              results.map(page => (
                <button
                  key={page.id}
                  onClick={() => {
                    setActivePage(page.id);
                    router.push(`/app/${page.id}`);
                  }}
                  className="w-full flex items-center justify-between p-4 bg-ocean-surface border border-ocean-border hover:border-ocean-blue rounded-xl text-left transition-all group overflow-hidden relative"
                >
                  <div>
                    <h3 className="font-medium text-ocean-text text-lg">{page.title || 'Untitled'}</h3>
                    <p className="text-sm text-ocean-muted truncate max-w-md">{(page as any).preview || 'Empty page'}</p>
                  </div>
                  {/* Semantic search relevancy wavy bar representation */}
                  <div className="w-24 h-2 bg-ocean-bg rounded-full overflow-hidden">
                    <motion.div 
                       className="h-full bg-ocean-blue"
                       initial={{ width: 0 }}
                       animate={{ width: `${Math.max(30, Math.random() * 100)}%` }}
                       transition={{ delay: 0.2, type: 'spring' }}
                    />
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
