import React, { useState, useRef, useEffect } from 'react';
import { Share, Globe, Download, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Page, Block } from '../../lib/store';
import { useEditorStore } from '../../lib/store';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export function PageShareMenu({ page, pageBlocks }: { page: Page; pageBlocks: Block[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invites, setInvites] = useState<{ email: string; role: string }[]>([]);
  const { updatePage } = useEditorStore();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleInvite = () => {
    if (inviteEmail && inviteEmail.includes('@')) {
      setInvites([...invites, { email: inviteEmail, role: 'Editor' }]);
      toast.success(`Invite sent to ${inviteEmail}`);
      setInviteEmail('');
    } else {
      toast.error('Please enter a valid email address');
    }
  };

  const handlePublish = () => {
    const newPublishedState = !page.published;
    updatePage(page.id, { published: newPublishedState });
    
    if (newPublishedState) {
      const url = `${window.location.origin}/app/${page.id}`;
      navigator.clipboard.writeText(url).catch(() => {});
      toast.success('Page published!', {
        description: 'Public link copied to clipboard.',
      });
    } else {
      toast.info('Page unpublished', {
        description: 'This page is no longer public.',
      });
    }
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
        onMouseDown={(e) => {
          if (isOpen) e.stopPropagation();
        }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-ocean-muted hover:text-ocean-text rounded-lg hover:bg-ocean-border-soft transition-colors"
      >
        Share
        <Share className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {isOpen && (
           <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="absolute right-0 top-full mt-2 w-72 bg-ocean-surface border border-ocean-border shadow-xl rounded-xl z-[100] overflow-hidden font-sans origin-top-right"
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

            <div className="p-1">
              <button 
                onClick={handlePublish}
                className="w-full flex items-center justify-between p-2 text-sm text-ocean-text hover:bg-ocean-border-soft rounded transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-ocean-blue" />
                  <span>{page.published ? 'Published to web' : 'Publish to web'}</span>
                </div>
                {page.published && <Check className="w-4 h-4 text-ocean-blue" />}
              </button>
              
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
    </div>
  );
}
