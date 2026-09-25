import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, CheckCircle, Keyboard, Eye } from 'lucide-react';
import { Card, Rating } from '../types';
import { scheduleCard } from '../fsrs';
import { MathRenderer } from './MathRenderer';

interface ReviewSessionProps {
  cards: Card[];
  deckName: string;
  maxInterval: number;
  isFinalReview: boolean;
  onRate: (card: Card, rating: Rating) => void;
  onBack: () => void;
}

function renderCloze(text: string, reveal: boolean): string {
  if (!text) return '';
  const clozeRegex = /\{\{c(\d+)::(.*?)(?:::(.*?))?\}\}/g;
  return text.replace(clozeRegex, (_, num, hidden, hint) => {
    if (reveal) return `<span class="px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 font-medium">${hidden}</span>`;
    if (hint) return `<span class="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-mono text-sm">[${hint}]</span>`;
    return `<span class="inline-block px-2 py-0.5 rounded bg-slate-200 text-slate-500 font-mono text-sm">[...]</span>`;
  });
}

const MASK_COLORS = [
  'rgb(20, 184, 166)',
  'rgb(245, 158, 11)',
  'rgb(239, 68, 68)',
  'rgb(99, 102, 241)',
];

export function ReviewSession({
  cards: initialCards,
  deckName,
  maxInterval,
  isFinalReview,
  onRate,
  onBack,
}: ReviewSessionProps) {
  const [queue] = useState<Card[]>(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [animState, setAnimState] = useState<'idle' | 'exit' | 'enter'>('idle');
  const [showHotkeys, setShowHotkeys] = useState(false);
  // Occlusion sequential reveal state
  const [revealedMasks, setRevealedMasks] = useState<Set<number>>(new Set());
  const [allMasksRevealed, setAllMasksRevealed] = useState(false);

  const currentCard = queue[currentIndex];

  const resetOcclusionState = useCallback(() => {
    setRevealedMasks(new Set());
    setAllMasksRevealed(false);
  }, []);

  const handleRate = useCallback((rating: Rating) => {
    if (!currentCard) return;
    // For occlusion cards, require all masks revealed before rating
    if (currentCard.cardType === 'occlusion' && !allMasksRevealed) return;
    if (!flipped && currentCard.cardType !== 'occlusion') return;
    const now = Date.now();
    const updated = isFinalReview
      ? currentCard
      : scheduleCard(currentCard, rating, now, maxInterval);
    onRate(updated, rating);
    setReviewedCount((c) => c + 1);
    setAnimState('exit');

    setTimeout(() => {
      if (currentIndex + 1 >= queue.length) {
        setCompleted(true);
      } else {
        setCurrentIndex((i) => i + 1);
        setFlipped(false);
        setAnimState('enter');
        resetOcclusionState();
        setTimeout(() => setAnimState('idle'), 300);
      }
    }, 250);
  }, [currentCard, flipped, isFinalReview, maxInterval, onRate, currentIndex, queue.length, allMasksRevealed, resetOcclusionState]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (completed) return;
      if (e.code === 'Space' || e.key === 'Enter') {
        if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') return;
        e.preventDefault();
        if (currentCard?.cardType === 'occlusion') {
          if (!flipped) {
            setFlipped(true);
          } else if (!allMasksRevealed) {
            setRevealedMasks(new Set(currentCard.masks.map((_, i) => i)));
            setAllMasksRevealed(true);
          }
        } else {
          setFlipped((f) => !f);
        }
      } else if ((flipped || (currentCard?.cardType === 'occlusion' && allMasksRevealed)) && currentCard?.cardType !== 'occlusion') {
        if (e.key === '1') { e.preventDefault(); handleRate('Again'); }
        else if (e.key === '2') { e.preventDefault(); handleRate('Hard'); }
        else if (e.key === '3') { e.preventDefault(); handleRate('Good'); }
        else if (e.key === '4') { e.preventDefault(); handleRate('Easy'); }
      } else if (currentCard?.cardType === 'occlusion' && allMasksRevealed) {
        if (e.key === '1') { e.preventDefault(); handleRate('Again'); }
        else if (e.key === '2') { e.preventDefault(); handleRate('Hard'); }
        else if (e.key === '3') { e.preventDefault(); handleRate('Good'); }
        else if (e.key === '4') { e.preventDefault(); handleRate('Easy'); }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [flipped, completed, handleRate, currentCard, allMasksRevealed]);

  if (completed) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-teal-50 flex items-center justify-center mb-5">
            <CheckCircle className="w-10 h-10 text-teal-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">All Done!</h2>
          <p className="text-slate-500 mb-6">
            You reviewed {reviewedCount} card{reviewedCount !== 1 ? 's' : ''} in {deckName}
          </p>
          <button
            onClick={onBack}
            className="px-6 py-3 rounded-xl bg-teal-500 text-white font-medium hover:bg-teal-600 transition-colors"
          >
            Back to Deck
          </button>
        </div>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-500 mb-4">No cards to review.</p>
          <button
            onClick={onBack}
            className="px-6 py-3 rounded-xl bg-teal-500 text-white font-medium hover:bg-teal-600 transition-colors"
          >
            Back to Deck
          </button>
        </div>
      </div>
    );
  }

  const progress = (currentIndex / queue.length) * 100;
  const cardKey = currentCard.id + currentIndex;
  const isOcclusion = currentCard.cardType === 'occlusion';

  const handleMaskClick = (maskIndex: number) => {
    if (!flipped || allMasksRevealed) return;
    setRevealedMasks((prev) => {
      const next = new Set(prev);
      next.add(maskIndex);
      if (next.size >= currentCard.masks.length) {
        setAllMasksRevealed(true);
      }
      return next;
    });
  };

  const handleRevealAll = () => {
    setRevealedMasks(new Set(currentCard.masks.map((_, i) => i)));
    setAllMasksRevealed(true);
  };

  const renderCardFront = () => {
    if (currentCard.cardType === 'cloze') {
      return (
        <div className="text-center">
          <MathRenderer
            text={renderCloze(currentCard.frontText, false)}
            className="text-xl font-medium text-slate-800 leading-relaxed"
          />
        </div>
      );
    }

    if (isOcclusion) {
      return (
        <div className="flex flex-col items-center">
          {currentCard.frontImage ? (
            <div className="relative inline-block">
              <img src={currentCard.frontImage} alt="Card front" className="max-h-56 object-contain rounded-lg" />
              {/* Masks: opaque when not flipped, individually removable when flipped */}
              {currentCard.masks.map((mask, i) => {
                if (flipped && revealedMasks.has(i)) return null;
                return (
                  <div
                    key={i}
                    onClick={flipped ? () => handleMaskClick(i) : undefined}
                    className={`absolute rounded transition-all duration-300 ${
                      flipped ? 'cursor-pointer hover:opacity-0' : ''
                    }`}
                    style={{
                      left: `${mask.x * 100}%`,
                      top: `${mask.y * 100}%`,
                      width: `${mask.w * 100}%`,
                      height: `${mask.h * 100}%`,
                      backgroundColor: MASK_COLORS[i % MASK_COLORS.length],
                    }}
                  >
                    {flipped && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <Eye className="w-5 h-5 text-white/80" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-400 italic">No image on this card</p>
          )}
          {currentCard.frontText && (
            <div className="text-center mt-4">
              <MathRenderer
                text={currentCard.frontText}
                className="text-base font-medium text-slate-600"
              />
            </div>
          )}
        </div>
      );
    }

    // Basic
    return (
      <>
        {currentCard.frontImage && (
          <div className="mb-5 flex justify-center">
            <img src={currentCard.frontImage} alt="Card front" className="max-h-56 object-contain rounded-lg" />
          </div>
        )}
        <div className="text-center">
          <MathRenderer
            text={currentCard.frontText}
            className="text-xl font-medium text-slate-800 leading-relaxed"
          />
        </div>
      </>
    );
  };

  const renderCardBack = () => {
    if (currentCard.cardType === 'cloze') {
      return (
        <div className="mt-6 pt-6 border-t border-slate-100 text-center animate-[fadeIn_0.3s_ease]">
          <MathRenderer
            text={renderCloze(currentCard.frontText, true)}
            className="text-lg font-medium text-slate-800 leading-relaxed"
          />
          {(currentCard.backText || currentCard.backImage) && (
            <div className="mt-4">
              {currentCard.backImage && (
                <div className="mb-3 flex justify-center">
                  <img src={currentCard.backImage} alt="Card back" className="max-h-48 object-contain rounded-lg" />
                </div>
              )}
              {currentCard.backText && (
                <MathRenderer
                  text={currentCard.backText}
                  className="text-base text-slate-600 leading-relaxed"
                />
              )}
            </div>
          )}
        </div>
      );
    }

    if (isOcclusion) {
      return (
        <div className="mt-6 pt-6 border-t border-slate-100 text-center animate-[fadeIn_0.3s_ease]">
          {currentCard.backText && (
            <MathRenderer
              text={currentCard.backText}
              className="text-base text-slate-600 leading-relaxed"
            />
          )}
        </div>
      );
    }

    // Basic
    return (
      <div className="mt-6 pt-6 border-t border-slate-100 text-center animate-[fadeIn_0.3s_ease]">
        {currentCard.backImage && (
          <div className="mb-4 flex justify-center">
            <img src={currentCard.backImage} alt="Card back" className="max-h-56 object-contain rounded-lg" />
          </div>
        )}
        <MathRenderer
          text={currentCard.backText}
          className="text-base text-slate-600 leading-relaxed"
        />
      </div>
    );
  };

  const showRatingButtons = isOcclusion ? allMasksRevealed : flipped;

  return (
    <div className="flex-1 flex flex-col bg-slate-50 relative">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-slate-200 bg-white">
        <button
          onClick={onBack}
          className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 max-w-xs mx-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>{isFinalReview ? 'Final Review' : 'Review'}</span>
            <span>{currentIndex + 1} / {queue.length}</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <button
          onClick={() => setShowHotkeys(!showHotkeys)}
          className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <Keyboard className="w-5 h-5" />
        </button>
      </div>

      {/* Hotkey Guide */}
      {showHotkeys && (
        <div className="absolute top-16 right-4 z-20 bg-white rounded-lg shadow-lg border border-slate-200 p-4 text-sm space-y-1.5 animate-[fadeIn_0.2s_ease]">
          {isOcclusion ? (
            <>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Reveal masks</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-xs font-mono">Space</kbd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500">Click individual masks to reveal</span>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Flip card</span>
              <kbd className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-xs font-mono">Space / Enter</kbd>
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <span className="text-red-500">Forgot</span>
            <kbd className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-xs font-mono">1</kbd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-amber-500">Hard</span>
            <kbd className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-xs font-mono">2</kbd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-teal-500">Good</span>
            <kbd className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-xs font-mono">3</kbd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-emerald-500">Easy</span>
            <kbd className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-xs font-mono">4</kbd>
          </div>
        </div>
      )}

      {/* Card Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div
          key={cardKey}
          className={`w-full max-w-2xl bg-white rounded-2xl shadow-sm border border-slate-200 p-8 min-h-[320px] flex flex-col justify-center transition-all duration-250 ${
            animState === 'exit'
              ? 'opacity-0 -translate-x-8'
              : animState === 'enter'
              ? 'opacity-0 translate-x-8'
              : 'opacity-100 translate-x-0'
          }`}
        >
          {renderCardFront()}

          {/* Back content (revealed on flip) */}
          {flipped && renderCardBack()}

          {/* Tags */}
          {currentCard.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
              {currentCard.tags.map((tag, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="mt-6 w-full max-w-2xl">
          {isOcclusion ? (
            !flipped ? (
              <button
                onClick={() => setFlipped(true)}
                className="w-full py-4 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
              >
                <Eye className="w-5 h-5" />
                Reveal Mask
                <span className="text-slate-400 text-sm ml-2">(Space)</span>
              </button>
            ) : !allMasksRevealed ? (
              <div className="space-y-2">
                <p className="text-center text-sm text-slate-500">
                  Click on each mask to reveal it, or reveal all at once.
                </p>
                <button
                  onClick={handleRevealAll}
                  className="w-full py-3 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Reveal All ({currentCard.masks.length - revealedMasks.size} remaining)
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2 animate-[fadeIn_0.2s_ease]">
                <button
                  onClick={() => handleRate('Again')}
                  className="flex flex-col items-center gap-1 py-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                >
                  <span className="text-lg">X</span>
                  <span className="text-sm font-medium">Forgot</span>
                  <kbd className="text-[10px] text-red-300">1</kbd>
                </button>
                <button
                  onClick={() => handleRate('Hard')}
                  className="flex flex-col items-center gap-1 py-3 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                >
                  <span className="text-lg">?</span>
                  <span className="text-sm font-medium">Hard</span>
                  <kbd className="text-[10px] text-amber-300">2</kbd>
                </button>
                <button
                  onClick={() => handleRate('Good')}
                  className="flex flex-col items-center gap-1 py-3 rounded-xl bg-teal-50 text-teal-600 hover:bg-teal-100 transition-colors"
                >
                  <span className="text-lg">V</span>
                  <span className="text-sm font-medium">Good</span>
                  <kbd className="text-[10px] text-teal-300">3</kbd>
                </button>
                <button
                  onClick={() => handleRate('Easy')}
                  className="flex flex-col items-center gap-1 py-3 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                >
                  <span className="text-lg">!</span>
                  <span className="text-sm font-medium">Easy</span>
                  <kbd className="text-[10px] text-emerald-300">4</kbd>
                </button>
              </div>
            )
          ) : (
            !flipped ? (
              <button
                onClick={() => setFlipped(true)}
                className="w-full py-4 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 transition-colors"
              >
                Flip Card
                <span className="text-slate-400 text-sm ml-2">(Space / Enter)</span>
              </button>
            ) : (
              <div className="grid grid-cols-4 gap-2 animate-[fadeIn_0.2s_ease]">
                <button
                  onClick={() => handleRate('Again')}
                  className="flex flex-col items-center gap-1 py-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                >
                  <span className="text-lg">X</span>
                  <span className="text-sm font-medium">Forgot</span>
                  <kbd className="text-[10px] text-red-300">1</kbd>
                </button>
                <button
                  onClick={() => handleRate('Hard')}
                  className="flex flex-col items-center gap-1 py-3 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                >
                  <span className="text-lg">?</span>
                  <span className="text-sm font-medium">Hard</span>
                  <kbd className="text-[10px] text-amber-300">2</kbd>
                </button>
                <button
                  onClick={() => handleRate('Good')}
                  className="flex flex-col items-center gap-1 py-3 rounded-xl bg-teal-50 text-teal-600 hover:bg-teal-100 transition-colors"
                >
                  <span className="text-lg">V</span>
                  <span className="text-sm font-medium">Good</span>
                  <kbd className="text-[10px] text-teal-300">3</kbd>
                </button>
                <button
                  onClick={() => handleRate('Easy')}
                  className="flex flex-col items-center gap-1 py-3 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                >
                  <span className="text-lg">!</span>
                  <span className="text-sm font-medium">Easy</span>
                  <kbd className="text-[10px] text-emerald-300">4</kbd>
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
