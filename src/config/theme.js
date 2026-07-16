// src/config/theme.js
// Brain-trainer style: індиго акцент, темна + світла теми

import { Platform } from 'react-native';

// ─── ТЕМНА ТЕМА ───────────────────────────────────────────────────────────────
export const DARK_COLORS = {
  primary: '#4F46E5',
  primaryLight: '#6D63FF',
  primaryDark: '#3730A3',
  background: '#0F0E17',
  surface: '#1A1929',
  surfaceAlt: '#241F3A',
  text: '#EAEAF0',
  textSecondary: '#9B99B5',
  textMuted: '#5E5C7A',
  border: '#2E2A4A',
  borderFocus: '#4F46E5',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  white: '#FFFFFF',
  black: '#000000',
  tabBar: '#13121F',
  tabBarBorder: '#2E2A4A',
  tabActive: '#4F46E5',
  tabInactive: '#5E5C7A',
};

// ─── СВІТЛА ТЕМА ─────────────────────────────────────────────────────────────
export const LIGHT_COLORS = {
  primary: '#4F46E5',
  primaryLight: '#4338CA',
  primaryDark: '#3730A3',
  background: '#F5F4FF',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF0FF',
  text: '#1A1840',
  textSecondary: '#5B5880',
  textMuted: '#9896B5',
  border: '#DDD9FF',
  borderFocus: '#4F46E5',
  success: '#059669',
  error: '#DC2626',
  warning: '#D97706',
  white: '#FFFFFF',
  black: '#000000',
  tabBar: '#FFFFFF',
  tabBarBorder: '#DDD9FF',
  tabActive: '#4F46E5',
  tabInactive: '#9896B5',
};

// Зворотна сумісність — не використовувати в нових файлах
export const COLORS = DARK_COLORS;

export function getThemeColors(isDark) {
  return isDark ? DARK_COLORS : LIGHT_COLORS;
}

export const FONTS = {
  size: { xs: 11, sm: 13, base: 15, md: 17, lg: 20, xl: 24, xxl: 30, display: 36 },
  weight: { normal: '400', medium: '500', semibold: '600', bold: '700', extrabold: '800' },
};

export const SPACING = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

export const RADIUS = { sm: 8, md: 12, lg: 18, xl: 24, full: 999 };

export function getShadow(type = 'card') {
  if (Platform.OS === 'web') {
    const map = {
      card:   { boxShadow: '0 4px 24px rgba(79,70,229,0.18)' },
      button: { boxShadow: '0 2px 12px rgba(79,70,229,0.35)' },
      sm:     { boxShadow: '0 2px 8px rgba(79,70,229,0.12)' },
    };
    return map[type] || {};
  }
  if (Platform.OS === 'android') {
    return { card: { elevation: 8 }, button: { elevation: 5 }, sm: { elevation: 3 } }[type] || {};
  }
  const map = {
    card:   { shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 16 },
    button: { shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.35, shadowRadius: 8 },
    sm:     { shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 4 },
  };
  return map[type] || {};
}