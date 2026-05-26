'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Share, Globe, Download, Check, X, Link2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFloating, autoUpdate, offset, flip, shift, FloatingPortal } from '@floating-ui/react';
import { doc, setDoc } from 'firebase/firestore';
import { Page, Block } from '../../lib/store';
import { useEditorStore } from '../../lib/store';
import { db } from '../../lib/firebase';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { slugify, isReservedSlug } from '../../lib/utils';

export function PageShareMenu({ page, pageBlocks }: { page: Page; pageBlocks: Block[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invites, setInvites] = useState<{ email: string; role: string }[]>([]);
  const { updatePage, pages } = useEditorStore();
  const menuRef = useRef<HTMLDivElement>(null);

  const { refs, floatingStyles } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    whileElementsMounted: autoUpdate,
    strategy: 'fixed',
    placement: 'bottom-end',
    middleware: [offset(8), flip(), shift({ padding: 12 })],
  });

  const initialSlug = page.slug || slugify(page.title || 'untitled');
  const [slug, setSlug] = useState(initialSlug);
  const [seoTitle, setSeoTitle] = useState(page.seo?.title || '');
  const [seoDesc, setSeoDesc] = useState(page.seo?.description || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSlug(page.slug || slugify(page.title || 'untitled'));
    setSeoTitle(page.seo?.title || '');
    setSeoDesc(page.seo?.description || '');
  }, [page.id, page.slug, page.title, page.seo?.title, page.seo?.description]);

  const slugError = useMemo(() => {
    if (!slug) return 'Slug is required';
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return 'Use lowercase letters, numbers, hyphens';
    if (slug.length > 80) return 'Slug too long (max 80)';
    if (isReservedSlug(slug)) return 'This slug is reserved';
    const collision = Object.values(pages).find(
      p => p.id !== page.id && p.workspaceId === page.workspaceId && !p.deleted && p.slug === slug
    );
    if (collision) return 'Slug already used in this workspace';
    return null;
  }, [slug, pages, page.id, page.workspaceId]);

  const publicUrl = `${window.location.origin}/p/${page.workspaceId}/${slug}`;

  const persistPageState = async (updates: Partial<Page>) => {
    const pageRef = doc(db, 'workspaces', page.workspaceId, 'pages', page.id);
    await setDoc(
      pageRef,
      {
        workspaceId: page.workspaceId,
        title: page.title || '',
        order: page.order,
        timestamp: Date.now(),
        deleted: page.deleted,
        parentId: page.parentId || '',
        icon: page.icon || '',
        coverImage: page.coverImage || '',
        published: updates.published !== undefined ? updates.published : page.published || false,
        ownerId: page.ownerId,
        slug: updates.slug !== undefined ? updates.slug : page.slug || '',
        publishedAt: updates.publishedAt !== undefined ? updates.publishedAt : page.publishedAt ?? null,
        seo: updates.seo !== undefined ? updates.seo : page.seo ?? null,
      },
      { merge: true }
    );
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const inTrigger = menuRef.current?.contains(target);
      const inFloating = refs.floating.current?.contains(target);
      if (!inTrigger && !inFloating) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, refs.floating]);

  const handleInvite = () => {
    if (inviteEmail && inviteEmail.includes('@')) {
      setInvites([...invites, { email: inviteEmail, role: 'Editor' }]);
      toast.success(`Invite sent to ${inviteEmail}`);
      setInviteEmail('');
    } else {
      toast.error('Please enter a valid email address');
    }
  };

  const handlePublishToggle = async () => {
    if (page.published) {
      const updates = { published: false, publishedAt: null };
      updatePage(page.id, updates);
      try {
        await persistPageState(updates);
        toast.info('Page unpublished', { description: 'This page is no longer public.' });
      } catch (error) {
        toast.error('Failed to unpublish page');
      }
      return;
    }
    if (slugError) {
      toast.error(slugError);
      return;
    }
    setSaving(true);
    try {
      const updates = {
        published: true,
        slug,
        publishedAt: Date.now(),
        seo: (seoTitle || seoDesc) ? { title: seoTitle || undefined, description: seoDesc || undefined } : null,
      };
      updatePage(page.id, updates);
      await persistPageState(updates);
      navigator.clipboard.writeText(publicUrl).catch(() => {});
      toast.success('Page published!', { description: 'Public link copied to clipboard.' });
    } catch (error) {
      toast.error('Failed to publish page');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    if (slugError) {
      toast.error(slugError);
      return;
    }
    try {
      const updates = {
        slug,
        seo: (seoTitle || seoDesc) ? { title: seoTitle || undefined, description: seoDesc || undefined } : null,
      };
      updatePage(page.id, updates);
      await persistPageState(updates);
      toast.success('Settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(publicUrl).catch(() => {});
    toast.success('Public URL copied');
  };

  const exportPDF = async () => {
    toast.loading('Generating PDF...', { id: 'pdfExport' });
    try {
      const element = document.getElementById('editor-content');
      if (!element) throw new Error('Content not found');
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${page.title || 'Untitled'}.pdf`);
      
      toast.success('PDF downloaded successfully!', { id: 'pdfExport' });
    } catch (e) {
      toast.error('Failed to generate PDF', { id: 'pdfExport' });
    }
    setIsOpen(false);
  };

  const exportMD = () => {
    let md = `# ${page.title || 'Untitled'}\n\n`;
    pageBlocks.forEach(block => {
      switch (block.type) {
        case 'heading1': md += `# ${block.content}\n\n`; break;
        case 'heading2': md += `## ${block.content}\n\n`; break;
        case 'heading3': md += `### ${block.content}\n\n`; break;
        case 'quote': md += `> ${block.content}\n\n`; break;
        case 'code': md += `\`\`\`\n${block.content}\n\`\`\`\n\n`; break;
        case 'bulletList': md += `- ${block.content}\n`; break;
        case 'numberedList': md += `1. ${block.content}\n`; break;
        case 'todo': md += `- [ ] ${block.content}\n`; break;
        default: md += `${block.content}\n\n`; break;
      }
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `${page.title || 'Export'}.md`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Markdown exported');
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={refs.setReference}
        onMouseDown={(e) => {
          if (isOpen) e.stopPropagation();
        }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-ocean-muted hover:text-ocean-text rounded-lg hover:bg-ocean-border-soft transition-colors"
      >
        Share
        <Share className="w-4 h-4" />
      </button>

      <FloatingPortal>
        <AnimatePresence>
          {isOpen && (
             <motion.div
              ref={refs.setFloating}
              style={floatingStyles}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="w-72 bg-ocean-surface border border-ocean-border shadow-xl rounded-xl z-[100] overflow-hidden font-sans origin-top-right"
            >
            <div className="p-3 border-b border-ocean-border">
              <div className="text-xs font-semibold uppercase text-ocean-muted mb-2 tracking-wide">Invite</div>
              <div className="flex gap-2 mb-3">
                <input 
                  type="email" 
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                  placeholder="name@email.com" 
                  className="flex-1 bg-ocean-bg border border-ocean-border outline-none rounded p-1.5 text-sm focus:border-ocean-blue transition-colors text-ocean-text min-w-0"
                />
                <button onClick={handleInvite} className="bg-ocean-blue text-white rounded px-3 py-1.5 text-sm hover:bg-ocean-blue/90 shrink-0">
                  Invite
                </button>
              </div>

              {invites.length > 0 && (
                <div className="space-y-2 mt-3 pt-3 border-t border-ocean-border-soft">
                  <div className="text-xs font-medium text-ocean-muted">People with access</div>
                  {invites.map((invite, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-ocean-blue-dim text-ocean-blue flex items-center justify-center font-medium text-xs">
                          {invite.email.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-ocean-text truncate max-w-[120px]">{invite.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-ocean-muted">
                        <span className="text-xs">{invite.role}</span>
                        <X 
                          className="w-3.5 h-3.5 cursor-pointer hover:text-red-500" 
                          onClick={() => setInvites(invites.filter((_, idx) => idx !== i))}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 border-b border-ocean-border space-y-2">
              <div className="text-xs font-semibold uppercase text-ocean-muted tracking-wide flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" /> Publish to web
              </div>

              <label className="block">
                <span className="text-[11px] text-ocean-muted">Slug</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  placeholder="my-post"
                  className="w-full bg-ocean-bg border border-ocean-border outline-none rounded p-1.5 text-sm focus:border-ocean-blue text-ocean-text"
                />
                {slugError && <span className="text-[11px] text-red-500">{slugError}</span>}
              </label>

              <label className="block">
                <span className="text-[11px] text-ocean-muted">SEO title (optional)</span>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value.slice(0, 200))}
                  placeholder={page.title || 'Page title'}
                  className="w-full bg-ocean-bg border border-ocean-border outline-none rounded p-1.5 text-sm focus:border-ocean-blue text-ocean-text"
                />
              </label>

              <label className="block">
                <span className="text-[11px] text-ocean-muted">SEO description (optional)</span>
                <textarea
                  value={seoDesc}
                  onChange={(e) => setSeoDesc(e.target.value.slice(0, 500))}
                  placeholder="Short summary for search engines and link previews"
                  rows={2}
                  className="w-full bg-ocean-bg border border-ocean-border outline-none rounded p-1.5 text-sm focus:border-ocean-blue text-ocean-text resize-none"
                />
              </label>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handlePublishToggle}
                  disabled={saving || (!page.published && !!slugError)}
                  className="flex-1 flex items-center justify-center gap-2 p-2 text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white bg-ocean-blue hover:bg-ocean-blue/90"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
                  {page.published ? 'Unpublish' : 'Publish'}
                </button>
                {page.published && (
                  <>
                    <button
                      onClick={handleSaveSettings}
                      disabled={!!slugError}
                      className="px-3 text-sm rounded border border-ocean-border text-ocean-text hover:bg-ocean-border-soft transition-colors disabled:opacity-50"
                      title="Save changes"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCopyUrl}
                      className="px-3 text-sm rounded border border-ocean-border text-ocean-text hover:bg-ocean-border-soft transition-colors"
                      title="Copy public URL"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>

              {page.published && (
                <div className="text-[11px] text-ocean-muted truncate flex items-center gap-1">
                  <Check className="w-3 h-3 text-ocean-blue" />
                  <a href={publicUrl} target="_blank" rel="noreferrer" className="underline truncate hover:text-ocean-blue">
                    {publicUrl}
                  </a>
                </div>
              )}
            </div>

            <div className="p-1">
              <div className="px-2 py-1.5 flex gap-2">
                <button 
                  onClick={exportPDF} 
                  className="flex-1 flex items-center justify-center gap-2 p-1.5 text-sm bg-ocean-bg hover:bg-ocean-border-soft text-ocean-text rounded border border-ocean-border transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> PDF
                </button>
                <button 
                  onClick={exportMD}
                  className="flex-1 flex items-center justify-center gap-2 p-1.5 text-sm bg-ocean-bg hover:bg-ocean-border-soft text-ocean-text rounded border border-ocean-border transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> MD
                </button>
              </div>
            </div>
          </motion.div>
          )}
        </AnimatePresence>
      </FloatingPortal>
    </div>
  );
}
