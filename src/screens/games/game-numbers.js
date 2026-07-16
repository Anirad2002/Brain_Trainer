// src/screens/games/game-numbers.js
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import GameShell from './GameShell';
import { useTheme } from '../../context/ThemeContext';
import { FONTS, SPACING, RADIUS } from '../../config/theme';

const NUMBERS_CONFIG = {
  id: 'numbers', title: 'Liczby', emoji: '🔢', color: '#06B6D4',
  description: 'Klikaj liczby od 1 do N w kolejności — jeśli popełnisz błąd, wszystko się zresetuje!',
  instructions: [
    'Na polu rozrzucone są liczby odwrócone do dołu (pokazane jako "?").',
    'Kliknij liczbę — odwróci się i pokaże swój numer.',
    'Klikaj liczby ściśle od 1 do ostatniej w kolejności.',
    'Jeśli klikniesz niewłaściwą liczbę — wszystkie odwrócą się z powrotem!',
    'Brak timera — ale czas przejścia jest rejestrowany.',
    'Im wyższy poziom — tym więcej liczb na polu!',
  ],
  levels: [
    { level: 1, label: 'Poziom 1 — 1 do 5',   desc: '5 liczb na polu. Prosty start!',       max: 5  },
    { level: 2, label: 'Poziom 2 — 1 do 10',  desc: '10 liczb. Zaczyna być ciekawie.',      max: 10 },
    { level: 3, label: 'Poziom 3 — 1 do 15',  desc: "15 liczb. Potrzebna dobra pamięć!",   max: 15 },
    { level: 4, label: 'Poziom 4 — 1 do 20',  desc: '20 liczb. Trudno!',                   max: 20 },
    { level: 5, label: 'Poziom 5 — 1 do 25',  desc: '25 liczb. Maksymalny poziom trudności!', max: 25 },
  ],
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function NumberCell({ value, revealed, isWrong, cellSize, color, colors, onPress }) {
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isWrong) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 6,  duration: 60, useNativeDriver: false }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: false }),
        Animated.timing(shakeAnim, { toValue: 4,  duration: 60, useNativeDriver: false }),
        Animated.timing(shakeAnim, { toValue: 0,  duration: 60, useNativeDriver: false }),
      ]).start();
    }
  }, [isWrong]);

  return (
    <Animated.View style={{ transform: [{ translateX: shakeAnim }], margin: 2 }}>
      <TouchableOpacity
        onPress={onPress}
        disabled={revealed}
        activeOpacity={0.8}
        style={[styles.cell, {
          width: cellSize, height: cellSize,
          backgroundColor: revealed ? color + '22' : isWrong ? colors.error + '18' : colors.surface,
          borderColor: revealed ? color : isWrong ? colors.error : colors.border,
          borderWidth: 2, borderRadius: RADIUS.md,
        }]}
      >
        <Text style={[styles.cellText, {
          fontSize: cellSize > 60 ? FONTS.size.xl : FONTS.size.lg,
          color: revealed ? color : isWrong ? colors.error : colors.textSecondary,
          fontWeight: FONTS.weight.extrabold,
        }]}>
          {revealed || isWrong ? value : '?'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function NumbersBoard({ level, onFinish }) {
  const { colors } = useTheme();
  const cfg = NUMBERS_CONFIG.levels[level - 1];
  const color = NUMBERS_CONFIG.color;

  const [positions] = useState(() => shuffle(
    Array.from({ length: cfg.max }, (_, i) => i + 1)
  ));
  const [revealed, setRevealed] = useState(new Set());
  const [next, setNext] = useState(1);
  const [mistakes, setMistakes] = useState(0);
  const [wrongIdx, setWrongIdx] = useState(null);
  const [finished, setFinished] = useState(false);
  const startTime = useRef(Date.now());

  const { width } = Dimensions.get('window');
  const cols = 5;
  const cellSize = Math.min(Math.floor((width - SPACING.md * 2 - cols * 4) / cols), 64);

  const handlePress = (idx, value) => {
    if (finished || wrongIdx !== null) return;

    if (value === next) {
      const newRevealed = new Set([...revealed, idx]);
      setRevealed(newRevealed);
      setNext((n) => n + 1);

      if (next === cfg.max) {
        setFinished(true);
        const duration = Date.now() - startTime.current;
        const bonus = Math.max(0, 100 - mistakes * 15);
        const pts = cfg.max * 5 + bonus;
        setTimeout(() => onFinish({ score: pts, duration, won: true }), 800);
      }
    } else {
      setMistakes((m) => m + 1);
      setWrongIdx(idx);
      setTimeout(() => {
        setRevealed(new Set());
        setNext(1);
        setWrongIdx(null);
      }, 700);
    }
  };

  return (
    <View style={[styles.board, { backgroundColor: colors.background }]}>
      <View style={[styles.statusBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.statusItem}>
          <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Następna</Text>
          <Text style={[styles.statusVal, { color }]}>{next}</Text>
        </View>
        <View style={[styles.progressCircle, { borderColor: color }]}>
          <Text style={[styles.progressText, { color }]}>{revealed.size}/{cfg.max}</Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Błędy</Text>
          <Text style={[styles.statusVal, { color: mistakes > 0 ? colors.error : colors.success }]}>{mistakes}</Text>
        </View>
      </View>

      <View style={[styles.progressBg, { backgroundColor: colors.surfaceAlt }]}>
        <View style={[styles.progressFill, { width: `${(revealed.size / cfg.max) * 100}%`, backgroundColor: color }]} />
      </View>

      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        Szukaj liczby <Text style={{ color, fontWeight: FONTS.weight.extrabold }}>{next}</Text>
      </Text>

      <View style={styles.grid}>
        {positions.map((value, idx) => (
          <NumberCell
            key={idx}
            value={value}
            revealed={revealed.has(idx)}
            isWrong={wrongIdx === idx}
            cellSize={cellSize}
            color={color}
            colors={colors}
            onPress={() => handlePress(idx, value)}
          />
        ))}
      </View>

      {wrongIdx !== null && (
        <View style={[styles.errorBanner, { backgroundColor: colors.error + '18', borderColor: colors.error }]}>
          <Text style={[styles.errorBannerText, { color: colors.error }]}>
            ❌ Niewłaściwa liczba! Wszystkie odwracają się z powrotem...
          </Text>
        </View>
      )}
      {finished && (
        <View style={[styles.finishedBanner, { backgroundColor: color + '18', borderColor: color }]}>
          <Text style={[styles.finishedText, { color }]}>🏆 Znalazłeś wszystkie {cfg.max} liczby!</Text>
        </View>
      )}
    </View>
  );
}

export default function NumbersGame({ navigation }) {
  return (
    <GameShell gameId="numbers" config={NUMBERS_CONFIG} navigation={navigation}>
      {({ level, onFinish }) => <NumbersBoard level={level} onFinish={onFinish} />}
    </GameShell>
  );
}

const styles = StyleSheet.create({
  board: { flex: 1 },
  statusBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md, borderBottomWidth: 1 },
  statusItem: { alignItems: 'center', flex: 1 },
  statusLabel: { fontSize: FONTS.size.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  statusVal: { fontSize: FONTS.size.xl, fontWeight: FONTS.weight.bold },
  progressCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  progressText: { fontSize: FONTS.size.sm, fontWeight: FONTS.weight.extrabold },
  progressBg: { height: 4 },
  progressFill: { height: 4 },
  hint: { textAlign: 'center', fontSize: FONTS.size.base, paddingVertical: SPACING.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', padding: SPACING.md },
  cell: { alignItems: 'center', justifyContent: 'center' },
  cellText: { textAlign: 'center' },
  errorBanner: { margin: SPACING.md, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, alignItems: 'center' },
  errorBannerText: { fontSize: FONTS.size.sm, fontWeight: FONTS.weight.semibold },
  finishedBanner: { margin: SPACING.md, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, alignItems: 'center' },
  finishedText: { fontSize: FONTS.size.md, fontWeight: FONTS.weight.bold },
});