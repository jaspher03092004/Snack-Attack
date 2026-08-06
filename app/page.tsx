'use client';

import React, { useState } from 'react';
import { Store, Delete } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function EntrancePage() {
  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isClockingIn, setIsClockingIn] = useState(false);
  const router = useRouter();

  const handlePinSubmit = async (enteredPin: string) => {
    setErrorMessage('');

    if (!supabase) {
      setErrorMessage('Authentication service is unavailable.');
      return;
    }

    const { data, error } = await supabase
      .from('staff')
      .select('id, name')
      .eq('pin_code', enteredPin)
      .limit(1)
      .single();

    if (error || !data) {
      setErrorMessage('Invalid PIN');
      setPin('');
      return;
    }

    localStorage.setItem('activeCashier', data.name);
    localStorage.setItem('activeCashierId', data.id);
    router.push('/start-order');
  };

  const handleKeyPress = (digit: string) => {
    setErrorMessage('');

    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);

      if (newPin.length === 4) {
        void handlePinSubmit(newPin);
      }
    }
  };

  // Handle backspace/delete
  const handleDelete = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-white text-slate-900 font-sans selection:bg-none">
      
      {/* Top Right Admin Button */}
      <div className="absolute top-4 right-4 md:top-8 md:right-8">
        <button 
          onClick={() => router.push('/admin')}
          className="flex flex-col items-center justify-center w-[72px] bg-slate-100 hover:bg-slate-200 rounded-xl py-3 px-4 transition-colors focus:outline-none border-none cursor-pointer"
          aria-label="Admin Access"
        >
          <Store className="w-6 h-6 text-emerald-500 mb-1 stroke-[2px]" />
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Admin</span>
        </button>
      </div>

      {/* Main Content Container */}
      <div className="flex flex-col items-center w-full max-w-[400px] pt-16 md:pt-0">
        
        {/* Header Typography */}
        <div className="text-center mb-8">
          <h1 className="text-[32px] font-bold tracking-tight text-slate-900 mb-1">
            Enter PIN
          </h1>
          <p className="text-[16px] text-slate-500 m-0">
            Snack Attack Terminal 01
          </p>
        </div>

        {/* PIN Entry Display (4 circles) */}
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="flex justify-center gap-4 mb-8 md:mb-12" aria-live="polite">
            {[...Array(4)].map((_, i) => (
              <div 
                key={i} 
                className={`h-4 w-4 md:h-5 md:w-5 rounded-full transition-all duration-100 border-2 ${
                  i < pin.length 
                    ? 'bg-slate-400 border-slate-400' 
                    : 'bg-transparent border-slate-200'
                }`} 
              />
            ))}
          </div>
          {errorMessage && <p className="text-sm text-rose-600">{errorMessage}</p>}
        </div>

        {/* Numeric Keypad Grid */}
        <div className="grid grid-cols-3 max-w-xs md:max-w-md mx-auto gap-3 md:gap-6 mb-8">
          {/* Numbers 1-9 */}
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num.toString())}
              className="h-16 w-16 text-2xl md:h-24 md:w-24 md:text-4xl bg-slate-100 hover:bg-slate-200 rounded-2xl flex items-center justify-center font-semibold text-slate-900 transition-colors active:bg-slate-300 focus:outline-none select-none border-none cursor-pointer"
              aria-label={`Digit ${num}`}
            >
              {num}
            </button>
          ))}
          
          {/* Empty bottom left cell */}
          <div className="h-16 w-16 md:h-24 md:w-24"></div>

          {/* 0 Button */}
          <button
            onClick={() => handleKeyPress('0')}
            className="h-16 w-16 text-2xl md:h-24 md:w-24 md:text-4xl bg-slate-100 hover:bg-slate-200 rounded-2xl flex items-center justify-center font-semibold text-slate-900 transition-colors active:bg-slate-300 focus:outline-none select-none border-none cursor-pointer"
            aria-label="Digit 0"
          >
            0
          </button>

          {/* Delete Button */}
          <button
            onClick={handleDelete}
            className="h-16 w-16 md:h-24 md:w-24 bg-slate-100 hover:bg-slate-200 rounded-2xl flex items-center justify-center transition-colors active:bg-slate-300 focus:outline-none border-none cursor-pointer select-none"
            aria-label="Delete last digit"
          >
            <Delete className="w-8 h-8 text-slate-900 stroke-[2px] pointer-events-none fill-transparent" />
          </button>
        </div>

        {/* Clock-in Toggle container */}
        <div 
          className="flex items-center justify-between w-full max-w-xs mx-auto mt-8 px-2" 
        >
          <span className="text-[18px] font-medium text-slate-900 select-none cursor-default">
            Clock-in for shift
          </span>
          <div 
            onClick={() => setIsClockingIn(!isClockingIn)}
            role="switch"
            aria-checked={isClockingIn}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsClockingIn(!isClockingIn);
              }
            }}
            className={`relative w-14 h-8 rounded-full cursor-pointer transition-colors duration-200 ease-in-out ${
              isClockingIn ? 'bg-emerald-500' : 'bg-slate-200'
            }`}
          >
            <div 
              className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out ${
                isClockingIn ? 'translate-x-6' : 'translate-x-0'
              }`} 
            />
          </div>
        </div>
        
      </div>
    </div>
  );
}
