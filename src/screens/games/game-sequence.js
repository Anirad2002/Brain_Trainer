// src/screens/games/game-sequence.js
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated } from 'react-native';
import GameShell from './GameShell';
import { useTheme } from '../../context/ThemeContext';
import { FONTS, SPACING, RADIUS, getShadow } from '../../config/theme';

const SEQ_CONFIG = {
  id: 'sequence', title: 'Sekwencja', emoji: '🎯', color: '#EC4899',
  description: "Zapamiętaj kolejność słów — a następnie wybierz je w odpowiedniej sekwencji",
  instructions: [
    "Na ekranie pojawiają się słowa jedno po drugim — zapamiętaj ich kolejność.",
    "Po wyświetleniu wszystkich słów zostaną one przemieszane.",
    "Klikaj na słowa w tej samej kolejności, w której się pojawiały.",
    "Jeśli popełnisz błąd — sekwencja zostanie zresetowana, zacznij od nowa.",
    "Brak timera — ale czas przejścia jest rejestrowany.",
    "Im wyższy poziom — tym dłuższa sekwencja!",
  ],
  levels: [
    { level: 1, label: 'Poziom 1 — Początek', desc: '3 słowa w sekwencji. Czas wyświetlania: 1.5s.', count: 3, showMs: 1500 },
    { level: 2, label: 'Poziom 2 — Uczeń',    desc: '4 słowa. Czas wyświetlania: 1.2s.',                count: 4, showMs: 1200 },
    { level: 3, label: 'Poziom 3 — Znawca',  desc: '5 słów. Czas wyświetlania: 1s.',                   count: 5, showMs: 1000 },
    { level: 4, label: 'Poziom 4 — Mistrz',  desc: '7 słów. Czas wyświetlania: 0.8s.',                  count: 7, showMs: 800  },
    { level: 5, label: 'Poziom 5 — Legenda', desc: '9 słów. Czas wyświetlania: 0.7s.',                  count: 9, showMs: 700  },
  ],
};

const WORD_POOLS = [
  ['SŁOŃCE','KSIĘŻYC','GWIAZDA','CHMURA','BŁYSKAWICA','WIATR','DESZCZ','ŚNIEG','MGŁA','TĘCZA'],
  ['KOT','PIES','KOŃ','LIS','WILK','NIEDŹWIEDŹ','ORZEŁ','RYBA','ZAJĄC','JEŻ'],
  ['JABŁKO','BANAN','GRUSZKA','WIŚNIA','MANGO','CYTRYNA','POMARAŃCZA','ŚLIWKA','BRZOSKWINIA','MELON'],
  ['NIEBIESKI','ZIELONY','CZERWONY','ŻÓŁTY','BIAŁY','CZARNY','RÓŻOWY','FIOLETOWY','POMARAŃCZOWY','SZARY'],
  ['MORZE','GÓRA','LAS','STEP','RZEKA','JEZIORO','PUSTYNIA','BAGNO','WYSPA','WODOSPAD'],
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildSequence(count) {
  const pool = shuffle(WORD_POOLS[Math.floor(Math.random() * WORD_POOLS.length)]);
  return pool.slice(0, count);
}

function SequenceBoard({ level, onFinish }) {
  const { colors } = useTheme();
  const cfg = SEQ_CONFIG.levels[level - 1];
  const color = SEQ_CONFIG.color;

  const [phase, setPhase] = useState('showing'); // 'showing'|'input'|'error'|'done'
  const [sequence] = useState(() => buildSequence(cfg.count));
  const [shuffled, setShuffled] = useState([]);
  const [showingIdx, setShowingIdx] = useState(0);
  const [userInput, setUserInput] = useState([]);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);

  const startTime = useRef(Date.now());
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (phase !== 'showing') return;
    if (showingIdx >= sequence.length) {
      setTimeout(() => {
        setShuffled(shuffle(sequence.map((w, i) => ({ word: w, id: i }))));
        setPhase('input');
      }, 500);
      return;
    }
    fadeAnim.setValue(1);
    const hideTimer = setTimeout(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start(() => {
        setShowingIdx((i) => i + 1);
      });
    }, cfg.showMs);
    return () => clearTimeout(hideTimer);
  }, [phase, showingIdx, sequence, cfg.showMs]);

  const handleWordPress = (item) => {
    if (phase !== 'input') return;
    const nextInput = [...userInput, item.word];
    setUserInput(nextInput);

    if (nextInput.length === sequence.length) {
      let hasError = false;
      for (let i = 0; i < sequence.length; i++) {
        if (nextInput[i] !== sequence[i]) {
          hasError = true;
          break;
        }
      }

      if (hasError) {
        setMistakes((m) => m + 1);
        setRound((r) => r + 1);
        setPhase('error');
        setTimeout(() => {
          setUserInput([]);
          setPhase('input');
        }, 1500);
      } else {
        const bonus = Math.max(0, 50 - mistakes * 10);
        const pts = sequence.length * 15 + bonus;
        const newScore = score + pts;
        setScore(newScore);
        const duration = Date.now() - startTime.current;
        setPhase('done');
        setTimeout(() => onFinish({ score: newScore, duration, won: true }), 600);
      }
    }
  };

  const handleRepeatShowing = () => {
    if (phase !== 'input') return;
    setUserInput([]);
    setShowingIdx(0);
    setPhase('showing');
  };

  const isSelected = (word) => userInput.includes(word);

  return (
    <ScrollView style={[styles.board, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={[styles.statusBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
          Próba {round} · {cfg.count} słów
        </Text>
        <View style={[styles.scorePill, { backgroundColor: color + '22', borderColor: color + '55' }]}>
          <Text style={[styles.scoreText, { color }]}>⭐ {score}</Text>
        </View>
      </View>

      {phase === 'showing' && (
        <View style={styles.showingArea}>
          <Text style={[styles.phaseHint, { color: colors.textSecondary }]}>
            Zapamiętaj kolejność! ({showingIdx + 1}/{sequence.length})
          </Text>
          <View style={styles.showingDots}>
            {sequence.map((_, i) => (
              <View key={i} style={[styles.dot, {
                backgroundColor: i < showingIdx ? color : i === showingIdx ? color : colors.surfaceAlt,
                opacity: i < showingIdx ? 0.4 : 1,
              }]} />
            ))}
          </View>
          {showingIdx < sequence.length ? (
            <Animated.View style={[styles.wordDisplay, getShadow('card'), { backgroundColor: colors.surface, borderColor: color, opacity: fadeAnim }]}>
              <Text style={[styles.wordDisplayNum, { color: colors.textMuted }]}>#{showingIdx + 1}</Text>
              <Text style={[styles.wordDisplayText, { color }]}>{sequence[showingIdx]}</Text>
            </Animated.View>
          ) : (
            <View style={[styles.wordDisplay, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Text style={[styles.wordDisplayText, { color: colors.textMuted }]}>⏳</Text>
            </View>
          )}
        </View>
      )}

      {(phase === 'input' || phase === 'error' || phase === 'done') && (
        <View style={styles.inputArea}>
          <Text style={[styles.phaseHint, { color: colors.textSecondary }]}>
            {phase === 'error'
              ? '❌ Błąd w kolejności! Zacznij od nowa...'
              : phase === 'done'
              ? '✅ Świetnie!'
              : `Wybierz słowa w poprawnej kolejności (${userInput.length}/${sequence.length})`
            }
          </Text>

          <View style={styles.slots}>
            {sequence.map((_, i) => (
              <View key={i} style={[styles.slot, {
                backgroundColor: i < userInput.length ? color + '22' : colors.surfaceAlt,
                borderColor: i < userInput.length ? color : colors.border,
              }]}>
                <Text style={[styles.slotText, { color: i < userInput.length ? color : colors.textMuted }]}>
                  {userInput[i] || (i + 1)}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.wordsGrid}>
            {shuffled.map((item) => {
              const selected = isSelected(item.word);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.wordBtn, getShadow('sm'), {
                    backgroundColor: selected ? color + '15' : colors.surface,
                    borderColor: selected ? color : colors.border,
                    opacity: selected ? 0.5 : 1,
                  }]}
                  onPress={() => !selected && handleWordPress(item)}
                  disabled={selected || phase !== 'input'}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.wordBtnText, { color: selected ? color : colors.text }]}>
                    {item.word}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {phase === 'input' && (
            <TouchableOpacity
              style={[styles.repeatBtn, { backgroundColor: colors.surface, borderColor: color }]}
              onPress={handleRepeatShowing}
              activeOpacity={0.8}
            >
              <Text style={[styles.repeatBtnText, { color }]}>🔄 Powtórz pokaz</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

export default function SequenceGame({ navigation }) {
  return (
    <GameShell gameId="sequence" config={SEQ_CONFIG} navigation={navigation}>
      {({ level, onFinish }) => <SequenceBoard level={level} onFinish={onFinish} />}
    </GameShell>
  );
}

const styles = StyleSheet.create({
  board: { flex: 1 },
  content: { paddingBottom: 40 },
  statusBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md, borderBottomWidth: 1 },
  statusLabel: { fontSize: FONTS.size.sm, fontWeight: FONTS.weight.medium },
  scorePill: { paddingHorizontal: SPACING.md, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: 1 },
  scoreText: { fontSize: FONTS.size.sm, fontWeight: FONTS.weight.bold },
  showingArea: { padding: SPACING.md, alignItems: 'center', paddingTop: SPACING.xl },
  inputArea: { padding: SPACING.md, paddingTop: SPACING.lg },
  phaseHint: { fontSize: FONTS.size.sm, textAlign: 'center', marginBottom: SPACING.lg },
  showingDots: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xl, justifyContent: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  wordDisplay: { width: 220, height: 120, borderRadius: RADIUS.xl, alignItems: 'center', justifyContent: 'center', borderWidth: 2, gap: SPACING.xs },
  wordDisplayNum: { fontSize: FONTS.size.sm, fontWeight: FONTS.weight.medium },
  wordDisplayText: { fontSize: FONTS.size.xxl, fontWeight: FONTS.weight.extrabold },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, justifyContent: 'center', marginBottom: SPACING.lg },
  slot: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.lg, borderWidth: 1.5, minWidth: 70, alignItems: 'center' },
  slotText: { fontSize: FONTS.size.sm, fontWeight: FONTS.weight.bold },
  wordsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, justifyContent: 'center' },
  wordBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1.5, minWidth: 90, alignItems: 'center' },
  wordBtnText: { fontSize: FONTS.size.base, fontWeight: FONTS.weight.semibold },
  repeatBtn: { marginTop: SPACING.xl, paddingVertical: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 2, alignItems: 'center', alignSelf: 'center', paddingHorizontal: SPACING.xl },
  repeatBtnText: { fontSize: FONTS.size.base, fontWeight: FONTS.weight.bold },
});