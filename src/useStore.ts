import { useState, useEffect, useCallback } from 'react';
import { Deck, Card, ReviewLog, Rating, CardType, MaskRect } from './types';
import * as db from './db';

export function useStore() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [reviewLogs, setReviewLogs] = useState<ReviewLog[]>([]);
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshDecks = useCallback(async () => {
    const allDecks = await db.getAllDecks();
    allDecks.sort((a, b) => a.createdAt - b.createdAt);
    setDecks(allDecks);
    if (allDecks.length > 0 && !activeDeckId) {
      setActiveDeckId(allDecks[0].id);
    }
  }, [activeDeckId]);

  const refreshCards = useCallback(async (deckId: string) => {
    const deckCards = await db.getCardsByDeck(deckId);
    deckCards.sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt);
    setCards(deckCards);
  }, []);

  const refreshReviewLogs = useCallback(async (deckId: string) => {
    const logs = await db.getReviewLogsByDeck(deckId);
    setReviewLogs(logs);
  }, []);

  useEffect(() => {
    (async () => {
      await refreshDecks();
      setLoading(false);
    })();
  }, [refreshDecks]);

  useEffect(() => {
    if (activeDeckId) {
      refreshCards(activeDeckId);
      refreshReviewLogs(activeDeckId);
    } else {
      setCards([]);
      setReviewLogs([]);
    }
  }, [activeDeckId, refreshCards, refreshReviewLogs]);

  const createDeck = useCallback(async (name: string): Promise<string> => {
    const deck: Deck = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
      examDate: null,
      finalReviewHours: 48,
    };
    await db.saveDeck(deck);
    await refreshDecks();
    setActiveDeckId(deck.id);
    return deck.id;
  }, [refreshDecks]);

  const renameDeck = useCallback(async (id: string, name: string) => {
    const deck = decks.find((d) => d.id === id);
    if (!deck) return;
    await db.saveDeck({ ...deck, name });
    await refreshDecks();
  }, [decks, refreshDecks]);

  const duplicateDeck = useCallback(async (id: string) => {
    const deck = decks.find((d) => d.id === id);
    if (!deck) return;
    const newDeck: Deck = {
      id: crypto.randomUUID(),
      name: `${deck.name} (Copy)`,
      createdAt: Date.now(),
      examDate: null,
      finalReviewHours: deck.finalReviewHours ?? 48,
    };
    const deckCards = await db.getCardsByDeck(id);
    const now = Date.now();
    const clonedCards = deckCards.map((c, i) => ({
      ...c,
      id: crypto.randomUUID(),
      deckId: newDeck.id,
      createdAt: now + i,
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
      state: 0 as const,
      lastReview: null,
      due: now,
    }));
    await db.saveDeck(newDeck);
    await db.saveCards(clonedCards);
    await refreshDecks();
    setActiveDeckId(newDeck.id);
  }, [decks, refreshDecks]);

  const removeDeck = useCallback(async (id: string) => {
    await db.deleteReviewLogsByDeck(id);
    await db.deleteCardsByDeck(id);
    await db.deleteDeck(id);
    await refreshDecks();
    if (activeDeckId === id) {
      const remaining = await db.getAllDecks();
      setActiveDeckId(remaining.length > 0 ? remaining[0].id : null);
    }
  }, [activeDeckId, refreshDecks]);

  const setExamDate = useCallback(async (deckId: string, date: number | null) => {
    const deck = decks.find((d) => d.id === deckId);
    if (!deck) return;
    await db.saveDeck({ ...deck, examDate: date });
    await refreshDecks();
  }, [decks, refreshDecks]);

  const setFinalReviewHours = useCallback(async (deckId: string, hours: number) => {
    const deck = decks.find((d) => d.id === deckId);
    if (!deck) return;
    await db.saveDeck({ ...deck, finalReviewHours: hours });
    await refreshDecks();
  }, [decks, refreshDecks]);

  const addCard = useCallback(async (
    deckId: string,
    frontText: string,
    backText: string,
    frontImage: string | null,
    backImage: string | null,
    tags: string[] = [],
    cardType: CardType = 'basic',
    masks: MaskRect[] = []
  ) => {
    const deckCards = await db.getCardsByDeck(deckId);
    const maxSort = deckCards.reduce((max, c) => Math.max(max, c.sortOrder), -1);
    const now = Date.now();
    const card: Card = {
      id: crypto.randomUUID(),
      deckId,
      cardType,
      frontText,
      backText,
      frontImage,
      backImage,
      tags,
      sortOrder: maxSort + 1,
      createdAt: now,
      masks,
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
      state: 0,
      lastReview: null,
      due: now,
    };
    await db.saveCard(card);
    if (deckId === activeDeckId) {
      await refreshCards(deckId);
    }
    return card;
  }, [activeDeckId, refreshCards]);

  const updateCard = useCallback(async (card: Card) => {
    await db.saveCard(card);
    if (card.deckId === activeDeckId) {
      await refreshCards(card.deckId);
    }
  }, [activeDeckId, refreshCards]);

  const removeCard = useCallback(async (id: string) => {
    await db.deleteCard(id);
    if (activeDeckId) {
      await refreshCards(activeDeckId);
    }
  }, [activeDeckId, refreshCards]);

  const resetDeckHistory = useCallback(async (deckId: string) => {
    const deckCards = await db.getCardsByDeck(deckId);
    const now = Date.now();
    const resetCards = deckCards.map((c) => ({
      ...c,
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
      state: 0 as const,
      lastReview: null,
      due: now,
    }));
    await db.saveCards(resetCards);
    await db.deleteReviewLogsByDeck(deckId);
    if (deckId === activeDeckId) {
      await refreshCards(deckId);
      await refreshReviewLogs(deckId);
    }
  }, [activeDeckId, refreshCards, refreshReviewLogs]);

  const logReview = useCallback(async (cardId: string, deckId: string, rating: Rating) => {
    const log: ReviewLog = {
      id: crypto.randomUUID(),
      cardId,
      deckId,
      rating,
      reviewedAt: Date.now(),
    };
    await db.addReviewLog(log);
  }, []);

  // Bulk operations
  const bulkDeleteCards = useCallback(async (cardIds: string[]) => {
    for (const id of cardIds) {
      await db.deleteCard(id);
    }
    if (activeDeckId) await refreshCards(activeDeckId);
  }, [activeDeckId, refreshCards]);

  const bulkMoveCards = useCallback(async (cardIds: string[], targetDeckId: string) => {
    const allCards = await db.getCardsByDeck(activeDeckId || '');
    const targetCards = await db.getCardsByDeck(targetDeckId);
    const maxSort = targetCards.reduce((max, c) => Math.max(max, c.sortOrder), -1);
    const toMove = allCards.filter((c) => cardIds.includes(c.id));
    const moved = toMove.map((c, i) => ({
      ...c,
      deckId: targetDeckId,
      sortOrder: maxSort + 1 + i,
    }));
    await db.saveCards(moved);
    if (activeDeckId) await refreshCards(activeDeckId);
  }, [activeDeckId, refreshCards]);

  const bulkResetHistory = useCallback(async (cardIds: string[]) => {
    const now = Date.now();
    const allCards = await db.getCardsByDeck(activeDeckId || '');
    const toReset = allCards.filter((c) => cardIds.includes(c.id));
    const reset = toReset.map((c) => ({
      ...c,
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
      state: 0 as const,
      lastReview: null,
      due: now,
    }));
    await db.saveCards(reset);
    if (activeDeckId) await refreshCards(activeDeckId);
  }, [activeDeckId, refreshCards]);

  const reorderCards = useCallback(async (reorderedCards: Card[]) => {
    const updated = reorderedCards.map((c, i) => ({ ...c, sortOrder: i }));
    await db.saveCards(updated);
    if (activeDeckId) await refreshCards(activeDeckId);
  }, [activeDeckId, refreshCards]);

  // Export / Import
  const exportData = useCallback(async (): Promise<string> => {
    return db.exportAllData();
  }, []);

  const importData = useCallback(async (json: string) => {
    await db.importAllData(json);
    await refreshDecks();
  }, [refreshDecks]);

  // CSV Import
  const importCSV = useCallback(async (deckId: string, rows: { front: string; back: string }[]) => {
    const deckCards = await db.getCardsByDeck(deckId);
    const maxSort = deckCards.reduce((max, c) => Math.max(max, c.sortOrder), -1);
    const now = Date.now();
    const newCards: Card[] = rows.map((row, i) => ({
      id: crypto.randomUUID(),
      deckId,
      cardType: 'basic' as CardType,
      frontText: row.front,
      backText: row.back,
      frontImage: null,
      backImage: null,
      tags: [],
      sortOrder: maxSort + 1 + i,
      createdAt: now + i,
      masks: [],
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
      state: 0,
      lastReview: null,
      due: now,
    }));
    await db.saveCards(newCards);
    if (deckId === activeDeckId) await refreshCards(deckId);
  }, [activeDeckId, refreshCards]);

  const activeDeck = decks.find((d) => d.id === activeDeckId) || null;

  return {
    decks,
    cards,
    reviewLogs,
    activeDeck,
    activeDeckId,
    loading,
    setActiveDeckId,
    createDeck,
    renameDeck,
    duplicateDeck,
    removeDeck,
    setExamDate,
    setFinalReviewHours,
    addCard,
    updateCard,
    removeCard,
    resetDeckHistory,
    logReview,
    bulkDeleteCards,
    bulkMoveCards,
    bulkResetHistory,
    reorderCards,
    exportData,
    importData,
    importCSV,
    refreshCards,
    refreshReviewLogs,
  };
}
