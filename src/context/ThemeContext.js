// src/context/ThemeContext.js
// Глобальний контекст теми: dark | light | auto
// Використання: const { colors, isDark, themeMode, setThemeMode } = useTheme();

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getThemeColors } from '../config/theme';

const STORAGE_KEY = 'brain_trainer_theme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // 'auto' | 'dark' | 'light'
  const [themeMode, setThemeModeState] = useState('auto');
  const systemScheme = useColorScheme(); // 'dark' | 'light' | null

  // Завантажуємо збережену тему при старті
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'dark' || saved === 'light' || saved === 'auto') {
          setThemeModeState(saved);
        }
      })
      .catch(() => {});
  }, []);

  // Зберігаємо тему при зміні
  const setThemeMode = (mode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => {});
  };

  // Визначаємо чи зараз темна тема
  const isDark =
    themeMode === 'dark'
      ? true
      : themeMode === 'light'
      ? false
      : systemScheme === 'dark'; // auto — дивимось на пристрій

  const colors = getThemeColors(isDark);

  return (
    <ThemeContext.Provider value={{ colors, isDark, themeMode, setThemeMode, systemScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Хук для отримання поточної теми.
 * @returns {{ colors: object, isDark: boolean, themeMode: string, setThemeMode: Function, systemScheme: string }}
 */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}