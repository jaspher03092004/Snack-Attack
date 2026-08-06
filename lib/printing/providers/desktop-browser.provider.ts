import type { PrintProvider, ReceiptData } from '@/lib/printing/types';

export class DesktopBrowserProvider implements PrintProvider {
  async print(_receipt: ReceiptData): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('Desktop print is unavailable outside the browser runtime.');
    }

    window.print();
  }
}
