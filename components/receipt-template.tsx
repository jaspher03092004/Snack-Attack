'use client';

import React from 'react';

const formatDateTime = () => {
  const now = new Date();
  return now.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

type ReceiptCartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  modifiers?: string[];
};

type ReceiptTemplateProps = {
  cart: ReceiptCartItem[];
  orderNumber: string;
  orderType?: string;
};

export function ReceiptTemplate({ cart, orderNumber, orderType = 'Dine In' }: ReceiptTemplateProps) {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="hidden print:block print:absolute print:top-0 print:left-0 print:w-[48mm] print:h-auto print:min-h-0 print:overflow-visible print:bg-white print:text-black print:px-3 font-mono print:m-0 print:p-0">
      <div className="w-full p-2 text-xs leading-tight text-black">
        <div className="text-center">
          <div className="text-sm font-extrabold uppercase">SNACK ATTACK</div>
          <div className="mt-1 text-[10px] font-semibold">{formatDateTime()}</div>
        </div>

        <div className="mt-2 border-t border-black border-dashed pt-1" />

        <div className="mt-2 py-2 text-center">
          <div className="text-lg font-extrabold">{orderNumber}</div>
          <div className="mt-1 text-[10px] font-semibold uppercase">{orderType}</div>
        </div>

        <div className="border-t border-black border-dashed pt-1" />

        <div className="mt-2 space-y-3 py-2">
          {cart.map((item) => (
            <div key={item.id}>
              <div className="flex justify-between gap-2">
                <div className="flex-1">
                  <div className="font-bold">{item.quantity}x {item.name}</div>
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="mt-1 text-xs font-extrabold text-black">
                      {item.modifiers.join(', ')}
                    </div>
                  )}
                </div>
                <div className="shrink-0 font-bold">₱{(item.price * item.quantity).toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 border-t border-black border-dashed pt-1" />

        <div className="mt-2 flex justify-between text-sm font-extrabold">
          <span>TOTAL DUE</span>
          <span>₱{subtotal.toFixed(2)}</span>
        </div>

        <div className="mt-3 border-t border-black border-dashed pt-1" />

        <div className="mt-3 text-center text-[10px] font-extrabold uppercase leading-4">
          <div>Thank you for your order!</div>
          <div className="mt-1">Please come again.</div>
        </div>
      </div>
    </div>
  );
}
