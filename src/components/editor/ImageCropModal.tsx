'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Check, X, Square, RectangleHorizontal, RectangleVertical } from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

type Crop = { x: number; y: number; w: number; h: number }; // percentages 0-100

type AspectLock = { id: string; label: string; ratio: number | null };
const aspectLocks: AspectLock[] = [
  { id: 'free', label: 'Free',  ratio: null },
  { id: '1:1',  label: '1:1',   ratio: 1 },
  { id: '4:3',  label: '4:3',   ratio: 4 / 3 },
  { id: '3:4',  label: '3:4',   ratio: 3 / 4 },
  { id: '16:9', label: '16:9',  ratio: 16 / 9 },
  { id: '9:16', label: '9:16',  ratio: 9 / 16 },
];

type DragHandle = 'move' | 'nw' | 'ne' | 'sw' | 'se' | null;

export function ImageCropModal({
  src,
  onSave,
  onClose,
}: {
  src: string;
  onSave: (croppedDataUrl: string) => void;
  onClose: () => void;
}) {
  const [crop, setCrop] = useState<Crop>({ x: 10, y: 10, w: 80, h: 80 });
  const [aspect, setAspect] = useState<AspectLock>(aspectLocks[0]);
  const [imageReady, setImageReady] = useState(false);
  const [imageAspect, setImageAspect] = useState(1);
  const [saving, setSaving] = useState(false);
  const dragRef = useRef<{ handle: DragHandle; startX: number; startY: number; startCrop: Crop } | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Apply aspect-ratio lock by adjusting current crop to match
  useEffect(() => {
    if (!aspect.ratio || !imageReady) return;
    // crop.w% of imageW divided by crop.h% of imageH should equal aspect.ratio
    // i.e., (w/h) * imageAspect = aspect.ratio  =>  w/h = aspect.ratio / imageAspect
    const target = aspect.ratio / imageAspect;
    setCrop(c => {
      let w = c.w;
      let h = c.h;
      if (w / h > target) {
        w = h * target;
      } else {
        h = w / target;
      }
      const x = Math.min(c.x, 100 - w);
      const y = Math.min(c.y, 100 - h);
      return { x, y, w, h };
    });
  }, [aspect, imageReady, imageAspect]);

  const handleImageLoad = () => {
    if (!imageRef.current) return;
    setImageAspect(imageRef.current.naturalWidth / imageRef.current.naturalHeight);
    setImageReady(true);
  };

  const beginDrag = (handle: Exclude<DragHandle, null>) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { handle, startX: e.clientX, startY: e.clientY, startCrop: crop };
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dx = ((e.clientX - d.startX) / rect.width) * 100;
      const dy = ((e.clientY - d.startY) / rect.height) * 100;
      const lock = aspect.ratio;

      let next = { ...d.startCrop };

      const clampSize = () => {
        if (next.w < 5) next.w = 5;
        if (next.h < 5) next.h = 5;
        if (next.x < 0) next.x = 0;
        if (next.y < 0) next.y = 0;
        if (next.x + next.w > 100) next.w = 100 - next.x;
        if (next.y + next.h > 100) next.h = 100 - next.y;
      };

      if (d.handle === 'move') {
        next.x = Math.max(0, Math.min(100 - next.w, d.startCrop.x + dx));
        next.y = Math.max(0, Math.min(100 - next.h, d.startCrop.y + dy));
      } else {
        // Resize from a corner. Compute the OPPOSITE corner as the anchor.
        const anchor = {
          nw: { x: d.startCrop.x + d.startCrop.w, y: d.startCrop.y + d.startCrop.h },
          ne: { x: d.startCrop.x,                  y: d.startCrop.y + d.startCrop.h },
          sw: { x: d.startCrop.x + d.startCrop.w, y: d.startCrop.y                   },
          se: { x: d.startCrop.x,                  y: d.startCrop.y                   },
        }[d.handle];

        const cornerStart = {
          nw: { x: d.startCrop.x,                  y: d.startCrop.y                   },
          ne: { x: d.startCrop.x + d.startCrop.w, y: d.startCrop.y                   },
          sw: { x: d.startCrop.x,                  y: d.startCrop.y + d.startCrop.h },
          se: { x: d.startCrop.x + d.startCrop.w, y: d.startCrop.y + d.startCrop.h },
        }[d.handle];

        let newCorner = { x: cornerStart.x + dx, y: cornerStart.y + dy };

        if (lock) {
          // Lock aspect: adjust newCorner so |dx|/|dy| matches the lock ratio (in screen units)
          const target = lock / imageAspect;
          let w = Math.abs(newCorner.x - anchor.x);
          let h = Math.abs(newCorner.y - anchor.y);
          if (w / h > target) {
            w = h * target;
          } else {
            h = w / target;
          }
          newCorner.x = anchor.x + Math.sign(newCorner.x - anchor.x) * w;
          newCorner.y = anchor.y + Math.sign(newCorner.y - anchor.y) * h;
        }

        next.x = Math.min(anchor.x, newCorner.x);
        next.y = Math.min(anchor.y, newCorner.y);
        next.w = Math.abs(newCorner.x - anchor.x);
        next.h = Math.abs(newCorner.y - anchor.y);
      }

      clampSize();
      setCrop(next);
    };

    const handleUp = () => {
      dragRef.current = null;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [aspect, imageAspect]);

  const handleSave = async () => {
    if (!imageRef.current || saving) return;
    setSaving(true);
    try {
      // Re-load via crossOrigin so the canvas isn't tainted (works if storage has CORS configured)
      const corsImg = new Image();
      corsImg.crossOrigin = 'anonymous';
      const loaded = new Promise<HTMLImageElement>((resolve, reject) => {
        corsImg.onload = () => resolve(corsImg);
        corsImg.onerror = reject;
      });
      corsImg.src = src;
      let drawableImage: HTMLImageElement;
      try {
        drawableImage = await loaded;
      } catch {
        drawableImage = imageRef.current;
      }

      const natW = drawableImage.naturalWidth;
      const natH = drawableImage.naturalHeight;
      const sx = Math.round((crop.x / 100) * natW);
      const sy = Math.round((crop.y / 100) * natH);
      const sw = Math.round((crop.w / 100) * natW);
      const sh = Math.round((crop.h / 100) * natH);

      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No canvas context');
      ctx.drawImage(drawableImage, sx, sy, sw, sh, 0, 0, sw, sh);
      const dataUrl = canvas.toDataURL('image/png');
      onSave(dataUrl);
    } catch (e) {
      console.error(e);
      toast.error('Could not crop image. Storage CORS may not be configured.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 font-sans">
      <div className="bg-ocean-surface border border-ocean-border rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col">

        <div className="px-6 py-4 border-b border-ocean-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ocean-text">Crop image</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-ocean-border-soft text-ocean-muted hover:text-ocean-text transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aspect controls */}
        <div className="px-6 py-3 border-b border-ocean-border flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider text-ocean-muted mr-2">Aspect</span>
          {aspectLocks.map(lock => {
            const Icon = lock.id === '1:1'
              ? Square
              : lock.id === '16:9' || lock.id === '4:3'
                ? RectangleHorizontal
                : lock.id === '9:16' || lock.id === '3:4'
                  ? RectangleVertical
                  : null;
            return (
              <button
                key={lock.id}
                onClick={() => setAspect(lock)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors",
                  aspect.id === lock.id
                    ? "bg-ocean-blue text-white"
                    : "bg-ocean-bg text-ocean-muted hover:text-ocean-text hover:bg-ocean-border-soft"
                )}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {lock.label}
              </button>
            );
          })}
        </div>

        {/* Image area */}
        <div className="flex-1 p-6 overflow-auto flex items-center justify-center bg-ocean-bg/40">
          <div
            ref={containerRef}
            className="relative inline-block max-w-full select-none"
            style={{ maxHeight: '60vh' }}
          >
            <img
              ref={imageRef}
              src={src}
              alt=""
              onLoad={handleImageLoad}
              className="block max-w-full"
              style={{ maxHeight: '60vh' }}
              draggable={false}
            />

            {imageReady && (
              <>
                {/* "Spotlight" overlay: dim everything except the crop region */}
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: `${crop.x}%`,
                    top: `${crop.y}%`,
                    width: `${crop.w}%`,
                    height: `${crop.h}%`,
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                  }}
                />

                {/* Crop rectangle (draggable) */}
                <div
                  className="absolute border-2 border-white cursor-move shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
                  style={{
                    left: `${crop.x}%`,
                    top: `${crop.y}%`,
                    width: `${crop.w}%`,
                    height: `${crop.h}%`,
                  }}
                  onMouseDown={beginDrag('move')}
                >
                  {/* Grid lines (rule of thirds) */}
                  <div className="absolute inset-0 pointer-events-none opacity-50">
                    <div className="absolute top-1/3 left-0 right-0 h-px bg-white/60" />
                    <div className="absolute top-2/3 left-0 right-0 h-px bg-white/60" />
                    <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/60" />
                    <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/60" />
                  </div>

                  {/* Corner handles */}
                  <div
                    className="absolute w-3 h-3 bg-white border-2 border-ocean-blue rounded-sm -top-1.5 -left-1.5 cursor-nwse-resize"
                    onMouseDown={beginDrag('nw')}
                  />
                  <div
                    className="absolute w-3 h-3 bg-white border-2 border-ocean-blue rounded-sm -top-1.5 -right-1.5 cursor-nesw-resize"
                    onMouseDown={beginDrag('ne')}
                  />
                  <div
                    className="absolute w-3 h-3 bg-white border-2 border-ocean-blue rounded-sm -bottom-1.5 -left-1.5 cursor-nesw-resize"
                    onMouseDown={beginDrag('sw')}
                  />
                  <div
                    className="absolute w-3 h-3 bg-white border-2 border-ocean-blue rounded-sm -bottom-1.5 -right-1.5 cursor-nwse-resize"
                    onMouseDown={beginDrag('se')}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-ocean-border flex items-center justify-between gap-4">
          <p className="text-xs text-ocean-muted">
            Drag the rectangle to move; drag a corner to resize.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg text-ocean-text hover:bg-ocean-border-soft transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !imageReady}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-ocean-blue text-white hover:bg-ocean-blue/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" /> Apply crop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
