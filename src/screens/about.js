// src/screens/about.js
// Про програму

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { FONTS, SPACING, RADIUS, getShadow } from '../config/theme';

const APP_VERSION = '1.0.0';
const GITHUB_URL  = 'https://github.com/Anirad2002/Proekt_dyplomowe';

// ─── Функціонал застосунку ────────────────────────────────────────────────────
const FEATURES = [
  { emoji: '🧠', title: 'Trening mózgu',         desc: 'Gry i ćwiczenia rozwijające pamięć, uwagę oraz logikę' },
  { emoji: '📝', title: 'Testy wiedzy',          desc: 'Sprawdzaj wiedzę z matematyki, języka i tematów ogólnych' },
  { emoji: '🎵', title: 'Muzyka w tle',          desc: 'Kolekcja utworów wspierających koncentrację i naukę' },
  { emoji: '👤', title: 'Profil osobisty',       desc: 'Zapisuj postępy i personalizuj swoje konto' },
  { emoji: '🌓', title: 'Ciemny i jasny motyw',  desc: 'Automatycznie dostosowuje się do ustawień urządzenia' },
  { emoji: '📱', title: 'Web + Android',         desc: 'Działa w przeglądarce i na Androidzie bez zmian w kodzie' },
];

// ─── Технологічний стек ───────────────────────────────────────────────────────
const TECH_STACK = [
  { emoji: '⚛️',  label: 'React Native' },
  { emoji: '📦',  label: 'Expo' },
  { emoji: '🔥',  label: 'Firebase' },
  { emoji: '🗺️',  label: 'React Navigation' },
  { emoji: '🎵',  label: 'expo-audio' },
  { emoji: '💾',  label: 'AsyncStorage' },
];

// ─── Компоненти ───────────────────────────────────────────────────────────────
function FeatureItem({ emoji, title, desc, colors, isLast }) {
  return (
    <>
      <View style={styles.featureRow}>
        <View style={[styles.featureIcon, { backgroundColor: colors.primary + '18' }]}>
          <Text style={{ fontSize: 22 }}>{emoji}</Text>
        </View>
        <View style={styles.featureTexts}>
          <Text style={[styles.featureTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>{desc}</Text>
        </View>
      </View>
      {!isLast && <View style={[styles.sep, { backgroundColor: colors.border }]} />}
    </>
  );
}

function TechChip({ emoji, label, colors }) {
  return (
    <View style={[styles.techChip, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      <Text style={{ fontSize: 16 }}>{emoji}</Text>
      <Text style={[styles.techLabel, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

// ─── Головний екран ───────────────────────────────────────────────────────────
export default function AboutScreen() {
  const { colors, isDark } = useTheme();

  const openGitHub = () => {
    Linking.openURL(GITHUB_URL).catch(() => {});
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Шапка з вашою іконкою */}
        <View style={[styles.heroCard, getShadow('card'), { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.blob} />
          <View style={[styles.logoCircle, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '55' }]}>
            <Image 
              source={require('../../assets/images/free-icon-brain-training.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>Brain Trainer</Text>
          <Text style={[styles.appTagline, { color: colors.textSecondary }]}>
            Trenuj umysł. Każdego dnia.
          </Text>
          <View style={[styles.versionBadge, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '44' }]}>
            <Text style={[styles.versionText, { color: colors.primary }]}>
              v{APP_VERSION} · {Platform.OS === 'web' ? 'Web' : 'Android'}
            </Text>
          </View>
        </View>

        {/* Опис */}
        <View style={[styles.descCard, getShadow('sm'), { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.descText, { color: colors.textSecondary }]}>
            Brain Trainer to aplikacja służąca do rozwoju zdolności poznawczych. Regularne treningi poprawiają pamięć, koncentrację oraz szybkość myślenia. Dostępna na Androida oraz w przeglądarce.
          </Text>
        </View>

        {/* Функціонал */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Możliwości</Text>
        <View style={[styles.card, getShadow('sm'), { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {FEATURES.map((f, idx) => (
            <FeatureItem
              key={f.title}
              {...f}
              colors={colors}
              isLast={idx === FEATURES.length - 1}
            />
          ))}
        </View>

        {/* Технології */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Technologie</Text>
        <View style={[styles.card, getShadow('sm'), { backgroundColor: colors.surface, borderColor: colors.border, padding: SPACING.md }]}>
          <View style={styles.techGrid}>
            {TECH_STACK.map((t) => (
              <TechChip key={t.label} {...t} colors={colors} />
            ))}
          </View>
        </View>

        {/* GitHub */}
        <TouchableOpacity
          style={[styles.githubBtn, getShadow('button'), { backgroundColor: colors.primary }]}
          onPress={openGitHub}
          activeOpacity={0.85}
        >
          <Text style={{ fontSize: 20 }}>⚡</Text>
          <Text style={styles.githubBtnText}>Otwórz na GitHubie</Text>
        </TouchableOpacity>

        {/* Авторство */}
        <View style={[styles.authorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ fontSize: 32 }}>👨‍💻</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.authorName, { color: colors.text }]}>Daryna Psiura 44066</Text>
            <Text style={[styles.authorSub, { color: colors.textSecondary }]}>
              Twórca projektu React Native + Firebase
            </Text>
          </View>
        </View>

        {/* Підвал */}
        <Text style={[styles.footer, { color: colors.textMuted }]}>
          © 2026 Brain Trainer{'\n'}
          Stworzono z ❤️ dla rozwoju umysłu
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Стилі ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: SPACING.md, paddingBottom: SPACING.xxl },

  heroCard: {
    borderRadius: RADIUS.xl, padding: SPACING.xl,
    alignItems: 'center', borderWidth: 1,
    marginBottom: SPACING.md, overflow: 'hidden', position: 'relative',
  },
  blob: {
    position: 'absolute', width: 200, height: 200,
    borderRadius: 100, backgroundColor: '#4F46E5',
    opacity: 0.06, top: -60, right: -60,
  },
  logoCircle: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  logoImage: {
    width: '65%',
    height: '65%',
  },
  appName: { fontSize: FONTS.size.xxl, fontWeight: FONTS.weight.extrabold, letterSpacing: 0.5 },
  appTagline: { fontSize: FONTS.size.sm, marginTop: SPACING.xs, marginBottom: SPACING.md },
  versionBadge: {
    paddingHorizontal: SPACING.md, paddingVertical: 5,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  versionText: { fontSize: FONTS.size.xs, fontWeight: FONTS.weight.semibold },

  descCard: {
    borderRadius: RADIUS.xl, padding: SPACING.lg,
    borderWidth: 1, marginBottom: SPACING.lg,
  },
  descText: { fontSize: FONTS.size.sm, lineHeight: 22, textAlign: 'center' },

  sectionLabel: {
    fontSize: FONTS.size.xs, fontWeight: FONTS.weight.semibold,
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginBottom: SPACING.sm,
  },

  card: { borderRadius: RADIUS.xl, borderWidth: 1, marginBottom: SPACING.lg, overflow: 'hidden' },

  featureRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: SPACING.md, gap: SPACING.md,
  },
  featureIcon: {
    width: 44, height: 44, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center',
  },
  featureTexts: { flex: 1, paddingTop: 2 },
  featureTitle: { fontSize: FONTS.size.base, fontWeight: FONTS.weight.semibold },
  featureDesc: { fontSize: FONTS.size.xs, lineHeight: 18, marginTop: 3 },
  sep: { height: 1, marginLeft: 44 + SPACING.md * 2 },

  techGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  techChip: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    paddingHorizontal: SPACING.sm, paddingVertical: 8,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  techLabel: { fontSize: FONTS.size.sm, fontWeight: FONTS.weight.medium },

  githubBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: RADIUS.full, paddingVertical: 15,
    marginBottom: SPACING.md, gap: SPACING.sm,
  },
  githubBtnText: { color: '#fff', fontSize: FONTS.size.md, fontWeight: FONTS.weight.bold },

  authorCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    borderRadius: RADIUS.xl, padding: SPACING.md,
    borderWidth: 1, marginBottom: SPACING.md,
  },
  authorName: { fontSize: FONTS.size.md, fontWeight: FONTS.weight.bold },
  authorSub: { fontSize: FONTS.size.xs, marginTop: 3 },

  footer: { textAlign: 'center', fontSize: FONTS.size.xs, lineHeight: 20, marginTop: SPACING.sm },
});
