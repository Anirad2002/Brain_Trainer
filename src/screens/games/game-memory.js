// src/screens/games/game-memory.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import GameShell from './GameShell';
import { useTheme } from '../../context/ThemeContext';
import { FONTS, SPACING, RADIUS } from '../../config/theme';

const MEMORY_CONFIG = {
  id: 'memory', title: "Pamięć", emoji: '🃏', color: '#4F46E5',
  description: 'Znajdź wszystkie pary takich samych kart jak najszybciej',
  instructions: [
    'Kliknij na kartę, aby ją odwrócić.',
    'Zapamiętaj symbol i znajdź jego parę wśród innych kart.',
    'Jeśli dwie odkryte karty są takie same — pozostają odkryte.',
    'Jeśli są różne — odwracają się z powrotem.',
    'Znajdź wszystkie pary przed końcem czasu.',
    'Im szybciej znajdziesz wszystkie pary — tym więcej punktów!',
  ],
  levels: [
    { level: 1, label: 'Poziom 1 — Nowicjusz',  desc: 'Pole 4×3, 60 sekund. 6 par kart.',    pairs: 6,  cols: 4, time: 60 },
    { level: 2, label: 'Poziom 2 — Uczeń',      desc: 'Pole 4×4, 60 sekund. 8 par kart.',    pairs: 8,  cols: 4, time: 60 },
    { level: 3, label: 'Poziom 3 — Znawca',     desc: 'Pole 5×4, 75 sekund. 10 par.',        pairs: 10, cols: 5, time: 75 },
    { level: 4, label: 'Poziom 4 — Mistrz',     desc: 'Pole 5×4, 60 sekund. 10 par.',        pairs: 10, cols: 5, time: 60 },
    { level: 5, label: 'Poziom 5 — Legenda',    desc: 'Pole 6×4, 60 sekund. 12 par!',        pairs: 12, cols: 6, time: 60 },
  ],
};

const EMOJI_POOL = [
  '🐱','🐶','🦊','🐻','🐼','🐨','🐯','🦁',
  '🐸','🐵','🦄','🐲','🌟','🍎','🍕','🎸',
  '⚽','🎯','🎲','🚀','🌈','🔥','❄️','🎃',
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildCards(pairs) {
  const emojis = shuffle(EMOJI_POOL).slice(0, pairs);
  return shuffle([...emojis, ...emojis].map((emoji, i) => ({
    id: i, emoji, flipped: false, matched: false,
  })));
}

function Card({ card, onPress, size, color, colors }) {
  const anim = useRef(new Animated.Value(card.flipped || card.matched ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: card.flipped || card.matched ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [card.flipped, card.matched]);

  const bgColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [color, card.matched ? color + '33' : colors.surface],
  });

  return (
    <TouchableOpacity
      onPress={() => onPress(card.id)}
      disabled={card.flipped || card.matched}
      activeOpacity={0.85}
      style={styles.cardWrapper}
    >
      <Animated.View style={[styles.card, {
        width: size, height: size,
        backgroundColor: bgColor,
        borderColor: card.matched ? color : card.flipped ? color : colors.primaryDark,
        borderWidth: 2,
        borderRadius: RADIUS.md,
      }]}>
        <Text style={[styles.cardEmoji, { fontSize: size * 0.45, opacity: card.flipped || card.matched ? 1 : 0 }]}>
          {card.emoji}
        </Text>
        {!card.flipped && !card.matched && (
          <Text style={{ fontSize: size * 0.4, position: 'absolute' }}>❓</Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

function MemoryBoard({ level, onFinish }) {
  const { colors } = useTheme();
  const cfg = MEMORY_CONFIG.levels[level - 1];
  const color = MEMORY_CONFIG.color;

  const [cards, setCards] = useState(() => buildCards(cfg.pairs));
  const [flipped, setFlipped] = useState([]);
  const [moves, setMoves] = useState(0);
  const [timeLeft, setTimeLeft] = useState(cfg.time);
  const [matched, setMatched] = useState(0);
  const [started, setStarted] = useState(false);
  const [checking, setChecking] = useState(false);
  const startTime = useRef(null);
  const timerRef = useRef(null);
  const totalPairs = cfg.pairs;

  const finishGame = useCallback((won, currentMatched, currentTimeLeft, currentMoves) => {
    clearInterval(timerRef.current);
    const duration = startTime.current ? Date.now() - startTime.current : cfg.time * 1000;
    const score = won
      ? Math.max(0, (currentMatched ?? totalPairs) * 10 + (currentTimeLeft ?? timeLeft) * 2 - Math.max(0, (currentMoves ?? moves) - totalPairs) * 3)
      : 0;
    onFinish({ score, duration, won });
  }, [totalPairs, timeLeft, moves, onFinish, cfg.time]);

  const startTimer = useCallback(() => {
    if (started) return;
    setStarted(true);
    startTime.current = Date.now();
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          finishGame(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [started, finishGame]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const handleFlip = useCallback((id) => {
    startTimer();

    if (checking || flipped.length >= 2) return;
    if (flipped.includes(id)) return;

    const newFlipped = [...flipped, id];
    setFlipped(newFlipped);
    setCards((c) => c.map((card) => card.id === id ? { ...card, flipped: true } : card));
    setMoves((m) => m + 1);

    if (newFlipped.length === 2) {
      setChecking(true);
      const [aId, bId] = newFlipped;
      setCards((c) => {
        const cardA = c.find((x) => x.id === aId);
        const cardB = c.find((x) => x.id === bId);
        if (cardA.emoji === cardB.emoji) {
          const updated = c.map((card) =>
            card.id === aId || card.id === bId ? { ...card, matched: true, flipped: false } : card
          );
          const newMatched = updated.filter((x) => x.matched).length / 2;
          setTimeout(() => {
            setMatched(newMatched);
            setFlipped([]);
            setChecking(false);
            if (newMatched === totalPairs) {
              const tl = timeLeft;
              setTimeout(() => finishGame(true, newMatched, tl, moves + 1), 0);
            }
          }, 500);
          return updated;
        } else {
          setTimeout(() => {
            setCards((prev) => prev.map((card) =>
              card.id === aId || card.id === bId ? { ...card, flipped: false } : card
            ));
            setFlipped([]);
            setChecking(false);
          }, 900);
          return c;
        }
      });
    }
  }, [flipped, checking, startTimer, totalPairs, finishGame, moves]);

  const { width } = Dimensions.get('window');
  const cols = cfg.cols;
  
  // Вираховуємо розмір картки з урахуванням відступів (по 4px на картку з кожного боку)
  const maxBoardWidth = width - SPACING.md * 2;
  const cardSize = Math.floor(Math.min((maxBoardWidth - cols * 4) / cols, 75));
  
  // Задаємо контейнеру сітки фіксовану ширину, щоб картки не розтікалися, а трималися купки
  const gridWidth = (cardSize + 4) * cols;
  const timerColor = timeLeft <= 10 ? colors.error : timeLeft <= 20 ? colors.warning : color;

  return (
    <View style={[styles.board, { backgroundColor: colors.background }]}>
      <View style={[styles.statusBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.statusItem}>
          <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Pary</Text>
          <Text style={[styles.statusVal, { color }]}>{matched}/{totalPairs}</Text>
        </View>
        <View style={[styles.timerCircle, { borderColor: timerColor }]}>
          <Text style={[styles.timerText, { color: timerColor }]}>{timeLeft}</Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Ruchy</Text>
          <Text style={[styles.statusVal, { color }]}>{moves}</Text>
        </View>
      </View>

      <View style={[styles.progressBg, { backgroundColor: colors.surfaceAlt }]}>
        <View style={[styles.progressFill, { width: `${(matched / totalPairs) * 100}%`, backgroundColor: color }]} />
      </View>

      <View style={styles.cardsArea}>
        {/* Банер стає повністю прозорим (невидимим), не порушуючи розмітку сітки */}
        <View style={[styles.hintBanner, { backgroundColor: color + '18', borderColor: color + '55', opacity: started ? 0 : 1 }]}>
          <Text style={{ fontSize: 20 }}>🃏</Text>
          <Text style={[styles.hintText, { color }]}>Kliknij na kartę, aby rozpocząć</Text>
        </View>
        
        {/* Центруємо обмежену по ширині сітку */}
        <View style={styles.gridCentering}>
          <View style={[styles.grid, { width: gridWidth }]}>
            {cards.map((card) => (
              <Card key={card.id} card={card} onPress={handleFlip} size={cardSize} color={color} colors={colors} />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

export default function MemoryGame({ navigation }) {
  return (
    <GameShell gameId="memory" config={MEMORY_CONFIG} navigation={navigation}>
      {({ level, onFinish }) => <MemoryBoard level={level} onFinish={onFinish} />}
    </GameShell>
  );
}

const styles = StyleSheet.create({
  board: { flex: 1 },
  statusBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md, borderBottomWidth: 1 },
  statusItem: { alignItems: 'center', flex: 1 },
  statusLabel: { fontSize: FONTS.size.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  statusVal: { fontSize: FONTS.size.xl, fontWeight: FONTS.weight.bold },
  timerCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  timerText: { fontSize: FONTS.size.lg, fontWeight: FONTS.weight.extrabold },
  progressBg: { height: 4 },
  progressFill: { height: 4 },
  cardsArea: { flex: 1, padding: SPACING.sm, justifyContent: 'center' },
  hintBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    borderRadius: RADIUS.lg, padding: SPACING.sm, borderWidth: 1,
    marginBottom: SPACING.lg, justifyContent: 'center',
  },
  hintText: { fontSize: FONTS.size.sm, fontWeight: FONTS.weight.medium },
  gridCentering: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  cardWrapper: { padding: 2 },
  card: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  cardEmoji: { position: 'absolute', textAlign: 'center' },
});
