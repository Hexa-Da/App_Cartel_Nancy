import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cartelnancy.app',
  appName: 'Cartel Nancy',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    hostname: 'localhost',
    allowNavigation: ['*']
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '402641775282-4gscsht88aek9v7jsfvga58293mi5at1.apps.googleusercontent.com',
      androidClientId: '402641775282-4gscsht88aek9v7jsfvga58293mi5at1.apps.googleusercontent.com',
      webClientId: '402641775282-flmj306kcpqct1hmrific149uhthiqcq.apps.googleusercontent.com'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#488AFF'
    },
    Auth: {
      // Configuration spécifique au plugin d'authentification si nécessaire
    }
  }
};

export default config;
