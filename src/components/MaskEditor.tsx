import { useRef, useState, useCallback, useEffect } from 'react';
import { X, Square, Trash2, Check } from 'lucide-react';
import { MaskRect } from '../types';

interface MaskEditorProps {
  image: string;
  masks: MaskRect[];
  onSave: (masks: MaskRect[]) => void;
  onCancel: () => void;
}

export function MaskEditor({ image, masks: initialMasks, onSave, onCancel }: MaskEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [masks, setMasks] = useState<MaskRect[]>(initialMasks);
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<MaskRect | null>(null);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });

  const getRelativePos = useCallback((e: React.MouseEvent | MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    return {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const pos = getRelativePos(e);
    setStartPos(pos);
    setDrawing(true);
  };

  useEffect(() => {
    if (!drawing) return;
    const handleMove = (e: MouseEvent) => {
      if (!startPos) return;
      const pos = getRelativePos(e);
      const rect: MaskRect = {
        x: Math.min(startPos.x, pos.x),
        y: Math.min(startPos.y, pos.y),
        w: Math.abs(pos.x - startPos.x),
        h: Math.abs(pos.y - startPos.y),
      };
      setCurrentRect(rect);
    };
    const handleUp = () => {
      if (currentRect && currentRect.w > 0.02 && currentRect.h > 0.02) {
        setMasks((prev) => [...prev, currentRect]);
      }
      setCurrentRect(null);
      setStartPos(null);
      setDrawing(false);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [drawing, startPos, currentRect, getRelativePos]);

  const removeMask = (index: number) => {
    setMasks((prev) => prev.filter((_, i) => i !== index));
  };

  const maskColors = [
    'rgb(37, 99, 235)',
    'rgb(245, 158, 11)',
    'rgb(239, 68, 68)',
    'rgb(99, 102, 241)',
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            <Square className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Mask Image</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            Click and drag on the image to draw colored boxes over the areas you want to hide during review.
          </p>

          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            className="relative inline-block w-full rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 cursor-crosshair select-none"
          >
            <img
              ref={imgRef}
              src={image}
              alt="Mask target"
              className="w-full h-auto block"
              draggable={false}
              onLoad={(e) => {
                const img = e.currentTarget;
                setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
              }}
            />
            {masks.map((mask, i) => (
              <div
                key={i}
                className="absolute group"
                style={{
                  left: `${mask.x * 100}%`,
                  top: `${mask.y * 100}%`,
                  width: `${mask.w * 100}%`,
                  height: `${mask.h * 100}%`,
                  backgroundColor: maskColors[i % maskColors.length],
                }}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); removeMask(i); }}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white dark:bg-slate-700 shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 dark:hover:bg-red-900/30"
                >
                  <X className="w-3 h-3 text-red-500" />
                </button>
              </div>
            ))}
            {currentRect && (
              <div
                className="absolute border-2 border-blue-400 bg-blue-400/50"
                style={{
                  left: `${currentRect.x * 100}%`,
                  top: `${currentRect.y * 100}%`,
                  width: `${currentRect.w * 100}%`,
                  height: `${currentRect.h * 100}%`,
                }}
              />
            )}
          </div>

          {masks.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-slate-400 dark:text-slate-500">{masks.length} mask{masks.length !== 1 ? 's' : ''}</span>
              <button
                onClick={() => setMasks([])}
                className="flex items-center gap-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 px-2 py-1 rounded-lg"
              >
                <Trash2 className="w-3 h-3" /> Clear all
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end px-6 py-4 border-t border-slate-200 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-800 rounded-b-2xl">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(masks)}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium transition-colors"
          >
            <Check className="w-4 h-4" />
            Save Masks ({masks.length})
          </button>
        </div>
      </div>
    </div>
  );
}
