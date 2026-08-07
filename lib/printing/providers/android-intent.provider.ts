import { IntentLauncher } from '@capgo/capacitor-intent-launcher';
import { receiptToPlainText } from '@/lib/printing/build-receipt';
import type { PrintProvider, ReceiptData } from '@/lib/printing/types';

const RAWBT_PACKAGE = 'ru.a402d.rawbtprinter';
const ACTION_SEND = 'android.intent.action.SEND';
const MIME_TEXT = 'text/plain';
const EXTRA_TEXT_KEY = 'android.intent.extra.TEXT';
const RESULT_CANCELED = 0;

export class AndroidIntentProvider implements PrintProvider {
  async print(receipt: ReceiptData): Promise<void> {
    const textPayload = receiptToPlainText(receipt);

    const result = await IntentLauncher.startActivityAsync({
      action: ACTION_SEND,
      type: MIME_TEXT,
      packageName: RAWBT_PACKAGE,
      extra: {
        [EXTRA_TEXT_KEY]: textPayload,
      },
    });

    if (result.resultCode === RESULT_CANCELED) {
      throw new Error('Printing canceled by user.');
    }
  }
}
