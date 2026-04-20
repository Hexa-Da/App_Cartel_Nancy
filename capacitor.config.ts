import type { CapacitorConfig } from '@capacitor/cli';

const getRequiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const config: CapacitorConfig = {
  appId: 'com.cartelnancy.app',
  appName: 'Cartel Nancy',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  ios: {
    scheme: 'Cartel Nancy',
    contentInset: 'never', // La WebView ignore les safe areas natives et s'étend sous la barre d'état
    scrollEnabled: false, // Désactive le UIScrollView natif - Solution radicale contre le rebond
    backgroundColor: '#000000',
    allowsLinkPreview: false
  },
  android: {
    backgroundColor: '#000000',
    allowMixedContent: true,
    captureInput: true
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: getRequiredEnv('GOOGLE_AUTH_SERVER_CLIENT_ID'),
      androidClientId: getRequiredEnv('GOOGLE_AUTH_ANDROID_CLIENT_ID'),
      iosClientId: getRequiredEnv('GOOGLE_AUTH_IOS_CLIENT_ID'),
      webClientId: getRequiredEnv('GOOGLE_AUTH_WEB_CLIENT_ID'),
      forceCodeForRefreshToken: true
    },
    FirebaseMessaging: {
      presentationOptions: ['alert', 'badge', 'sound']
    },
    Auth: {
      // Configuration spécifique au plugin d'authentification si nécessaire
    },
    Screen: {
      orientation: 'portrait'
    },
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: false,
      backgroundColor: "#000000",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    Keyboard: {
      resize: 'none',
      resizeOnFullScreen: false,
      style: 'dark'
    }
  }
};

export default config;
