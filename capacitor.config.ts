import type { CapacitorConfig } from '@capacitor/cli';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const loadEnvFile = (): void => {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, 'utf-8');
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value =
      rawValue.startsWith('"') && rawValue.endsWith('"')
        ? rawValue.slice(1, -1)
        : rawValue.startsWith("'") && rawValue.endsWith("'")
          ? rawValue.slice(1, -1)
          : rawValue;

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
};

loadEnvFile();

const getOptionalEnv = (name: string): string => {
  return process.env[name] ?? '';
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
      serverClientId: getOptionalEnv('GOOGLE_AUTH_SERVER_CLIENT_ID'),
      androidClientId: getOptionalEnv('GOOGLE_AUTH_ANDROID_CLIENT_ID'),
      iosClientId: getOptionalEnv('GOOGLE_AUTH_IOS_CLIENT_ID'),
      webClientId: getOptionalEnv('GOOGLE_AUTH_WEB_CLIENT_ID'),
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
