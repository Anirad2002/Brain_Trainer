// src/screens/questions.js — Тести з рандомізацією та зарахуванням XP у профіль
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { FONTS, SPACING, RADIUS, getShadow } from '../config/theme';
import { addTestXP } from '../services/userProgress';
import { getCurrentUser } from '../services/auth';

// Імпорт базових тестів
import { MATH_TEST } from '../data/tests/mathTest';
import { GENERAL_KNOWLEDGE_TEST } from '../data/tests/generalKnowledgeTest';
import { UKRAINIAN_TEST } from '../data/tests/ukrainianTest';

// Імпорт нових тестів
import { BIOLOGY_TEST } from '../data/tests/biologyTest';
import { CHEMISTRY_TEST } from '../data/tests/chemistryTest';
import { POLAND_TEST } from '../data/tests/polandTest';
import { TECH_TEST } from '../data/tests/techTest.js';

// Усі доступні тести в додатку
const ALL_TESTS = [
  MATH_TEST, 
  GENERAL_KNOWLEDGE_TEST, 
  UKRAINIAN_TEST,
  BIOLOGY_TEST,
  CHEMISTRY_TEST,
  POLAND_TEST,
  TECH_TEST
];

// Кількість питань на один раунд тестування
const QUESTIONS_PER_ROUND = 10;

// Утиліта для випадкового перемішування масиву за алгоритмом Фішера-Єйтса
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// ─── TestRunner ───────────────────────────────────────────────────────────────
function TestRunner({ test, onClose, colors }) {
  // Функція для повної рандомізації тесту та вибірки рівно 10 питань
  const prepareTestData = () => {
    const shuffledQuestions = shuffleArray(test.questions);
    // Беремо перші 10 питань після перемішування
    const selectedQuestions = shuffledQuestions.slice(0, QUESTIONS_PER_ROUND); 
    
    return selectedQuestions.map(q => ({
      ...q,
      options: shuffleArray(q.options)
    }));
  };

  const [questions, setQuestions] = useState(() => prepareTestData());
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [xpGained, setXpGained] = useState(0);
  const [streak, setStreak] = useState(0); 
  const [bestStreak, setBestStreak] = useState(0);

  const q = questions[current];
  const total = questions.length; // Завжди буде 10 (або менше, якщо в базі раптом забракне питань)
  const progress = (current / total) * 100;

  const handleSelect = async (idx) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);

    // Перевіряємо збіг тексту обраного варіанта з правильним текстом у базі даних
    const isCorrect = q.options[idx] === q.correctAnswer;
    const newScore = isCorrect ? score + 1 : score;
    const newStreak = isCorrect ? streak + 1 : 0;
    const newBest = Math.max(bestStreak, newStreak);

    if (isCorrect) setScore(newScore);
    setStreak(newStreak);
    setBestStreak(newBest);
    setAnswers((prev) => [...prev, { correct: isCorrect }]);

    // Зарахування прогресу на останньому питанні
    if (current + 1 >= total) {
      const user = getCurrentUser();
      if (user && newScore > 0) {
        const result = await addTestXP(user.uid, {
          testId: test.id,
          correct: newScore,
          total,
          streak: newBest,
        });
        if (result) setXpGained(result.xpGained);
      }
    }
  };

  const handleNext = () => {
    if (current + 1 >= total) {
      setFinished(true);
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setAnswered(false);
    }
  };

  const handleRestart = () => {
    setQuestions(prepareTestData()); // Нова випадкова генерація 10 питань при перезапуску
    setCurrent(0); setSelected(null); setAnswered(false);
    setScore(0); setFinished(false); setAnswers([]);
    setXpGained(0); setStreak(0); setBestStreak(0);
  };

  const getOptStyle = (idx) => {
    if (!answered) return [styles.option, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }];
    
    const isThisOptCorrect = q.options[idx] === q.correctAnswer;
    if (isThisOptCorrect) return [styles.option, { borderColor: colors.success, backgroundColor: colors.success + '18' }];
    if (idx === selected && !isThisOptCorrect) return [styles.option, { borderColor: colors.error, backgroundColor: colors.error + '18' }];
    
    return [styles.option, { borderColor: colors.border, backgroundColor: colors.surfaceAlt, opacity: 0.5 }];
  };

  const pct = Math.round((score / total) * 100);

  if (finished) {
    return (
      <View style={[styles.runnerContainer, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.resultScroll}>
          <View style={[styles.resultCard, getShadow('card'), { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.resultEmoji}>{pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '📚'}</Text>
            <Text style={[styles.resultTitle, { color: colors.text }]}>
              {pct >= 80 ? 'Świetnie!' : pct >= 50 ? 'Nieźle!' : 'Musisz jeszcze poćwiczyć'}
            </Text>
            <Text style={[styles.resultScore, { color: test.color }]}>{score} / {total}</Text>
            <Text style={[styles.resultPct, { color: colors.textSecondary }]}>{pct}% poprawnych</Text>

            {xpGained > 0 && (
              <View style={[styles.xpBanner, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '44' }]}>
                <Text style={{ fontSize: 20 }}>⭐</Text>
                <Text style={[styles.xpBannerText, { color: colors.primary }]}>+{xpGained} XP do profilu!</Text>
              </View>
            )}

            {bestStreak > 1 && (
              <View style={[styles.streakBanner, { backgroundColor: colors.warning + '18', borderColor: colors.warning + '44' }]}>
                <Text style={{ fontSize: 20 }}>🔥</Text>
                <Text style={[styles.streakText, { color: colors.warning }]}>Seria: {bestStreak} poprawnych z rzędu!</Text>
              </View>
            )}

            <View style={styles.answerDots}>
              {answers.map((a, i) => (
                <View key={i} style={[styles.dot, { backgroundColor: a.correct ? colors.success : colors.error }]} />
              ))}
            </View>

            <TouchableOpacity style={[styles.primaryBtn, getShadow('button'), { backgroundColor: test.color }]} onPress={handleRestart}>
              <Text style={styles.primaryBtnText}>🔄 Spróbuj ponownie</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.outlineBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[styles.outlineBtnText, { color: colors.textSecondary }]}>← Do testów</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.runnerContainer, { backgroundColor: colors.background }]}>
      <View style={[styles.runnerHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={{ color: colors.textSecondary, fontSize: 18 }}>✕</Text>
        </TouchableOpacity>
        <Text style={[styles.runnerTitle, { color: colors.text }]}>{test.emoji} {test.title}</Text>
        <View style={[styles.scorePill, { backgroundColor: test.color + '22' }]}>
          <Text style={[styles.scorePillText, { color: test.color }]}>✅ {score}</Text>
        </View>
      </View>

      <View style={[styles.progressBg, { backgroundColor: colors.surfaceAlt }]}>
        <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: test.color }]} />
      </View>

      <ScrollView contentContainerStyle={styles.runnerContent}>
        <View style={[styles.questionCard, getShadow('sm'), { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.questionNumber, { color: colors.textMuted }]}>Pytanie {current + 1} z {total}</Text>
          <Text style={[styles.questionText, { color: colors.text }]}>{q.question}</Text>
        </View>

        {q.options.map((opt, idx) => {
          const isThisOptCorrect = opt === q.correctAnswer;
          return (
            <TouchableOpacity 
              key={idx} 
              style={getOptStyle(idx)} 
              onPress={() => handleSelect(idx)} 
              activeOpacity={answered ? 1 : 0.8} 
              disabled={answered}
            >
              <View style={[styles.optBadge, { backgroundColor: answered && isThisOptCorrect ? colors.success : answered && idx === selected && !isThisOptCorrect ? colors.error : colors.surfaceAlt }]}>
                <Text style={{ color: answered ? '#fff' : colors.textSecondary, fontSize: FONTS.size.xs, fontWeight: FONTS.weight.bold }}>
                  {String.fromCharCode(65 + idx)}
                </Text>
              </View>
              <Text style={[styles.optText, { color: answered && isThisOptCorrect ? colors.success : answered && idx === selected && !isThisOptCorrect ? colors.error : colors.text }]}>{opt}</Text>
              {answered && isThisOptCorrect && <Text style={{ marginLeft: 'auto' }}>✅</Text>}
              {answered && idx === selected && !isThisOptCorrect && <Text style={{ marginLeft: 'auto' }}>❌</Text>}
            </TouchableOpacity>
          );
        })}

        {answered && (
          <TouchableOpacity style={[styles.nextBtn, getShadow('button'), { backgroundColor: test.color }]} onPress={handleNext}>
            <Text style={styles.primaryBtnText}>{current + 1 >= total ? '🏁 Zakończ' : 'Dalej →'}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Головний екран ───────────────────────────────────────────────────────────
export default function QuestionsScreen() {
  const { colors } = useTheme();
  const [activeTest, setActiveTest] = useState(null);

  if (activeTest) {
    return <TestRunner test={activeTest} colors={colors} onClose={() => setActiveTest(null)} />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>📝 Testy</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
            Poprawna odpowiedź = 1 punkt + 2 XP do profilu
          </Text>
        </View>

        <View style={styles.statsRow}>
          {[
            { emoji: '📚', value: ALL_TESTS.length, label: 'Tematów' },
            // Статистика показує загальну кількість доступних раундів (по 10 питань на кожну тему)
            { emoji: '❓', value: ALL_TESTS.length * QUESTIONS_PER_ROUND, label: 'Pytań łącznie' },
            { emoji: '⭐', value: '2XP', label: 'Za odpowiedź' },
          ].map((s) => (
            <View key={s.label} style={[styles.statChip, getShadow('sm'), { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={{ fontSize: 20 }}>{s.emoji}</Text>
              <Text style={[styles.statNum, { color: colors.primary }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Wybierz temat</Text>

        {ALL_TESTS.map((test) => (
          <TouchableOpacity 
            key={test.id} 
            style={[styles.testCard, getShadow('card'), { backgroundColor: colors.surface, borderColor: colors.border }]} 
            onPress={() => setActiveTest(test)} 
            activeOpacity={0.85}
          >
            <View style={[styles.testIcon, { backgroundColor: test.color + '22', borderColor: test.color + '55' }]}>
              <Text style={{ fontSize: 32 }}>{test.emoji}</Text>
            </View>
            <View style={styles.testInfo}>
              <Text style={[styles.testTitle, { color: colors.text }]}>{test.title}</Text>
              <Text style={[styles.testDesc, { color: colors.textSecondary }]} numberOfLines={2}>{test.description}</Text>
              <View style={styles.testMeta}>
                {/* Тепер на картці завжди гарно відображається "10 питань" та "+20 XP макс" */}
                <View style={[styles.metaBadge, { backgroundColor: test.color + '22' }]}>
                  <Text style={{ color: test.color, fontSize: FONTS.size.xs, fontWeight: FONTS.weight.semibold }}>{QUESTIONS_PER_ROUND} pytań</Text>
                </View>
                <View style={[styles.metaBadge, { backgroundColor: colors.primary + '18' }]}>
                  <Text style={{ color: colors.primary, fontSize: FONTS.size.xs, fontWeight: FONTS.weight.semibold }}>max +{QUESTIONS_PER_ROUND * 2} XP</Text>
                </View>
              </View>
            </View>
            <Text style={[styles.arrow, { color: colors.textMuted }]}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Стилістичне оформлення екрану ───
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
  sectionLabel: { fontSize: FONTS.size.xs, fontWeight: FONTS.weight.semibold, marginBottom: SPACING.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  testCard: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.xl, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, gap: SPACING.md },
  testIcon: { width: 64, height: 64, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  testInfo: { flex: 1 },
  testTitle: { fontSize: FONTS.size.md, fontWeight: FONTS.weight.bold, marginBottom: 4 },
  testDesc: { fontSize: FONTS.size.xs, lineHeight: 18, marginBottom: SPACING.sm },
  testMeta: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  metaBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 3, borderRadius: RADIUS.full },
  arrow: { fontSize: 28, fontWeight: FONTS.weight.bold },

  // TestRunner
  runnerContainer: { flex: 1 },
  runnerHeader: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, paddingTop: Platform.OS === 'ios' ? 50 : SPACING.md, borderBottomWidth: 1, gap: SPACING.sm },
  closeBtn: { padding: SPACING.sm },
  runnerTitle: { flex: 1, fontSize: FONTS.size.md, fontWeight: FONTS.weight.bold },
  scorePill: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.full },
  scorePillText: { fontSize: FONTS.size.sm, fontWeight: FONTS.weight.bold },
  progressBg: { height: 4 },
  progressFill: { height: 4, borderRadius: 2 },
  runnerContent: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  questionCard: { borderRadius: RADIUS.xl, padding: SPACING.lg, marginBottom: SPACING.md, borderWidth: 1 },
  questionNumber: { fontSize: FONTS.size.xs, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.sm },
  questionText: { fontSize: FONTS.size.lg, fontWeight: FONTS.weight.semibold, lineHeight: 26 },
  option: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1.5, gap: SPACING.md },
  optBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  optText: { flex: 1, fontSize: FONTS.size.base, lineHeight: 20 },
  nextBtn: { borderRadius: RADIUS.full, paddingVertical: 15, alignItems: 'center', marginTop: SPACING.md },

  resultScroll: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  resultCard: { borderRadius: RADIUS.xl, padding: SPACING.xl, alignItems: 'center', borderWidth: 1, gap: SPACING.md },
  resultEmoji: { fontSize: 64 },
  resultTitle: { fontSize: FONTS.size.xl, fontWeight: FONTS.weight.bold },
  resultScore: { fontSize: FONTS.size.display, fontWeight: FONTS.weight.extrabold },
  resultPct: { fontSize: FONTS.size.sm },
  xpBanner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, width: '100%', justifyContent: 'center' },
  xpBannerText: { fontSize: FONTS.size.md, fontWeight: FONTS.weight.bold },
  streakBanner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, width: '100%', justifyContent: 'center' },
  streakText: { fontSize: FONTS.size.sm, fontWeight: FONTS.weight.bold },
  answerDots: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  primaryBtn: { width: '100%', borderRadius: RADIUS.full, paddingVertical: 15, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: FONTS.size.md, fontWeight: FONTS.weight.bold },
  outlineBtn: { width: '100%', borderRadius: RADIUS.full, paddingVertical: 14, alignItems: 'center', borderWidth: 1 },
  outlineBtnText: { fontSize: FONTS.size.md, fontWeight: FONTS.weight.semibold },
});