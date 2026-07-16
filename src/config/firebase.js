// src/config/firebase.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: ""
};

// Уникаємо подвійної ініціалізації (HMR / hot reload)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Auth: на Android/iOS зберігаємо сесію через AsyncStorage
let auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  // React Native потребує явного persistence
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Якщо вже ініціалізовано (hot reload)
    auth = getAuth(app);
  }
}

const db = getFirestore(app);

export { app, auth, db };