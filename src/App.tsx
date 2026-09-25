import { useState, useMemo, useCallback } from 'react';
import { useStore } from './useStore';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { CardBuilder } from './components/CardBuilder';
import { ReviewSession } from './components/ReviewSession';
import { ExamDateModal } from './components/ExamDateModal';
import { CSVImport } from './components/CSVImport';
import { Card, Rating, CardType, MaskRect } from './types';
import { isCardDue, scheduleCard } from './fsrs';

type View = 'dashboard' | 'builder' | 'review' | 'finalReview' | 'csvImport';

function App() {
  const store = useStore();
  const [view, setView] = useState<View>('dashboard');
  const [showExamModal, setShowExamModal] = useState(false);

  const now = Date.now();

  const cardCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const deck of store.decks) {
      counts[deck.id] = deck.id === store.activeDeckId ? store.cards.length : 0;
    }
    return counts;
  }, [store.decks, store.cards, store.activeDeckId]);

  const dueCards = useMemo(() => {
    return store.cards
      .filter((c) => isCardDue(c, now))
      .sort((a, b) => a.due - b.due);
  }, [store.cards, now]);

  const maxInterval = useMemo(() => {
    if (store.activeDeck?.examDate) {
      const daysLeft = Math.ceil((store.activeDeck.examDate - now) / 86400000);
      if (daysLeft > 0) return daysLeft;
    }
    return 36500;
  }, [store.activeDeck, now]);

  const handleRate = useCallback(async (card: Card, rating: Rating) => {
    await store.updateCard(card);
    if (store.activeDeckId) {
      await store.logReview(card.id, store.activeDeckId, rating);
    }
  }, [store]);

  const handleAddCard = useCallback(async (
    frontText: string, backText: string, frontImage: string | null, backImage: string | null, tags: string[],
    cardType: CardType = 'basic', masks: MaskRect[] = []
  ) => {
    if (store.activeDeckId) {
      await store.addCard(store.activeDeckId, frontText, backText, frontImage, backImage, tags, cardType, masks);
    }
  }, [store.activeDeckId, store.addCard]);

  const handleEditCard = useCallback(async (card: Card) => {
    await store.updateCard(card);
  }, [store]);

  const handleDeleteCard = useCallback(async (cardId: string) => {
    await store.removeCard(cardId);
  }, [store]);

  const handleExport = useCallback(async () => {
    const json = await store.exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omnideck-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [store]);

  const handleImport = useCallback(async (file: File) => {
    const text = await file.text();
    await store.importData(text);
  }, [store]);

  const handleCSVImport = useCallback(async (rows: { front: string; back: string }[]) => {
    if (store.activeDeckId) {
      await store.importCSV(store.activeDeckId, rows);
      setView('dashboard');
    }
  }, [store.activeDeckId, store.importCSV]);

  if (store.loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-slate-50">
      <Sidebar
        decks={store.decks}
        activeDeckId={store.activeDeckId}
        cardCounts={cardCounts}
        onSelect={(id) => { store.setActiveDeckId(id); setView('dashboard'); }}
        onCreate={store.createDeck}
        onRename={store.renameDeck}
        onDuplicate={store.duplicateDeck}
        onDelete={store.removeDeck}
        onExport={handleExport}
        onImport={handleImport}
      />

      {store.activeDeck && view === 'dashboard' && (
        <Dashboard
          deck={store.activeDeck}
          cards={store.cards}
          reviewLogs={store.reviewLogs}
          allDecks={store.decks}
          onAddCards={() => setView('builder')}
          onStartReview={() => setView('review')}
          onSetExamDate={() => setShowExamModal(true)}
          onStartFinalReview={() => setView('finalReview')}
          onResetHistory={() => store.activeDeckId && store.resetDeckHistory(store.activeDeckId)}
          onDeleteDeck={() => store.activeDeckId && store.removeDeck(store.activeDeckId)}
          onEditCard={handleEditCard}
          onDeleteCard={handleDeleteCard}
          onBulkDelete={store.bulkDeleteCards}
          onBulkMove={store.bulkMoveCards}
          onBulkReset={store.bulkResetHistory}
          onReorder={store.reorderCards}
          onImportCSV={() => setView('csvImport')}
        />
      )}

      {store.activeDeck && view === 'builder' && (
        <CardBuilder
          deckName={store.activeDeck.name}
          onAddCard={handleAddCard}
          onBack={() => setView('dashboard')}
        />
      )}

      {store.activeDeck && view === 'csvImport' && (
        <CSVImport
          deckName={store.activeDeck.name}
          onImport={handleCSVImport}
          onBack={() => setView('dashboard')}
        />
      )}

      {store.activeDeck && view === 'review' && (
        <ReviewSession
          cards={dueCards}
          deckName={store.activeDeck.name}
          maxInterval={maxInterval}
          isFinalReview={false}
          onRate={handleRate}
          onBack={() => {
            setView('dashboard');
            if (store.activeDeckId) {
              store.refreshCards(store.activeDeckId);
              store.refreshReviewLogs(store.activeDeckId);
            }
          }}
        />
      )}

      {store.activeDeck && view === 'finalReview' && (
        <ReviewSession
          cards={store.cards}
          deckName={store.activeDeck.name}
          maxInterval={maxInterval}
          isFinalReview={true}
          onRate={handleRate}
          onBack={() => {
            setView('dashboard');
            if (store.activeDeckId) {
              store.refreshCards(store.activeDeckId);
              store.refreshReviewLogs(store.activeDeckId);
            }
          }}
        />
      )}

      {showExamModal && store.activeDeck && (
        <ExamDateModal
          deckName={store.activeDeck.name}
          currentExamDate={store.activeDeck.examDate}
          currentFinalReviewHours={store.activeDeck.finalReviewHours ?? 48}
          onSave={(date, finalReviewHours) => {
            if (store.activeDeckId) {
              store.setExamDate(store.activeDeckId, date);
              store.setFinalReviewHours(store.activeDeckId, finalReviewHours);
            }
            setShowExamModal(false);
          }}
          onClose={() => setShowExamModal(false)}
        />
      )}

      {!store.activeDeck && (
        <div className="flex-1 flex items-center justify-center bg-slate-50">
          <div className="text-center max-w-sm px-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-50 flex items-center justify-center mb-4">
              <span className="text-2xl">📚</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Welcome to OmniDeck</h2>
            <p className="text-slate-500 text-sm">
              Create your first deck from the sidebar to start building flashcards with smart spaced repetition.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
