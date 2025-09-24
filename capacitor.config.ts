import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cartelnancy.app',
  appName: 'Cartel Nancy',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  ios: {
    scheme: 'Cartel Nancy',
    contentInset: 'automatic',
    scrollEnabled: true,
    backgroundColor: '#000000',
    allowsLinkPreview: false,
    handleApplicationURL: true,
    keyboardResize: 'ionic',
    scrollPadding: true
  },
  android: {
    keyboardResize: 'none',
    scrollPadding: false,
    backgroundColor: '#000000',
    allowMixedContent: true,
    captureInput: true
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '402641775282-1dd873jdnaq0j1o48sgfk8f8kelltblt.apps.googleusercontent.com',
      androidClientId: '402641775282-pdqf0al035j46rcamrldne6o1hdj9ggj.apps.googleusercontent.com',
      iosClientId: '402641775282-bcu1on4ld4bk3609sl9e9rcmvsb23epp.apps.googleusercontent.com',
      webClientId: '402641775282-flmj306kcpqct1hmrific149uhthiqcq.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
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
    },
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: "#000000",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    }
  }
};

export default config;
