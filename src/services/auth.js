// src/services/auth.js
// Всі функції авторизації через Firebase Auth + Firestore профіль
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { Platform } from 'react-native';

// ─── Реєстрація ──────────────────────────────────────────────────────────────

/**
 * Реєструє нового користувача.
 * Створює запис у Firestore: users/{uid}
 */
export async function registerUser({ imie, email, haslo }) {
  // 1. Створюємо акаунт у Firebase Auth
  const { user } = await createUserWithEmailAndPassword(auth, email, haslo);

  // 2. Встановлюємо displayName
  await updateProfile(user, { displayName: imie });

  // 3. Зберігаємо профіль у Firestore
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    name: imie,     // ← зберігаємо як 'name', бо ProfileScreen читає profile?.name
    email,
    avatar: null,
    age: null,      // також виправити: ProfileScreen читає profile?.age (не wiek)
    gender: null,   // також виправити: ProfileScreen читає profile?.gender (не plec)
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return user;
}

// ─── Логін ───────────────────────────────────────────────────────────────────

/**
 * Входить у систему за email + password.
 */
export async function loginUser({ email, haslo }) {
  const { user } = await signInWithEmailAndPassword(auth, email, haslo);
  return user;
}

// ─── Вихід ───────────────────────────────────────────────────────────────────

/**
 * Виходить з аккаунту.
 */
export async function logoutUser() {
  await signOut(auth);
}

// ─── Слухач стану авторизації ─────────────────────────────────────────────

/**
 * Підписується на зміни стану авторизації.
 * Повертає unsubscribe-функцію.
 * @param {(user: import('firebase/auth').User | null) => void} callback
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// ─── Отримання профілю з Firestore ───────────────────────────────────────────

/**
 * Повертає профіль користувача з колекції users.
 * @param {string} uid
 */
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return snap.data();
}

// ─── Оновлення профілю ────────────────────────────────────────────────────────

/**
 * Оновлює поля профілю у Firestore та displayName у Auth.
 * @param {string} uid
 * @param {{ imie?: string, wiek?: number, plec?: string, avatar?: string }} data
 */
export async function updateUserProfile(uid, data) {
  const ref = doc(db, 'users', uid);

  const firestoreUpdate = { ...data, updatedAt: serverTimestamp() };
  await updateDoc(ref, firestoreUpdate);

  // Оновлюємо displayName якщо змінилося ім'я
  if (data.name && auth.currentUser) {
    await updateProfile(auth.currentUser, { displayName: data.name });
  }
}

// ─── Скидання паролю ─────────────────────────────────────────────────────────

/**
 * Надсилає лист для скидання паролю.
 * @param {string} email
 */
export async function resetPassword(email) {
  // continueUrl допомагає Firebase правильно обробити редирект після скидання
  const actionCodeSettings = Platform.OS === 'web'
    ? {
        url: typeof window !== 'undefined'
          ? `${window.location.origin}/login`
          : 'https://your-app.web.app/login',
        handleCodeInApp: false,
      }
    : undefined;

  if (actionCodeSettings) {
    await sendPasswordResetEmail(auth, email, actionCodeSettings);
  } else {
    await sendPasswordResetEmail(auth, email);
  }
}

// ─── Зміна паролю (потребує reauthentication) ────────────────────────────────

/**
 * Змінює пароль поточного користувача.
 * @param {string} currentPassword
 * @param {string} newPassword
 */
export async function changePassword(currentPassword, newPassword) {
  const user = auth.currentUser;
  if (!user) throw new Error('Użytkownik nie jest zalogowany');

  // Reauthenticate перед зміною пароля
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);

  await updatePassword(user, newPassword);
}

// ─── Поточний юзер ───────────────────────────────────────────────────────────

/**
 * Повертає поточного користувача Firebase Auth (або null).
 */
export function getCurrentUser() {
  return auth.currentUser;
}
