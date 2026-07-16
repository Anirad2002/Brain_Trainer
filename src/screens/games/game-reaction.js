// src/screens/games/game-reaction.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import GameShell from './GameShell';
import { useTheme } from '../../context/ThemeContext';
import { FONTS, SPACING, RADIUS, getShadow } from '../../config/theme';

const REACTION_CONFIG = {
  id: 'reaction', title: 'Reakcja', emoji: '⚡', color: '#EF4444',
  description: 'Klikaj, gdy jest zielono, NIE klikaj, gdy jest czerwono — trenuj szybkość reakcji!',
  instructions: [
    'Naciśnij przycisk "Start", aby rozpocząć.',
    'Gdy koło stanie się ZIELONE — kliknij jak najszybciej!',
    'Gdy koło jest CZERWONE — NIE klikaj, to pułapka.',
    'Za kliknięcie na zielone otrzymasz punkty.',
    'Za błąd na czerwonym lub pominięcie zielonego — kara.',
    'Im szybsza reakcja — tym więcej punktów za rundę!',
  ],
  levels: [
    { level: 1, label: 'Poziom 1 — Wolno',         desc: '10 rund. Opóźnienie 1.5-3s. Mało pułapek.',       rounds: 10, minDelay: 1500, maxDelay: 3000, trapChance: 0.15, goWindow: 2000 },
    { level: 2, label: 'Poziom 2 — Średnio',        desc: '12 rund. Opóźnienie 1-2.5s. Częste pułapki.',     rounds: 12, minDelay: 1000, maxDelay: 2500, trapChance: 0.25, goWindow: 1800 },
    { level: 3, label: 'Poziom 3 — Szybko',         desc: '15 rund. Opóźnienie 0.8-2s. Więcej pułapek.',     rounds: 15, minDelay: 800,  maxDelay: 2000, trapChance: 0.30, goWindow: 1500 },
    { level: 4, label: 'Poziom 4 — Bardzo szybko',  desc: '18 rund. Opóźnienie 0.6-1.5s.',                   rounds: 18, minDelay: 600,  maxDelay: 1500, trapChance: 0.35, goWindow: 1200 },
    { level: 5, label: 'Poziom 5 — Błyskawica',     desc: '20 rund. Opóźnienie 0.4-1s. Połowa to pułapki.', rounds: 20, minDelay: 400,  maxDelay: 1000, trapChance: 0.40, goWindow: 1000 },
  ],
};

function ReactionBoard({ level, onFinish }) {
  const { colors } = useTheme();
  const cfg = REACTION_CONFIG.levels[level - 1];
  const color = REACTION_CONFIG.color;

  // 'wait' | 'ready' | 'go' | 'trap' | 'miss' | 'done'
  const [circleState, setCircleState] = useState('wait');
  const [round, setRound]   = useState(0);
  const [score, setScore]   = useState(0);
  const [results, setResults] = useState([]);
  const [started, setStarted] = useState(false);

  const goTime      = useRef(null);
  const timeoutRef  = useRef(null);
  const scaleAnim   = useRef(new Animated.Value(1)).current;
  const startTime   = useRef(null);

  // Зберігаємо актуальні значення у ref, щоб не було stale closure
  const scoreRef   = useRef(0);
  const resultsRef = useRef([]);
  const roundRef   = useRef(0);

  const pulse = (toVal = 1.08) => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: toVal, duration: 120, useNativeDriver: false }),
      Animated.timing(scaleAnim, { toValue: 1,     duration: 120, useNativeDriver: false }),
    ]).start();
  };

  const nextRound = useCallback((currentRound, currentScore, currentResults) => {
    if (currentRound >= cfg.rounds) {
      clearTimeout(timeoutRef.current);
      const duration = Date.now() - startTime.current;
      const won = currentScore >= 50;
      onFinish({ score: currentScore, duration, won });
      setCircleState('done');
      return;
    }

    setCircleState('ready');
    const isTrap = Math.random() < cfg.trapChance;
    const delay  = cfg.minDelay + Math.random() * (cfg.maxDelay - cfg.minDelay);

    timeoutRef.current = setTimeout(() => {
      if (isTrap) {
        setCircleState('trap');
        goTime.current = null;
        // Якщо не натиснули на пастку — через 1.5с рахуємо як успіх
        timeoutRef.current = setTimeout(() => {
          const bonus = 5;
          const ns = currentScore + bonus;
          const r  = [...currentResults, { correct: true, trap: true }];
          // ← ВИПРАВЛЕННЯ: оновлюємо стан і ref окремо, не вкладено
          scoreRef.current   = ns;
          resultsRef.current = r;
          roundRef.current   = currentRound + 1;
          setScore(ns);
          setResults(r);
          setRound(currentRound + 1);
          // nextRound викликаємо через setTimeout(0) — поза поточним циклом рендеру
          setTimeout(() => nextRound(currentRound + 1, ns, r), 0);
        }, 1500);
      } else {
        setCircleState('go');
        goTime.current = Date.now();
        // Якщо не натиснули за goWindow мс — промах
        timeoutRef.current = setTimeout(() => {
          const penalty = Math.max(0, currentScore - 5);
          const r       = [...currentResults, { correct: false, miss: true }];
          scoreRef.current   = penalty;
          resultsRef.current = r;
          roundRef.current   = currentRound + 1;
          setCircleState('miss');
          setScore(penalty);
          setResults(r);
          setRound(currentRound + 1);
          // Пауза 800мс, щоб гравець побачив "Промах"
          setTimeout(() => nextRound(currentRound + 1, penalty, r), 800);
        }, cfg.goWindow);
      }
    }, delay);
  }, [cfg, onFinish]);

  const handlePress = useCallback(() => {
    if (!started) {
      setStarted(true);
      startTime.current = Date.now();
      nextRound(0, 0, []);
      return;
    }

    clearTimeout(timeoutRef.current);

    if (circleState === 'go' && goTime.current) {
      const reaction = Date.now() - goTime.current;
      pulse();
      const pts = Math.max(10, Math.round(50 - reaction / 20));
      const ns  = scoreRef.current + pts;
      const r   = [...resultsRef.current, { correct: true, reaction }];
      const rnd = roundRef.current + 1;
      scoreRef.current   = ns;
      resultsRef.current = r;
      roundRef.current   = rnd;
      // ← ВИПРАВЛЕННЯ: setState окремо, nextRound через setTimeout(0)
      setScore(ns);
      setResults(r);
      setRound(rnd);
      setCircleState('wait');
      setTimeout(() => nextRound(rnd, ns, r), 0);

    } else if (circleState === 'trap') {
      pulse(1.2);
      const ns  = Math.max(0, scoreRef.current - 10);
      const r   = [...resultsRef.current, { correct: false, trap: true }];
      const rnd = roundRef.current + 1;
      scoreRef.current   = ns;
      resultsRef.current = r;
      roundRef.current   = rnd;
      // ← ВИПРАВЛЕННЯ: setState окремо, nextRound через setTimeout
      setScore(ns);
      setResults(r);
      setRound(rnd);
      setCircleState('miss');
      setTimeout(() => nextRound(rnd, ns, r), 700);

    } else if (circleState === 'ready') {
      const ns  = Math.max(0, scoreRef.current - 5);
      const rnd = roundRef.current;
      scoreRef.current = ns;
      // ← ВИПРАВЛЕННЯ: setState окремо, nextRound через setTimeout
      setScore(ns);
      setCircleState('wait');
      setTimeout(() => nextRound(rnd, ns, resultsRef.current), 500);
    }
  }, [circleState, started, nextRound]);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const circleColor = {
    wait:  colors.surfaceAlt,
    ready: colors.warning,
    go:    colors.success,
    trap:  colors.error,
    miss:  colors.textMuted,
    done:  colors.primary,
  }[circleState];

  const circleLabel = {
    wait:  '●',
    ready: '⏳',
    go:    '⚡',
    trap:  '🚫',
    miss:  '😬',
    done:  '🏁',
  }[circleState];

  const correct  = results.filter(r => r.correct).length;
  const accuracy = results.length > 0 ? Math.round((correct / results.length) * 100) : 0;

  return (
    <TouchableOpacity
      style={[styles.board, { backgroundColor: colors.background }]}
      onPress={handlePress}
      activeOpacity={0.95}
    >
      <View style={[styles.statusBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.statusItem}>
          <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Punkty</Text>
          <Text style={[styles.statusVal, { color }]}>{score}</Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Runda</Text>
          <Text style={[styles.statusVal, { color }]}>{round}/{cfg.rounds}</Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Celność</Text>
          <Text style={[styles.statusVal, { color }]}>{accuracy}%</Text>
        </View>
      </View>

      <View style={[styles.progressBg, { backgroundColor: colors.surfaceAlt }]}>
        <View style={[styles.progressFill, { width: `${(round / cfg.rounds) * 100}%`, backgroundColor: color }]} />
      </View>

      <View style={styles.content}>
        <Animated.View style={[styles.circle, getShadow('card'), {
          backgroundColor: circleColor + '33',
          borderColor: circleColor,
          transform: [{ scale: scaleAnim }],
        }]}>
          <Text style={styles.circleEmoji}>{circleLabel}</Text>
          {circleState === 'go'    && <Text style={[styles.circleLabel, { color: colors.success }]}>KLIKAJ!</Text>}
          {circleState === 'trap'  && <Text style={[styles.circleLabel, { color: colors.error }]}>NIE KLIKAJ!</Text>}
          {circleState === 'ready' && <Text style={[styles.circleLabel, { color: colors.warning }]}>Uwaga...</Text>}
          {circleState === 'miss'  && <Text style={[styles.circleLabel, { color: colors.textMuted }]}>Pudło</Text>}
        </Animated.View>

        {!started ? (
          <Text style={[styles.hint, { color: colors.textSecondary }]}>Kliknij, aby zacząć</Text>
        ) : (
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            {circleState === 'ready' ? 'Przygotuj się...' : circleState === 'go' ? 'Klikaj!' : 'Kliknij ekran'}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function ReactionGame({ navigation }) {
  return (
    <GameShell gameId="reaction" config={REACTION_CONFIG} navigation={navigation}>
      {({ level, onFinish }) => <ReactionBoard level={level} onFinish={onFinish} />}
    </GameShell>
  );
}

const styles = StyleSheet.create({
  board: { flex: 1 },
  statusBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md, borderBottomWidth: 1 },
  statusItem: { alignItems: 'center', flex: 1 },
  statusLabel: { fontSize: FONTS.size.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  statusVal: { fontSize: FONTS.size.xl, fontWeight: FONTS.weight.bold },
  progressBg: { height: 4 },
  progressFill: { height: 4 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg, gap: SPACING.lg },
  circle: {
    width: 220, height: 220, borderRadius: 110,
    alignItems: 'center', justifyContent: 'center', borderWidth: 5, gap: SPACING.sm,
  },
  circleEmoji: { fontSize: 72 },
  circleLabel: { fontSize: FONTS.size.md, fontWeight: FONTS.weight.extrabold, letterSpacing: 1 },
  hint: { fontSize: FONTS.size.base, textAlign: 'center' },
});
