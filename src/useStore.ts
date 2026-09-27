import { useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { Deck, Card, ReviewLog, Rating, CardType, MaskRect } from './types';
import { supabase } from './supabaseClient';

function toDbCard(card: Card): Record<string, unknown> {
  return {
    id: card.id,
    deck_id: card.deckId,
    card_type: card.cardType,
    front_text: card.frontText,
    back_text: card.backText,
    front_image: card.frontImage,
    back_image: card.backImage,
    tags: card.tags,
    sort_order: card.sortOrder,
    masks: card.masks,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsedDays,
    scheduled_days: card.scheduledDays,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.lastReview,
    due: card.due,
  };
}

function fromDbCard(row: Record<string, unknown>): Card {
  return {
    id: row.id as string,
    deckId: row.deck_id as string,
    cardType: (row.card_type as CardType) ?? 'basic',
    frontText: (row.front_text as string) ?? '',
    backText: (row.back_text as string) ?? '',
    frontImage: (row.front_image as string | null) ?? null,
    backImage: (row.back_image as string | null) ?? null,
    tags: (row.tags as string[]) ?? [],
    sortOrder: (row.sort_order as number) ?? 0,
    createdAt: new Date(row.created_at as string).getTime(),
    masks: (row.masks as MaskRect[]) ?? [],
    stability: (row.stability as number) ?? 0,
    difficulty: (row.difficulty as number) ?? 0,
    elapsedDays: (row.elapsed_days as number) ?? 0,
    scheduledDays: (row.scheduled_days as number) ?? 0,
    reps: (row.reps as number) ?? 0,
    lapses: (row.lapses as number) ?? 0,
    state: (row.state as number) ?? 0,
    lastReview: (row.last_review as number | null) ?? null,
    due: (row.due as number) ?? Date.now(),
  };
}

function fromDbDeck(row: Record<string, unknown>): Deck {
  return {
    id: row.id as string,
    name: row.name as string,
    createdAt: new Date(row.created_at as string).getTime(),
    examDate: (row.exam_date as number | null) ?? null,
    finalReviewHours: (row.final_review_hours as number) ?? 48,
  };
}

function fromDbReviewLog(row: Record<string, unknown>): ReviewLog {
  return {
    id: row.id as string,
    cardId: row.card_id as string,
    deckId: row.deck_id as string,
    rating: row.rating as Rating,
    reviewedAt: new Date(row.reviewed_at as string).getTime(),
  };
}

export function useStore(user: User | null) {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [reviewLogs, setReviewLogs] = useState<ReviewLog[]>([]);
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [gardenEnabled, setGardenEnabled] = useState(true);

  const refreshDecks = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.from('decks').select('*').order('created_at', { ascending: true });
    if (error) { console.error('Failed to load decks:', error); return; }
    const mapped = (data || []).map(fromDbDeck);
    setDecks(mapped);
    if (mapped.length > 0 && !activeDeckId) {
      setActiveDeckId(mapped[0].id);
    }
  }, [user, activeDeckId]);

  const refreshCards = useCallback(async (deckId: string) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('deck_id', deckId)
      .order('sort_order', { ascending: true });
    if (error) { console.error('Failed to load cards:', error); return; }
    setCards((data || []).map(fromDbCard));
  }, [user]);

  const refreshReviewLogs = useCallback(async (deckId: string) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('review_logs')
      .select('*')
      .eq('deck_id', deckId)
      .order('reviewed_at', { ascending: true });
    if (error) { console.error('Failed to load review logs:', error); return; }
    setReviewLogs((data || []).map(fromDbReviewLog));
  }, [user]);

  const refreshAllReviewLogs = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('review_logs')
      .select('*')
      .order('reviewed_at', { ascending: true });
    if (error) { console.error('Failed to load all review logs:', error); return; }
    return (data || []).map(fromDbReviewLog);
  }, [user]);

  const loadUserSettings = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (error) { console.error('Failed to load settings:', error); return; }
    if (data) {
      setGardenEnabled(data.garden_enabled as boolean);
    } else {
      await supabase.from('user_settings').upsert({ id: user.id, garden_enabled: true, theme: 'light' });
      setGardenEnabled(true);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setDecks([]);
      setCards([]);
      setReviewLogs([]);
      setActiveDeckId(null);
      setLoading(false);
      return;
    }
    (async () => {
      await loadUserSettings();
      await refreshDecks();
      setLoading(false);
    })();
  }, [user, refreshDecks, loadUserSettings]);

  useEffect(() => {
    if (activeDeckId && user) {
      refreshCards(activeDeckId);
      refreshReviewLogs(activeDeckId);
    } else {
      setCards([]);
      setReviewLogs([]);
    }
  }, [activeDeckId, refreshCards, refreshReviewLogs, user]);

  const createDeck = useCallback(async (name: string): Promise<string> => {
    const { data, error } = await supabase
      .from('decks')
      .insert({ name })
      .select()
      .single();
    if (error) { console.error('Failed to create deck:', error); return ''; }
    const deck = fromDbDeck(data);
    await refreshDecks();
    setActiveDeckId(deck.id);
    return deck.id;
  }, [refreshDecks]);

  const renameDeck = useCallback(async (id: string, name: string) => {
    const { error } = await supabase.from('decks').update({ name }).eq('id', id);
    if (error) console.error('Failed to rename deck:', error);
    await refreshDecks();
  }, [refreshDecks]);

  const duplicateDeck = useCallback(async (id: string) => {
    const deck = decks.find((d) => d.id === id);
    if (!deck) return;
    const { data: newDeckData, error: deckError } = await supabase
      .from('decks')
      .insert({ name: `${deck.name} (Copy)`, exam_date: null, final_review_hours: deck.finalReviewHours ?? 48 })
      .select()
      .single();
    if (deckError || !newDeckData) { console.error('Failed to duplicate deck:', deckError); return; }
    const newDeckId = newDeckData.id;

    const { data: deckCards, error: cardsError } = await supabase
      .from('cards')
      .select('*')
      .eq('deck_id', id);
    if (cardsError || !deckCards) { console.error('Failed to load cards for duplicate:', cardsError); return; }

    const now = Date.now();
    const newCards = deckCards.map((c, i) => ({
      deck_id: newDeckId,
      card_type: c.card_type,
      front_text: c.front_text,
      back_text: c.back_text,
      front_image: c.front_image,
      back_image: c.back_image,
      tags: c.tags,
      sort_order: c.sort_order,
      masks: c.masks,
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      state: 0,
      last_review: null,
      due: now,
    }));

    const { error: insertError } = await supabase.from('cards').insert(newCards);
    if (insertError) console.error('Failed to insert duplicated cards:', insertError);

    await refreshDecks();
    setActiveDeckId(newDeckId);
  }, [decks, refreshDecks]);

  const removeDeck = useCallback(async (id: string) => {
    const { error } = await supabase.from('decks').delete().eq('id', id);
    if (error) console.error('Failed to delete deck:', error);
    await refreshDecks();
    if (activeDeckId === id) {
      const remaining = decks.filter((d) => d.id !== id);
      setActiveDeckId(remaining.length > 0 ? remaining[0].id : null);
    }
  }, [activeDeckId, decks, refreshDecks]);

  const setExamDate = useCallback(async (deckId: string, date: number | null) => {
    const { error } = await supabase.from('decks').update({ exam_date: date }).eq('id', deckId);
    if (error) console.error('Failed to set exam date:', error);
    await refreshDecks();
  }, [refreshDecks]);

  const setFinalReviewHours = useCallback(async (deckId: string, hours: number) => {
    const { error } = await supabase.from('decks').update({ final_review_hours: hours }).eq('id', deckId);
    if (error) console.error('Failed to set final review hours:', error);
    await refreshDecks();
  }, [refreshDecks]);

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
    const { data: existing } = await supabase
      .from('cards')
      .select('sort_order')
      .eq('deck_id', deckId)
      .order('sort_order', { ascending: false })
      .limit(1);
    const maxSort = existing && existing.length > 0 ? (existing[0].sort_order as number) : -1;
    const now = Date.now();
    const { data, error } = await supabase
      .from('cards')
      .insert({
        deck_id: deckId,
        card_type: cardType,
        front_text: frontText,
        back_text: backText,
        front_image: frontImage,
        back_image: backImage,
        tags,
        sort_order: maxSort + 1,
        masks,
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        scheduled_days: 0,
        reps: 0,
        lapses: 0,
        state: 0,
        last_review: null,
        due: now,
      })
      .select()
      .single();
    if (error) { console.error('Failed to add card:', error); return null; }
    if (deckId === activeDeckId) await refreshCards(deckId);
    return fromDbCard(data);
  }, [activeDeckId, refreshCards]);

  const updateCard = useCallback(async (card: Card) => {
    const { error } = await supabase.from('cards').update(toDbCard(card)).eq('id', card.id);
    if (error) console.error('Failed to update card:', error);
    if (card.deckId === activeDeckId) await refreshCards(card.deckId);
  }, [activeDeckId, refreshCards]);

  const removeCard = useCallback(async (id: string) => {
    const { error } = await supabase.from('cards').delete().eq('id', id);
    if (error) console.error('Failed to delete card:', error);
    if (activeDeckId) await refreshCards(activeDeckId);
  }, [activeDeckId, refreshCards]);

  const resetDeckHistory = useCallback(async (deckId: string) => {
    const now = Date.now();
    const { data: deckCards, error: fetchError } = await supabase
      .from('cards')
      .select('*')
      .eq('deck_id', deckId);
    if (fetchError || !deckCards) { console.error('Failed to fetch cards for reset:', fetchError); return; }

    const updates = deckCards.map((c) => ({
      id: c.id,
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      state: 0,
      last_review: null,
      due: now,
    }));

    const { error: updateError } = await supabase.from('cards').upsert(updates);
    if (updateError) console.error('Failed to reset card history:', updateError);

    const { error: logDeleteError } = await supabase.from('review_logs').delete().eq('deck_id', deckId);
    if (logDeleteError) console.error('Failed to delete review logs:', logDeleteError);

    if (deckId === activeDeckId) {
      await refreshCards(deckId);
      await refreshReviewLogs(deckId);
    }
  }, [activeDeckId, refreshCards, refreshReviewLogs]);

  const logReview = useCallback(async (cardId: string, deckId: string, rating: Rating, timeSpentMs?: number) => {
    const { error } = await supabase.from('review_logs').insert({
      card_id: cardId,
      deck_id: deckId,
      rating,
      time_spent_ms: timeSpentMs ?? null,
    });
    if (error) console.error('Failed to log review:', error);
  }, []);

  const bulkDeleteCards = useCallback(async (cardIds: string[]) => {
    if (cardIds.length === 0) return;
    const { error } = await supabase.from('cards').delete().in('id', cardIds);
    if (error) console.error('Failed to bulk delete cards:', error);
    if (activeDeckId) await refreshCards(activeDeckId);
  }, [activeDeckId, refreshCards]);

  const bulkMoveCards = useCallback(async (cardIds: string[], targetDeckId: string) => {
    const { data: targetCards } = await supabase
      .from('cards')
      .select('sort_order')
      .eq('deck_id', targetDeckId)
      .order('sort_order', { ascending: false })
      .limit(1);
    const maxSort = targetCards && targetCards.length > 0 ? (targetCards[0].sort_order as number) : -1;
    const updates = cardIds.map((id, i) => ({ id, deck_id: targetDeckId, sort_order: maxSort + 1 + i }));
    const { error } = await supabase.from('cards').upsert(updates);
    if (error) console.error('Failed to bulk move cards:', error);
    if (activeDeckId) await refreshCards(activeDeckId);
  }, [activeDeckId, refreshCards]);

  const bulkResetHistory = useCallback(async (cardIds: string[]) => {
    const now = Date.now();
    const updates = cardIds.map((id) => ({
      id,
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      state: 0,
      last_review: null,
      due: now,
    }));
    const { error } = await supabase.from('cards').upsert(updates);
    if (error) console.error('Failed to bulk reset history:', error);
    if (activeDeckId) await refreshCards(activeDeckId);
  }, [activeDeckId, refreshCards]);

  const reorderCards = useCallback(async (reorderedCards: Card[]) => {
    const updates = reorderedCards.map((c, i) => ({ id: c.id, sort_order: i }));
    const { error } = await supabase.from('cards').upsert(updates);
    if (error) console.error('Failed to reorder cards:', error);
    if (activeDeckId) await refreshCards(activeDeckId);
  }, [activeDeckId, refreshCards]);

  const importCSV = useCallback(async (deckId: string, rows: { front: string; back: string }[]) => {
    if (rows.length === 0) return;
    const { data: existing } = await supabase
      .from('cards')
      .select('sort_order')
      .eq('deck_id', deckId)
      .order('sort_order', { ascending: false })
      .limit(1);
    const maxSort = existing && existing.length > 0 ? (existing[0].sort_order as number) : -1;
    const now = Date.now();
    const newCards = rows.map((row, i) => ({
      deck_id: deckId,
      card_type: 'basic' as CardType,
      front_text: row.front,
      back_text: row.back,
      front_image: null,
      back_image: null,
      tags: [] as string[],
      sort_order: maxSort + 1 + i,
      masks: [] as MaskRect[],
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      state: 0,
      last_review: null,
      due: now,
    }));
    const { error } = await supabase.from('cards').insert(newCards);
    if (error) console.error('Failed to import CSV:', error);
    if (deckId === activeDeckId) await refreshCards(deckId);
  }, [activeDeckId, refreshCards]);

  const toggleGarden = useCallback(async (enabled: boolean) => {
    if (!user) return;
    setGardenEnabled(enabled);
    const { error } = await supabase
      .from('user_settings')
      .upsert({ id: user.id, garden_enabled: enabled, theme: 'light' });
    if (error) console.error('Failed to toggle garden:', error);
  }, [user]);

  const activeDeck = decks.find((d) => d.id === activeDeckId) || null;

  return {
    decks,
    cards,
    reviewLogs,
    activeDeck,
    activeDeckId,
    loading,
    gardenEnabled,
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
    importCSV,
    refreshCards,
    refreshReviewLogs,
    refreshAllReviewLogs,
    toggleGarden,
  };
}
