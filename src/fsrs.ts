import { Card, CardState, Rating } from './types';

// FSRS v4 default weights (20 parameters)
const DEFAULT_WEIGHTS = [
  0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14,
  0.94, 2.18, 0.05, 0.34, 1.26, 0.36, 1.02, 0.0, 0.0, 0.0,
];

const w = DEFAULT_WEIGHTS;
const DECAY = -0.5;
const FACTOR = Math.pow(0.9, 1 / DECAY) - 1;

function initStability(rating: Rating): number {
  switch (rating) {
    case 'Again': return w[2];
    case 'Hard': return w[3];
    case 'Good': return w[4];
    case 'Easy': return w[5];
  }
}

function initDifficulty(rating: Rating): number {
  const dInit = w[0];
  const dAgain = w[1];
  const r = ratingToIndex(rating);
  return Math.min(Math.max(dInit + (r - 2) * dAgain, 1), 10);
}

function ratingToIndex(rating: Rating): number {
  switch (rating) {
    case 'Again': return 1;
    case 'Hard': return 2;
    case 'Good': return 3;
    case 'Easy': return 4;
  }
}

function initDifficultyFromStability(s: number): number {
  return Math.min(Math.max(w[0] - Math.exp(w[17] * (s - w[16])) + 1, 1), 10);
}

function nextStability(d: number, s: number, r: number, rating: Rating): number {
  const hardPenalty = rating === 'Hard' ? w[15] : 1;
  const easyBonus = rating === 'Easy' ? w[16] : 1;

  if (rating === 'Again') {
    return nextForgetStability(d, s, r);
  }

  const newStability = s * (1 + Math.exp(w[8]) * (11 - d) * Math.pow(s, -w[9]) * (Math.exp((1 - r) * w[10]) - 1) * hardPenalty * easyBonus);
  return Math.min(Math.max(newStability, 0.1), 36500);
}

function nextForgetStability(d: number, s: number, r: number): number {
  return w[11] * Math.pow(d, -w[12]) * (Math.pow(s + 1, w[13]) - 1) * Math.exp((1 - r) * w[14]);
}

function nextDifficulty(d: number, rating: Rating): number {
  const nextD = d - w[6] * (ratingToIndex(rating) - 3);
  return Math.min(Math.max(meanReversion(w[0], nextD), 1), 10);
}

function meanReversion(init: number, current: number): number {
  return w[7] * init + (1 - w[7]) * current;
}

function nextInterval(s: number, elapsedDays: number, maxInterval: number): number {
  const factor = Math.pow(s * FACTOR + 1, DECAY);
  let interval = s * factor * Math.pow(elapsedDays + 1, -DECAY);
  interval = Math.max(interval, s);
  return Math.min(Math.round(interval), maxInterval);
}

function getRetrievability(elapsedDays: number, stability: number): number {
  if (stability <= 0) return 0;
  return Math.exp(Math.log(0.9) * elapsedDays / stability);
}

export function maxIntervalDefault(): number {
  return 36500;
}

export function scheduleCard(
  card: Card,
  rating: Rating,
  now: number,
  maxInterval: number = 36500
): Card {
  try {
    const elapsedDays = card.lastReview !== null
      ? Math.max(0, Math.floor((now - card.lastReview) / 86400000))
      : 0;

    let newState: CardState;
    let newStability: number;
    let newDifficulty: number;
    let newReps = card.reps + 1;
    let newLapses = card.lapses;

    if (card.state === CardState.New) {
      if (rating === 'Again') {
        newState = CardState.Learning;
        newStability = initStability('Again');
        newDifficulty = initDifficulty('Again');
      } else {
        newState = rating === 'Easy' ? CardState.Review : CardState.Learning;
        newStability = initStability(rating);
        newDifficulty = initDifficulty(rating);
      }
    } else if (card.state === CardState.Learning || card.state === CardState.Relearning) {
      if (rating === 'Again') {
        newState = card.state;
        newStability = initStability('Again');
        newDifficulty = nextDifficulty(card.difficulty, 'Again');
        newLapses = card.lapses;
      } else {
        newState = CardState.Review;
        newStability = initStability(rating);
        newDifficulty = initDifficulty(rating);
      }
    } else {
      // Review state
      const r = getRetrievability(elapsedDays, card.stability);
      if (rating === 'Again') {
        newState = CardState.Relearning;
        newStability = nextForgetStability(card.difficulty, card.stability, r);
        newDifficulty = nextDifficulty(card.difficulty, 'Again');
        newLapses = card.lapses + 1;
      } else {
        newState = CardState.Review;
        newStability = nextStability(card.difficulty, card.stability, r, rating);
        newDifficulty = nextDifficulty(card.difficulty, rating);
      }
    }

    if (isNaN(newStability) || isNaN(newDifficulty) || !isFinite(newStability) || !isFinite(newDifficulty)) {
      throw new Error('FSRS produced NaN or invalid value');
    }

    const scheduledDays = nextInterval(newStability, elapsedDays, maxInterval);
    if (isNaN(scheduledDays) || !isFinite(scheduledDays)) {
      throw new Error('FSRS interval calculation produced invalid value');
    }
    const nextDue = now + scheduledDays * 86400000;

    return {
      ...card,
      state: newState,
      stability: newStability,
      difficulty: newDifficulty,
      reps: newReps,
      lapses: newLapses,
      elapsedDays,
      scheduledDays,
      lastReview: now,
      due: nextDue,
    };
  } catch {
    return {
      ...card,
      state: card.state === CardState.New ? CardState.Learning : card.state,
      reps: card.reps + 1,
      lastReview: now,
      due: now + 86400000,
      scheduledDays: 1,
    };
  }
}

export function isCardDue(card: Card, now: number): boolean {
  return card.due <= now;
}

export function getDueCount(cards: Card[], now: number): number {
  return cards.filter((c) => isCardDue(c, now)).length;
}

export function getNewCount(cards: Card[]): number {
  return cards.filter((c) => c.state === CardState.New).length;
}

export function createNewCard(
  deckId: string,
  frontText: string,
  backText: string,
  frontImage: string | null,
  backImage: string | null
): Card {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    deckId,
    cardType: 'basic',
    frontText,
    backText,
    frontImage,
    backImage,
    tags: [],
    sortOrder: 0,
    createdAt: now,
    masks: [],
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    state: CardState.New,
    lastReview: null,
    due: now,
  };
}

export function resetCardSchedule(card: Card): Card {
  return {
    ...card,
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    state: CardState.New,
    lastReview: null,
    due: Date.now(),
  };
}
