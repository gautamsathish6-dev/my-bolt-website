export interface Deck {
  id: string;
  name: string;
  createdAt: number;
  examDate: number | null;
  finalReviewHours: number;
}

export type CardType = 'basic' | 'occlusion';

export interface MaskRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Card {
  id: string;
  deckId: string;
  cardType: CardType;
  frontText: string;
  backText: string;
  frontImage: string | null;
  backImage: string | null;
  tags: string[];
  sortOrder: number;
  createdAt: number;
  masks: MaskRect[];
  // FSRS scheduling state
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: CardState;
  lastReview: number | null;
  due: number;
}

export enum CardState {
  New = 0,
  Learning = 1,
  Review = 2,
  Relearning = 3,
}

export type Rating = 'Again' | 'Hard' | 'Good' | 'Easy';

export interface ReviewLog {
  id: string;
  cardId: string;
  deckId: string;
  rating: Rating;
  reviewedAt: number;
}
