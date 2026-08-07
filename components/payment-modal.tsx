'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { supabase as defaultSupabase } from '@/lib/supabase/client';
import { buildReceiptData } from '@/lib/printing/build-receipt';
import { printReceipt } from '@/lib/printing/print-receipt';
import type { SupabaseClient } from '@supabase/supabase-js';

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
  calculateTotalDeductions?: (items: any[]) => Record<string, number>;
  supabaseClient?: SupabaseClient | null;
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
  ],
  calculateTotalDeductions,
  supabaseClient
}: PaymentModalProps) {
  const [tenderedStr, setTenderedStr] = useState<string>('500');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string>('');
  const [printStep, setPrintStep] = useState<'customer' | 'kitchen'>('customer');
  const supabase = supabaseClient || defaultSupabase;

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTenderedStr('500');
      setCheckoutError('');
      setPrintStep('customer');
    }
  }, [isOpen]);

  const handleCloseModal = () => {
    setPrintStep('customer');
    onClose();
  };

  const createReceiptData = () => {
    const amountTendered = parseFloat(tenderedStr || '0');

    return buildReceiptData({
      orderNumber,
      orderType,
      totalDue,
      amountTendered,
      items,
    });
  };

  const runCheckoutOperations = async (): Promise<void> => {
    setCheckoutError('');
    if (!supabase) {
      throw new Error('Supabase client is not configured.');
    }

    const activeCashier =
      typeof window !== 'undefined' ? localStorage.getItem('activeCashier') || 'Unknown' : 'Unknown';

    const tendered = parseFloat(tenderedStr || '0');
    if (tendered < totalDue) {
      throw new Error('Amount tendered must cover the total due.');
    }

    // Snapshot cart data at checkout time to avoid state/prop timing issues.
    const cart = [...items];

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          order_number: orderNumber,
          total_amount: Number(totalDue),
          amount_tendered: Number(tendered),
          change_due: Number(Math.max(0, tendered - totalDue)),
          cashier_name: activeCashier,
          created_at: new Date().toISOString(),
        },
      ])
      .select('id')
      .single();

    if (orderError) {
      throw orderError;
    }
    if (!order?.id) {
      throw new Error('Unable to create order record');
    }

    const orderItems = cart.map((item) => ({
      order_id: order.id,
      item_name: item.name,
      quantity: Number(item.quantity),
      total_price: Number(item.price * item.quantity),
      modifiers: item.modifiers ?? [],
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
    if (itemsError) {
      throw itemsError;
    }

    // --- Deduct Inventory with Promise.all ---
    if (calculateTotalDeductions && supabase) {
      console.log('Cart being passed to deductions:', cart);
      const deductions = calculateTotalDeductions(cart);
      console.log("Final Cart Deductions Tally:", deductions); // Audit trail

      try {
        const updatePromises = Object.entries(deductions).map(async ([ingredientName, qtyToDeduct]) => {
          // 1. Fetch current stock
          const { data: itemData, error: fetchError } = await supabase
            .from('inventory')
            .select('pieces_stock')
            .eq('product_name', ingredientName)
            .single();

          if (fetchError || !itemData) {
            console.error(`Failed to fetch stock for ${ingredientName}:`, fetchError);
            return;
          }

          // 2. Subtract and update
          const newStock = itemData.pieces_stock - qtyToDeduct;
          const { error: updateError } = await supabase
            .from('inventory')
            .update({ pieces_stock: newStock })
            .eq('product_name', ingredientName);

          if (updateError) {
            console.error(`Failed to update ${ingredientName}:`, updateError);
          } else {
            console.log(`Successfully deducted ${qtyToDeduct} from ${ingredientName}. New stock: ${newStock}`);
          }
        });

        // Strictly wait for ALL inventory updates to finish
        await Promise.all(updatePromises);
      } catch (err) {
        console.error("Critical error during inventory deduction:", err);
      }
    }
  };

  const handleNoReceiptCheckout = async () => {
    setIsSubmitting(true);
    try {
      await runCheckoutOperations();
      onComplete?.();
      setPrintStep('customer');
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      console.error('Supabase Insert Error:', error);
      setCheckoutError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDualPrintCheckout = async () => {
    setCheckoutError('');

    if (printStep === 'customer') {
      setIsSubmitting(true);
      try {
        await runCheckoutOperations();
        await printReceipt(createReceiptData());
        setPrintStep('kitchen');
      } catch (error) {
        const message = error instanceof Error ? error.message : JSON.stringify(error);
        console.error('Supabase Insert Error:', error);
        setCheckoutError(message);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await printReceipt(createReceiptData());
      onComplete?.();
      setPrintStep('customer');
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to print receipt.';
      setCheckoutError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 sm:p-4 print:hidden">
      <div className="w-full max-w-md lg:max-w-5xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[95dvh] overflow-hidden">
        
        {/* Responsive Inner Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 p-6 md:p-8 flex-1 overflow-hidden h-full">
          
          {/* --- Column 1: Order Summary (Mobile: Fills remaining height & scrolls) --- */}
          <section className="flex flex-col w-full border-b md:border-b-0 md:border-r pb-2 md:pb-0 md:pr-8 flex-1 min-h-0 overflow-hidden">
            <button 
              onClick={handleCloseModal}
              className="flex-shrink-0 flex items-center text-slate-500 hover:text-slate-900 transition-colors mb-1 lg:mb-8 font-semibold w-fit focus:outline-none text-xs lg:text-sm"
            >
              <ArrowLeft className="w-4 h-4 lg:w-5 lg:h-5 mr-2 stroke-[2.5px]" />
              Back to Register
            </button>

            <div className="flex-shrink-0 text-[10px] lg:text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              Total Due
            </div>
            <div className="flex-shrink-0 text-2xl sm:text-3xl lg:text-[44px] leading-none font-black text-slate-900 mb-1 lg:mb-3 flex items-start tracking-tight">
              <span className="text-lg sm:text-xl lg:text-3xl mt-1 lg:mt-1.5 mr-1 font-sans">₱</span>
              {totalDue.toFixed(2)}
            </div>
            <div className="flex-shrink-0 text-[11px] lg:text-[15px] font-medium text-slate-500 mb-2 lg:mb-8">
              Order #{orderNumber} · {orderType}
            </div>

            <div className="flex-shrink-0 border-t-2 border-dashed border-slate-100 mb-2 lg:mb-6"></div>

            {/* Items Scroll Container */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
              {items.map((item) => (
                <div key={item.id} className="mb-1.5 lg:mb-5 last:mb-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <div className="font-bold text-slate-900 text-[11px] lg:text-[15px] leading-tight flex-1 pr-2">
                      {item.quantity}x {item.name}
                    </div>
                    <div className="font-bold text-slate-900 text-[11px] lg:text-[15px] tracking-tight">
                      ₱{(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="text-[9px] lg:text-[13px] text-slate-500 font-medium">
                      {item.modifiers.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex-shrink-0 border-t-2 border-dashed border-slate-100 mt-2 lg:mt-6"></div>
          </section>

          {/* --- Column 2: Amounts (Mobile: Pinned to bottom, flex-shrink-0) --- */}
          <section className="flex flex-col w-full border-b md:border-b-0 md:border-r pb-2 md:pb-0 md:pr-8 flex-shrink-0">
            <div className="flex flex-col gap-2 lg:gap-5 flex-1">
              <div className="bg-slate-50/80 rounded-xl lg:rounded-[20px] p-2 lg:p-6 border border-slate-100/80">
                <div className="text-[10px] lg:text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Amount Tendered</div>
                <div className="text-lg sm:text-2xl lg:text-[38px] leading-none font-black text-slate-900 flex items-start tracking-tight">
                  <span className="text-base sm:text-lg lg:text-2xl mt-0.5 lg:mt-1.5 mr-1 font-sans text-slate-800">₱</span>
                  {amountTendered.toFixed(2)}
                </div>
              </div>

              <div className={`rounded-xl lg:rounded-[20px] p-2 lg:p-6 border-2 transition-colors duration-300 ${
                changeDue > 0 ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50/80 border-slate-100/80'
              }`}>
                <div className={`text-[10px] lg:text-[11px] font-bold uppercase tracking-widest mb-0.5 transition-colors ${
                  changeDue > 0 ? 'text-emerald-600' : 'text-slate-500'
                }`}>Change Due</div>
                <div className={`text-xl sm:text-3xl lg:text-[46px] leading-none font-black flex items-start tracking-tight transition-colors ${
                  changeDue > 0 ? 'text-emerald-500' : 'text-slate-900'
                }`}>
                  <span className={`text-base sm:text-xl lg:text-3xl mt-1 lg:mt-1.5 mr-1 font-sans ${
                    changeDue > 0 ? 'text-emerald-500' : 'text-slate-800'
                  }`}>₱</span>
                  {changeDue.toFixed(2)}
                </div>
              </div>

              <button 
                onClick={handleCloseModal}
                className="mt-auto w-full py-2 lg:py-4 text-sm lg:text-lg font-bold rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all active:scale-[0.98] border border-slate-200/60 focus:outline-none"
              >
                Cancel
              </button>
            </div>
          </section>

          {/* --- Column 3: Numpad & Actions (Mobile: Pinned to bottom, flex-shrink-0) --- */}
          <section className="flex flex-col w-full gap-2 lg:gap-5 flex-shrink-0">
            
            {/* Automated Amounts - HIDDEN ON MOBILE per request */}
            <div className="hidden lg:grid grid-cols-2 gap-1.5 lg:gap-3">
              {[50, 100, 500, 1000].map((amt) => {
                const isActive = amountTendered === amt;
                return (
                  <button
                    key={amt}
                    onClick={() => handleQuickCash(amt)}
                    className={`py-2 lg:py-4 rounded-xl lg:rounded-[16px] font-bold text-xs lg:text-[16px] border-2 transition-all active:scale-95 focus:outline-none ${
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
              className="w-full py-2 lg:py-4 text-sm lg:text-lg font-bold rounded-xl bg-slate-100 text-slate-700 border-2 border-transparent hover:bg-slate-200 transition-all active:scale-[0.98] focus:outline-none"
            >
              Exact Amount (₱{totalDue.toFixed(2)})
            </button>

            <div className="grid grid-cols-3 gap-1 sm:gap-2 lg:gap-4">
              {['1','2','3','4','5','6','7','8','9','C','0','00'].map((val) => (
                <button
                  key={val}
                  onClick={() => handleKeypadPress(val)}
                  className={`rounded-lg lg:rounded-[18px] py-1.5 lg:py-3 text-sm sm:text-base lg:text-[28px] font-semibold transition-all active:scale-95 flex items-center justify-center select-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] border focus:outline-none ${
                    val === 'C'
                      ? 'bg-[#F8FAFC] text-slate-400 border-transparent hover:bg-slate-100 hover:text-slate-600'
                      : 'bg-white border-slate-100/80 text-slate-800 hover:bg-slate-50 hover:border-slate-200'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>

            {checkoutError && (
              <div className="rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 px-3 py-1.5 mb-0.5 text-xs lg:text-sm">
                {checkoutError}
              </div>
            )}

            <div className="flex flex-col xl:flex-row gap-3 w-full mt-4">
              {printStep === 'customer' && (
                <button
                  type="button"
                  onClick={handleNoReceiptCheckout}
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-xl font-bold bg-slate-200 text-slate-800 hover:bg-slate-300 disabled:bg-slate-300 disabled:text-slate-500"
                >
                  {isSubmitting ? 'PROCESSING...' : 'COMPLETE - NO RECEIPT'}
                </button>
              )}
              <button
                type="button"
                onClick={handleDualPrintCheckout}
                disabled={isSubmitting}
                className="w-full py-4 rounded-xl font-bold bg-emerald-500 text-white hover:bg-emerald-600 disabled:bg-slate-300 disabled:text-slate-500 flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4 lg:w-5 lg:h-5 stroke-[2.5px]" />
                {isSubmitting ? 'PROCESSING...' : printStep === 'customer' ? ' PRINT RECEIPT' : ' PRINT KITCHEN COPY'}
              </button>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}