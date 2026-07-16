// src/screens/settings.js — Налаштування: тема, сповіщення, видалення акаунту
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Platform, Alert, Modal, TextInput, ActivityIndicator,  } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { FONTS, SPACING, RADIUS, getShadow } from '../config/theme';
import { auth, db } from '../config/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import {
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  signOut,
} from 'firebase/auth';

const NOTIF_KEY = 'brain_trainer_notifications';

const THEME_OPTIONS = [
  { key: 'auto',  label: 'Auto',   emoji: '🌓', sublabel: 'Z urządzenia' },
  { key: 'dark',  label: 'Ciemna',  emoji: '🌙', sublabel: 'Zawsze ciemna' },
  { key: 'light', label: 'Jasna',  emoji: '☀️', sublabel: 'Zawsze jasna' },
];

// ─── Модал підтвердження пароля для видалення акаунту ─────────────────────────
function DeleteAccountModal({ visible, onClose, onConfirm, loading, colors }) {
  const [haslo, setHaslo] = useState('');

  useEffect(() => {
    if (visible) setHaslo('');
  }, [visible]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={daStyles.overlay}>
        <View style={[daStyles.card, getShadow('card'), { backgroundColor: colors.surface, borderColor: colors.error + '55' }]}>
          <Text style={[daStyles.title, { color: colors.error }]}>🗑️ Usuń konto</Text>
          <Text style={[daStyles.desc, { color: colors.textSecondary }]}>
            To działanie jest nieodwracalne. Wszystkie Twoje dane zostaną trwale usunięte.{'\n'}
            Wprowadź aktualne hasło, aby potwierdzić.
          </Text>
          <TextInput
            style={[daStyles.input, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.border }]}
            value={haslo}
            onChangeText={setHaslo}
            placeholder="Aktualne hasło"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
          />
          <View style={daStyles.btns}>
            <TouchableOpacity
              style={[daStyles.btnOutline, { borderColor: colors.border }]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={[daStyles.btnOutlineText, { color: colors.textSecondary }]}>Anuluj</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[daStyles.btnFill, { backgroundColor: colors.error }]}
              onPress={() => onConfirm(haslo)}
              disabled={loading || !haslo}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={daStyles.btnFillText}>Usuń</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const daStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  card: { width: '100%', maxWidth: 360, borderRadius: RADIUS.xl, padding: SPACING.xl, borderWidth: 1.5, gap: SPACING.md },
  title: { fontSize: FONTS.size.lg, fontWeight: FONTS.weight.bold, textAlign: 'center' },
  desc: { fontSize: FONTS.size.sm, textAlign: 'center', lineHeight: 20 },
  input: { borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: SPACING.md, paddingVertical: Platform.OS === 'ios' ? 14 : 12, fontSize: FONTS.size.base },
  btns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xs },
  btnOutline: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.full, borderWidth: 1, alignItems: 'center' },
  btnOutlineText: { fontSize: FONTS.size.base, fontWeight: FONTS.weight.medium },
  btnFill: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.full, alignItems: 'center' },
  btnFillText: { color: '#fff', fontSize: FONTS.size.base, fontWeight: FONTS.weight.bold },
});

// ─── Модал вибору часу сповіщення ────────────────────────────────────────────
function TimePickerModal({ visible, value, onSave, onClose, colors }) {
  const [godzina, setGodzina] = useState('09');
  const [minuta, setMinuta] = useState('00');

  useEffect(() => {
    if (visible && value) {
      const czesci = value.split(':');
      setGodzina(czesci[0] || '09');
      setMinuta(czesci[1] || '00');
    }
  }, [visible, value]);

  const handleSave = () => {
    const g = Math.min(23, Math.max(0, parseInt(godzina, 10) || 0));
    const m = Math.min(59, Math.max(0, parseInt(minuta, 10) || 0));
    onSave(`${String(g).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={tpStyles.overlay}>
        <View style={[tpStyles.card, getShadow('card'), { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[tpStyles.title, { color: colors.text }]}>⏰ Czas powiadomienia</Text>
          <Text style={[tpStyles.subtitle, { color: colors.textSecondary }]}>
            Wprowadź czas w formacie GG:MM
          </Text>
          <View style={tpStyles.timeRow}>
            <TextInput
              style={[tpStyles.timeInput, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.borderFocus }]}
              value={godzina} onChangeText={(v) => setGodzina(v.replace(/[^0-9]/g, '').slice(0, 2))}
              keyboardType="number-pad" maxLength={2} placeholder="09" placeholderTextColor={colors.textMuted}
            />
            <Text style={[tpStyles.colon, { color: colors.text }]}>:</Text>
            <TextInput
              style={[tpStyles.timeInput, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.borderFocus }]}
              value={minuta} onChangeText={(v) => setMinuta(v.replace(/[^0-9]/g, '').slice(0, 2))}
              keyboardType="number-pad" maxLength={2} placeholder="00" placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={tpStyles.btns}>
            <TouchableOpacity style={[tpStyles.btnOutline, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[tpStyles.btnOutlineText, { color: colors.textSecondary }]}>Anuluj</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[tpStyles.btnFill, { backgroundColor: colors.primary }]} onPress={handleSave}>
              <Text style={tpStyles.btnFillText}>Zapisz</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const tpStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  card: { width: '100%', maxWidth: 320, borderRadius: RADIUS.xl, padding: SPACING.xl, borderWidth: 1, gap: SPACING.md },
  title: { fontSize: FONTS.size.lg, fontWeight: FONTS.weight.bold, textAlign: 'center' },
  subtitle: { fontSize: FONTS.size.sm, textAlign: 'center' },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  timeInput: { width: 72, height: 64, borderRadius: RADIUS.lg, borderWidth: 2, textAlign: 'center', fontSize: FONTS.size.xxl, fontWeight: FONTS.weight.extrabold },
  colon: { fontSize: FONTS.size.xxl, fontWeight: FONTS.weight.extrabold },
  btns: { flexDirection: 'row', gap: SPACING.sm },
  btnOutline: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.full, borderWidth: 1, alignItems: 'center' },
  btnOutlineText: { fontSize: FONTS.size.base, fontWeight: FONTS.weight.medium },
  btnFill: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.full, alignItems: 'center' },
  btnFillText: { color: '#fff', fontSize: FONTS.size.base, fontWeight: FONTS.weight.bold },
});

// ─── Рядок налаштування ───────────────────────────────────────────────────────
function SettingsRow({ emoji, label, sublabel, onPress, right, last, colors, danger }) {
  return (
    <TouchableOpacity
      style={[rowStyles.row, !last && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
      onPress={onPress} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress && !right}
    >
      <View style={[rowStyles.icon, { backgroundColor: danger ? colors.error + '18' : colors.surfaceAlt }]}>
        <Text style={{ fontSize: 18 }}>{emoji}</Text>
      </View>
      <View style={rowStyles.texts}>
        <Text style={[rowStyles.label, { color: danger ? colors.error : colors.text }]}>{label}</Text>
        {sublabel ? <Text style={[rowStyles.sub, { color: colors.textMuted }]}>{sublabel}</Text> : null}
      </View>
      {right ?? (onPress && <Text style={[rowStyles.arrow, { color: danger ? colors.error : colors.textMuted }]}>›</Text>)}
    </TouchableOpacity>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.md, minHeight: 58 },
  icon: { width: 38, height: 38, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1 },
  label: { fontSize: FONTS.size.base, fontWeight: FONTS.weight.medium },
  sub: { fontSize: FONTS.size.xs, marginTop: 2 },
  arrow: { fontSize: 22, fontWeight: FONTS.weight.bold },
});


// ─── Допоміжні функції сповіщень ─────────────────────────────────────────────

// Android/iOS: планує щоденне сповіщення через expo-notifications
async function scheduleNotification(Notifications, time) {
  const [godzina, minuta] = time.split(':').map(Number);

  await Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🧠 Brain Trainer',
      body: 'Czas na trening mózgu! Zagraj dzisiaj w przynajmniej jedną grę.',
    },
    trigger: {
      hour: godzina,
      minute: minuta,
      repeats: true,
    },
  });
}

// Веб: планує сповіщення через setTimeout до наступного спрацювання
function scheduleWebNotification(time) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

  const [targetH, targetM] = time.split(':').map(Number);
  const now = new Date();
  const next = new Date();
  next.setHours(targetH, targetM, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1); // завтра якщо вже минуло
  const delay = next - now;

  // Зберігаємо таймер в window щоб можна було скасувати
  if (window._brainTrainerNotifTimer) clearTimeout(window._brainTrainerNotifTimer);
  window._brainTrainerNotifTimer = setTimeout(() => {
    new Notification('🧠 Brain Trainer', {
      body: 'Czas na trening mózgu! Zagraj dzisiaj w przynajmniej jedną grę.',
      icon: '/favicon.ico',
    });
    // Перепланувати на наступний день
    scheduleWebNotification(time);
  }, delay);
}

// ─── Головний екран ───────────────────────────────────────────────────────────
export default function SettingsScreen({ navigation }) {
  const { colors, isDark, themeMode, setThemeMode, systemScheme } = useTheme();

  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifTime, setNotifTime] = useState('09:00');
  const [notifEmail, setNotifEmail] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Завантажуємо збережені налаштування та відновлюємо веб-сповіщення
  useEffect(() => {
    AsyncStorage.getItem(NOTIF_KEY).then((raw) => {
      if (raw) {
        const d = JSON.parse(raw);
        const enabled = d.enabled ?? false;
        const time = d.time ?? '09:00';
        setNotifEnabled(enabled);
        setNotifTime(time);
        setNotifEmail(d.email ?? false);

        // Відновлюємо веб-таймер якщо сповіщення були увімкнені
        if (enabled && Platform.OS === 'web') {
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            scheduleWebNotification(time);
          }
        }
      }
    }).catch(() => {});
  }, []);

  const saveNotif = async (patch) => {
    const current = { enabled: notifEnabled, time: notifTime, email: notifEmail, ...patch };
    await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(current)).catch(() => {});
  };

  const handleToggleNotif = async (val) => {
    setNotifEnabled(val);
    saveNotif({ enabled: val });

    if (val) {
      if (Platform.OS === 'web') {
        // ── Веб: Web Notifications API ──────────────────────────────────────
        if (typeof Notification !== 'undefined') {
          if (Notification.permission === 'default') {
            const perm = await Notification.requestPermission();
            if (perm !== 'granted') {
              alert('❌ Brak zgody na powiadomienia. Zmień ustawienia przeglądarki.');
              setNotifEnabled(false);
              saveNotif({ enabled: false });
              return;
            }
          } else if (Notification.permission === 'denied') {
            alert('❌ Powiadomienia zablokowane przez przeglądarkię. Zezwól na nie w ustawieniach przeglądarki.');
            setNotifEnabled(false);
            saveNotif({ enabled: false });
            return;
          }
          // Тест-сповіщення
          new Notification('🧠 Brain Trainer', {
            body: 'Powiadomienia włączone! Trenuj swój mózg codziennie.',
            icon: '/favicon.ico',
          });
        }
      } else {
        // ── Android / iOS: expo-notifications ──────────────────────────────
        try {
          const Notifications = (await import('expo-notifications')).default;
          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          let finalStatus = existingStatus;
          if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
          }
          if (finalStatus !== 'granted') {
            Alert.alert('❌ Odmowa dostępu', 'Zezwól na powiadomienia w ustawieniach urządzenia');
            setNotifEnabled(false);
            saveNotif({ enabled: false });
            return;
          }
          await scheduleNotification(Notifications, notifTime);
        } catch {
          // expo-notifications не встановлено — тихо пропускаємо
        }
      }
    } else {
      // Вимкнути — скасовуємо всі заплановані
      if (Platform.OS !== 'web') {
        try {
          const Notifications = await import('expo-notifications');
          await Notifications.cancelAllScheduledNotificationsAsync();
        } catch {}
      }
    }
  };

  const handleToggleEmail = (val) => {
    setNotifEmail(val);
    saveNotif({ email: val });
  };

  const handleSaveTime = async (time) => {
    setNotifTime(time);
    saveNotif({ time });
    // Перепланувати сповіщення на новий час якщо увімкнено
    if (notifEnabled && Platform.OS !== 'web') {
      try {
        const Notifications = (await import('expo-notifications')).default;
        await Notifications.cancelAllScheduledNotificationsAsync();
        await scheduleNotification(Notifications, time);
      } catch {}
    }
    if (notifEnabled && Platform.OS === 'web') {
      scheduleWebNotification(time);
    }
  };

  // ─── Видалення акаунту: спочатку reauthenticate, потім видалити Firestore,
  //     потім видалити Auth, потім signOut (щоб очистити локальну сесію)
  const doDeleteAccount = async (haslo) => {
    const user = auth.currentUser;
    if (!user) return;

    setDeletingAccount(true);
    try {
      // 1. Reauthenticate — обов'язково перед deleteUser
      const credential = EmailAuthProvider.credential(user.email, haslo);
      await reauthenticateWithCredential(user, credential);

      // 2. Видаляємо дані з Firestore
      try {
        await deleteDoc(doc(db, 'users', user.uid));
      } catch {
        // Якщо документа немає — не критично, продовжуємо
      }

      // 3. Видаляємо акаунт з Firebase Authentication
      await deleteUser(user);

      // 4. signOut на випадок якщо deleteUser не очистив локальну сесію
      try { await signOut(auth); } catch {}

      setShowDeleteModal(false);
      // onAuthStateChanged у Root автоматично переведе на екран авторизації
    } catch (e) {
      setDeletingAccount(false);
      const msg =
        e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential'
          ? 'Nieprawidłowe hasło'
          : e.code === 'auth/too-many-requests'
          ? 'Za dużo prób. Spróbuj ponownie później.'
          : 'Nie udało się usunąć konta. Spróbuj ponownie.';

      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Błąd', msg);
      }
    }
  };

  const handleDeleteAccountPress = () => {
    if (Platform.OS === 'web') {
      // На вебі використовуємо модальне вікно (window.prompt не підходить для пароля)
      setShowDeleteModal(true);
    } else {
      // На момільному — спочатку Alert із попередженням, потім модал із паролем
      Alert.alert(
        '⚠️ Usuń konto',
        'To działanie jest nieodwracalne. Wszystkie Twoje dane zostaną usunięte na zawsze.',
        [
          { text: 'Anuluj', style: 'cancel' },
          { text: 'Kontynuuj', style: 'destructive', onPress: () => setShowDeleteModal(true) },
        ]
      );
    }
  };

  const SectionCard = ({ children }) => (
    <View style={[styles.sectionCard, getShadow('sm'), { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {children}
    </View>
  );

  return (
    <>
      <DeleteAccountModal
        visible={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeletingAccount(false); }}
        onConfirm={doDeleteAccount}
        loading={deletingAccount}
        colors={colors}
      />
      <TimePickerModal
        visible={showTimePicker}
        value={notifTime}
        onSave={handleSaveTime}
        onClose={() => setShowTimePicker(false)}
        colors={colors}
      />

      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.pageHeader}>
            <Text style={[styles.pageTitle, { color: colors.text }]}>⚙️ Ustawienia</Text>
          </View>

          {/* Поточна тема */}
          <View style={[styles.currentTheme, getShadow('sm'), { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ fontSize: 36 }}>{isDark ? '🌙' : '☀️'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.currentThemeTitle, { color: colors.text }]}>
                Aktualnie: Motyw {isDark ? 'Ciemny' : 'Jasny'}
              </Text>
              <Text style={[styles.currentThemeSub, { color: colors.textSecondary }]}>
                {themeMode === 'auto' ? `Urządzenie: ${systemScheme === 'dark' ? 'ciemny' : 'jasny'}` : 'Ustawiono ręcznie'}
              </Text>
            </View>
          </View>

          {/* Вибір теми */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>MOTYW GRAFICZNY</Text>
          <SectionCard>
            <View style={styles.themeOptions}>
              {THEME_OPTIONS.map((opt) => {
                const active = themeMode === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.themeOption, getShadow('sm'), { backgroundColor: active ? colors.primary + '18' : colors.surfaceAlt, borderColor: active ? colors.primary : colors.border }]}
                    onPress={() => setThemeMode(opt.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={{ fontSize: 28, marginBottom: 4 }}>{opt.emoji}</Text>
                    <Text style={[styles.themeOptionLabel, { color: active ? colors.primary : colors.text }]}>{opt.label}</Text>
                    <Text style={[styles.themeOptionSub, { color: colors.textMuted }]}>{opt.sublabel}</Text>
                    {active && (
                      <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
                        <Text style={{ color: '#fff', fontSize: 9, fontWeight: FONTS.weight.bold }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </SectionCard>

          {/* Сповіщення */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>POWIADOMIENIA</Text>
          <SectionCard>
            <SettingsRow
              emoji="🔔" label="Powiadomienia" sublabel={notifEnabled ? `Włączone · ${notifTime}` : 'Wyłączone'}
              colors={colors}
              right={
                <Switch value={notifEnabled} onValueChange={handleToggleNotif}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.white}
                />
              }
            />

            {notifEnabled && (
              <>
                <View style={[styles.indentedRow, { borderTopColor: colors.border }]}>
                  <SettingsRow
                    emoji="⏰" label="Czas przypomnienia"
                    sublabel={notifTime}
                    onPress={() => setShowTimePicker(true)}
                    colors={colors}
                  />
                </View>

                <View style={[styles.indentedRow, { borderTopColor: colors.border }]}>
                  <SettingsRow
                    emoji={Platform.OS === 'web' ? '📧' : '📳'}
                    label={Platform.OS === 'web' ? 'Wyślij na email' : 'Powiadomienia Push'}
                    sublabel={Platform.OS === 'web' ? 'Przypomnienie na pocztę' : 'Powiadomienie systemowe'}
                    colors={colors}
                    last
                    right={
                      <Switch value={notifEmail} onValueChange={handleToggleEmail}
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor={colors.white}
                      />
                    }
                  />
                </View>

                <View style={[styles.notifInfo, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '33' }]}>
                  <Text style={[styles.notifInfoText, { color: colors.textSecondary }]}>
                    {Platform.OS === 'web'
                      ? '📧 W wersji webowej przypomnienia są wysyłane на podany adres email'
                      : '📳 Powiadomienie pojawi się o ' + notifTime + ' każdego dnia'}
                  </Text>
                </View>
              </>
            )}
          </SectionCard>

          {/* Застосунок */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>APLIKACJA</Text>
          <SectionCard>
            <SettingsRow emoji="👤" label="Profil" sublabel="Imię, awatar, dane" onPress={() => navigation?.navigate('Profile')} colors={colors} />
            <SettingsRow emoji="ℹ️" label="O programie" onPress={() => navigation?.navigate('About')} colors={colors} />
            <SettingsRow emoji="⭐" label="Oceń aplikację" colors={colors} last />
          </SectionCard>

          {/* Акаунт */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>KONTO</Text>
          <SectionCard>
            <SettingsRow
              emoji="🗑️"
              label="Usuń konto"
              sublabel="Nieodwracalne usunięcie wszystkich danych"
              onPress={handleDeleteAccountPress}
              colors={colors}
              danger
              last
            />
          </SectionCard>

          <Text style={[styles.version, { color: colors.textMuted }]}>
            Brain Trainer v1.0.0 · Motyw: {themeMode}
          </Text>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  pageHeader: { paddingTop: SPACING.md, paddingBottom: SPACING.lg },
  pageTitle: { fontSize: FONTS.size.xxl, fontWeight: FONTS.weight.bold },
  currentTheme: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, gap: SPACING.md, marginBottom: SPACING.lg },
  currentThemeTitle: { fontSize: FONTS.size.md, fontWeight: FONTS.weight.bold },
  currentThemeSub: { fontSize: FONTS.size.xs, marginTop: 2 },
  sectionLabel: { fontSize: FONTS.size.xs, fontWeight: FONTS.weight.semibold, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: SPACING.sm, marginLeft: SPACING.xs },
  sectionCard: { borderRadius: RADIUS.xl, borderWidth: 1, overflow: 'hidden', marginBottom: SPACING.lg },
  themeOptions: { flexDirection: 'row', gap: SPACING.sm, padding: SPACING.md },
  themeOption: { flex: 1, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', borderWidth: 1.5, position: 'relative' },
  themeOptionLabel: { fontSize: FONTS.size.sm, fontWeight: FONTS.weight.semibold },
  themeOptionSub: { fontSize: FONTS.size.xs, textAlign: 'center', marginTop: 2 },
  checkBadge: { position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  indentedRow: { borderTopWidth: 1 },
  notifInfo: { margin: SPACING.md, borderRadius: RADIUS.lg, padding: SPACING.md, borderWidth: 1 },
  notifInfoText: { fontSize: FONTS.size.xs, lineHeight: 18 },
  version: { textAlign: 'center', fontSize: FONTS.size.xs, marginTop: SPACING.sm },
});