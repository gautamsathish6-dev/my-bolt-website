import { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowLeft, ImagePlus, X, Save, Eye, Bold, Italic, Code, Tag, BoxSelect, FileText } from 'lucide-react';
import { resizeImage } from '../imageUtils';
import { MathRenderer } from './MathRenderer';
import { MaskEditor } from './MaskEditor';
import { CardType, MaskRect } from '../types';

interface CardBuilderProps {
  deckName: string;
  onAddCard: (frontText: string, backText: string, frontImage: string | null, backImage: string | null, tags: string[], cardType: CardType, masks: MaskRect[]) => void;
  onBack: () => void;
}

type ImageSlot = 'front' | 'back';

const DRAFT_KEY = 'omnideck-card-draft';

interface DraftState {
  frontText: string;
  backText: string;
  frontImage: string | null;
  backImage: string | null;
  tags: string;
  cardType: CardType;
  masks: MaskRect[];
}

function loadDraft(): DraftState | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as DraftState;
    if (draft.cardType === 'cloze') draft.cardType = 'basic';
    return draft;
  } catch {
    return null;
  }
}

function saveDraft(draft: DraftState) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // ignore quota errors
  }
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

const CARD_TYPES: { value: CardType; label: string; icon: typeof FileText; desc: string }[] = [
  { value: 'basic', label: 'Basic', icon: FileText, desc: 'Standard front/back flashcard' },
  { value: 'occlusion', label: 'Image Occlusion', icon: BoxSelect, desc: 'Hide parts of an image with masks' },
];

const MASK_COLORS = [
  'rgb(37, 99, 235)',
  'rgb(245, 158, 11)',
  'rgb(239, 68, 68)',
  'rgb(99, 102, 241)',
];

export function CardBuilder({ deckName, onAddCard, onBack }: CardBuilderProps) {
  const draft = loadDraft();
  const [cardType, setCardType] = useState<CardType>(draft?.cardType ?? 'basic');
  const [frontText, setFrontText] = useState(draft?.frontText ?? '');
  const [backText, setBackText] = useState(draft?.backText ?? '');
  const [frontImage, setFrontImage] = useState<string | null>(draft?.frontImage ?? null);
  const [backImage, setBackImage] = useState<string | null>(draft?.backImage ?? null);
  const [tagsInput, setTagsInput] = useState(draft?.tags ?? '');
  const [masks, setMasks] = useState<MaskRect[]>(draft?.masks ?? []);
  const [dragOverSlot, setDragOverSlot] = useState<ImageSlot | null>(null);
  const [activeSlot, setActiveSlot] = useState<ImageSlot>('front');
  const [activeField, setActiveField] = useState<'front' | 'back'>('front');
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [showMaskEditor, setShowMaskEditor] = useState(false);
  const frontFileRef = useRef<HTMLInputElement>(null);
  const backFileRef = useRef<HTMLInputElement>(null);
  const frontTextRef = useRef<HTMLTextAreaElement>(null);
  const backTextRef = useRef<HTMLTextAreaElement>(null);

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

  const handleDrop = useCallback((e: React.DragEvent, slot: ImageSlot) => {
    e.preventDefault();
    setDragOverSlot(null);
    const file = e.dataTransfer.files[0];
    if (file) handleImageFile(file, slot);
  }, [handleImageFile]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = e.clipboardData.items;
      for (const item of items) {
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

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (frontText || backText || frontImage || backImage || tagsInput || masks.length > 0) {
        saveDraft({ frontText, backText, frontImage, backImage, tags: tagsInput, cardType, masks });
        setSavedIndicator(true);
        setTimeout(() => setSavedIndicator(false), 1500);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [frontText, backText, frontImage, backImage, tagsInput, cardType, masks]);

  useEffect(() => {
    const handler = () => {
      if (frontText || backText || frontImage || backImage || tagsInput || masks.length > 0) {
        saveDraft({ frontText, backText, frontImage, backImage, tags: tagsInput, cardType, masks });
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [frontText, backText, frontImage, backImage, tagsInput, cardType, masks]);

  const insertFormatting = (field: 'front' | 'back', wrapper: string) => {
    const ref = field === 'front' ? frontTextRef.current : backTextRef.current;
    const setter = field === 'front' ? setFrontText : setBackText;
    const value = field === 'front' ? frontText : backText;
    if (!ref) return;
    const start = ref.selectionStart;
    const end = ref.selectionEnd;
    const selected = value.substring(start, end);
    const newText = value.substring(0, start) + wrapper + selected + wrapper + value.substring(end);
    setter(newText);
    requestAnimationFrame(() => {
      ref.focus();
      ref.setSelectionRange(start + wrapper.length, end + wrapper.length);
    });
  };

  const handleSave = () => {
    if (!frontText.trim() && !backText.trim() && !frontImage && !backImage) return;
    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
    onAddCard(frontText.trim(), backText.trim(), frontImage, backImage, tags, cardType, masks);
    setFrontText('');
    setBackText('');
    setFrontImage(null);
    setBackImage(null);
    setTagsInput('');
    setMasks([]);
    clearDraft();
  };

  const canSave = frontText.trim() || backText.trim() || frontImage || backImage;

  const renderImageSlot = (slot: ImageSlot) => {
    const image = slot === 'front' ? frontImage : backImage;
    const fileRef = slot === 'front' ? frontFileRef : backFileRef;
    const label = slot === 'front' ? 'Front Image' : 'Back Image';

    return (
      <div>
        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">{label} (optional)</label>
        {image ? (
          <div className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <img src={image} alt={`${slot} preview`} className="w-full max-h-48 object-contain" />
            <button
              onClick={() => setImageForSlot(slot, null)}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            {slot === 'front' && cardType === 'occlusion' && (
              <div className="absolute top-2 left-2 flex gap-1.5">
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
            onDrop={(e) => handleDrop(e, slot)}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverSlot(slot);
            }}
            onDragLeave={() => setDragOverSlot(null)}
            onClick={() => {
              setActiveSlot(slot);
              fileRef.current?.click();
            }}
            onMouseEnter={() => setActiveSlot(slot)}
            className={`rounded-xl border-2 border-dashed p-5 text-center cursor-pointer transition-all ${
              dragOverSlot === slot
                ? 'border-blue-400 bg-blue-50 dark:bg-slate-700'
                : activeSlot === slot
                ? 'border-blue-300 bg-blue-50/30 dark:bg-slate-700/50 dark:border-blue-600'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <ImagePlus className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Drag & drop, click, or paste
            </p>
            {activeSlot === slot && (
              <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-1 font-medium">Paste target active</p>
            )}
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

  const renderRichControls = (field: 'front' | 'back') => (
    <div className="flex items-center gap-1 mb-1">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => insertFormatting(field, '**')}
        className="p-1 rounded text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
        title="Bold (Ctrl+B)"
      >
        <Bold className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => insertFormatting(field, '*')}
        className="p-1 rounded text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
        title="Italic (Ctrl+I)"
      >
        <Italic className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => insertFormatting(field, '`')}
        className="p-1 rounded text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
        title="Inline code"
      >
        <Code className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  const renderPreview = () => {
    if (cardType === 'occlusion') {
      return (
        <>
          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">Front (masked)</p>
            {frontImage ? (
              <div className="relative inline-block">
                <img src={frontImage} alt="Front preview" className="w-full max-h-40 object-contain rounded-lg" />
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
            ) : (
              <p className="text-slate-300 dark:text-slate-600 italic">Upload an image and add masks...</p>
            )}
          </div>
          <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">Front (revealed)</p>
            {frontImage ? (
              <img src={frontImage} alt="Front revealed" className="w-full max-h-40 object-contain rounded-lg" />
            ) : (
              <p className="text-slate-300 dark:text-slate-600 italic">Revealed view shows the unmasked image...</p>
            )}
          </div>
          {(backText || backImage) && (
            <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">Back (extra info)</p>
              <MathRenderer
                text={backText || 'Additional context...'}
                className={`text-base ${backText ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-slate-600 italic'}`}
              />
              {backImage && (
                <img src={backImage} alt="Back preview" className="mt-3 w-full max-h-40 object-contain rounded-lg" />
              )}
            </div>
          )}
        </>
      );
    }

    // Basic
    return (
      <>
        <div>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">Front</p>
          <MathRenderer
            text={frontText || 'Question or prompt...'}
            className={`text-base ${frontText ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-slate-600 italic'}`}
          />
          {frontImage && (
            <img src={frontImage} alt="Front preview" className="mt-3 w-full max-h-40 object-contain rounded-lg" />
          )}
        </div>
        <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">Back</p>
          <MathRenderer
            text={backText || 'Answer or explanation...'}
            className={`text-base ${backText ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-slate-600 italic'}`}
          />
          {backImage && (
            <img src={backImage} alt="Back preview" className="mt-3 w-full max-h-40 object-contain rounded-lg" />
          )}
        </div>
      </>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
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

      <div className="max-w-5xl mx-auto px-8 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 dark:text-slate-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Add Cards</h2>
            <p className="text-sm text-slate-400 dark:text-slate-500">to {deckName}</p>
          </div>
          {savedIndicator && (
            <span className="text-xs text-blue-500 dark:text-blue-400 font-medium animate-[fadeIn_0.3s_ease] flex items-center gap-1">
              <Save className="w-3 h-3" /> Draft saved
            </span>
          )}
        </div>

        {/* Card Type Selector */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Card Type</label>
          <div className="grid grid-cols-2 gap-2">
            {CARD_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  onClick={() => setCardType(type.value)}
                  className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 transition-all ${
                    cardType === type.value
                      ? 'border-blue-400 bg-blue-50 text-blue-700 dark:bg-slate-700 dark:text-blue-400 dark:border-blue-600'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{type.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
            {CARD_TYPES.find((t) => t.value === cardType)?.desc}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Form */}
          <div className="space-y-4">
            {cardType === 'occlusion' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Upload Occlusion Image</label>
                  {frontImage ? (
                    <div className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                      <img src={frontImage} alt="Occlusion target" className="w-full max-h-64 object-contain" />
                      <button
                        onClick={() => setFrontImage(null)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute top-2 left-2">
                        <button
                          onClick={() => setShowMaskEditor(true)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600/90 hover:bg-blue-700 text-white text-xs font-medium transition-colors backdrop-blur-sm"
                        >
                          <BoxSelect className="w-3.5 h-3.5" />
                          {masks.length > 0 ? `Edit Masks (${masks.length})` : 'Mask Image'}
                        </button>
                      </div>
                      {masks.length > 0 && (
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
                      onDrop={(e) => handleDrop(e, 'front')}
                      onDragOver={(e) => { e.preventDefault(); setDragOverSlot('front'); }}
                      onDragLeave={() => setDragOverSlot(null)}
                      onClick={() => { setActiveSlot('front'); frontFileRef.current?.click(); }}
                      className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
                        dragOverSlot === 'front'
                          ? 'border-blue-400 bg-blue-50 dark:bg-slate-700'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <ImagePlus className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-400 dark:text-slate-500">Drag & drop, click, or paste an image</p>
                      <input
                        ref={frontFileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageFile(file, 'front');
                        }}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Label / Hint (optional)</label>
                  <textarea
                    ref={frontTextRef}
                    value={frontText}
                    onChange={(e) => setFrontText(e.target.value)}
                    placeholder="Optional text shown above the image..."
                    rows={2}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition-all resize-none"
                  />
                </div>
              </>
            ) : (
              <>
                <div onFocus={() => setActiveField('front')}>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Front</label>
                  {renderRichControls('front')}
                  <textarea
                    ref={frontTextRef}
                    value={frontText}
                    onChange={(e) => setFrontText(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                        e.preventDefault();
                        insertFormatting('front', '**');
                      } else if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
                        e.preventDefault();
                        insertFormatting('front', '*');
                      }
                    }}
                    placeholder="Question or prompt... Use $E=mc^2$ for math, **bold**, *italic*"
                    rows={3}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition-all resize-none"
                  />
                </div>

                {renderImageSlot('front')}

                <div onFocus={() => setActiveField('back')}>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Back</label>
                  {renderRichControls('back')}
                  <textarea
                    ref={backTextRef}
                    value={backText}
                    onChange={(e) => setBackText(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                        e.preventDefault();
                        insertFormatting('back', '**');
                      } else if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
                        e.preventDefault();
                        insertFormatting('back', '*');
                      }
                    }}
                    placeholder="Answer or explanation... Use $ for block math, `code` for inline"
                    rows={3}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition-all resize-none"
                  />
                </div>

                {renderImageSlot('back')}
              </>
            )}

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Tags (optional)</label>
              <div className="relative">
                <Tag className="w-4 h-4 text-slate-300 dark:text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="biology, chapter1, hard..."
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 transition-all"
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={!canSave}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Card & Add Another
            </button>
          </div>

          {/* Live Preview */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              <Eye className="w-4 h-4" />
              Live Preview
              <span className="text-xs text-slate-300 dark:text-slate-600 font-normal ml-1">
                ({CARD_TYPES.find((t) => t.value === cardType)?.label})
              </span>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 min-h-[300px] shadow-sm">
              <div className="space-y-4">
                {renderPreview()}
                {tagsInput.trim() && (
                  <div className="border-t border-slate-100 dark:border-slate-700 pt-3 flex flex-wrap gap-1.5">
                    {tagsInput.split(',').map((t) => t.trim()).filter(Boolean).map((tag, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center">
              Drafts auto-save as you type
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
