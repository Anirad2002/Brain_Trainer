// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Додаємо розширення mp3, щоб Metro Bundler бачив ваші аудіофайли
config.resolver.assetExts.push('mp3');

module.exports = config;