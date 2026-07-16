// src/screens/games/game-logic.js
import React, { useState, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import GameShell from './GameShell';
import { useTheme } from '../../context/ThemeContext';
import { FONTS, SPACING, RADIUS, getShadow } from '../../config/theme';

const LOGIC_CONFIG = {
  id: 'logic', title: 'Logika', emoji: '🧩', color: '#7C3AED',
  description: 'Rozwiązuj zadania logiczne i łamigłówki — czas jest monitorowany, ale nie ograniczony',
  instructions: [
    'Otrzymasz zadanie logiczne z 4 opcjami odpowiedzi.',
    'Czytaj uważnie — nie ma timera, ale czas jest mierzony.',
    'Wybierz poprawną odpowiedź spośród dostępnych.',
    'Opcje odpowiedzi są za każdym razem przemieszane.',
    'Ukończ wszystkie zadania na poziomie, aby zdobyć punkty.',
    'Im wyższy poziom, tym trudniejsze zadania!',
  ],
  // Кількість питань що видаються у кожному рівні (з банку вибирається рандомно)
  levels: [
    { level: 1, label: 'Poziom 1 — Początkujący', desc: '5 zadań z banku. Podstawowa logika.',    count: 5  },
    { level: 2, label: 'Poziom 2 — Uczeń',        desc: '6 zadań. Średni poziom trudności.',          count: 6  },
    { level: 3, label: 'Poziom 3 — Znawca',      desc: '7 zadań. Ciągi liczbowe i zależności.', count: 7 },
    { level: 4, label: 'Poziom 4 — Mistrz',      desc: '8 zadań. Złożona dedukcja.',             count: 8  },
    { level: 5, label: 'Poziom 5 — Geniusz',     desc: '10 zadań najwyższej trudności.',        count: 10 },
  ],
};

// ─── Банк питань. Для кожного питання зберігаємо correctAnswer (текст), а не індекс.
// Так рандомне перемішування варіантів не ламає правильну відповідь.

const QUESTION_BANK = {
  1: [
    { q: 'Jeśli wszystkie koty to zwierzęta, a Murczyk to kot, to Murczyk jest…?', options: ['rośliną','zwierzęciem','ptakiem','rybą'], answer: 'zwierzęciem' },
    { q: 'Dokończ ciąg: 2, 4, 6, 8, …', options: ['9','11','10','12'], answer: '10' },
    { q: 'Co jest zbędne? Jabłko, gruszka, marchewka, pomarańcza', options: ['jabłko','gruszka','marchewka','pomarańcza'], answer: 'marchewka' },
    { q: 'Saszka ma 3 jabłka. Dał 1 Ani. Ile jabłek ma Saszka?', options: ['4','3','1','2'], answer: '2' },
    { q: 'Co łączy książkę i gazetę?', options: ['obie są okrągłe','obie się je','obie się czyta','obie są ciężkie'], answer: 'obie się czyta' },
    { q: 'Jaka liczba jest po 7?', options: ['6','9','8','10'], answer: '8' },
    { q: 'Słońce to gwiazda czy planeta?', options: ['planeta','gwiazda','księżyc','kometa'], answer: 'gwiazda' },
    { q: 'Co jest cięższe: 1 kg żelaza czy 1 kg puchu?', options: ['żelazo','puch','tak samo','zależy'], answer: 'tak samo' },
    { q: 'Ile dni jest w tygodniu?', options: ['5','6','7','8'], answer: '7' },
    { q: 'Jeśli wszystkie róże to kwiaty, a Maria trzyma różę, to co ona trzyma?', options: ['drzewo','kwiat','trawę','krzew'], answer: 'kwiat' },
    { q: 'Dokończ: 10, 20, 30, 40, …', options: ['45','48','50','55'], answer: '50' },
    { q: 'Co jest zbędne: stół, krzesło, szafa, podłoga?', options: ['stół','krzesło','szafa','podłoga'], answer: 'podłoga' },
  ],
  2: [
    { q: 'Dokończ ciąg: 1, 4, 9, 16, …', options: ['20','25','18','30'], answer: '25' },
    { q: 'Jeśli jutro po wczoraj to dzisiaj, jaki jest dziś dzień?', options: ['wczoraj','jutro','dzisiaj','przedwczoraj'], answer: 'dzisiaj' },
    { q: 'Jeśli 5 robotników buduje w 10 dni, to 10 robotników w…?', options: ['20 dni','10 dni','5 dni','2 dni'], answer: '5 dni' },
    { q: 'Linijka, długopis, ołówek, zeszyt — co jest zbędne?', options: ['linijka','długopis','ołówek','zeszyt'], answer: 'zeszyt' },
    { q: 'Dokończ: 5, 10, 15, 20, …', options: ['22','24','25','30'], answer: '25' },
    { q: 'Ile kątów ma prostokąt?', options: ['3','5','4','6'], answer: '4' },
    { q: 'Co jest zbędne: kot, pies, wróbel, krowa?', options: ['kot','pies','wróbel','krowa'], answer: 'wróbel' },
    { q: 'Jeśli Ania jest starsza od Borysa, a Borys starszy od Wery, kto jest najstarszy?', options: ['Borys','Wera','Ania','Wszyscy tak samo'], answer: 'Ania' },
    { q: 'Dokończ: A, B, C, D, …', options: ['E','F','G','H'], answer: 'E' },
    { q: 'Samochód i motocykl. Co je łączy?', options: ['oba latają','oba pływają','oba mają koła','oba są duże'], answer: 'oba mają koła' },
    { q: 'Jeśli lustrzane odbicie "3" to "Ɛ", to odbicie "12" to…?', options: ['21','12','ᄅ1','21 w lustrze'], answer: '21 w lustrze' },
    { q: 'Ile palców jest na dwóch dłoniach?', options: ['8','9','10','12'], answer: '10' },
  ],
  3: [
    { q: 'Dokończ: 3, 6, 12, 24, …', options: ['36','30','48','42'], answer: '48' },
    { q: 'W rodzinie jest 3 siostry. Każda ma 1 brata. Ile jest dzieci?', options: ['6','3','4','7'], answer: '4' },
    { q: 'Znajdź zależność: 2, 3, 5, 8, 13, …', options: ['18','21','20','15'], answer: '21' },
    { q: 'Liczba, która pomnożona przez dowolną daje tę samą liczbę?', options: ['1','2','0','10'], answer: '0' },
    { q: 'Dokończ: 1, 1, 2, 3, 5, 8, 13, …', options: ['18','21','20','19'], answer: '21' },
    { q: 'Jeśli KINO = 4 litery, TEATR = 5, to CYRK = ?', options: ['3','4','5','6'], answer: '4' },
    { q: 'Jeśli niektóre A są B, a wszystkie B są C, to?', options: ['wszystkie A są C','niektóre A są C','żadne A nie jest C','wszystkie C są A'], answer: 'niektóre A są C' },
    { q: 'Dokończ: 2, 4, 8, 16, …', options: ['24','30','32','28'], answer: '32' },
    { q: 'Która liczba jest pierwsza: 9, 15, 17, 21?', options: ['9','15','17','21'], answer: '17' },
    { q: 'Słowo "WIND" — ile ma liter?', options: ['3','4','5','6'], answer: '4' },
    { q: 'Jeśli wszyscy blondyni to ludzie, ale nie wszyscy ludzie to blondyni, to…', options: ['wszyscy ludzie to blondyni','niektórzy ludzie to blondyni','nikt nie jest blondynem','wszyscy blondyni są rudzi'], answer: 'niektórzy ludzie to blondyni' },
    { q: 'Dokończ: 100, 50, 25, …', options: ['15','10','12.5','20'], answer: '12.5' },
    { q: 'Ile sekund jest w 1 minucie?', options: ['10','100','60','30'], answer: '60' },
  ],
  4: [
    { q: 'Trzy osoby siedzą w rzędzie. Ania nie jest na brzegu. Borys siedzi pierwszy. Kto jest w środku?', options: ['Ania','Borys','Trzeci','Nie da się określić'], answer: 'Ania' },
    { q: 'Dokończ: 2, 6, 12, 20, 30, …', options: ['40','42','44','36'], answer: '42' },
    { q: 'Na farmie są kury i krowy. 10 głów i 28 nóg. Ile jest kur?', options: ['4','8','6','5'], answer: '6' },
    { q: 'Jeśli dziś jest środa, jaki dzień będzie za 100 dni?', options: ['piątek','środa','sobota','wtorek'], answer: 'piątek' },
    { q: 'Ile miesięcy w roku ma 28 dni?', options: ['1','12','4','6'], answer: '12' },
    { q: 'Znajdź zbędne: kwadrat, koło, trójkąt, sześcian', options: ['kwadrat','koło','trójkąt','sześcian'], answer: 'sześcian' },
    { q: 'Liczba 64: pierwiastek sześcienny?', options: ['8','4','6','16'], answer: '4' },
    { q: 'Jeśli A > B, B > C, C > D, co jest prawdą?', options: ['D > A','A > D','B = D','C > A'], answer: 'A > D' },
    { q: 'Jeśli 3 jabłka kosztują 6 zł, ile kosztuje 7 jabłek?', options: ['12','14','21','18'], answer: '14' },
    { q: 'Są 4 karty: czerwona, niebieska, zielona, żółta. Jaka karta jest między niebieską a żółtą, jeśli czerwona jest pierwsza, a zielona ostatnia?', options: ['niebieska','żółta','czerwona','nie ma żadnej'], answer: 'nie ma żadnej' },
    { q: 'Dokończ: 1, 8, 27, 64, …', options: ['100','125','81','144'], answer: '125' },
    { q: 'Jeśli miasto A jest na północ od miasta B, a B na wschód od C, gdzie jest A względem C?', options: ['na południu','na zachodzie','na północnym wschodzie','na wschodzie'], answer: 'na północnym wschodzie' },
  ],
  5: [
    { q: 'Są 3 pudełka: A(jabłka), B(gruszki), C(jabłka i gruszki), wszystkie etykiety są błędne. Z C wyciągnięto jabłko. Co jest w A?', options: ['jabłka','gruszki','jabłka i gruszki','puste'], answer: 'jabłka i gruszki' },
    { q: 'Winda. 5 osób. 3. piętro: 2 wychodzą, 1 wchodzi. 5. piętro: 3 wychodzą, 4 wchodzą. Ile osób jest w windzie?', options: ['4','5','6','7'], answer: '5' },
    { q: 'Dokończ ciąg: 0, 1, 3, 6, 10, 15, …', options: ['18','21','20','22'], answer: '21' },
    { q: 'Jeśli A > B i B > C i C > D, to które stwierdzenie jest prawdziwe?', options: ['D > A','A > D','B = D','C > A'], answer: 'A > D' },
    { q: '"Niektórzy studenci to prymusi. Wszyscy prymusi są inteligentni." Co z tego wynika?', options: ['Wszyscy studenci są inteligentni','Niektórzy studenci są inteligentni','Nikt nie jest inteligentny','Wszyscy inteligentni to studenci'], answer: 'Niektórzy studenci są inteligentni' },
    { q: 'Moneta: 5 razy orzeł. Prawdopodobieństwo orła za 6. razem?', options: ['ponad 50%','50%','poniżej 50%','100%'], answer: '50%' },
    { q: 'Liczba 2^10 = ?', options: ['512','2048','1024','256'], answer: '1024' },
    { q: '"SŁOŃCE" = 123456. Jak koduje się "SŁONET"?', options: ['12345','12346','12347','12348'], answer: '12346' },
    { q: 'Jeśli 6 kotów łapie 6 myszy w 6 minut, ile kotów złapie 100 myszy w 100 minut?', options: ['100','6','60','10'], answer: '6' },
    { q: 'Ojciec ma 30 lat, syn 5. Za ile lat ojciec będzie dwa razy starszy?', options: ['10','15','20','25'], answer: '20' },
    { q: 'Jest 5 domów. Norweg jest pierwszy. Zielony dom jest na lewo od białego. Biały jest 5. Ile domów jest między zielonym a skrajnym prawym?', options: ['1','2','3','4'], answer: '2' },
    { q: 'Trzej bracia: najstarszy ma 10, średni 8, najmłodszy 6. Ile wyniesie suma ich lat za 4 lata?', options: ['30','36','34','28'], answer: '36' },
    { q: 'Jeśli przestawić litery "ROMA" — ile jest różnych 4-literowych kombinacji?', options: ['12','24','16','8'], answer: '24' },
    { q: 'Ciąg: 2, 5, 11, 23, 47, … Co dalej?', options: ['90','95','94','96'], answer: '95' },
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

// Вибираємо рандомно count питань з банку і перемішуємо варіанти відповідей
function prepareQuestions(level, count) {
  const bank = QUESTION_BANK[level] || QUESTION_BANK[1];
  const picked = shuffle(bank).slice(0, Math.min(count, bank.length));
  return picked.map((q) => {
    const shuffledOptions = shuffle(q.options);
    const correctIdx = shuffledOptions.indexOf(q.answer);
    return { q: q.q, options: shuffledOptions, correct: correctIdx, answer: q.answer };
  });
}

// ─── Ігровий екран ────────────────────────────────────────────────────────────
function LogicBoard({ level, onFinish }) {
  const { colors } = useTheme();
  const color = LOGIC_CONFIG.color;
  const cfg = LOGIC_CONFIG.levels[level - 1];

  // useMemo — питання будуються один раз при монтуванні (не кожен рендер)
  const questions = useMemo(() => prepareQuestions(level, cfg.count), [level, cfg.count]);

  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);   // індекс обраного варіанта
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [score, setScore] = useState(0);
  const startTime = useRef(Date.now());

  const q = questions[current];
  const total = questions.length;
  const pct = Math.round((current / total) * 100);

  const handleSelect = (idx) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    if (idx === q.correct) {
      setCorrectCount((c) => c + 1);
      setScore((s) => s + 20 * level);
    }
    // При неправильному — НЕ показуємо правильну, просто ❌
  };

  const handleNext = () => {
    const isLastQuestion = current + 1 >= total;
    const finalScore = score;

    if (isLastQuestion) {
      const duration = Date.now() - startTime.current;
      const won = correctCount >= Math.ceil(total / 2);
      onFinish({ score: finalScore, duration, won });
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setAnswered(false);
    }
  };

  return (
    <ScrollView
      style={[styles.board, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Статус */}
      <View style={[styles.statusBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>
          Zadanie {current + 1} z {total}
        </Text>
        <View style={[styles.scorePill, { backgroundColor: color + '22', borderColor: color + '55' }]}>
          <Text style={[styles.scoreText, { color }]}>⭐ {score}</Text>
        </View>
      </View>
      <View style={[styles.progressBg, { backgroundColor: colors.surfaceAlt }]}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>

      {/* Задача */}
      <View style={[styles.questionCard, getShadow('sm'), { backgroundColor: colors.surface, borderColor: color + '44' }]}>
        <Text style={[styles.questionLabel, { color: colors.textMuted }]}>🧩 Zadanie logiczne</Text>
        <Text style={[styles.questionText, { color: colors.text }]}>{q.q}</Text>
      </View>

      {/* Варіанти відповідей (рандомно перемішані) */}
      {q.options.map((opt, idx) => {
        let bg = colors.surfaceAlt;
        let border = colors.border;
        let textColor = colors.text;
        let badgeBg = colors.surfaceAlt;
        let badgeTextColor = colors.textSecondary;
        let rightIcon = null;

        if (answered) {
          if (idx === selected && idx === q.correct) {
            // Правильна відповідь обрана
            bg = colors.success + '20'; border = colors.success; textColor = colors.success;
            badgeBg = colors.success; badgeTextColor = '#fff';
            rightIcon = '✅';
          } else if (idx === selected && idx !== q.correct) {
            // Неправильна обрана — показуємо ❌, але НЕ розкриваємо правильну
            bg = colors.error + '20'; border = colors.error; textColor = colors.error;
            badgeBg = colors.error; badgeTextColor = '#fff';
            rightIcon = '❌';
          } else {
            // Решта варіантів — просто нейтральні (не підсвічуємо правильну!)
            bg = colors.surfaceAlt; border = colors.border; textColor = colors.textMuted;
          }
        }

        return (
          <TouchableOpacity
            key={idx}
            style={[styles.option, { backgroundColor: bg, borderColor: border }]}
            onPress={() => handleSelect(idx)}
            disabled={answered}
            activeOpacity={0.8}
          >
            <View style={[styles.optionBadge, { backgroundColor: badgeBg }]}>
              <Text style={{ color: badgeTextColor, fontSize: FONTS.size.xs, fontWeight: FONTS.weight.bold }}>
                {String.fromCharCode(65 + idx)}
              </Text>
            </View>
            <Text style={[styles.optionText, { color: textColor }]}>{opt}</Text>
            {rightIcon && <Text style={{ marginLeft: 'auto' }}>{rightIcon}</Text>}
          </TouchableOpacity>
        );
      })}

      {/* Після відповіді: мінімальний фідбек + кнопка далі */}
      {answered && (
        <>
          <View style={[styles.feedbackBox, {
            backgroundColor: selected === q.correct ? colors.success + '15' : colors.error + '15',
            borderColor: selected === q.correct ? colors.success : colors.error,
          }]}>
            <Text style={[styles.feedbackText, { color: selected === q.correct ? colors.success : colors.error }]}>
              {selected === q.correct ? '✅ Dobrze! +' + (20 * level) + ' punktów' : '❌ Błędnie. Spróbuj kolejne!'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.nextBtn, getShadow('button'), { backgroundColor: color }]}
            onPress={handleNext}
          >
            <Text style={styles.nextBtnText}>
              {current + 1 >= total ? '🏁 Zakończ' : 'Następne zadanie →'}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

export default function LogicGame({ navigation }) {
  return (
    <GameShell gameId="logic" config={LOGIC_CONFIG} navigation={navigation}>
      {({ level, onFinish }) => <LogicBoard level={level} onFinish={onFinish} />}
    </GameShell>
  );
}

const styles = StyleSheet.create({
  board: { flex: 1 },
  content: { paddingBottom: 48 },
  statusBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.md, borderBottomWidth: 1,
  },
  statusLabel: { fontSize: FONTS.size.sm, fontWeight: FONTS.weight.medium },
  scorePill: { paddingHorizontal: SPACING.md, paddingVertical: 4, borderRadius: RADIUS.full, borderWidth: 1 },
  scoreText: { fontSize: FONTS.size.sm, fontWeight: FONTS.weight.bold },
  progressBg: { height: 4 },
  progressFill: { height: 4 },
  questionCard: {
    margin: SPACING.md, borderRadius: RADIUS.xl,
    padding: SPACING.lg, borderWidth: 1.5,
  },
  questionLabel: { fontSize: FONTS.size.xs, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.sm },
  questionText: { fontSize: FONTS.size.md, fontWeight: FONTS.weight.semibold, lineHeight: 26 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    marginHorizontal: SPACING.md, marginBottom: SPACING.sm,
    borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1.5,
  },
  optionBadge: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  optionText: { flex: 1, fontSize: FONTS.size.base, lineHeight: 20 },
  feedbackBox: {
    marginHorizontal: SPACING.md, marginTop: SPACING.sm,
    borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1,
  },
  feedbackText: { fontSize: FONTS.size.sm, fontWeight: FONTS.weight.semibold },
  nextBtn: {
    margin: SPACING.md, borderRadius: RADIUS.full,
    paddingVertical: 15, alignItems: 'center',
  },
  nextBtnText: { color: '#fff', fontSize: FONTS.size.md, fontWeight: FONTS.weight.bold },
});