import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rrbgroupd.mastery',
  appName: 'RRB Group D',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false,
    allowNavigation: [
      '*.googleapis.com',
      '*.firebaseio.com',
      '*.firebaseapp.com',
      'firestore.googleapis.com',
      'translate.googleapis.com',
    ],
  },
  plugins: {
    // ── Splash Screen ─────────────────────────────────────────────────
    SplashScreen: {
      launchShowDuration: 1800,
      backgroundColor: '#002045',        // matches --color-primary exactly
      androidSplashResourceName: 'splash',
      showSpinner: true,
      spinnerColor: '#adc7f7',            // dark-mode primary color
      splashFullScreen: true,
      splashImmersive: true,
      fadeInDuration: 300,
      fadeOutDuration: 200,
    },

    // ── Status Bar ────────────────────────────────────────────────────
    StatusBar: {
      style: 'dark' as any,
      backgroundColor: '#002045',
      overlaysWebView: false,
    },

    // ── Keyboard ──────────────────────────────────────────────────────
    Keyboard: {
      resize: 'body' as any,
      style: 'dark' as any,
      resizeOnFullScreen: true,
    },

    // ── Native Google Sign-In ─────────────────────────────────────────
    // serverClientId: get from Firebase Console → Project Settings → Web App
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: 'REPLACE_WITH_FIREBASE_WEB_CLIENT_ID.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },

    // ── Local Push Notifications ──────────────────────────────────────
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#002045',
      sound: undefined,
    },

    // ── Push Notifications (FCM) ──────────────────────────────────────
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },

  // ── Android-specific ──────────────────────────────────────────────────
  android: {
    buildOptions: {
      // ⚠️ Set these in your shell environment before building for release:
      //    export KEYSTORE_PATH=rrb-release.keystore
      //    export KEYSTORE_PASSWORD=<your-password>
      //    export KEYSTORE_ALIAS=rrbgroupd
      //    export KEYSTORE_ALIAS_PASSWORD=<your-password>
      keystorePath: process.env['KEYSTORE_PATH'] ?? 'rrb-release.keystore',
      keystorePassword: process.env['KEYSTORE_PASSWORD'] ?? '',
      keystoreAlias: process.env['KEYSTORE_ALIAS'] ?? 'rrbgroupd',
      keystoreAliasPassword: process.env['KEYSTORE_ALIAS_PASSWORD'] ?? '',
      releaseType: 'AAB',           // AAB for Play Store (smaller than APK)
      signingType: 'apksigner',
    },
  },
};

export default config;
