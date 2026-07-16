// src/services/gameStorage.js
// Прогрес ігор зберігається у Firestore (синхронізація між веб і Android)
// + AsyncStorage як кеш для офлайн-режиму
//
// Структура Firestore: users/{uid}/gameProgress/{gameId}
// {
//   currentLevel: number,
//   unlockedLevel: number,
//   totalScore: number,
//   history: [{ date, level, score, duration, won }]
// }

import { doc, getDoc, setDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const MAX_HISTORY = 50;

export const UNLOCK_SCORE = {
  1: 50,
  2: 120,
  3: 250,
  4: 400,
  5: 600,
};

// ─── Чекаємо поки Firebase Auth ініціалізується ───────────────────────────────
// На Android auth.currentUser може бути null одразу після старту —
// ця функція чекає до 5 секунд поки стан авторизації стане відомим.
function waitForUid(timeoutMs = 5000) {
  return new Promise((resolve) => {
    if (auth.currentUser) {         
      resolve(auth.currentUser.uid);
      return;
    }
    // В усіх інших випадках (null або undefined) — чекаємо Auth
    const timer = setTimeout(() => {
      unsub();
      resolve(auth.currentUser?.uid || null);
    }, timeoutMs);

    const unsub = onAuthStateChanged(auth, (user) => {
      clearTimeout(timer);
      unsub();
      resolve(user?.uid || null);
    });
  });
}

// Ключ AsyncStorage (кеш)
function getCacheKey(gameId, uid) {
  return `game_${uid || 'anonymous'}_${gameId}`;
}

const DEFAULT_PROGRESS = {
  currentLevel: 1,
  unlockedLevel: 1,
  totalScore: 0,
  history: [],
};

// ─── Отримати прогрес гри ────────────────────────────────────────────────────
export async function getGameProgress(gameId) {
  // ← ВИПРАВЛЕННЯ: чекаємо uid замість auth.currentUser?.uid
  const uid = await waitForUid();

  // Якщо не залогований — тільки локальний кеш
  if (!uid) {
    try {
      const raw = await AsyncStorage.getItem(getCacheKey(gameId, 'anonymous'));
      if (raw) return JSON.parse(raw);
    } catch {}
    return { ...DEFAULT_PROGRESS };
  }

  // Спробуємо Firestore (завжди першим — це єдине джерело правди)
  try {
    const ref = doc(db, 'users', uid, 'gameProgress', gameId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      // Кешуємо локально для офлайн-режиму
      await AsyncStorage.setItem(getCacheKey(gameId, uid), JSON.stringify(data)).catch(() => {});
      return data;
    }
    // Документ не існує — повертаємо дефолт (перша гра)
    return { ...DEFAULT_PROGRESS };
  } catch {
    // Firestore недоступний — беремо з кешу
    try {
      const raw = await AsyncStorage.getItem(getCacheKey(gameId, uid));
      if (raw) return JSON.parse(raw);
    } catch {}
  }

  return { ...DEFAULT_PROGRESS };
}

// ─── Зберегти результат після гри ────────────────────────────────────────────
export async function saveGameResult(gameId, { level, score, duration, won }) {
  // ← ВИПРАВЛЕННЯ: чекаємо uid
  const uid = await waitForUid();
  const progress = await getGameProgress(gameId);

  const entry = { date: new Date().toISOString(), level, score, duration, won };
  const history = [entry, ...progress.history].slice(0, MAX_HISTORY);
  const totalScore = progress.totalScore + score;

  let unlockedLevel = progress.unlockedLevel;
  let newUnlock = false;
  const required = UNLOCK_SCORE[level];

  if (won && score >= required && level === unlockedLevel && unlockedLevel < 5) {
    unlockedLevel = level + 1;
    newUnlock = true;
  }

  const updated = { currentLevel: level, unlockedLevel, totalScore, history };

  // Зберігаємо локально завжди
  const cacheKey = getCacheKey(gameId, uid || 'anonymous');
  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify(updated));
  } catch {}

  // Зберігаємо у Firestore якщо є uid
  if (uid) {
    try {
      const ref = doc(db, 'users', uid, 'gameProgress', gameId);
      await setDoc(ref, updated, { merge: false });
    } catch (e) {
      console.warn('Firestore saveGameResult error:', e);
    }
  }

  return { newUnlock, unlockedLevel };
}

// ─── Встановити поточний рівень ───────────────────────────────────────────────
export async function setCurrentLevel(gameId, level) {
  // ← ВИПРАВЛЕННЯ: чекаємо uid
  const uid = await waitForUid();
  const progress = await getGameProgress(gameId);
  if (level > progress.unlockedLevel) return;

  const updated = { ...progress, currentLevel: level };

  const cacheKey = getCacheKey(gameId, uid || 'anonymous');
  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify(updated));
  } catch {}

  if (uid) {
    try {
      const ref = doc(db, 'users', uid, 'gameProgress', gameId);
      await setDoc(ref, updated, { merge: false });
    } catch {}
  }
}

// ─── Скинути прогрес ─────────────────────────────────────────────────────────
export async function resetGameProgress(gameId) {
  const uid = await waitForUid();
  const cacheKey = getCacheKey(gameId, uid || 'anonymous');
  try {
    await AsyncStorage.removeItem(cacheKey);
  } catch {}

  if (uid) {
    try {
      const ref = doc(db, 'users', uid, 'gameProgress', gameId);
      await setDoc(ref, { ...DEFAULT_PROGRESS });
    } catch {}
  }
}

// ─── Отримати статистику по всіх іграх ───────────────────────────────────────
export async function getAllStats() {
  const ids = ['memory', 'math', 'words', 'reaction', 'numbers', 'sequence', 'logic'];
  const result = {};
  for (const id of ids) {
    result[id] = await getGameProgress(id);
  }
  return result;
}

// ─── Форматування ────────────────────────────────────────────────────────────
export function formatDuration(ms) {
  if (!ms) return '0s';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}min ${s % 60}s`;
}

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
