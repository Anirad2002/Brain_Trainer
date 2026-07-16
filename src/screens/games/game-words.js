// src/screens/games/game-words.js
import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from 'react-native';
import GameShell from './GameShell';
import { useTheme } from '../../context/ThemeContext';
import { FONTS, SPACING, RADIUS, getShadow } from '../../config/theme';

const WORDS_CONFIG = {
  id: 'words', title: 'Słowa', emoji: '🔤', color: '#F59E0B',
  description: 'Znajdź wszystkie ukryte słowa w siatce liter — szukaj poziomo, pionowo i po przekątnej!',
  instructions: [
    'W siatce ukryte są słowa — znajdź je wszystkie.',
    'Naciśnij pierwszą literę słowa, a następnie ostatnią.',
    'Słowa mogą układać się poziomo ↔, pionowo ↕ oraz po przekątnej ↗.',
    'Znalezione słowa zostaną podświetlone i skreślone z listy.',
    'Znajdź wszystkie słowa przed upływem czasu!',
    'Wyższy poziom to większa siatka i trudniejsze słowa.',
  ],
  levels: [
    { 
      level: 1, label: 'Poziom 1 — Zwierzęta', desc: 'Siatka 6×6, 4 słowa, 90 sekund.', size: 6, time: 90, count: 4,
      words: ['KOT','PIES','LIS','WILK','SOWA','KOZA','ŻABA','LEW','SŁOŃ','RYŚ','KRET','BORSUK','ŻYRAFA','ZEBRA','TYGRYS'] 
    },
    { 
      level: 2, label: 'Poziom 2 — Owoce i Warzywa', desc: 'Siatka 7×7, 5 słów, 90 sekund.', size: 7, time: 90, count: 5,
      words: ['JABŁKO','GRUSZKA','CYTRYNA','ŚLIWKA','MANGO','BANAN','KIWI','ANANAS','BRZOSKWINIA','MELON','ARBÓZ','OGÓREK','MARCHEW','POMIDOR','DYNIA'] 
    },
    { 
      level: 3, label: 'Poziom 3 — Kolory', desc: 'Siatka 8×8, 6 słów, 100 sekund.', size: 8, time: 100, count: 6,
      words: ['NIEBIESKI','ZIELONY','CZERWONY','ŻÓŁTY','BIAŁY','CZARNY','SZARY','RÓŻOWY','FIOLETOWY','BRĄZOWY','POMARAŃCZOWY'] 
    },
    { 
      level: 4, label: 'Poziom 4 — Przyroda', desc: 'Siatka 9×9, 7 słów, 110 sekund.', size: 9, time: 110, count: 7,
      words: ['LAS','RZEKA','GÓRA','STEP','JEZIORO','POLE','MORZE','OCEAN','NIEBO','CHMURA','SŁOŃCE','WIATR','DESZCZ','ŚNIEG','WULKAN','JASKINIA','WYSPA'] 
    },
    { 
      level: 5, label: 'Poziom 5 — Nauka', desc: 'Siatka 10×10, 8 słów, 120 sekund.', size: 10, time: 120, count: 8,
      words: ['FIZYKA','CHEMIA','BIOLOGIA','MATEMATYKA','ASTRONOMIA','GEOLOGIA','MEDYCYNA','ROBOTYKA','GENETYKA','EKOLOGIA','ANATOMIA'] 
    },
  ],
};

const HIGHLIGHT_COLORS = ['#4F46E5','#10B981','#EF4444','#F59E0B','#7C3AED','#EC4899','#06B6D4','#84CC16'];

function getRandomWords(wordsArray, count) {
  const shuffled = [...wordsArray].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function buildGrid(words, size) {
  const grid = Array.from({ length: size }, () => Array(size).fill(''));
  const placed = [];
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  const ALPHABET = 'AĄBCĆDEĘFGHIJKLŁMNŃOÓPRSŚTUWYZŹŻ'; // Polski alfabet

  for (const word of words) {
    let tries = 0, placed_ok = false;
    while (tries < 100 && !placed_ok) {
      tries++;
      const [dr, dc] = dirs[Math.floor(Math.random() * dirs.length)];
      const maxR = dr === 0 ? size : dr > 0 ? size - word.length : word.length - 1;
      const maxC = dc === 0 ? size : dc > 0 ? size - word.length : word.length - 1;
      const minR = dr < 0 ? word.length - 1 : 0;
      const minC = dc < 0 ? word.length - 1 : 0;
      if (maxR <= minR || maxC <= minC) continue;
      const r = minR + Math.floor(Math.random() * (maxR - minR));
      const c = minC + Math.floor(Math.random() * (maxC - minC));
      let ok = true;
      const cells = [];
      for (let i = 0; i < word.length; i++) {
        const nr = r + dr * i, nc = c + dc * i;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) { ok = false; break; }
        if (grid[nr][nc] !== '' && grid[nr][nc] !== word[i]) { ok = false; break; }
        if (cells.some(([cr, cc]) => cr === nr && cc === nc)) { ok = false; break; }
        cells.push([nr, nc]);
      }
      if (ok) {
        cells.forEach(([nr, nc], i) => { grid[nr][nc] = word[i]; });
        placed.push({ word, cells });
        placed_ok = true;
      }
    }
  }

  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (!grid[r][c]) grid[r][c] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];

  return { grid, wordPlacements: placed };
}

function WordsBoard({ level, onFinish }) {
  const { colors } = useTheme();
  const cfg = WORDS_CONFIG.levels[level - 1];
  const color = WORDS_CONFIG.color;

  const [gameData] = useState(() => {
    let built;
    let selectedWords;
    let attempts = 0;

    while (attempts < 50) {
      attempts++;
      selectedWords = getRandomWords(cfg.words, cfg.count);
      built = buildGrid(selectedWords, cfg.size);
      if (built.wordPlacements.length === cfg.count) {
        break;
      }
    }
    return { grid: built.grid, wordPlacements: built.wordPlacements, levelWords: selectedWords };
  });
  
  const { grid, wordPlacements, levelWords } = gameData;
  const [foundWords, setFoundWords] = useState([]);
  const [selecting, setSelecting] = useState([]);
  const [timeLeft, setTimeLeft] = useState(cfg.time);
  const [started, setStarted] = useState(false);
  const [score, setScore] = useState(0);

  const startTime = useRef(null);
  const timerRef = useRef(null);
  const { width } = Dimensions.get('window');
  const cellSize = Math.floor(Math.min((width - SPACING.md * 2 - 24) / cfg.size, 42));

  const startTimer = useCallback(() => {
    if (started) return;
    setStarted(true);
    startTime.current = Date.now();
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [started]);

  React.useEffect(() => {
    if (timeLeft === 0 && started) {
      const duration = Date.now() - startTime.current;
      onFinish({ score, duration, won: foundWords.length === levelWords.length });
    }
  }, [timeLeft, started, foundWords.length, levelWords.length, onFinish, score]);

  React.useEffect(() => () => clearInterval(timerRef.current), []);

  const checkSelection = useCallback((sel) => {
    if (sel.length < 2) return;
    for (const { word, cells } of wordPlacements) {
      if (foundWords.find(fw => fw.word === word)) continue;
      if (cells.length !== sel.length) continue;
      const match = cells.every(([r, c], i) => sel[i] && sel[i][0] === r && sel[i][1] === c);
      const matchReverse = cells.every(([r, c], i) => {
        const si = sel.length - 1 - i;
        return sel[si] && sel[si][0] === r && sel[si][1] === c;
      });
      if (match || matchReverse) {
        const colorIdx = foundWords.length % HIGHLIGHT_COLORS.length;
        const pts = word.length * 10 + timeLeft;
        setScore((s) => s + pts);
        setFoundWords((prev) => {
          const nf = [...prev, { word, colorIdx, cells }];
          if (nf.length === levelWords.length) {
            clearInterval(timerRef.current);
            const duration = Date.now() - startTime.current;
            setTimeout(() => onFinish({ score: score + pts, duration, won: true }), 600);
          }
          return nf;
        });
        break;
      }
    }
    setSelecting([]);
  }, [wordPlacements, foundWords, timeLeft, score, levelWords.length, onFinish]);

  const getCellState = (r, c) => {
    for (const fw of foundWords)
      if (fw.cells.some(([fr, fc]) => fr === r && fc === c))
        return { found: true, color: HIGHLIGHT_COLORS[fw.colorIdx] };
    if (selecting.some(([sr, sc]) => sr === r && sc === c))
      return { selecting: true };
    return {};
  };

  const handleCellPress = (r, c) => {
    startTimer();
    setSelecting((prev) => {
      if (prev.length === 0) return [[r, c]];
      const last = prev[prev.length - 1];
      if (last[0] === r && last[1] === c) { checkSelection(prev); return []; }
      const first = prev[0];
      const dr = r - first[0], dc = c - first[1];
      const len = Math.max(Math.abs(dr), Math.abs(dc));
      if (len === 0) return prev;
      const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
      const stepC = dc === 0 ? 0 : dc / Math.abs(dc);
      if (Math.abs(dr) !== Math.abs(dc) && dr !== 0 && dc !== 0) return prev;
      const newSel = [];
      for (let i = 0; i <= len; i++) newSel.push([first[0] + stepR * i, first[1] + stepC * i]);
      checkSelection(newSel);
      return [];
    });
  };

  const timerColor = timeLeft <= 15 ? colors.error : timeLeft <= 30 ? colors.warning : color;

  return (
    <ScrollView style={[styles.board, { backgroundColor: colors.background }]} contentContainerStyle={styles.boardContent} showsVerticalScrollIndicator={false}>
      <View style={[styles.statusBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.statusItem}>
          <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Znaleziono</Text>
          <Text style={[styles.statusVal, { color }]}>{foundWords.length}/{levelWords.length}</Text>
        </View>
        <View style={[styles.timerPill, { borderColor: timerColor }]}>
          <Text style={[styles.timerText, { color: timerColor }]}>⏱ {timeLeft}s</Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Punkty</Text>
          <Text style={[styles.statusVal, { color }]}>{score}</Text>
        </View>
      </View>

      <View style={[styles.wordsList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.wordsGrid}>
          {levelWords.map((word) => {
            const fw = foundWords.find(f => f.word === word);
            return (
              <View key={word} style={[styles.wordChip, {
                backgroundColor: fw ? HIGHLIGHT_COLORS[fw.colorIdx] + '22' : colors.surfaceAlt,
                borderColor: fw ? HIGHLIGHT_COLORS[fw.colorIdx] : colors.border,
              }]}>
                <Text style={[styles.wordChipText, { color: fw ? HIGHLIGHT_COLORS[fw.colorIdx] : colors.textSecondary }, fw && styles.strikethrough]}>
                  {fw ? '✓ ' : ''}{word}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={[styles.hintBanner, { backgroundColor: color + '18', borderColor: color + '55', opacity: started ? 0 : 1 }]}>
        <Text style={{ fontSize: 18 }}>🔤</Text>
        <Text style={[styles.hintText, { color }]}>Naciśnij literę, aby zacząć</Text>
      </View>

      <View style={[styles.gridContainer, getShadow('sm'), { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {grid.map((row, r) => (
          <View key={r} style={styles.gridRow}>
            {row.map((letter, c) => {
              const state = getCellState(r, c);
              return (
                <TouchableOpacity
                  key={c}
                  style={[styles.cell, {
                    width: cellSize, height: cellSize, borderRadius: RADIUS.sm,
                    backgroundColor: state.found ? state.color + '30' : state.selecting ? color + '44' : colors.surfaceAlt,
                    borderColor: state.found ? state.color : state.selecting ? color : colors.border,
                    borderWidth: state.found || state.selecting ? 2 : 1,
                  }]}
                  onPress={() => handleCellPress(r, c)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cellText, {
                    fontSize: cellSize > 36 ? FONTS.size.base : FONTS.size.sm,
                    color: state.found ? state.color : state.selecting ? color : colors.text,
                    fontWeight: state.found || state.selecting ? FONTS.weight.bold : FONTS.weight.normal,
                  }]}>
                    {letter}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
      <Text style={[styles.hint, { color: colors.textMuted }]}>Naciśnij pierwszą, a następnie ostatnią literę słowa</Text>
    </ScrollView>
  );
}

export default function WordsGame({ navigation }) {
  return (
    <GameShell gameId="words" config={WORDS_CONFIG} navigation={navigation}>
      {({ level, onFinish }) => <WordsBoard level={level} onFinish={onFinish} />}
    </GameShell>
  );
}

const styles = StyleSheet.create({
  board: { flex: 1 },
  boardContent: { paddingBottom: SPACING.xxl },
  statusBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md, borderBottomWidth: 1 },
  statusItem: { alignItems: 'center', flex: 1 },
  statusLabel: { fontSize: FONTS.size.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  statusVal: { fontSize: FONTS.size.xl, fontWeight: FONTS.weight.bold },
  timerPill: { paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 2 },
  timerText: { fontSize: FONTS.size.base, fontWeight: FONTS.weight.extrabold },
  wordsList: { margin: SPACING.md, borderRadius: RADIUS.lg, padding: SPACING.sm, borderWidth: 1 },
  wordsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, justifyContent: 'center' },
  wordChip: { 
    paddingHorizontal: SPACING.sm, 
    paddingVertical: 4, 
    borderRadius: RADIUS.full, 
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordChipText: { 
    fontSize: FONTS.size.xs, 
    fontWeight: FONTS.weight.semibold,
    textAlign: 'center',
  },
  strikethrough: { textDecorationLine: 'line-through' },
  hintBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    borderRadius: RADIUS.lg, padding: SPACING.sm, borderWidth: 1,
    marginHorizontal: SPACING.md, marginBottom: SPACING.xs, justifyContent: 'center',
    height: 40,
  },
  hintText: { fontSize: FONTS.size.sm, fontWeight: FONTS.weight.medium },
  gridContainer: { margin: SPACING.md, borderRadius: RADIUS.lg, padding: SPACING.xs, borderWidth: 1, alignItems: 'center' },
  gridRow: { flexDirection: 'row', gap: 2, marginBottom: 2 },
  cell: { alignItems: 'center', justifyContent: 'center' },
  cellText: { textAlign: 'center' },
  hint: { textAlign: 'center', fontSize: FONTS.size.xs, padding: SPACING.md },
});