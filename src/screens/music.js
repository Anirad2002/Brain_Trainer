// src/screens/music.js
import React, { useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, ActivityIndicator, Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useMusic } from '../context/MusicContext';
import { FONTS, SPACING, RADIUS, getShadow } from '../config/theme';

function formatMs(ms) {
  if (!ms) return '0:00';
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function MusicScreen() {
  const { colors } = useTheme();
  const {
    TRACKS, currentIdx, isPlaying, isLoading,
    position, duration, volume, isLooping,
    handlePlayPause, handlePrev, handleNext,
    handleSeek, toggleLoop, handleVolumeChange, selectTrack,
  } = useMusic();

  const track = TRACKS[currentIdx];
  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  // Стилі для Web-слайдера
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const id = 'dynamic-slider-styles';
    let tag = document.getElementById(id);
    if (!tag) { tag = document.createElement('style'); tag.id = id; document.head.appendChild(tag); }
    tag.innerHTML = `
      .custom-slider {
        -webkit-appearance: none; width: 100%; height: 6px;
        border-radius: 3px; outline: none; cursor: pointer;
      }
      .custom-slider::-webkit-slider-thumb {
        -webkit-appearance: none; height: 16px; width: 16px;
        border-radius: 50%; background: ${track.color};
        cursor: pointer; margin-top: -5px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
      .custom-slider::-moz-range-thumb {
        height: 16px; width: 16px; border-radius: 50%;
        background: ${track.color}; cursor: pointer; border: none;
      }
    `;
  }, [track.color]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Заголовок */}
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>🎵 Muzyka</Text>
          <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
            Twoje pliki audio do koncentracji i odpoczynku
          </Text>
        </View>

        {/* Плеєр */}
        <View style={[styles.playerCard, getShadow('card'), { backgroundColor: colors.surface, borderColor: colors.border }]}>

          {/* Обкладинка */}
          <View style={[styles.albumArt, { backgroundColor: track.color + '22', borderColor: track.color + '44' }]}>
            <Text style={styles.albumEmoji}>{track.emoji}</Text>
            {isLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator color={track.color} size="large" />
              </View>
            )}
          </View>

          <Text style={[styles.playerTitle,  { color: colors.text }]}>{track.title}</Text>
          <Text style={[styles.playerArtist, { color: colors.textSecondary }]}>{track.artist}</Text>

          {/* Прогрес */}
          <View style={styles.progressWrapper}>
            {Platform.OS === 'web' ? (
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={position}
                onChange={(e) => handleSeek(e.target.value)}
                className="custom-slider"
                style={{
                  background: `linear-gradient(to right, ${track.color} 0%, ${track.color} ${progressPercent}%, ${colors.surfaceAlt} ${progressPercent}%, ${colors.surfaceAlt} 100%)`
                }}
              />
            ) : (
              <TouchableOpacity
                style={[styles.progressBg, { backgroundColor: colors.surfaceAlt }]}
                activeOpacity={1}
                onPress={(e) => {
                  const touchX = e.nativeEvent.locationX;
                  const barWidth = 300;
                  const newProgress = (touchX / barWidth) * duration;
                  handleSeek(Math.min(duration, Math.max(0, newProgress)));
                }}
              >
                <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: track.color }]}>
                  <View style={[styles.progressThumb, { backgroundColor: track.color }]} />
                </View>
              </TouchableOpacity>
            )}
            <View style={styles.timeRow}>
              <Text style={[styles.timeText, { color: colors.textMuted }]}>{formatMs(position)}</Text>
              <Text style={[styles.timeText, { color: colors.textMuted }]}>{formatMs(duration) || track.duration}</Text>
            </View>
          </View>

          {/* Кнопки керування */}
          <View style={styles.controlsContainer}>
            <TouchableOpacity
              style={[styles.loopBtn, {
                backgroundColor: isLooping ? track.color : colors.surfaceAlt,
                borderColor: isLooping ? track.color : colors.border,
              }]}
              onPress={toggleLoop}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 18, color: isLooping ? '#fff' : colors.text }}>🔁</Text>
            </TouchableOpacity>

            <View style={styles.mainActionRow}>
              <TouchableOpacity style={[styles.controlBtn, { backgroundColor: colors.surfaceAlt }]} onPress={handlePrev}>
                <Text style={{ fontSize: 20 }}>⏮</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.playBtn, getShadow('button'), { backgroundColor: track.color }]}
                onPress={handlePlayPause}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={{ fontSize: 28 }}>{isPlaying ? '⏸' : '▶️'}</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity style={[styles.controlBtn, { backgroundColor: colors.surfaceAlt }]} onPress={handleNext}>
                <Text style={{ fontSize: 20 }}>⏭</Text>
              </TouchableOpacity>
            </View>

            <View style={{ width: 44 }} />
          </View>

          {/* Гучність */}
          <View style={styles.volumeRow}>
            <Text style={{ fontSize: 16 }}>🔈</Text>
            <View style={[styles.volumeBar, { backgroundColor: colors.surfaceAlt }]}>
              <View style={[styles.volumeFill, { width: `${volume * 100}%`, backgroundColor: track.color }]} />
            </View>
            <Text style={{ fontSize: 16 }}>🔊</Text>
          </View>
          <View style={styles.volumeBtns}>
            {[0.25, 0.5, 0.75, 1].map((v) => (
              <TouchableOpacity
                key={v}
                style={[styles.volBtn, {
                  backgroundColor: volume === v ? track.color : colors.surfaceAlt,
                  borderColor: volume === v ? track.color : colors.border,
                }]}
                onPress={() => handleVolumeChange(v)}
              >
                <Text style={{ color: volume === v ? '#fff' : colors.textSecondary, fontSize: FONTS.size.xs }}>
                  {Math.round(v * 100)}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Плейлист */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Playlista</Text>
        {TRACKS.map((t, idx) => {
          const isActive = idx === currentIdx;
          return (
            <TouchableOpacity
              key={t.id}
              style={[styles.trackRow, {
                backgroundColor: isActive ? track.color + '18' : colors.surface,
                borderColor: isActive ? track.color : colors.border,
              }]}
              onPress={() => selectTrack(idx)}
              activeOpacity={0.85}
            >
              <View style={[styles.trackIcon, { backgroundColor: t.color + '22', borderColor: t.color + '55' }]}>
                {isActive && isPlaying ? (
                  <View style={styles.barsContainer}>
                    {[1, 2, 3].map((i) => (
                      <View key={i} style={[styles.bar, { backgroundColor: t.color, height: 6 + i * 4 }]} />
                    ))}
                  </View>
                ) : (
                  <Text style={{ fontSize: 24 }}>{t.emoji}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.trackTitle, { color: isActive ? t.color : colors.text }]}>{t.title}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: FONTS.size.xs }}>{t.artist} · {t.duration}</Text>
              </View>
              <View style={[styles.playSmall, { backgroundColor: isActive ? t.color : colors.surfaceAlt }]}>
                <Text style={{ fontSize: 14 }}>{isActive && isPlaying ? '⏸' : '▶️'}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1 },
  scroll:          { padding: SPACING.md, paddingBottom: SPACING.xxl },
  pageHeader:      { paddingTop: SPACING.md, paddingBottom: SPACING.lg },
  pageTitle:       { fontSize: FONTS.size.xxl, fontWeight: FONTS.weight.bold },
  pageSubtitle:    { fontSize: FONTS.size.sm, marginTop: 4 },

  playerCard:      { borderRadius: RADIUS.xl, padding: SPACING.xl, alignItems: 'center', borderWidth: 1, marginBottom: SPACING.lg },
  albumArt:        { width: 140, height: 140, borderRadius: RADIUS.xl, alignItems: 'center', justifyContent: 'center', borderWidth: 2, marginBottom: SPACING.lg, position: 'relative' },
  albumEmoji:      { fontSize: 64 },
  loadingOverlay:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: RADIUS.xl, alignItems: 'center', justifyContent: 'center' },

  playerTitle:     { fontSize: FONTS.size.xl, fontWeight: FONTS.weight.bold, marginBottom: 4 },
  playerArtist:    { fontSize: FONTS.size.sm, marginBottom: SPACING.md },

  progressWrapper: { width: '100%', marginBottom: SPACING.md, paddingHorizontal: 2 },
  progressBg:      { height: 6, borderRadius: 3, width: '100%', overflow: 'visible', justifyContent: 'center' },
  progressFill:    { height: 6, borderRadius: 3, position: 'relative', overflow: 'visible' },
  progressThumb:   { position: 'absolute', right: -8, top: -5, width: 16, height: 16, borderRadius: 8, elevation: 3 },
  timeRow:         { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  timeText:        { fontSize: FONTS.size.xs },

  controlsContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: SPACING.lg },
  mainActionRow:   { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  controlBtn:      { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  playBtn:         { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  loopBtn:         { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },

  volumeRow:       { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, width: '100%', marginBottom: SPACING.sm },
  volumeBar:       { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  volumeFill:      { height: 6, borderRadius: 3 },
  volumeBtns:      { flexDirection: 'row', gap: SPACING.sm, justifyContent: 'center' },
  volBtn:          { paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1 },

  sectionLabel:    { fontSize: FONTS.size.xs, fontWeight: FONTS.weight.semibold, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: SPACING.sm },
  trackRow:        { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, borderRadius: RADIUS.xl, padding: SPACING.md, borderWidth: 1, marginBottom: SPACING.sm, width: '100%' },
  trackIcon:       { width: 48, height: 48, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  barsContainer:   { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 22 },
  bar:             { width: 4, borderRadius: 2 },
  trackTitle:      { fontSize: FONTS.size.base, fontWeight: FONTS.weight.semibold, marginBottom: 2 },
  playSmall:       { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
