import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Block, Page } from '../../lib/store';
import { PublicBlock } from './PublicBlock';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'notfound' }
  | { kind: 'error'; message: string }
  | { kind: 'ok'; page: Page; blocks: Block[] };

export function PublicPage() {
  const { wsId, slug } = useParams<{ wsId: string; slug: string }>();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!wsId || !slug) {
        setState({ kind: 'notfound' });
        return;
      }
      try {
        let pageDocSnap: { id: string; data: any } | null = null;

        const mirrorRef = doc(db, 'publicPages', slug);
        const mirrorSnap = await getDoc(mirrorRef).catch(() => null);
        if (mirrorSnap && mirrorSnap.exists()) {
          const mirror = mirrorSnap.data() as { workspaceId: string; pageId: string };
          if (mirror.workspaceId === wsId) {
            const pageRef = doc(db, 'workspaces', mirror.workspaceId, 'pages', mirror.pageId);
            const pSnap = await getDoc(pageRef);
            if (pSnap.exists()) pageDocSnap = { id: pSnap.id, data: pSnap.data() };
          }
        }

        if (!pageDocSnap) {
          const q = query(
            collection(db, 'workspaces', wsId, 'pages'),
            where('slug', '==', slug),
            where('published', '==', true),
            where('deleted', '==', false)
          );
          const snap = await getDocs(q).catch(() => null);
          if (snap && !snap.empty) {
            const d = snap.docs[0];
            pageDocSnap = { id: d.id, data: d.data() };
          }
        }

        if (!pageDocSnap) {
          if (!cancelled) setState({ kind: 'notfound' });
          return;
        }

        const pageData = pageDocSnap.data;
        if (!pageData.published || pageData.deleted) {
          if (!cancelled) setState({ kind: 'notfound' });
          return;
        }

        const page: Page = { id: pageDocSnap.id, ...pageData, parentId: pageData.parentId || null };

        const blocksSnap = await getDocs(
          collection(db, 'workspaces', wsId, 'pages', pageDocSnap.id, 'blocks')
        );
        const blocks: Block[] = blocksSnap.docs
          .map(b => ({ id: b.id, ...(b.data() as any), parentId: b.data().parentId || null }))
          .sort((a, b) => (a.order < b.order ? -1 : a.order > b.order ? 1 : 0));

        if (!cancelled) setState({ kind: 'ok', page, blocks });
      } catch (err: any) {
        if (!cancelled) setState({ kind: 'error', message: err?.message || 'Failed to load page' });
      }
    }
    load();
    return () => { cancelled = true; };
  }, [wsId, slug]);

  useEffect(() => {
    if (state.kind !== 'ok') return;
    const { page } = state;
    const title = page.seo?.title || page.title || 'Ocean';
    document.title = title;

    const ensureMeta = (name: string, attr: 'name' | 'property' = 'name') => {
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      return el;
    };

    const desc = page.seo?.description || '';
    ensureMeta('description').content = desc;
    ensureMeta('og:title', 'property').content = title;
    ensureMeta('og:description', 'property').content = desc;
    if (page.seo?.ogImage) ensureMeta('og:image', 'property').content = page.seo.ogImage;
  }, [state]);

  if (state.kind === 'loading') {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-ocean-bg">
        <div className="animate-pulse w-8 h-8 rounded-full bg-ocean-blue/50" />
      </div>
    );
  }

  if (state.kind === 'notfound') {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-ocean-bg text-ocean-text">
        <img src="/assets/logo-icon-accent.png" alt="Ocean" className="w-10 h-10 mb-4 opacity-60" />
        <h1 className="text-2xl font-serif mb-2">Page not found</h1>
        <p className="text-ocean-muted text-sm">This page may have been unpublished or never existed.</p>
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-ocean-bg text-ocean-muted text-sm">
        {state.message}
      </div>
    );
  }

  const { page, blocks } = state;

  return (
    <div className="w-full min-h-screen bg-ocean-bg text-ocean-text">
      <nav className="border-b border-ocean-border px-6 py-3 flex items-center">
        <a href="/" aria-label="Ocean">
          <img src="/assets/logo-dark.png" alt="Ocean" className="h-7 w-auto block dark:hidden" />
          <img src="/assets/logo-white.png" alt="Ocean" className="h-7 w-auto hidden dark:block" />
        </a>
      </nav>
      <article className="max-w-3xl mx-auto py-16 px-6 md:px-12">
        <header className="mb-10">
          {page.icon && <div className="text-5xl mb-4">{page.icon}</div>}
          <h1 className="text-5xl font-serif text-ocean-text leading-tight">{page.title || 'Untitled'}</h1>
          {page.publishedAt && (
            <time className="text-sm text-ocean-muted mt-3 block">
              {new Date(page.publishedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            </time>
          )}
        </header>

        <div className="space-y-1">
          {blocks.map(b => (
            <React.Fragment key={b.id}>
              <PublicBlock block={b} />
            </React.Fragment>
          ))}
        </div>

        <footer className="mt-20 pt-8 border-t border-ocean-border text-xs text-ocean-muted text-center flex items-center justify-center gap-1.5">
          Published with{' '}
          <a href="/" className="flex items-center gap-1 text-ocean-blue hover:underline" aria-label="Ocean">
            <img src="/assets/logo-icon-accent.png" alt="" className="w-4 h-4 object-contain" />
            Ocean
          </a>
        </footer>
      </article>
    </div>
  );
}
