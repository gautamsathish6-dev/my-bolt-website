import { useState, useRef, useCallback, useEffect } from 'react';
import { X, ImagePlus, BoxSelect, FileText } from 'lucide-react';
import { Card, CardType, MaskRect } from '../types';
import { resizeImage } from '../imageUtils';
import { MaskEditor } from './MaskEditor';

interface CardEditModalProps {
  card: Card;
  onSave: (card: Card) => void;
  onClose: () => void;
}

type ImageSlot = 'front' | 'back';

const CARD_TYPES: { value: CardType; label: string; icon: typeof FileText }[] = [
  { value: 'basic', label: 'Basic', icon: FileText },
  { value: 'occlusion', label: 'Occlusion', icon: BoxSelect },
];

const MASK_COLORS = [
  'rgb(37, 99, 235)',
  'rgb(245, 158, 11)',
  'rgb(239, 68, 68)',
  'rgb(99, 102, 241)',
];

export function CardEditModal({ card, onSave, onClose }: CardEditModalProps) {
  const [cardType, setCardType] = useState<CardType>(card.cardType === 'cloze' ? 'basic' : (card.cardType ?? 'basic'));
  const [frontText, setFrontText] = useState(card.frontText);
  const [backText, setBackText] = useState(card.backText);
  const [frontImage, setFrontImage] = useState<string | null>(card.frontImage);
  const [backImage, setBackImage] = useState<string | null>(card.backImage);
  const [masks, setMasks] = useState<MaskRect[]>(card.masks ?? []);
  const [activeSlot, setActiveSlot] = useState<ImageSlot>('front');
  const [showMaskEditor, setShowMaskEditor] = useState(false);
  const frontFileRef = useRef<HTMLInputElement>(null);
  const backFileRef = useRef<HTMLInputElement>(null);

  const setImageForSlot = useCallback((slot: ImageSlot, data: string | null) => {
    if (slot === 'front') setFrontImage(data);
    else setBackImage(data);
  }, []);

  const handleImageFile = useCallback(async (file: File, slot: ImageSlot) => {
    if (!file.type.startsWith('image/')) return;
    try {
      const resized = await resizeImage(file);
      setImageForSlot(slot, resized);
    } catch (e) {
      console.error('Image resize failed', e);
    }
  }, [setImageForSlot]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      for (const item of e.clipboardData.items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            handleImageFile(file, activeSlot);
            e.preventDefault();
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [activeSlot, handleImageFile]);

  const handleSave = () => {
    onSave({
      ...card,
      cardType,
      frontText: frontText.trim(),
      backText: backText.trim(),
      frontImage,
      backImage,
      masks,
    });
  };

  const renderImageSlot = (slot: ImageSlot) => {
    const image = slot === 'front' ? frontImage : backImage;
    const fileRef = slot === 'front' ? frontFileRef : backFileRef;
    const label = slot === 'front' ? 'Front Image' : 'Back Image';

    return (
      <div>
        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">{label}</label>
        {image ? (
          <div className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <img src={image} alt={`${slot} preview`} className="w-full max-h-40 object-contain" />
            <button
              onClick={() => setImageForSlot(slot, null)}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            {slot === 'front' && cardType === 'occlusion' && (
              <div className="absolute top-2 left-2">
                <button
                  onClick={() => setShowMaskEditor(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600/90 hover:bg-blue-700 text-white text-xs font-medium transition-colors backdrop-blur-sm"
                >
                  <BoxSelect className="w-3.5 h-3.5" />
                  {masks.length > 0 ? `Edit Masks (${masks.length})` : 'Mask Image'}
                </button>
              </div>
            )}
            {slot === 'front' && cardType === 'occlusion' && masks.length > 0 && (
              <div className="absolute inset-0 pointer-events-none">
                {masks.map((mask, i) => (
                  <div
                    key={i}
                    className="absolute"
                    style={{
                      left: `${mask.x * 100}%`,
                      top: `${mask.y * 100}%`,
                      width: `${mask.w * 100}%`,
                      height: `${mask.h * 100}%`,
                      backgroundColor: MASK_COLORS[i % MASK_COLORS.length],
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div
            onClick={() => {
              setActiveSlot(slot);
              fileRef.current?.click();
            }}
            onMouseEnter={() => setActiveSlot(slot)}
            className={`rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-all ${
              activeSlot === slot
                ? 'border-blue-300 bg-blue-50/30 dark:bg-slate-700/50 dark:border-blue-600'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <ImagePlus className="w-5 h-5 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
            <p className="text-xs text-slate-400 dark:text-slate-500">Click or paste</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageFile(file, slot);
              }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      {showMaskEditor && frontImage && (
        <MaskEditor
          image={frontImage}
          masks={masks}
          onSave={(newMasks) => {
            setMasks(newMasks);
            setShowMaskEditor(false);
          }}
          onCancel={() => setShowMaskEditor(false)}
        />
      )}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 rounded-t-2xl z-10">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Edit Card</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Card Type Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Card Type</label>
            <div className="grid grid-cols-2 gap-2">
              {CARD_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => setCardType(type.value)}
                    className={`flex items-center gap-1.5 justify-center px-2 py-2 rounded-lg border-2 transition-all text-xs font-medium ${
                      cardType === type.value
                        ? 'border-blue-400 bg-blue-50 text-blue-700 dark:bg-slate-700 dark:text-blue-400 dark:border-blue-600'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div onFocus={() => setActiveSlot('front')}>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Front</label>
            <textarea
              value={frontText}
              onChange={(e) => setFrontText(e.target.value)}
              placeholder="Question or prompt..."
              rows={3}
              className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition-all resize-none"
            />
          </div>

          {renderImageSlot('front')}

          <div onFocus={() => setActiveSlot('back')}>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Back</label>
            <textarea
              value={backText}
              onChange={(e) => setBackText(e.target.value)}
              rows={3}
              className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition-all resize-none"
            />
          </div>

          {renderImageSlot('back')}
        </div>

        <div className="flex gap-2 justify-end px-6 py-4 border-t border-slate-200 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-800 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
