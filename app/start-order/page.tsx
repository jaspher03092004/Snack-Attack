'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    ArrowRight,
    Clock3,
    History,
    LogOut,
    ReceiptText,
    ShoppingBag,
    Utensils,
    LayoutDashboard,
    Coffee,
    DollarSign,
    TrendingUp,
    Users,
    X,
    CheckCircle,
    AlertCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

const formatTime = (date: Date) =>
    date.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
    });

export default function StartOrderPage() {
    const router = useRouter();
    const [time, setTime] = useState('');
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
    const [todaysStats, setTodaysStats] = useState({
        orders: 0,
        revenue: 0,
        itemsSold: 0,
        peakHour: 'Calculating...',
    });

    // Time updater
    useEffect(() => {
        setTime(formatTime(new Date())); // Instantly set time on client mount
        const timer = window.setInterval(() => {
            setTime(formatTime(new Date()));
        }, 1000);
        return () => window.clearInterval(timer);
    }, []);

    // Load cashier name from localStorage
    useEffect(() => {
        const active = localStorage.getItem('activeCashier');
        if (active) {
            setCashierName(active);
        }
    }, []);

    // Load staff list for expenses
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

    // Live stats for today's summary and peak hour
    useEffect(() => {
        const fetchTodayStats = async () => {
            if (!supabase) {
                setTodaysStats({
                    orders: 0,
                    revenue: 0,
                    itemsSold: 0,
                    peakHour: 'No data yet',
                });
                return;
            }

            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);

            const { data: ordersData, error: ordersError } = await supabase
                .from('orders')
                .select('id, total_amount, status, created_at, order_items(quantity)')
                .gte('created_at', startOfDay.toISOString())
                .lte('created_at', endOfDay.toISOString())
                .order('created_at', { ascending: false });

            if (ordersError) {
                console.error('Today stats fetch error:', ordersError);
                setTodaysStats({
                    orders: 0,
                    revenue: 0,
                    itemsSold: 0,
                    peakHour: 'No data yet',
                });
                return;
            }

            // Mirror dashboard behavior: include completed orders and legacy rows with empty status.
            const completedOrders = (ordersData ?? []).filter((order: any) => {
                const normalizedStatus = String(order.status ?? '').toLowerCase();
                return normalizedStatus === 'completed' || !normalizedStatus;
            });

            const orders = completedOrders.length;
            const revenue = completedOrders.reduce(
                (sum: number, order: any) => sum + (Number(order.total_amount) || 0),
                0,
            );

            const itemsSold = completedOrders.reduce((sum: number, order: any) => {
                const items = (order.order_items ?? []) as Array<{ quantity?: number | string }>;
                return (
                    sum +
                    items.reduce((itemSum, item) => itemSum + (Number(item.quantity) || 0), 0)
                );
            }, 0);

            const hourTally: Record<number, number> = {};
            completedOrders.forEach((order: any) => {
                if (!order.created_at) return;
                const hour = new Date(order.created_at).getHours();
                hourTally[hour] = (hourTally[hour] || 0) + 1;
            });

            const peakHourEntry = Object.entries(hourTally).sort((a, b) => b[1] - a[1])[0];

            let peakHour = 'No data yet';
            if (peakHourEntry) {
                const hour = Number(peakHourEntry[0]);
                const formatHour = (value: number) => {
                    const suffix = value >= 12 ? 'PM' : 'AM';
                    const normalized = value % 12 || 12;
                    return `${normalized}:00 ${suffix}`;
                };
                peakHour = `${formatHour(hour)} – ${formatHour((hour + 1) % 24)}`;
            }

            setTodaysStats({ orders, revenue, itemsSold, peakHour });
        };

        void fetchTodayStats();
    }, []);

    const resetExpenseForm = () => {
        setExpenseAmount('');
        setExpenseNote('');
        setExpensedBy(staffList[0] ?? '');
        setExpenseError('');
        setExpenseSuccess('');
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
        setTimeout(() => {
            resetExpenseForm();
            closeExpensesModal();
        }, 1000);
    };

    return (
        <div className="relative h-screen w-full overflow-hidden bg-slate-50 font-sans text-slate-900">
            {/* Decorative background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.08),_transparent_35%)] pointer-events-none" />
            <div className="absolute left-0 bottom-0 h-[500px] w-[500px] -translate-x-1/4 translate-y-1/4 rounded-full bg-slate-200/50 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex h-full flex-col">
                {/* Header */}
                <header className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 bg-white/80 backdrop-blur-sm border-b border-slate-200/70 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 rounded-2xl bg-slate-900 px-4 py-2.5 shadow-lg">
                            <div className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_6px_rgba(16,185,129,0.2)]" />
                            <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">
                                TERMINAL 01 • ONLINE
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setExpenseMode('employee');
                                    setIsExpensesModalOpen(true);
                                }}
                                className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md"
                            >
                                <Users className="h-4 w-4" />
                                Staff Expense
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setExpenseMode('shop');
                                    setIsExpensesModalOpen(true);
                                }}
                                className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md"
                            >
                                <DollarSign className="h-4 w-4" />
                                Shop Expense
                            </button>
                            <Link
                                href="/time-in"
                                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md"
                            >
                                <Clock3 className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
                            <Link
                                href="/history"
                                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                            >
                                <History className="h-4 w-4" />
                            </Link>
                            <button
                                type="button"
                                onClick={() => router.push('/')}
                                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                            >
                                <LogOut className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-1.5 shadow-sm">
                            <div className="text-right">
                                <p className="text-sm font-bold text-slate-800">{time || ' '}</p>
                                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                                    {cashierName}
                                </p>
                            </div>
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white shadow-md">
                                {cashierName.charAt(0).toUpperCase()}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex flex-1 items-center justify-center px-6 py-8">
                    <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-5">
                        {/* Left panel: stats and info */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-xl backdrop-blur-sm">
                                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                                    Today's Summary
                                </h2>
                                <div className="mt-4 space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                        <span className="text-sm font-medium text-slate-600">Orders</span>
                                        <span className="text-xl font-bold text-slate-900">{todaysStats.orders}</span>
                                    </div>
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                        <span className="text-sm font-medium text-slate-600">Revenue</span>
                                        <span className="text-xl font-bold text-emerald-600">
                                            ₱{todaysStats.revenue.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-slate-600">Items Sold</span>
                                        <span className="text-xl font-bold text-slate-900">{todaysStats.itemsSold}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white/90 p-6 shadow-xl backdrop-blur-sm">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-2xl bg-emerald-100 p-2.5 text-emerald-700">
                                        <TrendingUp className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">Peak Hour</p>
                                        <p className="text-xs text-slate-400">{todaysStats.peakHour}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right panel: main action */}
                        <div className="lg:col-span-3 flex items-center justify-center">
                            <div className="relative w-full max-w-lg overflow-hidden rounded-[40px] border border-slate-200/70 bg-white/90 p-10 shadow-2xl backdrop-blur-xl">
                                <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(248,250,252,0.7),_transparent_40%)]" />
                                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-slate-100/50 blur-3xl" />

                                <div className="relative z-10 flex flex-col items-center gap-8 text-center">
                                    <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-slate-900 shadow-xl shadow-slate-900/20">
                                        <Coffee className="h-12 w-12 text-white" strokeWidth={2} />
                                    </div>
                                    <div>
                                        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
                                            Snack Attack
                                        </h1>
                                        <p className="mt-3 text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
                                            Ready for next customer
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => setShowOrderTypeSelection(true)}
                                        className="group inline-flex items-center justify-center gap-3 rounded-full bg-slate-900 px-10 py-5 text-lg font-semibold text-white shadow-xl shadow-slate-900/20 transition-all hover:-translate-y-1 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-slate-900/10"
                                    >
                                        Tap to Start Order
                                        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="py-5 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                        ✓ Database Synced • Local Hub Active
                    </p>
                </footer>
            </div>

            {/* Expenses Modal */}
            {isExpensesModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">
                                    {expenseMode === 'shop' ? 'Shop Expense' : 'Staff Expense'}
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Log a quick expense for the active shift.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeExpensesModal}
                                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleExpenseSubmit} className="mt-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">
                                    Amount (₱)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={expenseAmount}
                                    onChange={(e) => setExpenseAmount(e.target.value)}
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
                                    placeholder="0.00"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700">
                                    Description
                                </label>
                                <textarea
                                    value={expenseNote}
                                    onChange={(e) => setExpenseNote(e.target.value)}
                                    className="mt-1.5 min-h-[80px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
                                    placeholder="What was this expense for?"
                                    required
                                />
                            </div>

                            {expenseMode === 'employee' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">
                                        Staff Member
                                    </label>
                                    <select
                                        value={expensedBy}
                                        onChange={(e) => setExpensedBy(e.target.value)}
                                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
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
                                </div>
                            )}

                            {expenseError && (
                                <div className="flex items-center gap-2 text-sm text-rose-600">
                                    <AlertCircle className="h-4 w-4" />
                                    {expenseError}
                                </div>
                            )}
                            {expenseSuccess && (
                                <div className="flex items-center gap-2 text-sm text-emerald-600">
                                    <CheckCircle className="h-4 w-4" />
                                    {expenseSuccess}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeExpensesModal}
                                    className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 focus:ring-4 focus:ring-slate-200"
                                >
                                    Log Expense
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Order Type Selection Modal */}
            {showOrderTypeSelection && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-4xl rounded-3xl bg-white p-10 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-3xl font-extrabold text-slate-900">Select Order Type</h2>
                            <button
                                onClick={() => setShowOrderTypeSelection(false)}
                                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="grid gap-6 md:grid-cols-2">
                            <button
                                onClick={() => router.push('/pos?orderType=dine-in')}
                                className="group flex h-64 flex-col items-center justify-center rounded-3xl border-2 border-slate-200 bg-slate-50 p-8 text-center transition hover:-translate-y-1 hover:border-slate-300 hover:bg-white hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-slate-200"
                            >
                                <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-900 text-white shadow-lg transition group-hover:scale-105">
                                    <Utensils className="h-12 w-12" />
                                </div>
                                <span className="text-2xl font-bold text-slate-900">Dine In</span>
                                <p className="mt-2 text-sm text-slate-400">Customer eats on-site</p>
                            </button>

                            <button
                                onClick={() => router.push('/pos?orderType=take-out')}
                                className="group flex h-64 flex-col items-center justify-center rounded-3xl border-2 border-slate-200 bg-slate-50 p-8 text-center transition hover:-translate-y-1 hover:border-slate-300 hover:bg-white hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-slate-200"
                            >
                                <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-900 text-white shadow-lg transition group-hover:scale-105">
                                    <ShoppingBag className="h-12 w-12" />
                                </div>
                                <span className="text-2xl font-bold text-slate-900">Take Out</span>
                                <p className="mt-2 text-sm text-slate-400">Order to go</p>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes zoom-in-95 {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-in {
                    animation-duration: 200ms;
                    animation-fill-mode: both;
                }
                .fade-in {
                    animation-name: fade-in;
                }
                .zoom-in-95 {
                    animation-name: zoom-in-95;
                }
            `}</style>
        </div>
    );
}