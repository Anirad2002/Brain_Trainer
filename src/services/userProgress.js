// src/services/userProgress.js
// Глобальний рівень користувача у профілі.
// Бали з ігор + бали з тестів → загальний рівень.
// Рівень визначає: розблоковані ігри, аватари.
//
// Структура в Firestore: users/{uid}/progress
// {
//   totalXP: number,
//   level: number,
//   gameScores: { [gameId]: { bestScore, bestLevel, gamesPlayed, difficulty } },
//   testScores: { [testId]: { bestStreak, totalCorrect, attempts } },
//   lastUpdated: timestamp,
// }

import { doc, getDoc, updateDoc, setDoc, serverTimestamp, increment } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../config/firebase';

// ─── Рівні: скільки XP потрібно для кожного ──────────────────────────────────
export const LEVEL_THRESHOLDS = [
  0,    // рівень 1 (старт)
  100,  // рівень 2
  250,  // рівень 3
  500,  // рівень 4
  900,  // рівень 5
  1400, // рівень 6
  2100, // рівень 7
  3000, // рівень 8
  4200, // рівень 9
  6000, // рівень 10 
  8000, // рівень 11
  10000, // рівень 12
  12000, // рівень 13
  14000, // рівень 14
];

// ─── Що розблоковується на якому рівні профілю ───────────────────────────────

// Ігри: { route, level_required }
export const GAME_UNLOCK_LEVELS = {
  MemoryGame:    1,
  MathGame:      1,
  WordsGame:     2,
  ReactionGame:  2,
  NumbersGame:   3,
  SequenceGame:  3,
  LogicGame:     4,
};

// Аватари: { key, level_required }
export const AVATAR_UNLOCK_LEVELS = {
  cat:               1,
  dog:               1,
  butterfly:         3,
  fox:               4,
  owl:               6,
  bear:              8,
  cat_art:           9,
  fox_art:          10,
  dog_art:          11,
  butterfly_art:    12,
};

// ─── Обчислення рівня по XP ───────────────────────────────────────────────────
export function calcLevel(xp) {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return Math.min(level, LEVEL_THRESHOLDS.length);
}

export function xpForNextLevel(currentLevel) {
  if (currentLevel >= LEVEL_THRESHOLDS.length) return null; // макс
  return LEVEL_THRESHOLDS[currentLevel]; // наступний поріг
}

export function xpProgressPct(xp) {
  const level = calcLevel(xp);
  const current = LEVEL_THRESHOLDS[level - 1] || 0;
  const next = LEVEL_THRESHOLDS[level];
  if (!next) return 100;
  return Math.round(((xp - current) / (next - current)) * 100);
}

// ─── Кеш ключ ────────────────────────────────────────────────────────────────
const CACHE_KEY = 'user_progress_cache';

// ─── Отримати прогрес ─────────────────────────────────────────────────────────
export async function getUserProgressData(uid) {
  if (!uid) return getDefaultProgress();
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      const d = snap.data();
      const progress = {
        totalXP:    d.totalXP    || 0,
        level:      d.level      || 1,
        gameScores: d.gameScores || {},
        testScores: d.testScores || {},
      };
      await AsyncStorage.setItem(CACHE_KEY + uid, JSON.stringify(progress));
      return progress;
    }
  } catch {
    // fallback to cache
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY + uid);
      if (cached) return JSON.parse(cached);
    } catch {}
  }
  return getDefaultProgress();
}

function getDefaultProgress() {
  return { totalXP: 0, level: 1, gameScores: {}, testScores: {} };
}

// ─── Додати XP від гри ────────────────────────────────────────────────────────
export async function addGameXP(uid, { gameId, score, level, difficulty, won }) {
  if (!uid || !won) return null;

  const xp = Math.round(score * 0.5); // 1 бал гри = 0.5 XP
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    const data = snap.exists() ? snap.data() : {};

    const prevBest = data.gameScores?.[gameId]?.bestScore || 0;
    const isNewBest = score > prevBest;

    const updates = {
      totalXP:                                increment(xp),
      [`gameScores.${gameId}.gamesPlayed`]:   increment(1),
      [`gameScores.${gameId}.difficulty`]:    difficulty || 'Średni',
      updatedAt:                              serverTimestamp(),
    };
    if (isNewBest) {
      updates[`gameScores.${gameId}.bestScore`] = score;
      updates[`gameScores.${gameId}.bestLevel`] = level;
    }

    // Перераховуємо рівень
    const newXP = (data.totalXP || 0) + xp;
    const newLevel = calcLevel(newXP);
    updates.level = newLevel;

    await updateDoc(ref, updates);
    return { xpGained: xp, newLevel, newXP };
  } catch { return null; }
}

// ─── Додати XP від тесту ──────────────────────────────────────────────────────
export async function addTestXP(uid, { testId, correct, total, streak }) {
  if (!uid || correct === 0) return null;

  const xp = correct * 2; // 1 правильна відповідь = 2 XP
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    const data = snap.exists() ? snap.data() : {};

    const prevBestStreak = data.testScores?.[testId]?.bestStreak || 0;

    const updates = {
      totalXP:                                increment(xp),
      [`testScores.${testId}.totalCorrect`]:  increment(correct),
      [`testScores.${testId}.attempts`]:     increment(1),
      updatedAt:                              serverTimestamp(),
    };
    if (streak > prevBestStreak) {
      updates[`testScores.${testId}.bestStreak`] = streak;
    }

    const newXP = (data.totalXP || 0) + xp;
    const newLevel = calcLevel(newXP);
    updates.level = newLevel;

    await updateDoc(ref, updates);
    return { xpGained: xp, newLevel, newXP };
  } catch { return null; }
}