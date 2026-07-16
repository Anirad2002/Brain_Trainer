// src/screens/games/game-math.js
// Гра: Математика на швидкість
// Вирішуй приклади якнайшвидше, кожна правильна відповідь = бали + час

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Pressable,
} from 'react-native';
import GameShell from './GameShell';
import { useTheme } from '../../context/ThemeContext';
import { FONTS, SPACING, RADIUS, getShadow } from '../../config/theme';

// ─── Конфігурація ─────────────────────────────────────────────────────────────
const MATH_CONFIG = {
  id: 'math',
  title: 'Matematyka',
  emoji: '🔢',
  color: '#10B981',
  description: 'Rozwiązuj zadania matematyczne jak najszybciej — każda sekunda się liczy!',
  instructions: [
    'Na ekranie pojawi się równanie matematyczne i 4 opcje odpowiedzi.',
    'Kliknij poprawną odpowiedź tak szybko, jak to możliwe.',
    'Za poprawną odpowiedź otrzymujesz punkty i +3 sekundy.',
    'Za błędną odpowiedź — -5 sekund z licznika.',
    'Gra kończy się, gdy skończy się czas.',
    'Im wyższy poziom, tym trudniejsze działania!',
  ],
  levels: [
    { level: 1, label: 'Poziom 1 — Dodawanie',      desc: 'Proste działania +/- do 20. Czas: 30s.',    ops: ['+','-'],         max: 20,  time: 30 },
    { level: 2, label: 'Poziom 2 — Mnożenie',       desc: 'Mnożenie i dzielenie do 10×10. Czas: 35s.', ops: ['×','÷'],          max: 10,  time: 35 },
    { level: 3, label: 'Poziom 3 — Mieszane',       desc: 'Wszystkie 4 działania, liczby do 50. Czas: 40s.',    ops: ['+','-','×'],      max: 50,  time: 40 },
    { level: 4, label: 'Poziom 4 — Duże liczby',    desc: 'Liczby do 100, wszystkie działania. Czas: 40s.',     ops: ['+','-','×','÷'],  max: 100, time: 40 },
    { level: 5, label: 'Poziom 5 — Mistrz',         desc: 'Liczby dwucyfrowe, wszystkie działania. Czas: 45s.',  ops: ['+','-','×'],      max: 150, time: 45 },
  ],
};

// ─── Генерація прикладу ───────────────────────────────────────────────────────
function generateQuestion(levelCfg) {
  const op = levelCfg.ops[Math.floor(Math.random() * levelCfg.ops.length)];
  let a, b, answer;

  if (op === '+') {
    a = Math.floor(Math.random() * levelCfg.max) + 1;
    b = Math.floor(Math.random() * levelCfg.max) + 1;
    answer = a + b;
  } else if (op === '-') {
    a = Math.floor(Math.random() * levelCfg.max) + 1;
    b = Math.floor(Math.random() * a) + 1;
    answer = a - b;
  } else if (op === '×') {
    a = Math.floor(Math.random() * Math.min(levelCfg.max, 12)) + 1;
    b = Math.floor(Math.random() * Math.min(levelCfg.max, 12)) + 1;
    answer = a * b;
  } else { // ÷
    b = Math.floor(Math.random() * 10) + 2;
    answer = Math.floor(Math.random() * 10) + 1;
    a = b * answer;
  }

  // 4 варіанти відповіді — один правильний
  const wrong = new Set();
  while (wrong.size < 3) {
    const delta = Math.floor(Math.random() * 10) + 1;
    const w = Math.random() > 0.5 ? answer + delta : Math.max(0, answer - delta);
    if (w !== answer) wrong.add(w);
  }
  const options = shuffleArr([answer, ...Array.from(wrong)]);

  return { question: `${a} ${op} ${b}`, answer, options };
}

function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Ігровий екран ────────────────────────────────────────────────────────────
function MathBoard({ level, onFinish }) {
  const { colors } = useTheme();
  const cfg = MATH_CONFIG.levels[level - 1];
  const color = MATH_CONFIG.color;

  const [current, setCurrent] = useState(() => generateQuestion(cfg));
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [timeLeft, setTimeLeft] = useState(cfg.time);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong'
  const [started, setStarted] = useState(false);
  const startTime = useRef(null);
  const timerRef = useRef(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Таймер
  useEffect(() => {
    if (!started) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [started]);

  // Кінець гри коли час вийшов
  useEffect(() => {
    if (timeLeft === 0 && started) {
      const duration = Date.now() - startTime.current;
      const won = score >= 50; // мінімум для перемоги
      onFinish({ score, duration, won });
    }
  }, [timeLeft]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4,  duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleAnswer = (opt) => {
    if (feedback || !started) return;
    setSelected(opt);

    if (opt === current.answer) {
      setFeedback('correct');
      setScore((s) => s + 10 + level * 2);
      setCorrect((c) => c + 1);
      setTimeLeft((t) => Math.min(t + 3, cfg.time + 15)); // +3с бонус
    } else {
      setFeedback('wrong');
      setWrong((w) => w + 1);
      setTimeLeft((t) => Math.max(0, t - 5)); // -5с штраф
      shake();
    }

    setTimeout(() => {
      setCurrent(generateQuestion(cfg));
      setSelected(null);
      setFeedback(null);
    }, 500);
  };

  const handleStart = () => {
    setStarted(true);
    startTime.current = Date.now();
  };

  const timerColor = timeLeft <= 10 ? colors.error : timeLeft <= 20 ? colors.warning : color;
  const accuracy = correct + wrong > 0 ? Math.round((correct / (correct + wrong)) * 100) : 0;

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      <View style={[styles.board, { backgroundColor: colors.background }]}>
        <View style={[styles.statusBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.statusItem}>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Punkty</Text>
            <Text style={[styles.statusVal, { color }]}>{score}</Text>
          </View>
          <View style={[styles.timerCircle, { borderColor: timerColor }]}>
            <Text style={[styles.timerText, { color: timerColor }]}>{timeLeft}</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Trafność</Text>
            <Text style={[styles.statusVal, { color }]}>{accuracy}%</Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* Приклад */}
          <Animated.View
            style={[
              styles.questionCard,
              getShadow('card'),
              { backgroundColor: colors.surface, borderColor: colors.border, transform: [{ translateX: shakeAnim }] },
            ]}
          >
            {feedback === 'correct' && (
              <Text style={[styles.feedbackLabel, { color: colors.success }]}>+{10 + level * 2} pkt ✅</Text>
            )}
            {feedback === 'wrong' && (
              <Text style={[styles.feedbackLabel, { color: colors.error }]}>-5s ❌</Text>
            )}
            <Text style={[styles.questionText, { color: colors.text }]}>{current.question}</Text>
            <Text style={[styles.questionEq, { color: colors.textMuted }]}>=  ?</Text>
          </Animated.View>

          {/* Варіанти */}
          <View style={styles.optionsGrid}>
            {current.options.map((opt, i) => {
              let bg = colors.surface;
              let border = colors.border;
              if (selected !== null) {
                if (opt === current.answer) { bg = colors.success + '22'; border = colors.success; }
                else if (opt === selected && opt !== current.answer) { bg = colors.error + '22'; border = colors.error; }
              }
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.option, getShadow('sm'), { backgroundColor: bg, borderColor: border }]}
                  onPress={() => handleAnswer(opt)}
                  disabled={!!feedback}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.optionText, { color: colors.text }]}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Статистика внизу */}
          <View style={styles.bottomStats}>
            <View style={[styles.miniStat, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={{ color: colors.success, fontSize: FONTS.size.sm, fontWeight: FONTS.weight.bold }}>✅ {correct}</Text>
            </View>
            <View style={[styles.miniStat, { backgroundColor: colors.surfaceAlt }]}>
              <Text style={{ color: colors.error, fontSize: FONTS.size.sm, fontWeight: FONTS.weight.bold }}>❌ {wrong}</Text>
            </View>
          </View>
        </View>
      </View>
      {/* Старт оверлей */}
      {!started && (
        <Pressable
          style={[styles.startOverlay, { backgroundColor: colors.background }]}
          onPress={handleStart}
        >
          <Text style={{ fontSize: 56 }}>🔢</Text>
          <Text style={[styles.startTitle, { color: colors.text }]}>Gotowy?</Text>
          <Text style={[styles.startSub, { color: colors.textSecondary }]}>
            Poziom {level} · {cfg.time} sekund
          </Text>
          <View style={[styles.startBtn, { backgroundColor: color }]}>
            <Text style={styles.startBtnText}>▶ Start</Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

// ─── Головний компонент ───────────────────────────────────────────────────────
export default function MathGame({ navigation }) {
  return (
    <GameShell gameId="math" config={MATH_CONFIG} navigation={navigation}>
      {({ level, onFinish }) => <MathBoard level={level} onFinish={onFinish} />}
    </GameShell>
  );
}

const styles = StyleSheet.create({
  board: { flex: 1, position: 'relative' },
  statusBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.md, borderBottomWidth: 1,
  },
  statusItem: { alignItems: 'center', minWidth: 70 },
  statusLabel: { fontSize: FONTS.size.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  statusVal: { fontSize: FONTS.size.xl, fontWeight: FONTS.weight.bold },
  timerCircle: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center', borderWidth: 3,
  },
  timerText: { fontSize: FONTS.size.xl, fontWeight: FONTS.weight.extrabold },

  content: { flex: 1, padding: SPACING.md, justifyContent: 'center' },

  questionCard: {
    borderRadius: RADIUS.xl, padding: SPACING.xl,
    alignItems: 'center', borderWidth: 1, marginBottom: SPACING.xl,
    position: 'relative',
  },
  feedbackLabel: {
    position: 'absolute', top: SPACING.sm, right: SPACING.md,
    fontSize: FONTS.size.sm, fontWeight: FONTS.weight.bold,
  },
  questionText: { fontSize: FONTS.size.display, fontWeight: FONTS.weight.extrabold, letterSpacing: 2 },
  questionEq: { fontSize: FONTS.size.xxl, fontWeight: FONTS.weight.bold, marginTop: SPACING.xs },

  optionsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm,
    justifyContent: 'center', marginBottom: SPACING.lg,
  },
  option: {
    width: '47%', paddingVertical: SPACING.lg,
    borderRadius: RADIUS.xl, alignItems: 'center', borderWidth: 2,
  },
  optionText: { fontSize: FONTS.size.xxl, fontWeight: FONTS.weight.extrabold },

  bottomStats: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.md },
  miniStat: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full },

  startOverlay: {
  ...StyleSheet.absoluteFillObject,
  zIndex: 10,
  elevation: 10,
  alignItems: 'center',
  justifyContent: 'center',
  gap: SPACING.md,
  opacity: 1,
},
  startTitle: { fontSize: FONTS.size.xxl, fontWeight: FONTS.weight.extrabold },
  startSub: { fontSize: FONTS.size.base },
  startBtn: { paddingHorizontal: SPACING.xxl, paddingVertical: SPACING.md, borderRadius: RADIUS.full, marginTop: SPACING.sm },
  startBtnText: { color: '#fff', fontSize: FONTS.size.lg, fontWeight: FONTS.weight.bold },
});
