import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gestione.turni',
  appName: 'Gestione Turni',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
