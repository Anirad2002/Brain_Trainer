// src/screens/games/GameShell.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Modal, ActivityIndicator,  } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { FONTS, SPACING, RADIUS, getShadow } from '../../config/theme';
import {
  getGameProgress, saveGameResult, setCurrentLevel,
  UNLOCK_SCORE, formatDuration, formatDate,
} from '../../services/gameStorage';
import { addGameXP } from '../../services/userProgress';
import { getCurrentUser } from '../../services/auth';

const MAX_LEVELS = 5;

function LevelBadge({ level, unlocked, current, color, onPress, colors }) {
  const isLocked  = level > unlocked;
  const isCurrent = level === current;
  const isDone    = !isLocked && !isCurrent;
  return (
    <TouchableOpacity
      style={[styles.levelBadge, {
        backgroundColor: isLocked ? colors.surfaceAlt : isCurrent ? color : colors.surface,
        borderColor: isLocked ? colors.border : isCurrent ? color : color + '66',
        opacity: isLocked ? 0.5 : 1,
      }]}
      onPress={() => !isLocked && onPress(level)}
      disabled={isLocked} activeOpacity={0.8}
    >
      {isLocked
        ? <Text style={{ fontSize: 18 }}>🔒</Text>
        : <Text style={[styles.levelNum, { color: isCurrent ? '#fff' : color }]}>{level}</Text>
      }
      {isDone && <View style={[styles.doneDot, { backgroundColor: colors.success }]} />}
    </TouchableOpacity>
  );
}

function HistoryList({ history, color, colors }) {
  if (!history || history.length === 0) {
    return (
      <View style={styles.emptyHistory}>
        <Text style={{ fontSize: 32 }}>📭</Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Brak rozegranych gier</Text>
      </View>
    );
  }
  return (
    <>
      {history.slice(0, 10).map((h, i) => (
        <View key={i} style={[styles.historyRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <View style={[styles.historyLevel, { backgroundColor: color + '22' }]}>
            <Text style={[styles.historyLevelText, { color }]}>P{h.level}</Text>
          </View>
          <View style={styles.historyInfo}>
            <Text style={[styles.historyDate, { color: colors.textSecondary }]}>{formatDate(h.date)}</Text>
            <Text style={[styles.historyDur, { color: colors.textMuted }]}>{formatDuration(h.duration)}</Text>
          </View>
          <View style={styles.historyRight}>
            <Text style={[styles.historyScore, { color: h.won ? color : colors.error }]}>{h.score} pkt</Text>
            <Text style={{ fontSize: 14 }}>{h.won ? '✅' : '❌'}</Text>
          </View>
        </View>
      ))}
    </>
  );
}

function InfoModal({ visible, onClose, title, emoji, colors, children }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[modalStyles.header, { borderBottomColor: colors.border }]}>
            <Text style={{ fontSize: 22 }}>{emoji}</Text>
            <Text style={[modalStyles.title, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top:10,bottom:10,left:10,right:10 }}>
              <Text style={{ color: colors.textMuted, fontSize: 22 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={modalStyles.content} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, borderWidth: 1, maxHeight: '85%' },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.lg, borderBottomWidth: 1 },
  title: { flex: 1, fontSize: FONTS.size.lg, fontWeight: FONTS.weight.bold },
  content: { padding: SPACING.lg, paddingBottom: 48 },
});

// ─── ResultScreen ─────────────────────────────────────────────────────────────
function ResultScreen({ result, config, onPlayAgain, onMenu, onContinue, newUnlock, unlockedLevel, xpGained, progress, colors }) {
  const { won, score, duration, level } = result;
  const required = UNLOCK_SCORE[level] || 999;
  const pct = Math.min(100, Math.round((score / required) * 100));

  const nextLevel = level + 1;
  const nextAlreadyUnlocked = progress && nextLevel <= (progress.unlockedLevel || 1);
  const canContinue = (newUnlock || nextAlreadyUnlocked) && nextLevel <= MAX_LEVELS;
  const continueLevel = newUnlock ? unlockedLevel : nextLevel;

  return (
    <ScrollView contentContainerStyle={styles.resultScroll}>
      <View style={[styles.resultCard, getShadow('card'), { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={styles.resultMainEmoji}>{won ? '🏆' : '💪'}</Text>
        <Text style={[styles.resultTitle, { color: colors.text }]}>{won ? 'Wygrana!' : 'Spróbuj ponownie!'}</Text>

        {newUnlock && (
          <View style={[styles.unlockBanner, { backgroundColor: config.color + '18', borderColor: config.color }]}>
            <Text style={{ fontSize: 24 }}>🔓</Text>
            <Text style={[styles.unlockText, { color: config.color }]}>Odblokowano poziom {unlockedLevel}!</Text>
          </View>
        )}
        {xpGained > 0 && (
          <View style={[styles.xpBanner, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '44' }]}>
            <Text style={{ fontSize: 22 }}>⭐</Text>
            <Text style={[styles.xpBannerText, { color: colors.primary }]}>+{xpGained} XP do profilu!</Text>
          </View>
        )}

        <View style={styles.resultStats}>
          {[
            { label: 'Punkty',  value: score,                emoji: '⭐' },
            { label: 'Czas',    value: formatDuration(duration), emoji: '⏱' },
            { label: 'Poziom',  value: `${level}`,             emoji: '📊' },
          ].map((s) => (
            <View key={s.label} style={[styles.resultStat, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Text style={{ fontSize: 22 }}>{s.emoji}</Text>
              <Text style={[styles.resultStatVal, { color: config.color }]}>{s.value}</Text>
              <Text style={[styles.resultStatLabel, { color: colors.textSecondary }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {level < MAX_LEVELS && (
          <View style={styles.progressSection}>
            <View style={styles.progressLabelRow}>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Do poziomu {level + 1}</Text>
              <Text style={[styles.progressLabel, { color: config.color }]}>{score}/{required}</Text>
            </View>
            <View style={[styles.progressBg, { backgroundColor: colors.surfaceAlt }]}>
              <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: config.color }]} />
            </View>
          </View>
        )}
        {level >= MAX_LEVELS && (
          <View style={[styles.maxLevelBanner, { backgroundColor: config.color + '18', borderColor: config.color }]}>
            <Text style={{ fontSize: 20 }}>👑</Text>
            <Text style={{ color: config.color, fontWeight: FONTS.weight.bold, fontSize: FONTS.size.sm }}>Maksymalny poziom!</Text>
          </View>
        )}

        {canContinue && (
          <TouchableOpacity
            style={[styles.continueBtn, getShadow('button'), { backgroundColor: config.color }]}
            onPress={() => onContinue(continueLevel)}
          >
            <Text style={styles.bigBtnText}>▶ Dalej — Poziom {continueLevel}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.bigBtn, getShadow('button'), { backgroundColor: canContinue ? colors.surfaceAlt : config.color }]}
          onPress={onPlayAgain}
        >
          <Text style={[styles.bigBtnText, { color: canContinue ? colors.text : '#fff' }]}>🔄 Zagraj ponownie</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.outlineBtn, { borderColor: colors.border }]} onPress={onMenu}>
          <Text style={[styles.outlineBtnText, { color: colors.textSecondary }]}>← Menu główne</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── GameShell ────────────────────────────────────────────────────────────────
export default function GameShell({ gameId, config, navigation, children }) {
  const { colors } = useTheme();
  const [screen, setScreen] = useState('menu');
  const [progress, setProgress] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [result, setResult] = useState(null);
  const [newUnlock, setNewUnlock] = useState(false);
  const [newUnlockedLevel, setNewUnlockedLevel] = useState(null);
  const [xpGained, setXpGained] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isFinishing, setIsFinishing] = useState(false); // Новий стан для екрана збереження результатів
  const [showInstructions, setShowInstructions] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const loadProgress = useCallback(async () => {
    setLoading(true);
    const p = await getGameProgress(gameId);
    setProgress(p);
    setSelectedLevel(p.currentLevel);
    setLoading(false);
  }, [gameId]);

  useFocusEffect(useCallback(() => { loadProgress(); }, [loadProgress]));

  const handleFinish = useCallback(async ({ score, duration, won }) => {
    // 1. Спочатку вмикаємо завантаження, щоб користувач бачив спинер замість застиглого ігрового поля
    setIsFinishing(true);

    // 2. Робимо мікротаймаут, щоб React встиг перемалювати інтерфейс на Loader
    setTimeout(async () => {
      try {
        const { newUnlock: nu, unlockedLevel: ul } = await saveGameResult(gameId, {
          level: selectedLevel, score, duration, won,
        });
        let gained = 0;
        const user = getCurrentUser();
        if (user && won && score > 0) {
          const r = await addGameXP(user.uid, { gameId, score, level: selectedLevel, difficulty: config.levels[selectedLevel - 1]?.label || '', won });
          gained = r?.xpGained || 0;
        }
        setXpGained(gained);
        setResult({ score, duration, won, level: selectedLevel });
        setNewUnlock(nu);
        setNewUnlockedLevel(ul);
        await loadProgress();
        setScreen('result');
      } catch (error) {
        console.error("Помилка під час збереження результатів гри:", error);
      } finally {
        // 3. Вимикаємо лоадер після завершення всіх операцій
        setIsFinishing(false);
      }
    }, 150);
  }, [gameId, selectedLevel, loadProgress, config]);

  const handleSelectLevel = async (level) => {
    setSelectedLevel(level);
    await setCurrentLevel(gameId, level);
  };

  const handleContinue = async (level) => {
    const targetLevel = level || newUnlockedLevel;
    if (targetLevel && targetLevel <= MAX_LEVELS) {
      await setCurrentLevel(gameId, targetLevel);
      setSelectedLevel(targetLevel);
      await loadProgress();
      setXpGained(0);
      setNewUnlock(false);
      setScreen('playing');
    }
  };

  const handleGoToGamesHub = useCallback(async () => {
    setXpGained(0);
    await loadProgress();
    setScreen('menu');
    if (navigation) {
      try {
        navigation.navigate('Main', { screen: 'Games' });
      } catch {
        try { navigation.goBack(); } catch {}
      }
    }
  }, [navigation, loadProgress]);

  if (loading || !progress) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={config.color} size="large" />
      </View>
    );
  }

  // ЕКРАН ЗАВАНТАЖЕННЯ РЕЗУЛЬТАТІВ (показується замість "зависання")
  if (isFinishing) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={config.color} size="large" />
        <Text style={[styles.loadingText, { color: colors.textSecondary, marginTop: SPACING.md }]}>
          Podliczanie punktów i zapisywanie próby...
        </Text>
      </SafeAreaView>
    );
  }

  if (screen === 'playing') {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
        <View style={[styles.gameHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.exitBtn} onPress={() => setScreen('menu')}>
            <Text style={{ color: colors.textSecondary, fontSize: FONTS.size.base }}>✕ Wyjdź</Text>
          </TouchableOpacity>
          <Text style={[styles.gameHeaderTitle, { color: colors.text }]}>{config.emoji} Poziom {selectedLevel}</Text>
          <View style={{ width: 70 }} />
        </View>
        <View style={styles.flex}>
          {children({ level: selectedLevel, onFinish: handleFinish })}
        </View>
      </SafeAreaView>
    );
  }

  if (screen === 'result' && result) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
        <ResultScreen
          result={result}
          config={config}
          progress={progress}
          newUnlock={newUnlock}
          unlockedLevel={newUnlockedLevel}
          xpGained={xpGained}
          colors={colors}
          onContinue={handleContinue}
          onPlayAgain={() => { setXpGained(0); setScreen('playing'); }}
          onMenu={handleGoToGamesHub}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <InfoModal visible={showInstructions} onClose={() => setShowInstructions(false)} title="Jak grać" emoji="📖" colors={colors}>
        {config.instructions.map((line, i) => (
          <View key={i} style={styles.instrRow}>
            <View style={[styles.instrNum, { backgroundColor: config.color }]}>
              <Text style={{ color: '#fff', fontSize: FONTS.size.xs, fontWeight: FONTS.weight.bold }}>{i + 1}</Text>
            </View>
            <Text style={[styles.instrText, { color: colors.textSecondary }]}>{line}</Text>
          </View>
        ))}
      </InfoModal>
      <InfoModal visible={showHistory} onClose={() => setShowHistory(false)} title="Ostatnie gry" emoji="📜" colors={colors}>
        <HistoryList history={progress.history} color={config.color} colors={colors} />
      </InfoModal>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, getShadow('card'), { backgroundColor: colors.surface, borderColor: config.color + '44' }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
            <Text style={{ color: colors.textSecondary, fontSize: FONTS.size.base }}>←</Text>
          </TouchableOpacity>
          <Text style={styles.heroEmoji}>{config.emoji}</Text>
          <Text style={[styles.heroTitle, { color: colors.text }]}>{config.title}</Text>
          <Text style={[styles.heroDesc, { color: colors.textSecondary }]}>{config.description}</Text>
          <View style={[styles.totalScore, { backgroundColor: config.color + '18', borderColor: config.color + '44' }]}>
            <Text style={{ fontSize: 16 }}>⭐</Text>
            <Text style={[styles.totalScoreText, { color: config.color }]}>{progress.totalScore} punktów ogółem</Text>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Poziom trudności</Text>
        <View style={[styles.levelCard, getShadow('sm'), { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.levelsRow}>
            {Array.from({ length: MAX_LEVELS }, (_, i) => i + 1).map((lvl) => (
              <LevelBadge key={lvl} level={lvl} unlocked={progress.unlockedLevel} current={selectedLevel}
                color={config.color} onPress={handleSelectLevel} colors={colors} />
            ))}
          </View>
          {config.levels[selectedLevel - 1] && (
            <View style={[styles.levelDesc, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Text style={[styles.levelDescTitle, { color: colors.text }]}>{config.levels[selectedLevel - 1].label}</Text>
              <Text style={[styles.levelDescText, { color: colors.textSecondary }]}>{config.levels[selectedLevel - 1].desc}</Text>
              {selectedLevel < MAX_LEVELS && (
                <Text style={[styles.levelDescScore, { color: config.color }]}>
                  Wymagane {UNLOCK_SCORE[selectedLevel]} pkt → odblokuje poziom {selectedLevel + 1}
                </Text>
              )}
            </View>
          )}
          <View style={styles.unlockRow}>
            <Text style={{ fontSize: 14 }}>🔓</Text>
            <Text style={[styles.unlockInfo, { color: colors.textSecondary }]}>Odblokowano {progress.unlockedLevel}/{MAX_LEVELS} poziomów</Text>
          </View>
        </View>

        <TouchableOpacity style={[styles.bigBtn, getShadow('button'), { backgroundColor: config.color }]} onPress={() => setScreen('playing')} activeOpacity={0.85}>
          <Text style={styles.bigBtnText}>▶ Graj</Text>
        </TouchableOpacity>
        <View style={styles.secondaryBtns}>
          <TouchableOpacity style={[styles.halfBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowInstructions(true)}>
            <Text style={{ fontSize: 18 }}>📖</Text>
            <Text style={[styles.halfBtnText, { color: colors.text }]}>Zasady</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.halfBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowHistory(true)}>
            <Text style={{ fontSize: 18 }}>📜</Text>
            <Text style={[styles.halfBtnText, { color: colors.text }]}>Historia</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: FONTS.size.base, fontWeight: FONTS.weight.medium },
  scroll: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  heroCard: { borderRadius: RADIUS.xl, padding: SPACING.xl, alignItems: 'center', borderWidth: 1, marginBottom: SPACING.lg, position: 'relative' },
  backBtn: { position: 'absolute', top: SPACING.md, left: SPACING.md, padding: SPACING.sm },
  heroEmoji: { fontSize: 56, marginBottom: SPACING.sm },
  heroTitle: { fontSize: FONTS.size.xxl, fontWeight: FONTS.weight.bold, marginBottom: 4 },
  heroDesc: { fontSize: FONTS.size.sm, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.md },
  totalScore: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1 },
  totalScoreText: { fontSize: FONTS.size.sm, fontWeight: FONTS.weight.semibold },
  sectionLabel: { fontSize: FONTS.size.xs, fontWeight: FONTS.weight.semibold, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: SPACING.sm },
  levelCard: { borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, marginBottom: SPACING.md },
  levelsRow: { flexDirection: 'row', gap: SPACING.sm, justifyContent: 'center', marginBottom: SPACING.md },
  levelBadge: { width: 52, height: 52, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', borderWidth: 2, position: 'relative' },
  levelNum: { fontSize: FONTS.size.lg, fontWeight: FONTS.weight.extrabold },
  doneDot: { position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4 },
  levelDesc: { borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, marginBottom: SPACING.md },
  levelDescTitle: { fontSize: FONTS.size.base, fontWeight: FONTS.weight.bold, marginBottom: 4 },
  levelDescText: { fontSize: FONTS.size.sm, lineHeight: 20, marginBottom: SPACING.xs },
  levelDescScore: { fontSize: FONTS.size.xs, fontWeight: FONTS.weight.semibold, marginTop: 4 },
  unlockRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  unlockInfo: { fontSize: FONTS.size.xs },
  bigBtn: { borderRadius: RADIUS.full, paddingVertical: 16, alignItems: 'center', marginBottom: SPACING.md },
  continueBtn: { borderRadius: RADIUS.full, paddingVertical: 16, alignItems: 'center', marginBottom: SPACING.sm, width: '100%' },
  bigBtnText: { color: '#fff', fontSize: FONTS.size.md, fontWeight: FONTS.weight.bold },
  secondaryBtns: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  halfBtn: { flex: 1, borderRadius: RADIUS.xl, padding: SPACING.md, alignItems: 'center', borderWidth: 1, gap: SPACING.xs },
  halfBtnText: { fontSize: FONTS.size.sm, fontWeight: FONTS.weight.semibold },
  instrRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, marginBottom: SPACING.md },
  instrNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  instrText: { flex: 1, fontSize: FONTS.size.sm, lineHeight: 21 },
  historyRow: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, gap: SPACING.sm },
  historyLevel: { paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.sm },
  historyLevelText: { fontSize: FONTS.size.xs, fontWeight: FONTS.weight.bold },
  historyInfo: { flex: 1 },
  historyDate: { fontSize: FONTS.size.xs },
  historyDur: { fontSize: FONTS.size.xs, marginTop: 2 },
  historyRight: { alignItems: 'flex-end', gap: 2 },
  historyScore: { fontSize: FONTS.size.sm, fontWeight: FONTS.weight.bold },
  emptyHistory: { alignItems: 'center', padding: SPACING.xl, gap: SPACING.sm },
  emptyText: { fontSize: FONTS.size.sm },
  resultScroll: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  resultCard: { borderRadius: RADIUS.xl, padding: SPACING.xl, alignItems: 'center', borderWidth: 1, gap: SPACING.md },
  resultMainEmoji: { fontSize: 64 },
  resultTitle: { fontSize: FONTS.size.xxl, fontWeight: FONTS.weight.bold },
  unlockBanner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1.5, width: '100%', justifyContent: 'center' },
  unlockText: { fontSize: FONTS.size.md, fontWeight: FONTS.weight.bold },
  xpBanner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, width: '100%', justifyContent: 'center' },
  xpBannerText: { fontSize: FONTS.size.md, fontWeight: FONTS.weight.bold },
  resultStats: { flexDirection: 'row', gap: SPACING.sm, width: '100%' },
  resultStat: { flex: 1, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', gap: 4, borderWidth: 1 },
  resultStatVal: { fontSize: FONTS.size.lg, fontWeight: FONTS.weight.bold },
  resultStatLabel: { fontSize: FONTS.size.xs },
  progressSection: { width: '100%', gap: SPACING.xs },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: FONTS.size.xs, fontWeight: FONTS.weight.medium },
  progressBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4 },
  maxLevelBanner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1, width: '100%', justifyContent: 'center' },
  outlineBtn: { width: '100%', borderRadius: RADIUS.full, paddingVertical: 14, alignItems: 'center', borderWidth: 1 },
  outlineBtnText: { fontSize: FONTS.size.md, fontWeight: FONTS.weight.semibold },
  gameHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md, paddingTop: Platform.OS === 'ios' ? 50 : SPACING.md, borderBottomWidth: 1 },
  exitBtn: { paddingVertical: 6, paddingHorizontal: SPACING.sm },
  gameHeaderTitle: { fontSize: FONTS.size.md, fontWeight: FONTS.weight.bold },
});