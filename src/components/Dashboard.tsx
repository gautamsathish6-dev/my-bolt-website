import { useState, useMemo } from 'react';
import { Plus, Rocket, Calendar, Play, Layers, Clock, CircleAlert as AlertCircle, Trash2, RotateCcw, Settings, Pencil, X, Upload, GripVertical, ArrowRight, SquareCheck as CheckSquare, Square, Filter } from 'lucide-react';
import { Deck, Card, ReviewLog, CardState } from '../types';
import { getDueCount, getNewCount } from '../fsrs';
import { CardEditModal } from './CardEditModal';
import { MathRenderer } from './MathRenderer';

interface DashboardProps {
  deck: Deck;
  cards: Card[];
  reviewLogs: ReviewLog[];
  allDecks: Deck[];
  onAddCards: () => void;
  onStartReview: () => void;
  onSetExamDate: () => void;
  onStartFinalReview: () => void;
  onResetHistory: () => void;
  onDeleteDeck: () => void;
  onEditCard: (card: Card) => void;
  onDeleteCard: (cardId: string) => void;
  onBulkDelete: (cardIds: string[]) => void;
  onBulkMove: (cardIds: string[], targetDeckId: string) => void;
  onBulkReset: (cardIds: string[]) => void;
  onReorder: (cards: Card[]) => void;
  onImportCSV: () => void;
}

export function Dashboard({
  deck, cards, reviewLogs, allDecks,
  onAddCards, onStartReview, onSetExamDate, onStartFinalReview,
  onResetHistory, onDeleteDeck,
  onEditCard, onDeleteCard,
  onBulkDelete, onBulkMove, onBulkReset,
  onReorder, onImportCSV,
}: DashboardProps) {
  const [showEditMenu, setShowEditMenu] = useState(false);
  const [editMenuPos, setEditMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [confirmDeleteCard, setConfirmDeleteCard] = useState<Card | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [bulkMoveTarget, setBulkMoveTarget] = useState(false);

  const now = Date.now();
  const dueCount = getDueCount(cards, now);
  const newCount = getNewCount(cards);
  const totalCount = cards.length;
  const learnedCount = cards.filter((c) => c.state === CardState.Review && c.reps >= 2).length;

  const daysUntilExam = deck.examDate
    ? Math.ceil((deck.examDate - now) / 86400000)
    : null;
  const finalReviewHours = deck.finalReviewHours ?? 48;
  const isFinalReviewReady = deck.examDate
    ? deck.examDate - now <= finalReviewHours * 3600000 && deck.examDate > now
    : false;

  const dailyLimit = deck.examDate && daysUntilExam !== null && daysUntilExam > 0
    ? Math.ceil(totalCount / daysUntilExam)
    : null;

  const streakData = useMemo(() => {
    const days: { date: Date; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      const count = reviewLogs.filter((l) => l.reviewedAt >= d.getTime() && l.reviewedAt < next.getTime()).length;
      days.push({ date: d, count });
    }
    return days;
  }, [reviewLogs]);

  const todayReviewCount = streakData[6]?.count || 0;

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    cards.forEach((c) => c.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [cards]);

  const filteredCards = useMemo(() => {
    if (!filterTag) return cards;
    return cards.filter((c) => c.tags.includes(filterTag));
  }, [cards, filterTag]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCards.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCards.map((c) => c.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setShowBulkMenu(false);
  };

  const handleDragStart = (cardId: string) => {
    if (!reorderMode) return;
    setDraggedCardId(cardId);
  };

  const handleDragOver = (e: React.DragEvent, _targetId: string) => {
    if (!reorderMode || !draggedCardId) return;
    e.preventDefault();
  };

  const handleDrop = (targetId: string) => {
    if (!reorderMode || !draggedCardId || draggedCardId === targetId) return;
    const reordered = [...cards];
    const fromIdx = reordered.findIndex((c) => c.id === draggedCardId);
    const toIdx = reordered.findIndex((c) => c.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    onReorder(reordered);
    setDraggedCardId(null);
  };

  const selectedArray = Array.from(selectedIds);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto px-8 py-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight truncate">{deck.name}</h2>
              <div className="relative shrink-0">
                <button
                  onClick={(e) => {
                    if (showEditMenu) {
                      setShowEditMenu(false);
                    } else {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setEditMenuPos({ top: rect.top, left: rect.right + 8 });
                      setShowEditMenu(true);
                    }
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 dark:text-slate-500 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </button>
                {showEditMenu && editMenuPos && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowEditMenu(false)} />
                    <div
                      className="fixed z-50 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 min-w-[180px]"
                      style={{ top: editMenuPos.top, left: editMenuPos.left }}
                    >
                      <button
                        onClick={() => { setConfirmReset(true); setShowEditMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Reset Deck History
                      </button>
                      <button
                        onClick={() => { setConfirmDelete(true); setShowEditMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete Deck
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
            {deck.examDate && (
              <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Exam in {daysUntilExam} day{daysUntilExam !== 1 ? 's' : ''}
                {dailyLimit && ` · ${dailyLimit} cards/day target`}
              </p>
            )}
          </div>
        </div>

        {/* Analytics Row */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 mb-1">
              <Layers className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Total</span>
            </div>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{totalCount}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 mb-1">
              <CheckSquare className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Learned</span>
            </div>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{learnedCount}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">Due</span>
            </div>
            <p className="text-2xl font-bold text-amber-500 dark:text-amber-400">{dueCount}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 mb-1">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wide">New</span>
            </div>
            <p className="text-2xl font-bold text-slate-600 dark:text-slate-300">{newCount}</p>
          </div>
        </div>

        {/* 7-day streak grid */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Last 7 Days</span>
            <span className="text-sm text-slate-400 dark:text-slate-500">{todayReviewCount} reviewed today</span>
          </div>
          <div className="flex items-center gap-2">
            {streakData.map((day, i) => {
              const isToday = i === 6;
              const intensity = Math.min(day.count / 20, 1);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full h-12 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                      day.count > 0
                        ? 'text-white'
                        : 'text-slate-300 dark:text-slate-600 bg-slate-50 dark:bg-slate-700/50'
                    } ${isToday ? 'ring-2 ring-blue-400 dark:ring-blue-500' : ''}`}
                    style={day.count > 0 ? {
                      backgroundColor: `rgba(37, 99, 235, ${0.3 + intensity * 0.7})`
                    } : undefined}
                  >
                    {day.count > 0 ? day.count : ''}
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {day.date.toLocaleDateString('en', { weekday: 'short' }).charAt(0)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 mb-8">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onAddCards}
              className="flex items-center gap-3 px-5 py-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-slate-700 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-slate-700 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-slate-600 transition-colors">
                <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-slate-700 dark:text-slate-200">Add Cards</p>
                <p className="text-sm text-slate-400 dark:text-slate-500">Create flashcards</p>
              </div>
            </button>

            <button
              onClick={onImportCSV}
              className="flex items-center gap-3 px-5 py-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-slate-700 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-700 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-slate-600 transition-colors">
                <Upload className="w-5 h-5 text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-slate-700 dark:text-slate-200">Import CSV</p>
                <p className="text-sm text-slate-400 dark:text-slate-500">Bulk add from file</p>
              </div>
            </button>
          </div>

          {dueCount > 0 && (
            <button
              onClick={onStartReview}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 transition-all shadow-sm"
            >
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-white">Start Review</p>
                <p className="text-sm text-blue-100">{dueCount} card{dueCount !== 1 ? 's' : ''} ready</p>
              </div>
            </button>
          )}

          {isFinalReviewReady && (
            <button
              onClick={onStartFinalReview}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm"
            >
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <Play className="w-5 h-5 text-white fill-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-white">Run Final Review</p>
                <p className="text-sm text-amber-50">Cycle through all {totalCount} cards</p>
              </div>
            </button>
          )}

          <button
            onClick={onSetExamDate}
            className="w-full flex items-center gap-3 px-5 py-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-slate-700 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-700 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-slate-600 transition-colors">
              <Calendar className="w-5 h-5 text-slate-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-slate-700 dark:text-slate-200">
                {deck.examDate ? 'Change Exam Date' : 'Set Exam Date'}
              </p>
              <p className="text-sm text-slate-400 dark:text-slate-500">
                {deck.examDate ? 'Adjust your study schedule' : 'Schedule cards to finish before your test'}
              </p>
            </div>
          </button>
        </div>

        {/* Card List */}
        {totalCount > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Cards in this deck
              </h3>
              <div className="flex items-center gap-2">
                {allTags.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setFilterTag(filterTag ? null : allTags[0])}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Filter className="w-3.5 h-3.5" />
                      {filterTag || 'All tags'}
                    </button>
                    {filterTag && allTags.length > 1 && (
                      <div className="absolute right-0 top-8 z-20 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 min-w-[120px]">
                        <button
                          onClick={() => setFilterTag(null)}
                          className="w-full text-left px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                        >
                          All tags
                        </button>
                        {allTags.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => setFilterTag(tag)}
                            className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 ${
                              filterTag === tag ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={() => {
                    setReorderMode(!reorderMode);
                    setSelectedIds(new Set());
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    reorderMode
                      ? 'bg-blue-50 text-blue-600 dark:bg-slate-700 dark:text-blue-400'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <GripVertical className="w-3.5 h-3.5" />
                  {reorderMode ? 'Done Reordering' : 'Reorder'}
                </button>
              </div>
            </div>

            {/* Bulk action bar */}
            {selectedIds.size > 0 && !reorderMode && (
              <div className="sticky top-0 z-10 flex items-center gap-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 mb-2 shadow-sm animate-[fadeIn_0.2s_ease]">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{selectedIds.size} selected</span>
                <div className="flex-1" />
                <button
                  onClick={() => setShowBulkMenu(!showBulkMenu)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Actions
                </button>
                <button
                  onClick={clearSelection}
                  className="p-1 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
                {showBulkMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowBulkMenu(false)} />
                    <div className="absolute right-4 top-12 z-20 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 min-w-[180px]">
                      <button
                        onClick={() => { onBulkDelete(selectedArray); clearSelection(); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete Cards
                      </button>
                      <button
                        onClick={() => { setBulkMoveTarget(true); setShowBulkMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        <ArrowRight className="w-3.5 h-3.5" /> Move to Deck...
                      </button>
                      <button
                        onClick={() => { onBulkReset(selectedArray); clearSelection(); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Reset History
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Bulk move target picker */}
            {bulkMoveTarget && (
              <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Move {selectedIds.size} cards to:</h3>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {allDecks.filter((d) => d.id !== deck.id).map((d) => (
                      <button
                        key={d.id}
                        onClick={() => {
                          onBulkMove(selectedArray, d.id);
                          clearSelection();
                          setBulkMoveTarget(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        {d.name}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setBulkMoveTarget(false)}
                    className="mt-3 w-full px-4 py-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Select all checkbox */}
            {!reorderMode && filteredCards.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 mb-2 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {selectedIds.size === filteredCards.length && selectedIds.size > 0
                  ? <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                  : <Square className="w-3.5 h-3.5" />
                }
                {selectedIds.size === filteredCards.length && selectedIds.size > 0 ? 'Deselect all' : 'Select all'}
              </button>
            )}

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {filteredCards.map((card) => (
                <div
                  key={card.id}
                  draggable={reorderMode}
                  onDragStart={() => handleDragStart(card.id)}
                  onDragOver={(e) => handleDragOver(e, card.id)}
                  onDrop={() => handleDrop(card.id)}
                  className={`group flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl border px-4 py-3 transition-all ${
                    reorderMode ? 'cursor-grab active:cursor-grabbing' : ''
                  } ${
                    draggedCardId === card.id ? 'opacity-40 border-blue-300 dark:border-blue-600' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  } ${selectedIds.has(card.id) ? 'border-blue-300 dark:border-blue-600 bg-blue-50/30 dark:bg-slate-700' : ''}`}
                >
                  {reorderMode ? (
                    <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                  ) : (
                    <button
                      onClick={() => toggleSelect(card.id)}
                      className="shrink-0"
                    >
                      {selectedIds.has(card.id)
                        ? <CheckSquare className="w-4 h-4 text-blue-500" />
                        : <Square className="w-4 h-4 text-slate-300 dark:text-slate-600 hover:text-slate-400" />
                      }
                    </button>
                  )}

                  <div className="flex-1 min-w-0">
                    {card.cardType && card.cardType !== 'basic' && (
                      <span className="inline-block text-[10px] px-1.5 py-0.5 rounded-full mb-0.5 font-medium bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                        Occlusion
                      </span>
                    )}
                    <MathRenderer
                      text={card.frontText || (card.frontImage ? '(image only)' : 'Untitled')}
                      className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate"
                    />
                    <MathRenderer
                      text={card.backText || (card.backImage ? '(image only)' : 'No answer')}
                      className="text-xs text-slate-400 dark:text-slate-500 truncate"
                    />
                    {card.tags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {card.tags.map((tag, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {(card.frontImage || card.backImage) && (
                    <div className="flex gap-1 shrink-0">
                      {card.frontImage && (
                        <img src={card.frontImage} alt="" className="w-8 h-8 object-cover rounded border border-slate-200 dark:border-slate-700" />
                      )}
                      {card.backImage && (
                        <img src={card.backImage} alt="" className="w-8 h-8 object-cover rounded border border-slate-200 dark:border-slate-700" />
                      )}
                    </div>
                  )}

                  {!reorderMode && (
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingCard(card)}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteCard(card)}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {totalCount === 0 && (
          <div className="mt-12 text-center py-12">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <Layers className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-slate-400 dark:text-slate-500">This deck is empty. Add your first card to get started.</p>
          </div>
        )}
      </div>

      {/* Confirm Reset Modal */}
      {confirmReset && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Reset Deck History?</h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              This will wipe all scheduling progress for "{deck.name}" and treat every card as new. Your cards will not be deleted.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmReset(false)} className="px-4 py-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium">Cancel</button>
              <button onClick={() => { onResetHistory(); setConfirmReset(false); }} className="px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 text-sm font-medium">Reset</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Deck */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Delete Deck?</h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              This will permanently delete "{deck.name}" and all {totalCount} cards inside it.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium">Cancel</button>
              <button onClick={onDeleteDeck} className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 text-sm font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Card */}
      {confirmDeleteCard && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Delete Card?</h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">This will permanently delete this card.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDeleteCard(null)} className="px-4 py-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium">Cancel</button>
              <button onClick={() => { onDeleteCard(confirmDeleteCard.id); setConfirmDeleteCard(null); }} className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 text-sm font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Card Edit Modal */}
      {editingCard && (
        <CardEditModal
          card={editingCard}
          onSave={(updated) => { onEditCard(updated); setEditingCard(null); }}
          onClose={() => setEditingCard(null)}
        />
      )}
    </div>
  );
}
