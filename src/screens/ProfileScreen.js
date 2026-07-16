// src/screens/ProfileScreen.js
import React, { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Platform, Alert, RefreshControl,
  TextInput, Modal, Image,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { FONTS, SPACING, RADIUS, getShadow } from '../config/theme';
import { getUserProfile, updateUserProfile, logoutUser, getCurrentUser, changePassword } from '../services/auth';
import { getUserProgressData, calcLevel, xpForNextLevel, xpProgressPct, AVATAR_UNLOCK_LEVELS } from '../services/userProgress';
import { auth, db } from '../config/firebase';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  verifyBeforeUpdateEmail,
} from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';

const AVATARS = [
  { key: 'cat',       emoji: '🐱', label: 'Kot',       levelReq: 1 },
  { key: 'dog',       emoji: '🐶', label: 'Pies',      levelReq: 1 },
  { key: 'butterfly', emoji: '🦋', label: 'Motyl',     levelReq: 3 },
  { key: 'fox',       emoji: '🦊', label: 'Lisek',     levelReq: 4 },
  { key: 'owl',       emoji: '🦉', label: 'Sowa',      levelReq: 6 },
  { key: 'bear',      emoji: '🐻', label: 'Niedźwiedź', levelReq: 8 },

  { key: 'cat_art',         image: require('../../assets/images/cat.jpg'),         label: 'Kot',     levelReq: 9 },
  { key: 'fox_art',         image: require('../../assets/images/fox.jpg'),         label: 'Lis',     levelReq: 10 },
  { key: 'dog_art',         image: require('../../assets/images/dog.jpg'),         label: 'Pies',    levelReq: 11 },
  { key: 'butterfly_art',   image: require('../../assets/images/butterfly.jpg'),   label: 'Motyl',   levelReq: 12 },
];

const GAME_META = {
  memory:   { title: "Pamięć",      emoji: '🃏', color: '#4F46E5', difficulty: 'Średni' },
  math:     { title: 'Matematyka',  emoji: '🔢', color: '#10B981', difficulty: 'Łatwy'   },
  words:    { title: 'Słowa',       emoji: '🔤', color: '#F59E0B', difficulty: 'Średni' },
  reaction: { title: 'Reakcja',     emoji: '⚡',  color: '#EF4444', difficulty: 'Łatwy'   },
  numbers:  { title: 'Liczby',      emoji: '🔢', color: '#06B6D4', difficulty: 'Średni' },
  sequence: { title: 'Sekwencja',   emoji: '🎯', color: '#EC4899', difficulty: 'Średni' },
  logic:    { title: 'Logika',      emoji: '🧩', color: '#7C3AED', difficulty: 'Trudny'  },
};

const TEST_META = {
  math:       { title: 'Matematyka',    emoji: '🔢', color: '#4F46E5' },
  general:    { title: 'Wiedza ogólna', emoji: '🌍', color: '#10B981' },
  ukrainian:  { title: 'Ukraina',       emoji: '🇺🇦', color: '#F59E0B' },
  biology:    { title: 'Biologia',      emoji: '🧬', color: '#00a822' },
  chemistry:  { title: 'Chemia',        emoji: '🧪', color: '#0a02a3' },
  poland:     { title: 'Polska',        emoji: '🇵🇱', color: '#EF4444' },
  tech:       { title: 'Technologie',   emoji: '💻', color: '#a400cd' },
};

const GENDERS = [
  { key: 'male',   label: 'Mężczyzna' },
  { key: 'female', label: 'Kobieta' },
  { key: 'other',  label: 'Inna' },
];

// ─── Field — окремий компонент ЗА межами EditProfileModal, щоб не перестворювався ──
function Field({ label, value, onChange, placeholder, secure, keyboardType, disabled, colors }) {
  return (
    <View style={{ marginBottom: SPACING.md }}>
      <Text style={[mStyles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      {disabled
        ? <View style={[mStyles.disabledField, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
            <Text style={{ color: colors.textMuted, fontSize: FONTS.size.base }}>{value}</Text>
          </View>
        : <TextInput
            style={[mStyles.input, { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.border }]}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            secureTextEntry={secure}
            keyboardType={keyboardType || 'default'}
            autoCapitalize="none"
          />
      }
    </View>
  );
}

// ─── EditProfileModal ─────────────────────────────────────────────────────────
function EditProfileModal({ visible, profile, onClose, onSaved, colors }) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  // Email change state
  const [newEmail, setNewEmail] = useState('');
  const [emailPwd, setEmailPwd] = useState('');
  const [tab, setTab] = useState('info');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (visible) {
      setName(profile?.name || '');
      setAge(profile?.age ? String(profile.age) : '');
      setGender(profile?.gender || '');
      setError(''); setSuccess('');
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      setNewEmail(''); setEmailPwd('');
      setTab('info');
    }
  }, [visible, profile]);

  const handleSaveInfo = async () => {
    if (!name.trim()) { setError("Imię nie może być puste"); return; }
    setLoading(true); setError('');
    try {
      const user = getCurrentUser();
      await updateUserProfile(user.uid, {
        name: name.trim(),
        age: age ? parseInt(age, 10) : null,
        gender: gender || null,
      });
      setSuccess('✅ Zapisano!');
      setTimeout(() => { setSuccess(''); onSaved(); onClose(); }, 1200);
    } catch { setError('Błąd zapisu'); }
    finally { setLoading(false); }
  };

  const handleSavePwd = async () => {
    if (!currentPwd) { setError('Wprowadź aktualne hasło'); return; }
    if (!newPwd || newPwd.length < 6) { setError('Nowe hasło musi mieć min. 6 znaków'); return; }
    if (newPwd !== confirmPwd) { setError('Hasła nie pasują'); return; }
    setLoading(true); setError('');
    try {
      await changePassword(currentPwd, newPwd);
      setSuccess('✅ Hasło zmienione!');
      setTimeout(() => { setSuccess(''); setCurrentPwd(''); setNewPwd(''); setConfirmPwd(''); }, 2000);
    } catch (e) {
      setError(e.code === 'auth/wrong-password' ? 'Nieprawidłowe aktualne hasło' : 'Błąd zmiany hasła');
    }
    finally { setLoading(false); }
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) { setError('Wprowadź poprawny email'); return; }
    if (!emailPwd) { setError('Wprowadź aktualne hasło do potwierdzenia'); return; }
    setLoading(true); setError('');
    try {
      const user = getCurrentUser();
      // Reauthenticate before changing email
      const credential = EmailAuthProvider.credential(user.email, emailPwd);
      await reauthenticateWithCredential(user, credential);

      await verifyBeforeUpdateEmail(user, newEmail.trim());
      await updateUserProfile(user.uid, { email: newEmail.trim() });
      setSuccess('✅ E-mail weryfikacyjny wysłany na nowy adres');
      
      setTimeout(() => {
        setSuccess(''); setNewEmail(''); setEmailPwd('');
        onSaved();
      }, 3000);
    } catch (e) {
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setError('Nieprawidłowe hasło');
      } else if (e.code === 'auth/email-already-in-use') {
        setError('Ten email jest już używany');
      } else if (e.code === 'auth/invalid-email') {
        setError('Niepoprawny format email');
      } else {
        setError('Błąd zmiany email');
      }
    }
    finally { setLoading(false); }
  };

  const TABS = [
    { k: 'info',     label: '👤 Dane' },
    { k: 'email',    label: '📧 Email' },
    { k: 'password', label: '🔒 Hasło' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={mStyles.overlay}>
        <View style={[mStyles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[mStyles.header, { borderBottomColor: colors.border }]}>
            <Text style={[mStyles.title, { color: colors.text }]}>✏️ Edytuj dane</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: colors.textMuted, fontSize: 22 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={[mStyles.tabs, { backgroundColor: colors.surfaceAlt }]}>
            {TABS.map((t) => (
              <TouchableOpacity
                key={t.k}
                style={[mStyles.tab, tab === t.k && { backgroundColor: colors.primary }]}
                onPress={() => { setTab(t.k); setError(''); setSuccess(''); }}
              >
                <Text style={[mStyles.tabText, { color: tab === t.k ? '#fff' : colors.textSecondary }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView contentContainerStyle={mStyles.content}>
            {error ? <View style={[mStyles.alertBox, { backgroundColor: colors.error + '18', borderColor: colors.error }]}><Text style={{ color: colors.error, fontSize: FONTS.size.sm }}>{error}</Text></View> : null}
            {success ? <View style={[mStyles.alertBox, { backgroundColor: colors.success + '18', borderColor: colors.success }]}><Text style={{ color: colors.success, fontSize: FONTS.size.sm }}>{success}</Text></View> : null}

            {tab === 'info' ? (
              <>
                <Field label="Imię" value={name} onChange={setName} placeholder="Twoje imię" colors={colors} />
                <Field label="Wiek" value={age} onChange={(v) => setAge(v.replace(/[^0-9]/g, ''))} placeholder="Twój wiek" keyboardType="number-pad" colors={colors} />
                <Text style={[mStyles.fieldLabel, { color: colors.textSecondary }]}>Płeć</Text>
                <View style={{ flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg }}>
                  {GENDERS.map((g) => (
                    <TouchableOpacity
                      key={g.key}
                      style={[mStyles.genderBtn, { backgroundColor: gender === g.key ? colors.primary + '22' : colors.surfaceAlt, borderColor: gender === g.key ? colors.primary : colors.border }]}
                      onPress={() => setGender(g.key)}
                    >
                      <Text style={[{ fontSize: FONTS.size.sm, fontWeight: FONTS.weight.medium, color: gender === g.key ? colors.primary : colors.textSecondary }]}>{g.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={[mStyles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSaveInfo} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={mStyles.saveBtnText}>Zapisz</Text>}
                </TouchableOpacity>
              </>
            ) : tab === 'email' ? (
              <>
                <View style={[mStyles.alertBox, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '33', marginBottom: SPACING.md }]}>
                  <Text style={{ color: colors.textSecondary, fontSize: FONTS.size.xs }}>
                    📧 Aktualny email: <Text style={{ fontWeight: FONTS.weight.bold, color: colors.text }}>{getCurrentUser()?.email || ''}</Text>
                  </Text>
                </View>
                <Field label="Nowy Email" value={newEmail} onChange={setNewEmail} placeholder="nowy@email.com" keyboardType="email-address" colors={colors} />
                <Field label="Aktualne hasło (do potwierdzenia)" value={emailPwd} onChange={setEmailPwd} placeholder="••••••••" secure colors={colors} />
                <TouchableOpacity style={[mStyles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleChangeEmail} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={mStyles.saveBtnText}>Zmień Email</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Field label="Aktualne hasło" value={currentPwd} onChange={setCurrentPwd} placeholder="••••••••" secure colors={colors} />
                <Field label="Nowe hasło" value={newPwd} onChange={setNewPwd} placeholder="••••••••" secure colors={colors} />
                <Field label="Powtórz nowe hasło" value={confirmPwd} onChange={setConfirmPwd} placeholder="••••••••" secure colors={colors} />
                <TouchableOpacity style={[mStyles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSavePwd} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={mStyles.saveBtnText}>Zmień hasło</Text>}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const mStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, borderWidth: 1, maxHeight: '88%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, borderBottomWidth: 1 },
  title: { fontSize: FONTS.size.lg, fontWeight: FONTS.weight.bold },
  tabs: { flexDirection: 'row', margin: SPACING.md, borderRadius: RADIUS.lg, padding: 4 },
  tab: { flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.md, alignItems: 'center' },
  tabText: { fontSize: FONTS.size.sm, fontWeight: FONTS.weight.semibold },
  content: { padding: SPACING.lg, paddingBottom: 48 },
  alertBox: { borderRadius: RADIUS.md, padding: SPACING.sm, marginBottom: SPACING.md, borderWidth: 1 },
  fieldLabel: { fontSize: FONTS.size.sm, fontWeight: FONTS.weight.medium, marginBottom: SPACING.xs },
  input: { borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: SPACING.md, paddingVertical: Platform.OS === 'ios' ? 14 : 12, fontSize: FONTS.size.base },
  disabledField: { borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: SPACING.md, paddingVertical: Platform.OS === 'ios' ? 14 : 12 },
  genderBtn: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, alignItems: 'center', borderWidth: 1 },
  saveBtn: { borderRadius: RADIUS.full, paddingVertical: 15, alignItems: 'center', marginTop: SPACING.sm },
  saveBtnText: { color: '#fff', fontSize: FONTS.size.md, fontWeight: FONTS.weight.bold },
});

// ─── AvatarPicker ─────────────────────────────────────────────────────────────
function AvatarPicker({ visible, current, userLevel, onSelect, onClose, colors }) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={[apStyles.overlay]}>
        <View style={[apStyles.card, getShadow('card'), { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[apStyles.header, { borderBottomColor: colors.border }]}>
            <Text style={[apStyles.title, { color: colors.text }]}>👤 Wybierz awatar</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: colors.textMuted, fontSize: 22 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={[apStyles.hint, { color: colors.textSecondary }]}>
            Awatary odblokowują się wraz z poziomem
          </Text>
          <ScrollView contentContainerStyle={apStyles.scrollGrid} showsVerticalScrollIndicator={false}>
            <View style={apStyles.grid}>
              {AVATARS.map((av) => {
                const locked = userLevel < av.levelReq;
                const selected = av.key === current;
                return (
                  <TouchableOpacity
                    key={av.key}
                    style={[apStyles.item, {
                      backgroundColor: selected ? colors.primary + '20' : colors.surfaceAlt,
                      borderColor: selected ? colors.primary : colors.border,
                      opacity: locked ? 0.45 : 1,
                    }]}
                    onPress={() => { if (!locked) { onSelect(av.key); onClose(); } }}
                    disabled={locked}
                    activeOpacity={0.8}
                  >
                    {/* Перевірка: Якщо є av.image — рендеримо Image, інакше Text емодзі */}
                    {av.image ? (
                      <View style={apStyles.imageContainer}>
                        <Image source={av.image} style={apStyles.itemImage} />
                      </View>
                    ) : (
                      <Text style={{ fontSize: 36 }}>{av.emoji}</Text>
                    )}

                    <Text style={[apStyles.itemLabel, { color: selected ? colors.primary : colors.textSecondary }]} numberOfLines={1}>
                      {av.label}
                    </Text>
                    {locked
                      ? <View style={[apStyles.lockBadge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                          <Text style={{ fontSize: 9, color: 'rgb(255, 179, 0)', fontWeight: 'bold' }}>🔒 Poz.{av.levelReq}</Text>
                        </View>
                      : selected
                      ? <View style={[apStyles.lockBadge, { backgroundColor: colors.primary }]}>
                          <Text style={{ fontSize: 9, color: '#fff' }}>✓</Text>
                        </View>
                      : null
                    }
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const apStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  card: { width: '100%', maxWidth: 380, maxHeight: '80%', borderRadius: RADIUS.xl, borderWidth: 1, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, borderBottomWidth: 1 },
  title: { fontSize: FONTS.size.md, fontWeight: FONTS.weight.bold },
  hint: { fontSize: FONTS.size.xs, textAlign: 'center', paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, marginBottom: SPACING.xs },
  scrollGrid: { paddingBottom: SPACING.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: SPACING.md, gap: SPACING.sm, justifyContent: 'flex-start' },
  item: { width: '30%', aspectRatio: 1, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 2, gap: 4, position: 'relative' },
  imageContainer: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  itemImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  itemLabel: { fontSize: FONTS.size.xs, fontWeight: FONTS.weight.medium, paddingHorizontal: 2 },
  lockBadge: { position: 'absolute', bottom: -6, paddingHorizontal: 4, paddingVertical: 2, borderRadius: RADIUS.sm, borderWidth: 1, zIndex: 5 },
});

// ─── Головний екран ───────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { colors } = useTheme();
  const [profile, setProfile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [avatar, setAvatar] = useState('cat');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showRecords, setShowRecords] = useState(false);

  const load = useCallback(async () => {
    const user = getCurrentUser();
    if (!user) return;
    try { await auth.currentUser?.reload(); } catch {}
    try {
      const [p, prog] = await Promise.all([
        getUserProfile(user.uid),
        getUserProgressData(user.uid),
      ]);
      setProfile(p);
      setProgress(prog);
      setAvatar(p?.avatar || 'cat');
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleAvatarSelect = async (key) => {
    const user = getCurrentUser();
    setAvatar(key);
    await updateUserProfile(user.uid, { avatar: key });
    setProfile((p) => ({ ...p, avatar: key }));
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Wylogować się?')) logoutUser();
    } else {
      Alert.alert('Wylogowanie', 'Wylogować się?', [
        { text: 'Anuluj', style: 'cancel' },
        { text: 'Wyloguj', style: 'destructive', onPress: () => logoutUser() },
      ]);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const user = getCurrentUser();
  const totalXP  = progress?.totalXP || 0;
  const userLevel = calcLevel(totalXP);
  const nextXP    = xpForNextLevel(userLevel);
  const pct       = xpProgressPct(totalXP);
  const currentAvatar = AVATARS.find((a) => a.key === avatar) || AVATARS[0];
  const gameScores = progress?.gameScores || {};
  const testScores = progress?.testScores || {};

  return (
    <>
      <AvatarPicker
        visible={showAvatarPicker}
        current={avatar}
        userLevel={userLevel}
        onSelect={handleAvatarSelect}
        onClose={() => setShowAvatarPicker(false)}
        colors={colors}
      />
      <EditProfileModal
        visible={showEdit}
        profile={profile}
        onClose={() => setShowEdit(false)}
        onSaved={load}
        colors={colors}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >

        {/* ── Шапка ── */}
        <View style={styles.heroArea}>
          <View style={styles.blobBg} />
          
          <View style={{ width: 100, height: 100, position: 'relative' }}> 
            <TouchableOpacity
              style={[styles.avatarWrap, getShadow('card'), { borderColor: colors.primary, backgroundColor: colors.primaryDark, overflow: 'hidden', width: '100%', height: '100%' }]}
              onPress={() => setShowAvatarPicker(true)}
              activeOpacity={0.85}
            >
              {currentAvatar.image ? (
                <Image source={currentAvatar.image} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
              ) : (
                <Text style={styles.avatarEmoji}>{currentAvatar.emoji}</Text>
              )}
            </TouchableOpacity>

            <View style={[styles.editAvatarBadge, { backgroundColor: colors.primary, zIndex: 10 }]}>
              <Text style={{ fontSize: 10, color: '#fff' }}>✏️</Text>
            </View>
          </View>

          <Text style={[styles.heroName, { color: colors.text }]}>{profile?.name || 'Użytkownik'}</Text>
        
          <Text style={[styles.heroEmail, { color: colors.textSecondary }]}>{user?.email}</Text>

          <View style={[styles.levelBadge, { backgroundColor: colors.primary + '1A', borderColor: colors.primary + '55' }]}>
            <Text style={[styles.levelText, { color: colors.primary }]}>🏅 Poziom {userLevel}</Text>
          </View>

          {/* XP прогрес-бар */}
          <View style={styles.xpSection}>
            <View style={styles.xpRow}>
              <Text style={[styles.xpLabel, { color: colors.textSecondary }]}>{totalXP} XP</Text>
              <Text style={[styles.xpLabel, { color: colors.textMuted }]}>
                {nextXP ? `→ Poziom ${userLevel + 1}: jeszcze ${nextXP - totalXP} XP` : '👑 Maksimum!'}
              </Text>
            </View>
            <View style={[styles.xpBg, { backgroundColor: colors.surfaceAlt }]}>
              <View style={[styles.xpFill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
            </View>
          </View>
        </View>

        {/* ── Статистика ── */}
        <View style={[styles.card, getShadow('sm'), { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>📊 Moje statystyki</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statTile, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Text style={{ fontSize: 22 }}>🏅</Text>
              <Text style={[styles.statVal, { color: colors.primary }]}>{userLevel}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Poziom</Text>
            </View>
            <View style={[styles.statTile, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Text style={{ fontSize: 22 }}>🎮</Text>
              <Text style={[styles.statVal, { color: colors.primary }]}>
                {Object.values(gameScores).reduce((s, g) => s + (g.gamesPlayed || 0), 0)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Gry</Text>
            </View>
            <TouchableOpacity
              style={[styles.statTile, { backgroundColor: showRecords ? colors.primary + '18' : colors.surfaceAlt, borderColor: showRecords ? colors.primary : colors.border }]}
              onPress={() => setShowRecords((s) => !s)}
            >
              <Text style={{ fontSize: 22 }}>🏆</Text>
              <Text style={[styles.statVal, { color: colors.primary }]}>
                {Math.max(0, ...Object.values(gameScores).map((g) => g.bestScore || 0))}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Rekord ›</Text>
            </TouchableOpacity>
          </View>

          {/* Розгорнуті рекорди */}
          {showRecords && (
            <View style={[styles.recordsBlock, { borderTopColor: colors.border }]}>
              <Text style={[styles.recordsBlockTitle, { color: colors.text }]}>🎮 Rekordy w grach</Text>
              {Object.entries(gameScores).length === 0
                ? <Text style={[styles.emptyText, { color: colors.textMuted }]}>Brak rozegranych gier</Text>
                : Object.entries(gameScores).map(([id, g]) => {
                    const m = GAME_META[id] || { title: id, emoji: '🎮', color: colors.primary, difficulty: '' };
                    return (
                      <View key={id} style={[styles.recordRow, { borderBottomColor: colors.border }]}>
                        <Text style={{ fontSize: 20, width: 28 }}>{m.emoji}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.recordName, { color: colors.text }]}>{m.title}</Text>
                          <Text style={[styles.recordMeta, { color: colors.textMuted }]}>
                            {m.difficulty} · Poz.{g.bestLevel || 1} · {g.gamesPlayed || 0} gier
                          </Text>
                        </View>
                        <Text style={[styles.recordScore, { color: m.color }]}>{g.bestScore || 0} pkt</Text>
                      </View>
                    );
                  })
              }

              <Text style={[styles.recordsBlockTitle, { color: colors.text, marginTop: SPACING.md }]}>📝 Wyniki testów</Text>
              {Object.entries(testScores).length === 0
                ? <Text style={[styles.emptyText, { color: colors.textMuted }]}>Brak ukończonych testów</Text>
                : Object.entries(testScores).map(([id, t]) => {
                    const m = TEST_META[id] || { title: id, emoji: '📝', color: colors.primary };
                    return (
                      <View key={id} style={[styles.recordRow, { borderBottomColor: colors.border }]}>
                        <Text style={{ fontSize: 20, width: 28 }}>{m.emoji}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.recordName, { color: colors.text }]}>{m.title}</Text>
                          <Text style={[styles.recordMeta, { color: colors.textMuted }]}>
                            {t.attempts || 0} prób · {t.totalCorrect || 0} poprawnych
                          </Text>
                        </View>
                        <Text style={[styles.recordScore, { color: m.color }]}>
                          🔥{t.bestStreak || 0}
                        </Text>
                      </View>
                    );
                  })
              }
            </View>
          )}
        </View>

        {/* ── Основні дані ── */}
        <View style={[styles.card, getShadow('sm'), { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>👤 Dane podstawowe</Text>
            <TouchableOpacity
              style={[styles.editBtn, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '55' }]}
              onPress={() => setShowEdit(true)}
            >
              <Text style={[styles.editBtnText, { color: colors.primary }]}>✏️ Edytuj</Text>
            </TouchableOpacity>
          </View>

          {[
            { label: "Imię",   value: profile?.name || '—' },
            { label: 'Email', value: user?.email || '—' },
            { label: 'Wiek',  value: profile?.age ? `${profile.age} lat` : '—' },
            { label: 'Płeć',  value: profile?.gender === 'male' ? 'Mężczyzna' : profile?.gender === 'female' ? 'Kobieta' : profile?.gender === 'other' ? 'Inna' : '—' },
          ].map((row, i, arr) => (
            <View key={row.label} style={[styles.dataRow, { borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: colors.border }]}>
              <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>{row.label}</Text>
              <Text style={[styles.dataValue, { color: colors.text }]}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* ── Кнопки ── */}
        <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.border }]} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>🚪 Wyloguj się</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: colors.textMuted }]}>Brain Trainer v1.0.0</Text>
      </ScrollView>
    </>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroArea: { alignItems: 'center', paddingTop: SPACING.xl, paddingBottom: SPACING.lg, paddingHorizontal: SPACING.lg, overflow: 'hidden', position: 'relative' },
  blobBg: { position: 'absolute', width: 320, height: 320, borderRadius: 160, backgroundColor: '#4F46E5', opacity: 0.06, top: -120 },
  avatarWrap: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md, position: 'relative' },
  avatarEmoji: { fontSize: 50 },
  editAvatarBadge: { position: 'absolute', bottom: 2, right: 2, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  heroName: { fontSize: FONTS.size.xl, fontWeight: FONTS.weight.bold, marginBottom: 4 },
  heroEmail: { fontSize: FONTS.size.sm, marginBottom: SPACING.sm },
  levelBadge: { paddingHorizontal: SPACING.md, paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 1, marginBottom: SPACING.md },
  levelText: { fontSize: FONTS.size.sm, fontWeight: FONTS.weight.bold },
  xpSection: { width: '100%' },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  xpLabel: { fontSize: FONTS.size.xs },
  xpBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  xpFill: { height: 8, borderRadius: 4 },
  card: { marginHorizontal: SPACING.md, marginBottom: SPACING.md, borderRadius: RADIUS.xl, borderWidth: 1, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, borderBottomWidth: 1 },
  cardTitle: { fontSize: FONTS.size.md, fontWeight: FONTS.weight.bold },
  editBtn: { paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1 },
  editBtnText: { fontSize: FONTS.size.xs, fontWeight: FONTS.weight.semibold },
  statsRow: { flexDirection: 'row', gap: SPACING.sm, padding: SPACING.md },
  statTile: { flex: 1, borderRadius: RADIUS.lg, padding: SPACING.md, alignItems: 'center', gap: 4, borderWidth: 1 },
  statVal: { fontSize: FONTS.size.lg, fontWeight: FONTS.weight.bold },
  statLabel: { fontSize: FONTS.size.xs },
  recordsBlock: { borderTopWidth: 1, padding: SPACING.md },
  recordsBlockTitle: { fontSize: FONTS.size.sm, fontWeight: FONTS.weight.bold, marginBottom: SPACING.sm },
  recordRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm, borderBottomWidth: 1, gap: SPACING.sm },
  recordName: { fontSize: FONTS.size.sm, fontWeight: FONTS.weight.semibold },
  recordMeta: { fontSize: FONTS.size.xs, marginTop: 2 },
  recordScore: { fontSize: FONTS.size.md, fontWeight: FONTS.weight.extrabold },
  emptyText: { fontSize: FONTS.size.xs, textAlign: 'center', padding: SPACING.md },
  dataRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  dataLabel: { fontSize: FONTS.size.sm, fontWeight: FONTS.weight.medium },
  dataValue: { fontSize: FONTS.size.sm },
  actionBtn: { marginHorizontal: SPACING.md, marginBottom: SPACING.sm, paddingVertical: 15, borderRadius: RADIUS.full, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { fontSize: FONTS.size.md, fontWeight: FONTS.weight.semibold },
  version: { textAlign: 'center', fontSize: FONTS.size.xs, paddingBottom: SPACING.lg, marginTop: SPACING.sm },
});
