import { Capacitor } from '@capacitor/core';
import { AndroidIntentProvider } from '@/lib/printing/providers/android-intent.provider';
import { DesktopBrowserProvider } from '@/lib/printing/providers/desktop-browser.provider';
import type { PrintProvider, ReceiptData } from '@/lib/printing/types';

let cachedProvider: PrintProvider | null = null;

const resolveProvider = (): PrintProvider => {
  if (cachedProvider) return cachedProvider;

  const isAndroidNative = Capacitor.getPlatform() === 'android' && Capacitor.isNativePlatform();
  cachedProvider = isAndroidNative ? new AndroidIntentProvider() : new DesktopBrowserProvider();

  return cachedProvider;
};

export const printReceipt = async (receipt: ReceiptData): Promise<void> => {
  const provider = resolveProvider();
  await provider.print(receipt);
};
