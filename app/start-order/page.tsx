'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Clock3, History, LogOut, ReceiptText, ShoppingBag, Utensils } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

const formatTime = (date: Date) => date.toLocaleTimeString([], {
  hour: 'numeric',
  minute: '2-digit',
});

export default function StartOrderPage() {
  const router = useRouter();
  const [time, setTime] = useState(formatTime(new Date()));
  const [cashierName, setCashierName] = useState('Staff');
  const [showOrderTypeSelection, setShowOrderTypeSelection] = useState(false);
  const [isExpensesModalOpen, setIsExpensesModalOpen] = useState(false);
  const [expenseMode, setExpenseMode] = useState<'employee' | 'shop'>('employee');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseNote, setExpenseNote] = useState('');
  const [staffList, setStaffList] = useState<string[]>([]);
  const [expensedBy, setExpensedBy] = useState('');
  const [expenseError, setExpenseError] = useState('');
  const [expenseSuccess, setExpenseSuccess] = useState('');

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTime(formatTime(new Date()));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const active = localStorage.getItem('activeCashier');
    if (active) {
      setCashierName(active);
    }
  }, []);

  useEffect(() => {
    const loadStaff = async () => {
      if (!supabase) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('payroll')
        .select('employee_name')
        .eq('shift_date', todayDate)
        .order('employee_name');

      if (error) {
        console.error('Staff list fetch error:', error);
        return;
      }

      const names = Array.from(
        new Set((data ?? []).map((row: any) => row.employee_name as string))
      ).sort();

      setStaffList(names);
      setExpensedBy((currentValue) =>
        currentValue && names.includes(currentValue) ? currentValue : names[0] ?? ''
      );
    };

    loadStaff();
  }, []);

  const resetExpenseForm = () => {
    setExpenseAmount('');
    setExpenseNote('');
    setExpensedBy(staffList[0] ?? '');
  };

  const closeExpensesModal = () => {
    resetExpenseForm();
    setIsExpensesModalOpen(false);
  };

  const handleExpenseSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setExpenseError('');
    setExpenseSuccess('');

    if (!supabase) {
      setExpenseError('Supabase client is not configured.');
      return;
    }

    const amount = parseFloat(expenseAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      setExpenseError('Please enter a valid expense amount.');
      return;
    }

    if (expenseMode === 'employee' && !expensedBy) {
      setExpenseError('Please select a staff member.');
      return;
    }

    const payload = {
      item_name: expenseNote,
      amount: Number(amount),
      expensed_by: expenseMode === 'shop' ? 'shop' : expensedBy,
    };

    const { error } = await supabase.from('expenses').insert([payload]);
    if (error) {
      console.error('Expense insert error:', error);
      setExpenseError(error.message);
      return;
    }

    setExpenseSuccess('Expense logged successfully.');
    resetExpenseForm();
    closeExpensesModal();
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-slate-50 text-slate-900 font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_35%)] pointer-events-none" />
      <div className="absolute right-0 top-1/4 h-[420px] w-[420px] translate-x-1/4 rounded-full bg-slate-200/70 blur-3xl opacity-80 pointer-events-none" />

      <div className="relative z-10 flex h-full flex-col">
        <header className="flex flex-wrap items-start justify-between gap-4 px-6 py-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-3 rounded-3xl bg-white/90 px-4 py-3 shadow-sm border border-slate-200">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_8px_rgba(16,185,129,0.12)]" />
              <span className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-600">TERMINAL 01 • ONLINE</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setExpenseMode('employee');
                  setIsExpensesModalOpen(true);
                }}
                className="flex h-12 w-32 items-center justify-center rounded-2xl border border-slate-200 bg-white/90 text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-100"
              >
                Employee Expenses
              </button>
              <button
                type="button"
                onClick={() => {
                  setExpenseMode('shop');
                  setIsExpensesModalOpen(true);
                }}
                className="flex h-12 w-32 items-center justify-center rounded-2xl border border-slate-200 bg-white/90 text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-100"
              >
                Shop Expenses
              </button>
              <Link
                href="/time-in"
                className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white/90 text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-100"
                aria-label="Clock in"
              >
                <Clock3 className="h-5 w-5" />
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-3xl border border-slate-200 bg-white/90 p-2 shadow-sm">
              <Link
                href="/history"
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100"
                aria-label="Go to order history"
              >
                <History className="h-5 w-5" />
              </Link>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100"
                aria-label="Exit to home"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
            <div className="inline-flex items-center gap-4 rounded-3xl bg-white/90 px-4 py-3 shadow-sm border border-slate-200">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">{time}</p>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{cashierName}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">JL</div>
            </div>
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

      {isExpensesModalOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 px-6 py-10">
          <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-8 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {expenseMode === 'shop' ? 'Shop Expense' : 'Employee Expenses'}
                </h2>
                <p className="mt-1 text-sm text-slate-500">Log a quick expense for the active shift.</p>
              </div>
              <button
                type="button"
                onClick={closeExpensesModal}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close employee expenses"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleExpenseSubmit} className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                <span className="mb-2 block">Amount</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={expenseAmount}
                  onChange={(event) => setExpenseAmount(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  placeholder="0.00"
                  required
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                <span className="mb-2 block">Note/Description</span>
                <textarea
                  value={expenseNote}
                  onChange={(event) => setExpenseNote(event.target.value)}
                  className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  placeholder="Describe the expense"
                  required
                />
              </label>

              {expenseMode === 'employee' ? (
                <label className="block text-sm font-medium text-slate-700">
                  <span className="mb-2 block">Expensed By</span>
                  <select
                    value={expensedBy}
                    onChange={(event) => setExpensedBy(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  >
                    {staffList.length === 0 ? (
                      <option value="" disabled>
                        No staff available
                      </option>
                    ) : (
                      staffList.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))
                    )}
                  </select>
                </label>
              ) : null}

              {expenseError && (
                <p className="text-sm text-rose-600">{expenseError}</p>
              )}
              {expenseSuccess && (
                <p className="text-sm text-emerald-600">{expenseSuccess}</p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeExpensesModal}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
