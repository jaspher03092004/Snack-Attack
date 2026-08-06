import type { ReceiptData, ReceiptItem } from '@/lib/printing/types';

type BuildReceiptInput = {
  orderNumber: string;
  orderType: string;
  totalDue: number;
  amountTendered: number;
  items: ReceiptItem[];
};

export const buildReceiptData = ({
  orderNumber,
  orderType,
  totalDue,
  amountTendered,
  items,
}: BuildReceiptInput): ReceiptData => {
  const changeDue = Math.max(0, amountTendered - totalDue);

  return {
    orderNumber,
    orderType,
    totalDue,
    amountTendered,
    changeDue,
    items,
    printedAtIso: new Date().toISOString(),
  };
};

const formatCurrency = (value: number) => `PHP ${value.toFixed(2)}`;

const formatLocalDateTime = (iso: string) => {
  const date = new Date(iso);
  return date.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

export const receiptToPlainText = (receipt: ReceiptData): string => {
  const lines: string[] = [];

  lines.push('SNACK ATTACK');
  lines.push(formatLocalDateTime(receipt.printedAtIso));
  lines.push('--------------------------------');
  lines.push(`Order: ${receipt.orderNumber}`);
  lines.push(`Type: ${receipt.orderType}`);
  lines.push('--------------------------------');

  receipt.items.forEach((item) => {
    lines.push(`${item.quantity} x ${item.name}`);
    lines.push(`  ${formatCurrency(item.price * item.quantity)}`);

    if (item.modifiers && item.modifiers.length > 0) {
      lines.push(`  ${item.modifiers.join(', ')}`);
    }
  });

  lines.push('--------------------------------');
  lines.push(`TOTAL: ${formatCurrency(receipt.totalDue)}`);
  lines.push(`CASH:  ${formatCurrency(receipt.amountTendered)}`);
  lines.push(`CHANGE:${formatCurrency(receipt.changeDue)}`);
  lines.push('--------------------------------');
  lines.push('Thank you for your order!');

  return lines.join('\n');
};
