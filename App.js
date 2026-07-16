// App.js
import React, { useState, useEffect } from 'react';
import {
  StatusBar, StyleSheet, View, Text, Platform,
  TouchableOpacity, ActivityIndicator, Image, useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme, DefaultTheme, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { onAuthStateChanged } from 'firebase/auth';
import { MusicProvider } from './src/context/MusicContext';

import { auth } from './src/config/firebase';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

// Імпорт кастомної іконки додатку з правильним відносним шляхом
const BRAIN_ICON = require('./assets/images/free-icon-brain-training.png');

// ── Екрани авторизації ────────────────────────────────────────────────────────
import LoginScreen     from './src/screens/LoginScreen';
import RegisterScreen  from './src/screens/RegisterScreen';

// ── Основні екрани ────────────────────────────────────────────────────────────
import ProfileScreen   from './src/screens/ProfileScreen';
import MusicScreen     from './src/screens/music';
import QuestionsScreen from './src/screens/questions';
import GamesScreen     from './src/screens/games';
import SettingsScreen  from './src/screens/settings';
import AboutScreen     from './src/screens/about';

// ── Ігри ─────────────────────────────────────────────────────────────────────
import MemoryGame    from './src/screens/games/game-memory';
import MathGame      from './src/screens/games/game-math';
import WordsGame     from './src/screens/games/game-words';
import ReactionGame  from './src/screens/games/game-reaction';
import NumbersGame   from './src/screens/games/game-numbers';
import SequenceGame  from './src/screens/games/game-sequence';
import LogicGame     from './src/screens/games/game-logic';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const TABS = [
  { name: 'Games',    icon: '🎮', label: 'Gry',          component: GamesScreen     },
  { name: 'Tests',    icon: '📝', label: 'Testy',        component: QuestionsScreen },
  { name: 'Music',    icon: '🎵', label: 'Muzyka',       component: MusicScreen     },
  { name: 'Profile',  icon: '👤', label: 'Profil',       component: ProfileScreen   },
  { name: 'Settings', icon: '⚙️', label: 'Ustawienia',   component: SettingsScreen  },
];

// Гранична ширина екрана, нижче якої інтерфейс стає мобільним (як на Android)
const BREAKPOINT = 768;

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const observer = new MutationObserver(() => {
    document.querySelectorAll('[aria-hidden="true"]').forEach((el) => {
      const focused = el.querySelector(':focus');
      if (focused) focused.blur();
    });
  });
  observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['aria-hidden'] });
}

// ─── Веб-хедер ────────────────────────────────────────────────────────────────
function WebHeader() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  // Якщо екран маленький (мобільний вигляд), верхній хедер повністю приховується
  if (width < BREAKPOINT) return null;

  const go = (name) => {
    navigation.navigate('Main', { screen: name });
  };

  return (
    <View style={[wh.bar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      {/* Логотип зліва */}
      <TouchableOpacity style={wh.logo} onPress={() => go('Games')}>
        <Image source={BRAIN_ICON} style={wh.imageIcon} />
        <Text style={[wh.logoText, { color: colors.text }]}>Brain Trainer</Text>
      </TouchableOpacity>

      {/* Контейнер навігації: строго по центру екрана */}
      <View style={wh.navContainer}>
        <View style={wh.navRow}>
          {TABS.map((t) => (
            <TouchableOpacity key={t.name} style={wh.navBtn} onPress={() => go(t.name)}>
              <Text style={wh.tabIcon}>{t.icon}</Text>
              <Text style={[wh.navBtnLabel, { color: colors.textSecondary }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const wh = StyleSheet.create({
  bar: {
    height: 70, 
    flexDirection: 'row', 
    alignItems: 'center',
    paddingHorizontal: 24,
    borderBottomWidth: 1, 
    position: 'relative', 
    zIndex: 999,
  },
  logo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10,
    position: 'absolute', 
    left: 24,
    zIndex: 10,
  },
  imageIcon: { width: 32, height: 32, resizeMode: 'contain' },
  logoText: { fontSize: 19, fontWeight: '700', letterSpacing: 0.3 },
  
  // Контейнер займає всю ширину хедера і центрує внутрішні кнопки
  navContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navRow: {
    flexDirection: 'row', 
    gap: 20, 
    alignItems: 'center',
  },
  navBtn: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8,
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 8,
  },
  tabIcon: { 
    fontSize: 18, 
  },
  navBtnLabel: { 
    fontSize: 14, 
    fontWeight: '500',
  },
});

// ─── Обгортка для веб-екрана (додає хедер) ───────────────────────────────────
function withWebHeader(ScreenComponent) {
  return function WrappedScreen(props) {
    const { colors } = useTheme();
    if (Platform.OS !== 'web') return <ScreenComponent {...props} />;
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <WebHeader />
        <ScreenComponent {...props} />
      </View>
    );
  };
}

const GamesScreenWeb    = withWebHeader(GamesScreen);
const QuestionsScreenWeb = withWebHeader(QuestionsScreen);
const MusicScreenWeb    = withWebHeader(MusicScreen);
const ProfileScreenWeb  = withWebHeader(ProfileScreen);
const SettingsScreenWeb = withWebHeader(SettingsScreen);

// ─── Auth Stack ───────────────────────────────────────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login"    component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// ─── Main Tabs ────────────────────────────────────────────────────────────────
function MainTabs() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  // Якщо це веб і екран великий — нижній таб-бар ховаємо. 
  // Якщо екран зменшується (< BREAKPOINT) або це мобільний пристрій — показуємо нижнє меню як на Android.
  const shouldHideTabBar = isWeb && width >= BREAKPOINT;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: shouldHideTabBar
          ? { display: 'none' }
          : {
              backgroundColor: colors.tabBar,
              borderTopColor: colors.tabBarBorder,
              borderTopWidth: 1,
              paddingBottom: Platform.OS === 'ios' ? 20 : 8,
              paddingTop: 8,
              height: Platform.OS === 'ios' ? 80 : 64,
            },
        tabBarActiveTintColor:   colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        tabBarIcon: ({ focused }) => {
          const tab = TABS.find((t) => t.name === route.name);
          return (
            <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>
              {tab?.icon}
            </Text>
          );
        },
      })}
    >
      <Tab.Screen name="Games"    component={isWeb ? GamesScreenWeb    : GamesScreen}    options={{ title: 'Gry' }} />
      <Tab.Screen name="Tests"    component={isWeb ? QuestionsScreenWeb : QuestionsScreen} options={{ title: 'Testy' }} />
      <Tab.Screen name="Music"    component={isWeb ? MusicScreenWeb    : MusicScreen}    options={{ title: 'Muzyka' }} />
      <Tab.Screen name="Profile"  component={isWeb ? ProfileScreenWeb  : ProfileScreen}  options={{ title: 'Profil' }} />
      <Tab.Screen name="Settings" component={isWeb ? SettingsScreenWeb : SettingsScreen} options={{ title: 'Ustaw.' }} />
    </Tab.Navigator>
  );
}

// ─── App Stack ────────────────────────────────────────────────────────────────
function AppStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: 'bold' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Main"         component={MainTabs}    options={{ headerShown: false }} />
      <Stack.Screen name="About"        component={AboutScreen} options={{ title: 'O aplikacji' }} />
      {/* ── Ігри ── */}
      <Stack.Screen name="MemoryGame"   component={MemoryGame}  options={{ headerShown: false }} />
      <Stack.Screen name="MathGame"     component={MathGame}    options={{ headerShown: false }} />
      <Stack.Screen name="WordsGame"    component={WordsGame}   options={{ headerShown: false }} />
      <Stack.Screen name="ReactionGame" component={ReactionGame} options={{ headerShown: false }} />
      <Stack.Screen name="NumbersGame"  component={NumbersGame}  options={{ headerShown: false }} />
      <Stack.Screen name="SequenceGame" component={SequenceGame} options={{ headerShown: false }} />
      <Stack.Screen name="LogicGame"    component={LogicGame}    options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
function Root() {
  const { colors, isDark } = useTheme();
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  if (user === undefined) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textSecondary, marginTop: 12, fontSize: 14 }}>
          Ładowanie...
        </Text>
      </View>
    );
  }

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    fonts: DarkTheme.fonts,
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary:      colors.primary,
      background:   colors.background,
      card:         colors.surface,
      text:         colors.text,
      border:       colors.border,
      notification: colors.primary,
    },
  };

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <NavigationContainer theme={navTheme}>
        {user ? <AppStack /> : <AuthStack />}
      </NavigationContainer>
    </>
  );
}

// ─── Кореневий компонент ──────────────────────────────────────────────────────
export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <MusicProvider>
          <Root />
        </MusicProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
