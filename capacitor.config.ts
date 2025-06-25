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
      serverClientId: '402641775282-1dd873jdnaq0j1o48sgfk8f8kelltblt.apps.googleusercontent.com',
      androidClientId: '402641775282-2g2kh1vb785nj0c6o10kqfbeor951lpu.apps.googleusercontent.com',
      iosClientId: '402641775282-bcu1on4ld4bk3609sl9e9rcmvsb23epp.apps.googleusercontent.com',
      webClientId: '402641775282-flmj306kcpqct1hmrific149uhthiqcq.apps.googleusercontent.com'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#488AFF'
    },
    Auth: {
      // Configuration spécifique au plugin d'authentification si nécessaire
    },
    Screen: {
      orientation: 'portrait'
    }
  }
};

export default config;
