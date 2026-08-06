import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.snackattack.pos',
  appName: 'Snack Attack POS',
  webDir: 'www',
  server: {
    url: 'https://snack-attack-eight.vercel.app/',
    cleartext: false
  }
};

export default config;