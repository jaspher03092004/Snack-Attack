export type ReceiptItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  modifiers?: string[];
};

export type ReceiptData = {
  orderNumber: string;
  orderType: string;
  totalDue: number;
  amountTendered: number;
  changeDue: number;
  items: ReceiptItem[];
  printedAtIso: string;
};

export interface PrintProvider {
  print(receipt: ReceiptData): Promise<void>;
}
