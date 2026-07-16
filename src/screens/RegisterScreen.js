// src/screens/RegisterScreen.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Image,
} from 'react-native';
import { registerUser } from '../services/auth';
import { useTheme } from '../context/ThemeContext';
import { FONTS, SPACING, RADIUS, getShadow } from '../config/theme';

// Імпорт кастомної іконки додатку (вихід на два рівні назад)
const BRAIN_ICON = require('../../assets/images/free-icon-brain-training.png');

// ─── Сила паролю ─────────────────────────────────────────────────────────────
function getPasswordStrength(haslo, colors) {
  if (!haslo) return { score: 0, label: '', color: colors.border };
  let score = 0;
  if (haslo.length >= 8) score++;
  if (/[A-Z]/.test(haslo)) score++;
  if (/[0-9]/.test(haslo)) score++;
  if (/[^A-Za-z0-9]/.test(haslo)) score++;
  return [
    { score: 0, label: '',          color: colors.border      },
    { score: 1, label: 'Słabe',     color: colors.error       },
    { score: 2, label: 'Średnie',   color: colors.warning     },
    { score: 3, label: 'Dobre',     color: colors.primaryLight },
    { score: 4, label: 'Silne',     color: colors.success     },
  ][score];
}

function PasswordStrengthBar({ haslo, colors }) {
  const s = getPasswordStrength(haslo, colors);
  if (!haslo) return null;
  return (
    <View style={ssStyles.wrapper}>
      <View style={ssStyles.bars}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[ssStyles.bar, { backgroundColor: i <= s.score ? s.color : colors.border }]} />
        ))}
      </View>
      <Text style={[ssStyles.label, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

const ssStyles = StyleSheet.create({
  wrapper: { marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 8 },
  bars: { flexDirection: 'row', gap: 4, flex: 1 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  label: { fontSize: FONTS.size.xs, fontWeight: FONTS.weight.medium, minWidth: 50 },
});

// ─── Поле вводу ──────────────────────────────────────────────────────────────
function InputField({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, error, children, colors }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: SPACING.md }}>
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
        autoCapitalize={keyboardType === 'email-address' ? 'none' : secureTextEntry ? 'none' : 'words'}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {children}
      {error ? <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text> : null}
    </View>
  );
}

// ─── Валідація ────────────────────────────────────────────────────────────────
function validate(imie, email, haslo, potvrdzHaslo) {
  const errors = {};
  if (!imie.trim()) errors.imie = "Wprowadź swoje imię";
  else if (imie.trim().length < 2) errors.imie = "Imię jest za krótkie";
  if (!email.trim()) errors.email = 'Wprowadź adres email';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Nieprawidłowy format email';
  if (!haslo) errors.haslo = 'Wprowadź hasło';
  else if (haslo.length < 6) errors.haslo = 'Minimum 6 znaków';
  if (!potvrdzHaslo) errors.potvrdzHaslo = 'Potwierdź hasło';
  else if (haslo !== potvrdzHaslo) errors.potvrdzHaslo = 'Hasła nie są identyczne';
  return errors;
}

function mapFirebaseError(code) {
  const map = {
    'auth/email-already-in-use': 'Ten email jest вже zajęty',
    'auth/invalid-email': 'Nieprawidłowy format email',
    'auth/weak-password': 'Hasło jest zbyt słabe',
    'auth/network-request-failed': 'Błąd sieci',
    'auth/operation-not-allowed': 'Rejestracja jest tymczasowo niedostępna',
  };
  return map[code] || `Błąd: ${code || 'nieznany'}`;
}

// ─── Головний екран ───────────────────────────────────────────────────────────
export default function RegisterScreen({ navigation }) {
  const { colors } = useTheme();
  const [imie, setImie] = useState('');
  const [email, setEmail] = useState('');
  const [haslo, setHaslo] = useState('');
  const [potvrdzHaslo, setPotvrdzHaslo] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleRegister = async () => {
    setApiError('');
    const ve = validate(imie, email, haslo, potvrdzHaslo);
    if (Object.keys(ve).length > 0) { setErrors(ve); return; }
    setErrors({});
    setLoading(true);   // ← tu była literówka: loading(true)
    try {
      await registerUser({ imie: imie.trim(), email: email.trim(), haslo });
    } catch (err) {
      console.log('Register error:', err.code);
      setApiError(mapFirebaseError(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Декоративний фон */}
        <View style={[styles.blob1, { backgroundColor: colors.primaryDark }]} />
        <View style={[styles.blob2, { backgroundColor: colors.primaryLight }]} />

        <View style={[styles.card, getShadow('card'), { backgroundColor: colors.surface, borderColor: colors.border }]}>

          {/* Шапка з кнопкою назад та абсолютно відцентрованою іконкою */}
          <View style={styles.header}>
            <TouchableOpacity
              style={[styles.backBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
              onPress={() => navigation?.goBack()}
            >
              <Text style={[styles.backBtnText, { color: colors.text }]}>←</Text>
            </TouchableOpacity>
            
            <View style={[styles.iconContainer, { backgroundColor: colors.primaryDark, borderColor: colors.primary }]}>
              <Image source={BRAIN_ICON} style={styles.imageIcon} />
            </View>
          </View>

          {/* Тексти тепер вирівняні по центру */}
          <Text style={[styles.title, { color: colors.text }]}>Utwórz konto</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Dołącz do Brain Trainer</Text>

          {apiError ? (
            <View style={[styles.apiErrorBox, { backgroundColor: colors.error + '18', borderColor: colors.error }]}>
              <Text style={[styles.apiErrorText, { color: colors.error }]}>{apiError}</Text>
            </View>
          ) : null}

          <InputField label="Imię" value={imie} onChangeText={setImie} placeholder="Twoje imię" error={errors.imie} colors={colors} />

          <InputField label="Email" value={email} onChangeText={setEmail} placeholder="twoj@email.com" keyboardType="email-address" error={errors.email} colors={colors} />

          <InputField label="Hasło" value={haslo} onChangeText={setHaslo} placeholder="••••••••" secureTextEntry error={errors.haslo} colors={colors}>
            <PasswordStrengthBar haslo={haslo} colors={colors} />
          </InputField>

          <InputField label="Potwierdź hasło" value={potvrdzHaslo} onChangeText={setPotvrdzHaslo} placeholder="••••••••" secureTextEntry error={errors.potvrdzHaslo} colors={colors} />

          <TouchableOpacity
            style={[styles.primaryBtn, getShadow('button'), { backgroundColor: colors.primary }, loading && styles.disabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>Zarejestruj się</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginLink} onPress={() => navigation?.navigate('Login')}>
            <Text style={[styles.loginLinkText, { color: colors.textSecondary }]}>
              Masz już konto?{' '}
              <Text style={[styles.loginLinkAccent, { color: colors.primaryLight }]}>Zaloguj się</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    opacity: 0.08, top: -80, left: -80,
  },
  blob2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    opacity: 0.05, bottom: 0, right: -50,
  },
  card: {
    width: '100%', maxWidth: 400,
    borderRadius: RADIUS.xl, padding: SPACING.xl, borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: '100%',
    height: 72,
    marginBottom: SPACING.md,
  },
  backBtn: {
    position: 'absolute',
    left: 0,
    width: 40, height: 40, borderRadius: RADIUS.md,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
    zIndex: 10,
  },
  backBtnText: { fontSize: FONTS.size.lg },
  iconContainer: {
    width: 72, height: 72, borderRadius: RADIUS.lg,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2,
  },
  imageIcon: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
  },
  // Змінено на textAlign: 'center'
  title: { 
    fontSize: FONTS.size.xl, 
    fontWeight: FONTS.weight.bold, 
    marginBottom: 4,
    textAlign: 'center', 
  },
  // Змінено на textAlign: 'center'
  subtitle: { 
    fontSize: FONTS.size.sm, 
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  apiErrorBox: {
    borderWidth: 1, borderRadius: RADIUS.md,
    padding: SPACING.sm, marginBottom: SPACING.md,
  },
  apiErrorText: { fontSize: FONTS.size.sm, textAlign: 'center' },
  label: { fontSize: FONTS.size.sm, marginBottom: SPACING.xs, fontWeight: FONTS.weight.medium },
  input: {
    borderRadius: RADIUS.md, borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: FONTS.size.base,
  },
  errorText: { fontSize: FONTS.size.xs, marginTop: 4 },
  primaryBtn: {
    borderRadius: RADIUS.full, paddingVertical: 15,
    alignItems: 'center', justifyContent: 'center', marginTop: SPACING.sm,
  },
  disabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: FONTS.size.md, fontWeight: FONTS.weight.bold, letterSpacing: 0.5 },
  loginLink: { marginTop: SPACING.lg, alignItems: 'center' },
  loginLinkText: { fontSize: FONTS.size.sm },
  loginLinkAccent: { fontWeight: FONTS.weight.semibold },
});
