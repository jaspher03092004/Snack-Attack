'use client';

import React, { useEffect, useState } from 'react';
import { ArrowRight, ShoppingBag, Utensils } from 'lucide-react';
import { useRouter } from 'next/navigation';

const formatTime = (date: Date) => date.toLocaleTimeString([], {
  hour: 'numeric',
  minute: '2-digit',
});

export default function StartOrderPage() {
  const router = useRouter();
  const [time, setTime] = useState(formatTime(new Date()));
  const [showOrderTypeSelection, setShowOrderTypeSelection] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTime(formatTime(new Date()));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-slate-50 text-slate-900 font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_35%)] pointer-events-none" />
      <div className="absolute right-0 top-1/4 h-[420px] w-[420px] translate-x-1/4 rounded-full bg-slate-200/70 blur-3xl opacity-80 pointer-events-none" />

      <div className="relative z-10 flex h-full flex-col">
        <header className="flex items-center justify-between px-6 py-6">
          <div className="inline-flex items-center gap-3 rounded-3xl bg-white/90 px-4 py-3 shadow-sm border border-slate-200">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_8px_rgba(16,185,129,0.12)]" />
            <span className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-600">TERMINAL 01 • ONLINE</span>
          </div>

          <div className="inline-flex items-center gap-4 rounded-3xl bg-white/90 px-4 py-3 shadow-sm border border-slate-200">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900">{time}</p>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Jaspher L.</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">JL</div>
          </div>
        </header>

        <main className="relative flex flex-1 items-center justify-center px-6">
          <div className="relative w-full max-w-3xl overflow-hidden rounded-[36px] border border-slate-200/70 bg-white/90 p-10 shadow-2xl backdrop-blur-xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(248,250,252,0.85),_transparent_40%)]" />
            <div className="absolute left-1/2 top-1/3 h-[320px] w-[320px] -translate-x-1/2 rounded-full bg-slate-100/70 blur-3xl" />

                  <div className="relative z-10 flex flex-col items-center justify-center gap-10 text-center">
              <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-slate-900 shadow-xl">
                <svg viewBox="0 0 64 64" className="h-12 w-12 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 26h40" />
                  <path d="M12 34h40" />
                  <path d="M20 18a8 8 0 0 1 8-8h8a8 8 0 0 1 8 8v4H20v-4Z" />
                  <path d="M20 40h24a8 8 0 0 1 8 8v2H12v-2a8 8 0 0 1 8-8Z" />
                </svg>
              </div>
              <div>
                <h1 className="text-5xl font-extrabold tracking-tight text-slate-900">Snack Attack</h1>
                <p className="mt-4 text-sm uppercase tracking-[0.28em] text-slate-500">READY FOR NEXT CUSTOMER</p>
              </div>
              <button
                onClick={() => setShowOrderTypeSelection(true)}
                className="inline-flex items-center justify-center gap-3 rounded-full bg-white px-9 py-4 text-lg font-semibold text-slate-900 shadow-xl shadow-slate-900/10 transition hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-slate-900/10"
              >
                Tap to Start Order
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </main>

        <footer className="py-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">✓ DATABASE SYNCED • LOCAL HUB ACTIVE</p>
        </footer>
      </div>

      {showOrderTypeSelection && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/70 px-6 py-10">
          <div className="w-full max-w-5xl rounded-[36px] bg-white p-10 shadow-2xl border border-slate-200">
            <h2 className="text-4xl font-extrabold text-slate-900 text-center">Select Order Type</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              <button
                onClick={() => router.push('/pos?orderType=dine-in')}
                className="group flex h-64 flex-col items-center justify-center rounded-[32px] border border-slate-200 bg-slate-50 p-8 text-center transition duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-xl focus:outline-none"
              >
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-900 text-white shadow-lg">
                  <Utensils className="h-10 w-10" />
                </div>
                <span className="text-2xl font-bold text-slate-900">Dine In</span>
              </button>

              <button
                onClick={() => router.push('/pos?orderType=take-out')}
                className="group flex h-64 flex-col items-center justify-center rounded-[32px] border border-slate-200 bg-slate-50 p-8 text-center transition duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-xl focus:outline-none"
              >
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-900 text-white shadow-lg">
                  <ShoppingBag className="h-10 w-10" />
                </div>
                <span className="text-2xl font-bold text-slate-900">Take Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
