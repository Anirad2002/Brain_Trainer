// src/screens/games.js — Хаб ігор з розблокуванням по рівню профілю
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { FONTS, SPACING, RADIUS, getShadow } from '../config/theme';
import { getUserProgressData, calcLevel } from '../services/userProgress';
import { getCurrentUser } from '../services/auth';

const GAMES = [
  { id: 'memory',   title: "Pamięć",        emoji: '🃏', description: 'Znajdź pary takich samych kart',               difficulty: 'Średni', color: '#4F46E5', route: 'MemoryGame',   levelReq: 1 },
  { id: 'math',     title: 'Matematyka',    emoji: '🔢', description: 'Rozwiązuj zadania na czas',                    difficulty: 'Łatwy',   color: '#10B981', route: 'MathGame',     levelReq: 1 },
  { id: 'words',    title: 'Słowa',         emoji: '🔤', description: 'Znajdź wszystkie słowa w siatce liter',       difficulty: 'Średni', color: '#F59E0B', route: 'WordsGame',    levelReq: 2 },
  { id: 'reaction', title: 'Reakcja',       emoji: '⚡',  description: 'Naciskaj zielone, nie naciskaj czerwonego',    difficulty: 'Łatwy',   color: '#EF4444', route: 'ReactionGame', levelReq: 2 },
  { id: 'numbers',  title: 'Liczby',        emoji: '🔢', description: 'Odkrywaj liczby w kolejności rosnącej',        difficulty: 'Średni', color: '#06B6D4', route: 'NumbersGame',  levelReq: 3 },
  { id: 'sequence', title: 'Sekwencja',     emoji: '🎯', description: "Zapamiętaj i powtórz kolejność słów",          difficulty: 'Średni', color: '#EC4899', route: 'SequenceGame', levelReq: 3 },
  { id: 'logic',    title: 'Logika',        emoji: '🧩', description: 'Rozwiązuj zadania logiczne i łamigłówki',     difficulty: 'Trudny',  color: '#7C3AED', route: 'LogicGame',    levelReq: 4 },
];

const DIFF_COLORS = { 'Łatwy': '#10B981', 'Średni': '#F59E0B', 'Trudny': '#EF4444' };

function GameCard({ game, userLevel, onPress, colors }) {
  const locked = userLevel < game.levelReq;
  return (
    <TouchableOpacity
      style={[styles.gameCard, getShadow('card'), { backgroundColor: colors.surface, borderColor: locked ? colors.border : game.color + '55', opacity: locked ? 0.65 : 1 }]}
      onPress={onPress} disabled={locked} activeOpacity={0.85}
    >
      <View style={[styles.gameCardTop, { backgroundColor: game.color + '14' }]}>
        <Text style={styles.gameEmoji}>{game.emoji}</Text>
        {locked && (
          <View style={[styles.lockBadge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Text style={[styles.lockText, { color: colors.textSecondary }]}>🔒 Poz.{game.levelReq}</Text>
          </View>
        )}
      </View>
      <View style={styles.gameCardBody}>
        <Text style={[styles.gameTitle, { color: colors.text }]}>{game.title}</Text>
        <Text style={[styles.gameDesc, { color: colors.textSecondary }]} numberOfLines={2}>{game.description}</Text>
        <View style={styles.gameMeta}>
          <View style={[styles.diffBadge, { backgroundColor: DIFF_COLORS[game.difficulty] + '22' }]}>
            <Text style={[styles.diffText, { color: DIFF_COLORS[game.difficulty] }]}>{game.difficulty}</Text>
          </View>
          {!locked && (
            <View style={[styles.playBadge, { backgroundColor: game.color }]}>
              <Text style={styles.playBadgeText}>▶ Graj</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function GamesScreen({ navigation }) {
  const { colors } = useTheme();
  const [userLevel, setUserLevel] = useState(1);

  // useFocusEffect — оновлює рівень щоразу при поверненні на вкладку Ігри
  useFocusEffect(
    useCallback(() => {
      const user = getCurrentUser();
      if (!user) return;
      getUserProgressData(user.uid).then((p) => setUserLevel(calcLevel(p?.totalXP || 0)));
    }, [])
  );

  const available = GAMES.filter((g) => userLevel >= g.levelReq);
  const locked    = GAMES.filter((g) => userLevel < g.levelReq);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>🎮 Gry</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
            Trenuj mózg · Twój poziom: <Text style={{ color: colors.primary, fontWeight: FONTS.weight.bold }}>{userLevel}</Text>
          </Text>
        </View>

        <View style={styles.statsRow}>
          {[
            { emoji: '🎮', value: GAMES.length, label: 'Gier' }, 
            { emoji: '✅', value: available.length, label: 'Dostępne' }, 
            { emoji: '🔒', value: locked.length, label: 'Zablok.' }
          ].map((s) => (
            <View key={s.label} style={[styles.statChip, getShadow('sm'), { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={{ fontSize: 20 }}>{s.emoji}</Text>
              <Text style={[styles.statNum, { color: colors.primary }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {available.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Dostępne</Text>
            <View style={styles.grid}>
              {available.map((g) => (
                <GameCard key={g.id} game={g} userLevel={userLevel} onPress={() => navigation?.navigate(g.route)} colors={colors} />
              ))}
            </View>
          </>
        )}

        {locked.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Zablokowane</Text>
            <View style={styles.grid}>
              {locked.map((g) => (
                <GameCard key={g.id} game={g} userLevel={userLevel} onPress={() => {}} colors={colors} />
              ))}
            </View>
          </>
        )}

        <View style={[styles.xpHint, { backgroundColor: colors.surface, borderColor: colors.primary + '44' }]}>
          <Text style={{ fontSize: 20 }}>💡</Text>
          <Text style={[styles.xpHintText, { color: colors.textSecondary }]}>
            Graj w gry i rozwiązuj testy, aby zdobywać wyższe poziomy i odblokowywać nowe gry!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  pageHeader: { paddingTop: SPACING.md, paddingBottom: SPACING.lg },
  pageTitle: { fontSize: FONTS.size.xxl, fontWeight: FONTS.weight.bold },
  pageSubtitle: { fontSize: FONTS.size.sm, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  statChip: { flex: 1, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', gap: 4, borderWidth: 1 },
  statNum: { fontSize: FONTS.size.lg, fontWeight: FONTS.weight.bold },
  statLabel: { fontSize: FONTS.size.xs },
  sectionLabel: { fontSize: FONTS.size.xs, fontWeight: FONTS.weight.semibold, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: SPACING.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
  gameCard: { width: '47.5%', borderRadius: RADIUS.xl, borderWidth: 1, overflow: 'hidden' },
  gameCardTop: { height: 90, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  gameEmoji: { fontSize: 44 },
  lockBadge: { position: 'absolute', top: 8, right: 8, paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.full, borderWidth: 1 },
  lockText: { fontSize: FONTS.size.xs, fontWeight: FONTS.weight.medium },
  gameCardBody: { padding: SPACING.md },
  gameTitle: { fontSize: FONTS.size.base, fontWeight: FONTS.weight.bold, marginBottom: 4 },
  gameDesc: { fontSize: FONTS.size.xs, lineHeight: 17, marginBottom: SPACING.sm },
  gameMeta: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap', alignItems: 'center' },
  diffBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.full },
  diffText: { fontSize: FONTS.size.xs, fontWeight: FONTS.weight.semibold },
  playBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.full },
  playBadgeText: { color: '#fff', fontSize: FONTS.size.xs, fontWeight: FONTS.weight.semibold },
  xpHint: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, borderRadius: RADIUS.xl, padding: SPACING.md, borderWidth: 1 },
  xpHintText: { flex: 1, fontSize: FONTS.size.xs, lineHeight: 18 },
});