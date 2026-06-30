'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';

export type PaymentCartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  modifiers: string[];
};

export interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  totalDue?: number;
  orderNumber?: string;
  orderType?: string;
  items?: PaymentCartItem[];
}

export function PaymentModal({
  isOpen,
  onClose,
  onComplete,
  totalDue = 431.20,
  orderNumber = '042',
  orderType = 'Dine In',
  items = [
    { id: '1', name: 'Classic Cheeseburger', price: 150.00, quantity: 2, modifiers: ['No Onions', 'Extra Mayo'] },
    { id: '2', name: 'Large Fries', price: 85.00, quantity: 1, modifiers: [] }
  ]
}: PaymentModalProps) {
  const [tenderedStr, setTenderedStr] = useState<string>('500');

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTenderedStr('500');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const amountTendered = parseFloat(tenderedStr || '0');
  const changeDue = Math.max(0, amountTendered - totalDue);

  const handleKeypadPress = (val: string) => {
    if (val === 'C') {
      setTenderedStr('');
    } else if (val === '00') {
      setTenderedStr(prev => (prev === '' || prev === '0') ? '0' : prev + '00');
    } else {
      setTenderedStr(prev => {
        if (prev === '0') return val;
        return prev + val;
      });
    }
  };

  const handleQuickCash = (amount: number) => {
    setTenderedStr(amount.toString());
  };

  const handleExactAmount = () => {
    setTenderedStr(totalDue.toString());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:hidden">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-[1000px] h-[720px] flex overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Left Column - Summary */}
        <div className="w-[340px] bg-white border-r border-slate-100 p-8 flex flex-col shrink-0">
          <button 
            onClick={onClose}
            className="flex items-center text-slate-500 hover:text-slate-900 transition-colors mb-8 font-semibold w-fit focus:outline-none"
          >
            <ArrowLeft className="w-5 h-5 mr-2 stroke-[2.5px]" />
            Back to Register
          </button>

          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
            Total Due
          </div>
          <div className="text-[44px] leading-none font-black text-slate-900 mb-3 flex items-start tracking-tight">
            <span className="text-3xl mt-1.5 mr-1 font-sans">₱</span>
            {totalDue.toFixed(2)}
          </div>
          <div className="text-[15px] font-medium text-slate-500 mb-8">
            Order #{orderNumber} · {orderType}
          </div>

          <div className="border-t-2 border-dashed border-slate-100 mb-6"></div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {items.map((item) => (
              <div key={item.id} className="mb-5 last:mb-0">
                <div className="flex justify-between items-start mb-1">
                  <div className="font-bold text-slate-900 text-[15px] leading-tight flex-1 pr-2">
                    {item.quantity}x {item.name}
                  </div>
                  <div className="font-bold text-slate-900 text-[15px] tracking-tight">
                    ₱{(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
                {item.modifiers && item.modifiers.length > 0 && (
                  <div className="text-[13px] text-slate-500 font-medium">
                    {item.modifiers.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="border-t-2 border-dashed border-slate-100 mt-6"></div>
        </div>

        {/* Right Column - Payment */}
        <div className="flex-1 bg-white p-8 flex flex-col">
          {/* Interactive Area */}
          <div className="flex gap-8 flex-1">
            
            {/* Left Sub-column */}
            <div className="flex-1 flex flex-col gap-5">
              {/* Amount Tendered */}
              <div className="bg-slate-50/80 rounded-[20px] p-6 border border-slate-100/80">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Amount Tendered</div>
                <div className="text-[38px] leading-none font-black text-slate-900 flex items-start tracking-tight">
                  <span className="text-2xl mt-1.5 mr-1 font-sans text-slate-800">₱</span>
                  {amountTendered.toFixed(2)}
                </div>
              </div>

              {/* Change Due */}
              <div className={`rounded-[20px] p-6 border-2 transition-colors duration-300 ${
                changeDue > 0 ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50/80 border-slate-100/80'
              }`}>
                <div className={`text-[11px] font-bold uppercase tracking-widest mb-1.5 transition-colors ${
                  changeDue > 0 ? 'text-emerald-600' : 'text-slate-500'
                }`}>Change Due</div>
                <div className={`text-[46px] leading-none font-black flex items-start tracking-tight transition-colors ${
                  changeDue > 0 ? 'text-emerald-500' : 'text-slate-900'
                }`}>
                  <span className={`text-3xl mt-1.5 mr-1 font-sans ${
                    changeDue > 0 ? 'text-emerald-500' : 'text-slate-800'
                  }`}>₱</span>
                  {changeDue.toFixed(2)}
                </div>
              </div>

              {/* Cancel Button */}
              <button 
                onClick={onClose}
                className="mt-auto w-full py-[22px] rounded-[18px] bg-slate-100 text-slate-600 font-bold text-[16px] hover:bg-slate-200 transition-all active:scale-[0.98] border border-slate-200/60 focus:outline-none"
              >
                Cancel
              </button>
            </div>

            {/* Right Sub-column (Keypad) */}
            <div className="w-[320px] flex flex-col gap-5">
              
              {/* Quick Cash */}
              <div className="grid grid-cols-2 gap-3">
                {[50, 100, 500, 1000].map(amt => {
                  const isActive = amountTendered === amt;
                  return (
                    <button
                      key={amt}
                      onClick={() => handleQuickCash(amt)}
                      className={`py-4 rounded-[16px] font-bold text-[16px] border-2 transition-all active:scale-95 focus:outline-none ${
                        isActive 
                          ? 'bg-white border-slate-900 text-slate-900 shadow-sm' 
                          : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      ₱{amt}
                    </button>
                  );
                })}
              </div>
              
              <button 
                onClick={handleExactAmount}
                className="w-full py-4 rounded-[16px] bg-slate-100 text-slate-700 font-bold text-[16px] border-2 border-transparent hover:bg-slate-200 transition-all active:scale-[0.98] focus:outline-none"
              >
                Exact Amount (₱{totalDue.toFixed(2)})
              </button>

              {/* Keypad Grid */}
              <div className="grid grid-cols-3 gap-3 mt-1 flex-1">
                {['1','2','3','4','5','6','7','8','9','C','0','00'].map(val => (
                  <button
                    key={val}
                    onClick={() => handleKeypadPress(val)}
                    className={`rounded-[18px] py-3 text-[28px] font-semibold transition-all active:scale-95 flex items-center justify-center select-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] border focus:outline-none ${
                      val === 'C' 
                        ? 'bg-[#F8FAFC] text-slate-400 border-transparent hover:bg-slate-100 hover:text-slate-600' 
                        : 'bg-white border-slate-100/80 text-slate-800 hover:bg-slate-50 hover:border-slate-200'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>

              {/* Print Receipt Button */}
              <button 
                className="mt-2 w-full py-[22px] rounded-[18px] bg-[#10B981] hover:bg-[#059669] text-white font-bold text-[17px] flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-emerald-500/25 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 active:scale-[0.98]"
                onClick={() => {
                  window.print();
                  onClose();
                  onComplete?.();
                }}
              >
                <Printer className="w-5 h-5 stroke-[2.5px]" /> PRINT RECEIPT
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
