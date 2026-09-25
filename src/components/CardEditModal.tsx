import { useState, useRef, useCallback, useEffect } from 'react';
import { X, ImagePlus, BoxSelect, FileText, Layers3 } from 'lucide-react';
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
  { value: 'cloze', label: 'Cloze', icon: Layers3 },
  { value: 'occlusion', label: 'Occlusion', icon: BoxSelect },
];

export function CardEditModal({ card, onSave, onClose }: CardEditModalProps) {
  const [cardType, setCardType] = useState<CardType>(card.cardType ?? 'basic');
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
        <label className="block text-sm font-medium text-slate-600 mb-1.5">{label}</label>
        {image ? (
          <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-white">
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
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-500/90 hover:bg-teal-600 text-white text-xs font-medium transition-colors backdrop-blur-sm"
                >
                  <BoxSelect className="w-3.5 h-3.5" />
                  {masks.length > 0 ? `Edit Masks (${masks.length})` : 'Mask Image'}
                </button>
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
                ? 'border-teal-300 bg-teal-50/30'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <ImagePlus className="w-5 h-5 text-slate-300 mx-auto mb-1" />
            <p className="text-xs text-slate-400">Click or paste</p>
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl z-10">
          <h3 className="font-semibold text-slate-800">Edit Card</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Card Type Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Card Type</label>
            <div className="grid grid-cols-3 gap-2">
              {CARD_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => setCardType(type.value)}
                    className={`flex items-center gap-1.5 justify-center px-2 py-2 rounded-lg border-2 transition-all text-xs font-medium ${
                      cardType === type.value
                        ? 'border-teal-400 bg-teal-50 text-teal-700'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
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
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              {cardType === 'cloze' ? 'Text with Cloze Deletions' : 'Front'}
            </label>
            <textarea
              value={frontText}
              onChange={(e) => setFrontText(e.target.value)}
              placeholder={
                cardType === 'cloze'
                  ? 'The capital of France is {{c1::Paris}}...'
                  : 'Question or prompt...'
              }
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all resize-none"
            />
          </div>

          {renderImageSlot('front')}

          <div onFocus={() => setActiveSlot('back')}>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              {cardType === 'cloze' ? 'Extra Notes' : 'Back'}
            </label>
            <textarea
              value={backText}
              onChange={(e) => setBackText(e.target.value)}
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all resize-none"
            />
          </div>

          {renderImageSlot('back')}
        </div>

        <div className="flex gap-2 justify-end px-6 py-4 border-t border-slate-200 sticky bottom-0 bg-white rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-slate-500 hover:bg-slate-100 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-lg bg-teal-500 text-white hover:bg-teal-600 text-sm font-medium transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
