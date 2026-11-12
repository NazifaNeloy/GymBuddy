// Dynamic Expo config. Only EXPO_PUBLIC_* values are inlined into the app bundle,
// and they are read directly from process.env in src/constants/config.js.
// Never put secret keys here.

module.exports = () => ({
  expo: {
    name: 'GymBuddy',
    slug: 'gymbuddy',
    owner: 'nazifaneloy', // Expo account that owns the EAS project
    scheme: 'gymbuddy', // deep links: OAuth redirect + password reset
    version: '0.1.0',
    orientation: 'default', // phones and tablets, portrait and landscape
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic', // follow system light/dark mode
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#FFFFFF',
      dark: { backgroundColor: '#0B0F14' },
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.nazifaneloy.gymbuddy',
    },
    android: {
      package: 'com.nazifaneloy.gymbuddy',
      versionCode: 1,
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
    },
    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
      output: 'single',
    },
    extra: {
      // Links this app to the EAS project on expo.dev (builds, GitHub integration). Not a secret.
      eas: { projectId: '6e94e413-cb33-4299-ba68-694031040e39' },
    },
    plugins: [
      'expo-secure-store',
      'expo-web-browser',
      [
        'expo-image-picker',
        {
          photosPermission: 'GymBuddy needs access to your photos to save progress pictures.',
          cameraPermission: 'GymBuddy needs camera access to take progress pictures.',
        },
      ],
      ['expo-notifications', { color: '#2563EB' }],
    ],
  },
});
