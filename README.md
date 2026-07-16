<div align="center">

# <img width="64" height="64" alt="free-icon-brain-training" src="https://github.com/user-attachments/assets/4767f674-55ef-445a-a125-5a2bebf25a3a" /> Brain Trainer

**Wieloplatformowa aplikacja do treningu mózgu i wiedzy ogólnej**

*Działa na Androidzie i w przeglądarce — z jednej bazy kodu*

[![React Native](https://img.shields.io/badge/React%20Native-0.85.3-61DAFB?logo=react)](https://reactnative.dev)
[![Expo](https://img.shields.io/badge/Expo-SDK%2056-000020?logo=expo)](https://expo.dev)
[![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28?logo=firebase)](https://firebase.google.com)
[![React Navigation](https://img.shields.io/badge/React%20Navigation-7-6B52AE)](https://reactnavigation.org)
[![Licencja](https://img.shields.io/badge/Licencja-MIT-green)](LICENSE)

</div>

---

## 📖 Spis treści

- [O projekcie](#o-projekcie)
- [Funkcjonalności](#funkcjonalności)
- [Gry umysłowe](#-gry-umysłowe)
- [Testy wiedzy](#-testy-wiedzy)
- [System grywalizacji](#-system-grywalizacji)
- [Stos technologiczny](#-stos-technologiczny)
- [Struktura projektu](#-struktura-projektu)
- [Instalacja i uruchomienie](#-instalacja-i-uruchomienie)
- [Konfiguracja Firebase](#-konfiguracja-firebase)
- [Screenshoty](#-screenshoty)
- [Autor](#-autor)

---

## O projekcie

**Brain Trainer** to wieloplatformowa aplikacja mobilna i webowa służąca do treningu funkcji poznawczych — pamięci, koncentracji, szybkości reakcji, logicznego myślenia i zdolności matematycznych. Aplikacja łączy w sobie **7 gier umysłowych**, **7 tematycznych testów wiedzy**, moduł **muzyki relaksacyjnej** oraz rozbudowany **system postępów** oparty na punktach XP i poziomach profilu.

Projekt stworzono jako pracę dyplomową na kierunku Informatyka. Cała aplikacja działa z **jednej bazy kodu** — zarówno na Androidzie (via Expo Go / APK), jak i w przeglądarce internetowej (via react-native-web), bez konieczności utrzymywania osobnych projektów.

---

## Funkcjonalności

| Moduł | Opis |
|---|---|
| 🔐 **Autoryzacja** | Rejestracja, logowanie e-mail/hasło, logowanie przez Google, reset hasła |
| 🎮 **Gry umysłowe** | 7 gier z wieloma poziomami trudności i systemem XP |
| 📝 **Testy wiedzy** | 7 kategorii tematycznych, randomizacja pytań i odpowiedzi |
| 🎵 **Muzyka relaksacyjna** | 4 ścieżki audio z pełnym odtwarzaczem (play/pause/pętla/głośność) |
| 👤 **Profil użytkownika** | Historia wyników, poziom XP, wybór awatara, edycja danych |
| 🔓 **Odblokowywanie treści** | Gry i awatary odblokowują się wraz z rosnącym poziomem profilu |
| 🌓 **Motywy** | Tryb ciemny / jasny / automatyczny (z ustawień urządzenia) |
| 📱 **Cross-platform** | Android + Web bez zmian w kodzie źródłowym |

---

## 🎮 Gry umysłowe

Każda gra posiada **5 poziomów trudności** oraz własny mechanizm przyznawania punktów XP, które trafiają do globalnego profilu użytkownika.

### 🃏 Pamięć
Klasyczna gra memory z animowanymi kartami emoji. Zadaniem gracza jest odkrycie wszystkich par kart przed upływem czasu. Siatka kart rośnie od **4×3** (poziom 1, 6 par, 60 s) do **6×4** (poziom 5, 12 par, 60 s). Karty animowane są za pomocą `Animated.Value` z interpolacją koloru tła.

### 🔢 Matematyka
Zadania matematyczne generowane w czasie rzeczywistym. Każda poprawna odpowiedź dodaje **+3 sekundy** do licznika czasu, błędna odejmuje **−5 sekund**. Poziomy różnią się dozwolonymi operacjami (od `+/−` do 20 aż po wszystkie cztery działania na liczbach do 150).

### 🔤 Słowa
Wyszukiwanie słów ukrytych w siatce liter (poziomo, pionowo i po przekątnej). Siatka rośnie od **6×6** z 4 słowami (poziom 1) do **10×10** z 8 słowami (poziom 5). Kategorie tematyczne: Zwierzęta, Owoce i Warzywa, Kolory, Przyroda, Nauka.

### ⚡ Reakcja
Trening szybkości reakcji. Koło zmienia kolor na **zielone** (kliknij!) lub **czerwone** (pułapka — nie klikaj!). Czas pojawienia się koła jest losowy. Okno czasowe na reakcję kurczy się z poziomu na poziom (od 2000 ms do 1000 ms).

### 🔢 Liczby
Na planszy losowo rozrzucone są odwrócone liczby. Gracz musi klikać je w kolejności rosnącej od 1 do N — błąd resetuje wszystkie odkryte liczby. Liczba kart rośnie od 5 (poziom 1) do 25 (poziom 5). Brak timera — mierzony jest czas ukończenia.

### 🎯 Sekwencja
Słowa pojawiają się na ekranie jedno po drugim, a następnie zostają wymieszane. Gracz musi kliknąć je w oryginalnej kolejności. Sekwencja rośnie od 3 słów (1,5 s na słowo) do 9 słów (0,7 s na słowo). Pule słów są tematyczne i losowane przy każdej rozgrywce.

### 🧩 Logika
Zadania logiczne i łamigłówki z czterema opcjami odpowiedzi. Brak ograniczenia czasu — mierzony jest czas rozwiązania. Bank pytań podzielony na 5 poziomów trudności, od prostego wnioskowania logicznego do złożonej dedukcji i ciągów liczbowych. Gra dostępna od **poziomu 4** profilu.

---

## 📝 Testy wiedzy

Moduł testów oferuje **7 kategorii tematycznych**. Każdy test losuje **10 pytań** z większego banku (algorytm Fishera-Yatesa), a odpowiedzi są każdorazowo mieszane, co uniemożliwia zapamiętanie pozycji poprawnej odpowiedzi.

| Kategoria | Emoji | Opis |
|---|---|---|
| Matematyka | 🔢 | Zadania arytmetyczne i algebraiczne |
| Wiedza ogólna | 🌍 | Pytania z różnych dziedzin |
| Ukraina | 🇺🇦 | Historia, kultura i geografia Ukrainy |
| Biologia | 🧬 | Budowa organizmów, genetyka, ekosystemy |
| Chemia | 🧪 | Pierwiastki, związki, reakcje chemiczne |
| Polska | 🇵🇱 | Historia, kultura i geografia Polski |
| Technologie | 💻 | Informatyka, programowanie, nowoczesne technologie |

System śledzi aktualną **serię poprawnych odpowiedzi (streak)** i przyznaje bonus XP, motywując do odpowiadania bez błędów.

---

## 🏆 System grywalizacji

Aplikacja posiada rozbudowany system postępów oparty na **punktach XP** i **14 poziomach profilu**.

### Progi XP

| Poziom | Wymagane XP |
|:---:|---:|
| 1 | 0 |
| 2 | 100 |
| 3 | 250 |
| 4 | 500 |
| 5 | 900 |
| 6 | 1 400 |
| 7 | 2 100 |
| 8 | 3 000 |
| 9 | 4 200 |
| 10 | 6 000 |
| 11 | 8 000 |
| 12 | 10 000 |
| 13 | 12 000 |
| 14 | 14 000 |

### Odblokowywanie gier

| Gra | Wymagany poziom |
|---|:---:|
| 🃏 Pamięć | 1 |
| 🔢 Matematyka | 1 |
| 🔤 Słowa | 2 |
| ⚡ Reakcja | 2 |
| 🔢 Liczby | 3 |
| 🎯 Sekwencja | 3 |
| 🧩 Logika | 4 |

### Odblokowywanie awatarów

| Awatar | Wymagany poziom |
|---|:---:|
| 🐱 Kot | 1 |
| 🐶 Pies | 1 |
| 🦋 Motyl | 3 |
| 🦊 Lisek | 4 |
| 🦉 Sowa | 6 |
| 🐻 Niedźwiedź | 8 |
| 🐱 Kot (graficzny) | 9 |
| 🦊 Lis (graficzny) | 10 |
| 🐶 Pies (graficzny) | 11 |
| 🦋 Motyl (graficzny) | 12 |

---

## 🛠 Stos technologiczny

```
Frontend / Mobile
├── React Native 0.85.3
├── React 19.2.3
├── Expo SDK 56
├── react-native-web 0.21.2        ← Web support
└── expo-audio                     ← Odtwarzanie audio

Nawigacja
├── React Navigation 7
├── @react-navigation/native-stack
└── @react-navigation/bottom-tabs

Backend / Chmura
├── Firebase Authentication 12     ← E-mail, Google Sign-In
└── Cloud Firestore 12             ← Baza danych użytkowników i wyników

Przechowywanie lokalne
└── @react-native-async-storage    ← Persystencja sesji (Android/iOS)

Styl
└── StyleSheet API + ThemeContext  ← Motywy ciemny / jasny / auto
```

---

## 📁 Struktura projektu

```
brain-trainer/
├── App.js                         # Główny plik — nawigacja, auth listener
├── app.json                       # Konfiguracja Expo
├── package.json
│
├── assets/
│   ├── images/                    # Ikony, awatary (cat.jpg, fox.jpg, ...)
│   └── music/                     # Pliki MP3 (Szum_morza, Odglos_deszczu, ...)
│
└── src/
    ├── config/
    │   ├── firebase.js            # Inicjalizacja Firebase (Auth + Firestore)
    │   └── theme.js               # Palety kolorów (DARK_COLORS, LIGHT_COLORS)
    │
    ├── context/
    │   ├── ThemeContext.js        # Globalny kontekst motywu
    │   └── MusicContext.js        # Zarządzanie muzyką i stanem audio
    │
    ├── data/
    │   └── tests/
    │       ├── mathTest.js
    │       ├── generalKnowledgeTest.js
    │       ├── ukrainianTest.js
    │       ├── biologyTest.js
    │       ├── chemistryTest.js
    │       ├── polandTest.js
    │       └── techTest.js
    │
    ├── services/
    │   ├── auth.js                # Rejestracja, logowanie, wylogowanie, reset hasła
    │   └── userProgress.js        # XP, poziomy, zapis wyników do Firestore
    │
    └── screens/
        ├── LoginScreen.js         # Ekran logowania (e-mail + Google)
        ├── RegisterScreen.js      # Rejestracja z paskiem siły hasła
        ├── ProfileScreen.js       # Profil użytkownika, wyniki, awatary
        ├── games.js               # Hub gier z systemem blokowania
        ├── questions.js           # Hub testów wiedzy
        ├── music.js               # Odtwarzacz muzyki relaksacyjnej
        ├── settings.js            # Motyw, powiadomienia, usuwanie konta
        ├── about.js               # O aplikacji
        └── games/
            ├── GameShell.js       # Wspólna powłoka dla wszystkich gier
            ├── game-memory.js     # 🃏 Pamięć
            ├── game-math.js       # 🔢 Matematyka
            ├── game-words.js      # 🔤 Słowa
            ├── game-reaction.js   # ⚡ Reakcja
            ├── game-numbers.js    # 🔢 Liczby
            ├── game-sequence.js   # 🎯 Sekwencja
            └── game-logic.js      # 🧩 Logika
```

---

## 🚀 Instalacja i uruchomienie

### Wymagania

- [Node.js](https://nodejs.org) ≥ 18
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- Konto Firebase (bezpłatny plan Spark wystarczy)
- Opcjonalnie: [Android Studio](https://developer.android.com/studio) lub fizyczne urządzenie z aplikacją **Expo Go**

### Kroki

```bash
# 1. Sklonuj repozytorium
git clone https://github.com/Anirad2002/Proekt_dyplomowe.git
cd Proekt_dyplomowe/brain-trainer

# 2. Zainstaluj zależności
npm install

# 3. Uruchom aplikację
npm start          # Expo Dev Tools (skaner QR dla Expo Go)
npm run android    # Emulator Android
npm run web        # Przeglądarka (http://localhost:8081)
```

> **Uwaga:** przed uruchomieniem skonfiguruj Firebase — patrz sekcja poniżej.

---

## 🔥 Konfiguracja Firebase

1. Utwórz projekt w [Firebase Console](https://console.firebase.google.com)
2. Włącz **Authentication** → metody: *E-mail/hasło* i *Google*
3. Utwórz bazę danych **Firestore** w trybie produkcyjnym
4. Skopiuj konfigurację projektu i wklej ją do `src/config/firebase.js`:

```javascript
const firebaseConfig = {
  apiKey:            "TWÓJ_API_KEY",
  authDomain:        "TWÓJ_PROJECT.firebaseapp.com",
  projectId:         "TWÓJ_PROJECT",
  storageBucket:     "TWÓJ_PROJECT.firebasestorage.app",
  messagingSenderId: "TWÓJ_SENDER_ID",
  appId:             "TWÓJ_APP_ID",
};
```

5. Dla logowania Google na Androidzie: wstaw `WEB_CLIENT_ID` z Firebase Console → *Authentication → Sign-in method → Google → Web client ID* do `src/screens/LoginScreen.js`.

### Reguły Firestore (zalecane)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /gameProgress/{gameId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

---

## 📱 Screenshoty

> Zrzuty ekranu z wersji Android i Web

| Android | Web |
|:---:|:---:|
| *Ekran logowania* | *Ekran logowania* |
| *Hub gier z blokadami* | *Hub gier (responsywny nagłówek)* |
| *Gra Pamięć* | *Testy wiedzy* |
| *Profil użytkownika* | *Muzyka relaksacyjna* |

---

## 🔮 Perspektywy rozwoju

- [ ] Publikacja w Google Play Store (`eas build --platform android`)
- [ ] Globalny ranking użytkowników (tabela liderów w Firestore)
- [ ] Powiadomienia push — codzienne przypomnienia o treningu
- [ ] Tryb rywalizacji wieloosobowej w czasie rzeczywistym
- [ ] Rozszerzenie bazy pytań i dynamiczne dodawanie treści
- [ ] Wsparcie dla platformy iOS
- [ ] Panel administracyjny do zarządzania pytaniami i użytkownikami

---

## 👤 Autor

**Daryna Pasiura**

Projekt: Praca dyplomowa — Kierunek Informatyka, Uniwersytet Vizja, Warszawa 2026

---

<div align="center">

Stworzone z ❤️ i ☕ przy użyciu React Native + Firebase

</div>
