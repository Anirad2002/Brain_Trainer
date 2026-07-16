// src/screens/LoginScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  ScrollView, Alert, Modal, Image, // ← Додано імпорт Image
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { FONTS, SPACING, RADIUS, getShadow } from '../config/theme';
import { loginUser, resetPassword } from '../services/auth';
import { auth, db } from '../config/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

// Імпорт кастомної іконки додатку з правильним шляхом (вихід на два рівні назад)
const BRAIN_ICON = require('../../assets/images/free-icon-brain-training.png');

// ─── Google Sign-In ───────────────────────────────────────────────────────────
// Веб: використовуємо Firebase signInWithPopup (безкоштовно, вбудовано у Firebase SDK)
// Android: використовуємо @react-native-google-signin/google-signin
//
// Для Android: npx expo install @react-native-google-signin/google-signin
// Вкажіть WEB_CLIENT_ID з Firebase Console → Authentication → Google → Web client ID
const WEB_CLIENT_ID = 'YOUR_WEB_CLIENT_ID'; // <-- замінити

let GoogleSignin = null;
if (Platform.OS !== 'web') {
  try {
    const pkg = require('@react-native-google-signin/google-signin');
    GoogleSignin = pkg.GoogleSignin;
    GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
  } catch {
    GoogleSignin = null;
  }
}

// Firebase Auth провайдери (завжди доступні — частина firebase/auth)
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
} from 'firebase/auth';

// ─── Збереження профілю Google-юзера у Firestore ─────────────────────────────
async function ensureFirestoreProfile(user) {
  if (!user) return;
  try {
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        name: user.displayName || 'Użytkownik',
        email: user.email,
        avatar: 'cat',
        age: null,
        gender: null,
        totalXP: 0,
        level: 1,
        gameScores: {},
        testScores: {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (e) {
    console.log('Firestore profile error:', e);
  }
}

// ─── Поле вводу ──────────────────────────────────────────────────────────────
function InputField({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, error, colors }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldWrapper}>
      {label ? <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text> : null}
      <TextInput
        style={[
          styles.input,
          { backgroundColor: colors.surfaceAlt, color: colors.text, borderColor: colors.border },
          focused && { borderColor: colors.borderFocus, backgroundColor: colors.surface },
          error && { borderColor: colors.error },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType || 'default'}
        autoCapitalize="none"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {error ? <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text> : null}
    </View>
  );
}

// ─── Модал "Забули пароль?" ───────────────────────────────────────────────────
// Використовуємо Modal (не View з absoluteFill) — коректно працює і на вебі і на Android
function ForgotModal({ visible, onClose, colors }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    setSent(false);
    setEmail('');
    setError('');
    onClose();
  };

  const handleSend = async () => {
    setError('');
    const trimmed = email.trim();
    if (!trimmed) { setError('Wprowadź adres email'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Nieprawidłowy format adresu email');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(trimmed);
      setSent(true);
    } catch (e) {
      console.log('Reset password error:', e.code, e.message);
      if (e.code === 'auth/user-not-found') {
        setError('Nie znaleziono konta z tym adresem email');
      } else if (e.code === 'auth/invalid-email') {
        setError('Nieprawidłowy format adresu email');
      } else if (e.code === 'auth/network-request-failed') {
        setError('Błąd sieci. Sprawdź swoje połączenie');
      } else {
        setError(`Błąd: ${e.message || 'spróbuj ponownie'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={[styles.modalOverlay]}>
        <View style={[styles.modalCard, getShadow('card'), { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>🔑 Resetuj hasło</Text>

          {sent ? (
            <>
              <Text style={[styles.modalSub, { color: colors.success }]}>
                ✅ Wiadomość została wysłana na adres:{'\n'}{email}{'\n\n'}Sprawdź skrzynkę odbiorczą oraz spam!
              </Text>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleClose}
              >
                <Text style={styles.modalBtnText}>Zamknij</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                Wprowadź adres email powiązany z Twoim kontem — wyślemy Ci link do zresetowania hasła
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surfaceAlt,
                    color: colors.text,
                    borderColor: error ? colors.error : colors.border,
                    marginBottom: 4,
                  },
                ]}
                value={email}
                onChangeText={(t) => { setEmail(t); setError(''); }}
                placeholder="twoj@email.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoFocus
              />
              {error ? (
                <Text style={[styles.errorText, { color: colors.error, marginBottom: SPACING.sm }]}>
                  {error}
                </Text>
              ) : null}
              <View style={styles.modalBtns}>
                <TouchableOpacity
                  style={[styles.modalBtnOutline, { borderColor: colors.border }]}
                  onPress={handleClose}
                >
                  <Text style={[styles.modalBtnOutlineText, { color: colors.textSecondary }]}>Anuluj</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.primary, flex: 1 }]}
                  onPress={handleSend}
                  disabled={loading}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.modalBtnText}>Wyślij</Text>
                  }
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Валідація ────────────────────────────────────────────────────────────────
function validate(email, password) {
  const errors = {};
  if (!email.trim()) errors.email = 'Wprowadź adres email';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Nieprawidłowy format adresu email';
  if (!password) errors.password = 'Wprowadź hasło';
  else if (password.length < 6) errors.password = 'Minimum 6 znaków';
  return errors;
}

// Повернення текстових помилок
function mapFirebaseError(code) {
  const map = {
    'auth/user-not-found':        'Nie znaleziono użytkownika',
    'auth/wrong-password':        'Nieprawidłowe hasło',
    'auth/invalid-email':         'Nieprawidłowy format adresu email',
    'auth/too-many-requests':     'Zbyt wiele prób. Spróbuj później',
    'auth/network-request-failed':'Błąd sieci',
    'auth/invalid-credential':    'Nieprawidłowy email lub hasło',
    'auth/popup-closed-by-user':  'Okno Google zostało zamknięte',
    'auth/cancelled-popup-request': 'Anulowano',
  };
  return map[code] || `Błąd: ${code || 'nieznany'}`;
}

// ─── Головний екран ───────────────────────────────────────────────────────────
export default function LoginScreen({ navigation }) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [showForgot, setShowForgot] = useState(false);

  // ── Звичайний логін ────────────────────────────────────────────────────────
  const handleLogin = async () => {
    setApiError('');
    const ve = validate(email, password);
    if (Object.keys(ve).length > 0) { setErrors(ve); return; }
    setErrors({});
    setLoading(true);
    try {
      await loginUser({ email: email.trim(), haslo: password });
    } catch (err) {
      console.log('Login error:', err.code);
      setApiError(mapFirebaseError(err.code));
    } finally {
      setLoading(false);
    }
  };

  // ── Google Sign-In ─────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setApiError('');
    setGoogleLoading(true);
    try {
      let user = null;

      if (Platform.OS === 'web') {
        const provider = new GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');
        const result = await signInWithPopup(auth, provider);
        user = result.user;
      } else {
        if (!GoogleSignin) {
          Alert.alert(
            'Google Sign-In',
            'Встановіть пакет:\n\nnpx expo install @react-native-google-signin/google-signin\n\nTa вкажіть WEB_CLIENT_ID у LoginScreen.js',
            [{ text: 'OK' }]
          );
          return;
        }
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const signInResult = await GoogleSignin.signIn();
        const idToken = signInResult.data?.idToken ?? signInResult.idToken;
        if (!idToken) throw new Error('Не вдалося отримати idToken');
        const credential = GoogleAuthProvider.credential(idToken);
        const result = await signInWithCredential(auth, credential);
        user = result.user;
      }

      if (user) await ensureFirestoreProfile(user);

    } catch (err) {
      console.log('Google Sign-In error:', err.code, err.message);
      const skip = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'SIGN_IN_CANCELLED'];
      if (!skip.includes(err.code)) {
        setApiError(mapFirebaseError(err.code));
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <>
      <ForgotModal visible={showForgot} onClose={() => setShowForgot(false)} colors={colors} />

      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.blob1, { pointerEvents: 'none' }]} />
          <View style={[styles.blob2, { pointerEvents: 'none' }]} />

          <View style={[styles.card, getShadow('card'), { backgroundColor: colors.surface, borderColor: colors.border }]}>

            {/* Контейнер іконки (стилі не мінялися, змінено тільки емодзі на Image) */}
            <View style={[styles.iconContainer, { backgroundColor: colors.primaryDark, borderColor: colors.primary }]}>
              <Image source={BRAIN_ICON} style={styles.imageIcon} />
            </View>
            <Text style={[styles.appName, { color: colors.text }]}>Brain Trainer</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Zaloguj się na swoje konto</Text>

            {apiError ? (
              <View style={[styles.apiErrorBox, { backgroundColor: colors.error + '18', borderColor: colors.error }]}>
                <Text style={[styles.apiErrorText, { color: colors.error }]}>{apiError}</Text>
              </View>
            ) : null}

            <InputField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="twoj@email.com"
              keyboardType="email-address"
              error={errors.email}
              colors={colors}
            />
            <InputField
              label="Hasło"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              error={errors.password}
              colors={colors}
            />

            <TouchableOpacity style={styles.forgotBtn} onPress={() => setShowForgot(true)}>
              <Text style={[styles.forgotText, { color: colors.primaryLight }]}>Zapomniałeś hasła?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryBtn, getShadow('button'), { backgroundColor: colors.primary }, loading && styles.disabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>Zaloguj się</Text>
              }
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.textMuted }]}>lub</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            <TouchableOpacity
              style={[
                styles.googleBtn,
                getShadow('sm'),
                { backgroundColor: colors.surface, borderColor: colors.border },
                googleLoading && styles.disabled,
              ]}
              onPress={handleGoogle}
              disabled={googleLoading}
              activeOpacity={0.85}
            >
              {googleLoading
                ? <ActivityIndicator color={colors.primary} size="small" />
                : <>
                    <Text style={styles.googleIcon}>G</Text>
                    <Text style={[styles.googleBtnText, { color: colors.text }]}>
                      Zaloguj się przez Google
                    </Text>
                  </>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: colors.primary }]}
              onPress={() => navigation?.navigate('Register')}
              activeOpacity={0.85}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.primaryLight }]}>
                Zarejestruj się
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

// ─── Стилі ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1, justifyContent: 'center', alignItems: 'center',
    padding: SPACING.md, paddingVertical: SPACING.xxl,
  },
  blob1: {
    position: 'absolute', width: 280, height: 280, borderRadius: 140,
    backgroundColor: '#4F46E5', opacity: 0.07, top: -60, right: -80,
  },
  blob2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: '#6D63FF', opacity: 0.05, bottom: 40, left: -60,
  },

  card: {
    width: '100%', maxWidth: 400,
    borderRadius: RADIUS.xl, padding: SPACING.xl, borderWidth: 1,
  },
  // Твій оригінальний стиль контейнера (залишився квадратом)
  iconContainer: {
    width: 72, height: 72, borderRadius: RADIUS.lg,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: SPACING.md, borderWidth: 2,
  },
  // Стилізація под нову картинку всередині оригінальної плашки
  imageIcon: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
  },
  appName: {
    fontSize: FONTS.size.xl, fontWeight: FONTS.weight.bold,
    textAlign: 'center', letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: FONTS.size.sm, textAlign: 'center',
    marginTop: SPACING.xs, marginBottom: SPACING.lg,
  },
  apiErrorBox: {
    borderWidth: 1, borderRadius: RADIUS.md,
    padding: SPACING.sm, marginBottom: SPACING.md,
  },
  apiErrorText: { fontSize: FONTS.size.sm, textAlign: 'center' },

  fieldWrapper: { marginBottom: SPACING.md },
  label: { fontSize: FONTS.size.sm, marginBottom: SPACING.xs, fontWeight: FONTS.weight.medium },
  input: {
    borderRadius: RADIUS.md, borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: FONTS.size.base,
  },
  errorText: { fontSize: FONTS.size.xs, marginTop: 4 },

  forgotBtn: { alignSelf: 'flex-end', marginBottom: SPACING.lg, marginTop: -SPACING.xs },
  forgotText: { fontSize: FONTS.size.sm, fontWeight: FONTS.weight.medium },

  primaryBtn: {
    borderRadius: RADIUS.full, paddingVertical: 15,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#fff', fontSize: FONTS.size.md,
    fontWeight: FONTS.weight.bold, letterSpacing: 0.5,
  },
  disabled: { opacity: 0.6 },

  divider: {
    flexDirection: 'row', alignItems: 'center',
    marginVertical: SPACING.md, gap: SPACING.sm,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: FONTS.size.sm },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, borderRadius: RADIUS.full, paddingVertical: 14,
    borderWidth: 1.5, marginBottom: SPACING.sm,
  },
  googleIcon: {
    fontSize: FONTS.size.lg, fontWeight: FONTS.weight.extrabold,
    color: '#4285F4', width: 24, textAlign: 'center',
  },
  googleBtnText: { fontSize: FONTS.size.base, fontWeight: FONTS.weight.semibold },

  secondaryBtn: {
    borderWidth: 1.5, borderRadius: RADIUS.full,
    paddingVertical: 14, alignItems: 'center',
  },
  secondaryBtnText: { fontSize: FONTS.size.md, fontWeight: FONTS.weight.semibold },

  // Модал скидання паролю
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: '100%', maxWidth: 380,
    borderRadius: RADIUS.xl, padding: SPACING.xl, borderWidth: 1,
  },
  modalTitle: {
    fontSize: FONTS.size.lg, fontWeight: FONTS.weight.bold,
    marginBottom: SPACING.sm,
  },
  modalSub: {
    fontSize: FONTS.size.sm, lineHeight: 21,
    marginBottom: SPACING.md,
  },
  modalBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  modalBtn: {
    borderRadius: RADIUS.full, paddingVertical: 13,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: SPACING.md,
  },
  modalBtnText: { color: '#fff', fontSize: FONTS.size.base, fontWeight: FONTS.weight.bold },
  modalBtnOutline: {
    borderRadius: RADIUS.full, paddingVertical: 13,
    paddingHorizontal: SPACING.md, borderWidth: 1, alignItems: 'center',
  },
  modalBtnOutlineText: { fontSize: FONTS.size.base, fontWeight: FONTS.weight.medium },
});
