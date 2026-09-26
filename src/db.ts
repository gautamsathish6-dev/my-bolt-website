import { Deck, Card, ReviewLog } from './types';

const DB_NAME = 'omnideck-db';
const DB_VERSION = 4;
const DECKS_STORE = 'decks';
const CARDS_STORE = 'cards';
const LOGS_STORE = 'reviewLogs';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;

      if (!db.objectStoreNames.contains(DECKS_STORE)) {
        db.createObjectStore(DECKS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(CARDS_STORE)) {
        const store = db.createObjectStore(CARDS_STORE, { keyPath: 'id' });
        store.createIndex('deckId', 'deckId', { unique: false });
      }
      if (!db.objectStoreNames.contains(LOGS_STORE)) {
        const store = db.createObjectStore(LOGS_STORE, { keyPath: 'id' });
        store.createIndex('cardId', 'cardId', { unique: false });
        store.createIndex('deckId', 'deckId', { unique: false });
      }

      if (oldVersion < 3 && db.objectStoreNames.contains(DECKS_STORE)) {
        const tx = (event.target as IDBOpenDBRequest).transaction;
        if (tx) {
          const store = tx.objectStore(DECKS_STORE);
          const getAllReq = store.getAll();
          getAllReq.onsuccess = () => {
            for (const deck of getAllReq.result as Deck[]) {
              if (deck.finalReviewHours === undefined) {
                store.put({ ...deck, finalReviewHours: 48 });
              }
            }
          };
        }
      }

      // v4: migrate cloze cards to basic
      if (oldVersion < 4 && db.objectStoreNames.contains(CARDS_STORE)) {
        const tx = (event.target as IDBOpenDBRequest).transaction;
        if (tx) {
          const store = tx.objectStore(CARDS_STORE);
          const getAllReq = store.getAll();
          getAllReq.onsuccess = () => {
            for (const card of getAllReq.result as Card[]) {
              if ((card.cardType as string) === 'cloze') {
                store.put({ ...card, cardType: 'basic' });
              }
            }
          };
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

function tx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const request = fn(store);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      })
  );
}

// Decks
export async function getAllDecks(): Promise<Deck[]> {
  return tx<Deck[]>(DECKS_STORE, 'readonly', (s) => s.getAll() as IDBRequest<Deck[]>);
}

export async function saveDeck(deck: Deck): Promise<void> {
  await tx(DECKS_STORE, 'readwrite', (s) => s.put(deck));
}

export async function deleteDeck(id: string): Promise<void> {
  await tx(DECKS_STORE, 'readwrite', (s) => s.delete(id));
}

// Cards
export async function getCardsByDeck(deckId: string): Promise<Card[]> {
  const db = await openDB();
  return new Promise<Card[]>((resolve, reject) => {
    const transaction = db.transaction(CARDS_STORE, 'readonly');
    const store = transaction.objectStore(CARDS_STORE);
    const index = store.index('deckId');
    const request = index.getAll(deckId);
    request.onsuccess = () => resolve(request.result as Card[]);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCard(card: Card): Promise<void> {
  await tx(CARDS_STORE, 'readwrite', (s) => s.put(card));
}

export async function saveCards(cards: Card[]): Promise<void> {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(CARDS_STORE, 'readwrite');
    const store = transaction.objectStore(CARDS_STORE);
    for (const card of cards) {
      store.put(card);
    }
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function deleteCard(id: string): Promise<void> {
  await tx(CARDS_STORE, 'readwrite', (s) => s.delete(id));
}

export async function deleteCardsByDeck(deckId: string): Promise<void> {
  const cards = await getCardsByDeck(deckId);
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(CARDS_STORE, 'readwrite');
    const store = transaction.objectStore(CARDS_STORE);
    for (const card of cards) {
      store.delete(card.id);
    }
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Review Logs
export async function addReviewLog(log: ReviewLog): Promise<void> {
  await tx(LOGS_STORE, 'readwrite', (s) => s.put(log));
}

export async function getReviewLogsByDeck(deckId: string): Promise<ReviewLog[]> {
  const db = await openDB();
  return new Promise<ReviewLog[]>((resolve, reject) => {
    const transaction = db.transaction(LOGS_STORE, 'readonly');
    const store = transaction.objectStore(LOGS_STORE);
    const index = store.index('deckId');
    const request = index.getAll(deckId);
    request.onsuccess = () => resolve(request.result as ReviewLog[]);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteReviewLogsByDeck(deckId: string): Promise<void> {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(LOGS_STORE, 'readwrite');
    const store = transaction.objectStore(LOGS_STORE);
    const index = store.index('deckId');
    const request = index.getAllKeys(deckId);
    request.onsuccess = () => {
      for (const key of request.result) {
        store.delete(key);
      }
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Export / Import (full backup)
export async function exportAllData(): Promise<string> {
  const [decks, allCards, allLogs] = await Promise.all([
    getAllDecks(),
    (async () => {
      const db = await openDB();
      return new Promise<Card[]>((resolve, reject) => {
        const req = db.transaction(CARDS_STORE, 'readonly').objectStore(CARDS_STORE).getAll();
        req.onsuccess = () => resolve(req.result as Card[]);
        req.onerror = () => reject(req.error);
      });
    })(),
    (async () => {
      const db = await openDB();
      return new Promise<ReviewLog[]>((resolve, reject) => {
        const req = db.transaction(LOGS_STORE, 'readonly').objectStore(LOGS_STORE).getAll();
        req.onsuccess = () => resolve(req.result as ReviewLog[]);
        req.onerror = () => reject(req.error);
      });
    })(),
  ]);

  return JSON.stringify({ decks, cards: allCards, logs: allLogs, version: DB_VERSION });
}

export async function importAllData(json: string): Promise<void> {
  const data = JSON.parse(json) as { decks: Deck[]; cards: Card[]; logs: ReviewLog[] };
  const db = await openDB();

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([DECKS_STORE, CARDS_STORE, LOGS_STORE], 'readwrite');

    const deckStore = transaction.objectStore(DECKS_STORE);
    for (const deck of data.decks) {
      deckStore.put({ ...deck, finalReviewHours: deck.finalReviewHours ?? 48 });
    }

    const cardStore = transaction.objectStore(CARDS_STORE);
    for (const card of data.cards) {
      cardStore.put({
        ...card,
        cardType: (card.cardType as string) === 'cloze' ? 'basic' : (card.cardType ?? 'basic'),
        masks: card.masks ?? [],
      });
    }

    const logStore = transaction.objectStore(LOGS_STORE);
    for (const log of data.logs) logStore.put(log);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
