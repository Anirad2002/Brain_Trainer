// src/context/MusicContext.js
import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';

// expo-audio — тільки для Android/iOS
let createAudioPlayer = null;
let setAudioModeAsync = null;
let setIsAudioActiveAsync = null;

if (Platform.OS !== 'web') {
  try {
    const ExpoAudio = require('expo-audio');
    createAudioPlayer    = ExpoAudio.createAudioPlayer;
    setAudioModeAsync    = ExpoAudio.setAudioModeAsync;
    setIsAudioActiveAsync = ExpoAudio.setIsAudioActiveAsync;
  } catch (e) {
    console.warn('expo-audio not available:', e);
  }
}

const TRACKS = [
  { id: 1, title: 'Szum morza',        artist: 'Ambient', duration: '5:24', emoji: '🌊', color: '#4F46E5', source: require('../../assets/music/Szum_morza.mp3') },
  { id: 2, title: 'Poranna medytacja', artist: 'Focus',   duration: '4:12', emoji: '🌧️', color: '#7C3AED', source: require('../../assets/music/Odglos_deszczu.mp3') },
  { id: 3, title: 'Koncentracja',      artist: 'Study',   duration: '5:00', emoji: '🧠', color: '#F59E0B', source: require('../../assets/music/Relaksujaca_muzyka.mp3') },
  { id: 4, title: 'Dźwięki lasu',      artist: 'Nature',  duration: '4:45', emoji: '🌿', color: '#059669', source: require('../../assets/music/Dzwieki_lasu.mp3') },
];

const MusicContext = createContext(null);

export function MusicProvider({ children }) {
  // Android/iOS player ref (expo-audio AudioPlayer instance)
  const playerRef   = useRef(null);
  // Web audio ref (HTMLAudioElement)
  const webAudioRef = useRef(null);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying,  setIsPlaying]  = useState(false);
  const [isLoading,  setIsLoading]  = useState(false);
  const [position,   setPosition]   = useState(0);   // мілісекунди
  const [duration,   setDuration]   = useState(0);   // мілісекунди
  const [volume,     setVolume]     = useState(1);
  const [isLooping,  setIsLooping]  = useState(false);

  // Ref для handleNext щоб уникнути stale closure у callback
  const handleNextRef = useRef(null);

  // ─── Ініціалізація Audio Mode (Android/iOS) ────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'web' && setAudioModeAsync) {
      setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        allowsRecordingIOS: false,
      }).catch(() => {});
    }
    return () => { stopAndUnload(); };
  }, []);

  // ─── Прогрес для Android/iOS (polling кожні 250мс) ────────────────────────
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!isPlaying || !playerRef.current) return;

    const interval = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      setPosition((p.currentTime || 0) * 1000);
      setDuration((p.duration || 0) * 1000);

      // Якщо трек закінчився
      if (p.currentTime > 0 && p.duration > 0 && p.currentTime >= p.duration) {
        if (isLooping) {
          p.seekTo(0);
          p.play();
        } else {
          handleNextRef.current?.();
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isPlaying, currentIdx, isLooping]);

  // ─── Прогрес для Web ───────────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!isPlaying || !webAudioRef.current) return;

    const interval = setInterval(() => {
      const a = webAudioRef.current;
      if (!a) return;
      setPosition(a.currentTime * 1000);
      setDuration((a.duration || 0) * 1000);
      if (a.ended) {
        if (isLooping) {
          a.currentTime = 0;
          a.play().catch(() => {});
          setPosition(0);
        } else {
          handleNextRef.current?.();
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isPlaying, currentIdx, isLooping]);

  // ─── Зупинити і вивантажити поточний звук ─────────────────────────────────
  const stopAndUnload = useCallback(async () => {
    // Android/iOS
    if (Platform.OS !== 'web' && playerRef.current) {
      const p = playerRef.current;
      playerRef.current = null;
      try {
        p.pause();
        p.remove();
      } catch {}
    }
    // Web
    if (Platform.OS === 'web' && webAudioRef.current) {
      try {
        webAudioRef.current.pause();
        webAudioRef.current.src = '';
        webAudioRef.current = null;
      } catch {}
    }
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
  }, []);

  // ─── Завантажити і відтворити трек ────────────────────────────────────────
  const loadAndPlay = useCallback(async (indexToPlay) => {
    const idx = indexToPlay ?? currentIdx;
    const targetTrack = TRACKS[idx];
    if (!targetTrack) return;

    setIsLoading(true);
    await stopAndUnload();

    // ── Web ──────────────────────────────────────────────────────────────────
    if (Platform.OS === 'web') {
      try {
        let uri = targetTrack.source;
        if (typeof uri === 'object' && uri !== null) uri = uri.uri || uri.default || String(uri);
        else if (typeof uri === 'number') uri = String(uri);

        const audio = new window.Audio(uri);
        audio.volume = volume;
        audio.loop   = isLooping;
        webAudioRef.current = audio;

        audio.addEventListener('loadedmetadata', () => {
          setDuration((audio.duration || 0) * 1000);
        });

        await audio.play();
        setIsPlaying(true);
      } catch (e) {
        console.error('Web Play Error:', e);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // ── Android / iOS (expo-audio) ────────────────────────────────────────────
    if (!createAudioPlayer) {
      console.warn('expo-audio not available');
      setIsLoading(false);
      return;
    }

    try {
      // Активуємо аудіо підсистему
      if (setIsAudioActiveAsync) await setIsAudioActiveAsync(true).catch(() => {});

      const player = createAudioPlayer(targetTrack.source, { updateInterval: 250 });
      player.volume  = volume;
      player.loop    = isLooping;
      playerRef.current = player;

      player.play();
      setIsPlaying(true);
    } catch (e) {
      console.error('Mobile Load Error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [currentIdx, volume, isLooping, stopAndUnload]);

  // ─── Play / Pause ──────────────────────────────────────────────────────────
  const handlePlayPause = useCallback(async () => {
    // Web
    if (Platform.OS === 'web') {
      if (!webAudioRef.current) {
        await loadAndPlay(currentIdx);
        return;
      }
      if (isPlaying) {
        webAudioRef.current.pause();
        setIsPlaying(false);
      } else {
        await webAudioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
      return;
    }

    // Android/iOS
    if (!playerRef.current) {
      await loadAndPlay(currentIdx);
      return;
    }
    if (isPlaying) {
      playerRef.current.pause();
      setIsPlaying(false);
    } else {
      playerRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying, currentIdx, loadAndPlay]);

  // ─── Попередній трек ───────────────────────────────────────────────────────
  const handlePrev = useCallback(async () => {
    const idx = currentIdx === 0 ? TRACKS.length - 1 : currentIdx - 1;
    setCurrentIdx(idx);
    await loadAndPlay(idx);
  }, [currentIdx, loadAndPlay]);

  // ─── Наступний трек ────────────────────────────────────────────────────────
  const handleNext = useCallback(async () => {
    const idx = (currentIdx + 1) % TRACKS.length;
    setCurrentIdx(idx);
    await loadAndPlay(idx);
  }, [currentIdx, loadAndPlay]);

  // Оновлюємо ref кожен раз коли handleNext змінюється
  useEffect(() => {
    handleNextRef.current = handleNext;
  }, [handleNext]);

  // ─── Перемотка ────────────────────────────────────────────────────────────
  const handleSeek = useCallback(async (value) => {
    const ms = Number(value);
    setPosition(ms);
    if (Platform.OS === 'web' && webAudioRef.current) {
      webAudioRef.current.currentTime = ms / 1000;
    } else if (playerRef.current) {
      await playerRef.current.seekTo(ms / 1000);
    }
  }, []);

  // ─── Пауза / Цикл ─────────────────────────────────────────────────────────
  const toggleLoop = useCallback(async () => {
    const val = !isLooping;
    setIsLooping(val);
    if (Platform.OS === 'web' && webAudioRef.current) {
      webAudioRef.current.loop = val;
    } else if (playerRef.current) {
      playerRef.current.loop = val;
    }
  }, [isLooping]);

  // ─── Гучність ─────────────────────────────────────────────────────────────
  const handleVolumeChange = useCallback(async (v) => {
    setVolume(v);
    if (Platform.OS === 'web' && webAudioRef.current) {
      webAudioRef.current.volume = v;
    } else if (playerRef.current) {
      playerRef.current.volume = v;
    }
  }, []);

  // ─── Вибір треку ──────────────────────────────────────────────────────────
  const selectTrack = useCallback(async (idx) => {
    setCurrentIdx(idx);
    await loadAndPlay(idx);
  }, [loadAndPlay]);

  return (
    <MusicContext.Provider value={{
      TRACKS, currentIdx, isPlaying, isLoading,
      position, duration, volume, isLooping,
      handlePlayPause, handlePrev, handleNext,
      handleSeek, toggleLoop, handleVolumeChange, selectTrack,
    }}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  return useContext(MusicContext);
}
