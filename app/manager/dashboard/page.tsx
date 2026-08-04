'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
    LayoutGrid,
    ReceiptText,
    Box,
    Users,
    ArrowUp,
    ArrowLeft,
    LogOut,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Calendar,
    Clock,
    RefreshCw,
    MoreVertical,
    Eye,
    Printer,
    Download,
    BarChart3,
    PieChart,
    Wallet,
    Briefcase,
    Coffee,
    ChevronRight,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, LineChart, Line } from 'recharts';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

type OrderRecord = {
    id: string;
    order_number: string;
    status?: string;
    total_amount: number;
    created_at: string;
};

type ExpenseRecord = {
    id: string;
    item_name: string;
    amount: number;
    expense_date: string;
    expensed_by: string;
};

type NetIncomeRecord = {
    id: string;
    date: string;
    net_cash: number;
    total_expenses: number;
    total_salaries: number;
};

export default function ManagerDashboard() {
    const router = useRouter();
    const [activeNav, setActiveNav] = useState('dashboard');
    const [orders, setOrders] = useState<OrderRecord[]>([]);
    const [expensesToday, setExpensesToday] = useState<ExpenseRecord[]>([]);
    const [netStats, setNetStats] = useState({
        netToday: 0,
        netYesterday: 0,
        netWeek: 0,
        netMonth: 0,
        expensesToday: 0,
        salariesToday: 0,
    });
    const [netChartData, setNetChartData] = useState<Array<{ name: string; net: number }>>([]);
    const [isLoading, setIsLoading] = useState(true);

    const getTodayDateString = () => {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    };

    const getDateKey = (date: Date) =>
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    useEffect(() => {
        const fetchOrdersAndExpenses = async () => {
            if (!supabase) {
                console.error('Supabase client is not configured.');
                setIsLoading(false);
                return;
            }

            const todayDate = getTodayDateString();
            const [ordersResult, expensesResult, netIncomeResult] = await Promise.all([
                supabase
                    .from('orders')
                    .select('id, order_number, status, total_amount, created_at')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('expenses')
                    .select('id, item_name, amount, expense_date, expensed_by')
                    .eq('expense_date', todayDate)
                    .order('id', { ascending: false }),
                supabase
                    .from('net_income')
                    .select('id, date, net_cash, total_expenses, total_salaries')
                    .order('date', { ascending: true }),
            ]);

            if (ordersResult.error) {
                console.error('Orders fetch error:', ordersResult.error);
            } else {
                const parsedOrders = (ordersResult.data ?? []).map((order: any) => ({
                    id: order.id,
                    order_number: order.order_number,
                    status: order.status,
                    total_amount: Number(order.total_amount) || 0,
                    created_at: order.created_at,
                })) as OrderRecord[];
                setOrders(parsedOrders);
            }

            if (expensesResult.error) {
                console.error('Expenses fetch error:', expensesResult.error);
            } else {
                const parsedExpenses = (expensesResult.data ?? []).map((expense: any) => ({
                    id: expense.id,
                    item_name: expense.item_name,
                    amount: Number(expense.amount) || 0,
                    expense_date: expense.expense_date,
                    expensed_by: expense.expensed_by,
                })) as ExpenseRecord[];
                setExpensesToday(parsedExpenses);
            }

            if (netIncomeResult.error) {
                console.error('Net income fetch error:', netIncomeResult.error);
            } else {
                const parsedNetIncome = (netIncomeResult.data ?? []).map((row: any) => ({
                    id: row.id,
                    date: row.date,
                    net_cash: Number(row.net_cash) || 0,
                    total_expenses: Number(row.total_expenses) || 0,
                    total_salaries: Number(row.total_salaries) || 0,
                })) as NetIncomeRecord[];

                const today = new Date();
                const todayKey = getDateKey(today);
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayKey = getDateKey(yesterday);
                const startOfLast7 = new Date(today);
                startOfLast7.setDate(startOfLast7.getDate() - 6);
                const startOfLast7Key = getDateKey(startOfLast7);
                const currentMonthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

                const isToday = (dateKey: string) => dateKey === todayKey;
                const isYesterday = (dateKey: string) => dateKey === yesterdayKey;
                const isWithinLast7Days = (dateKey: string) => dateKey >= startOfLast7Key && dateKey <= todayKey;
                const isThisMonth = (dateKey: string) => dateKey.startsWith(currentMonthPrefix);

                const netToday = parsedNetIncome
                    .filter((row) => isToday(row.date))
                    .reduce((sum, row) => sum + row.net_cash, 0);
                const netYesterday = parsedNetIncome
                    .filter((row) => isYesterday(row.date))
                    .reduce((sum, row) => sum + row.net_cash, 0);
                const netWeek = parsedNetIncome
                    .filter((row) => isWithinLast7Days(row.date))
                    .reduce((sum, row) => sum + row.net_cash, 0);
                const netMonth = parsedNetIncome
                    .filter((row) => isThisMonth(row.date))
                    .reduce((sum, row) => sum + row.net_cash, 0);

                const todaysNetRows = parsedNetIncome.filter((row) => isToday(row.date));
                const expensesTodayTotal = todaysNetRows.reduce((sum, row) => sum + row.total_expenses, 0);
                const salariesTodayTotal = todaysNetRows.reduce((sum, row) => sum + row.total_salaries, 0);

                setNetStats({
                    netToday,
                    netYesterday,
                    netWeek,
                    netMonth,
                    expensesToday: expensesTodayTotal,
                    salariesToday: salariesTodayTotal,
                });

                const last7DateLabels = Array.from({ length: 7 }, (_, index) => {
                    const date = new Date(today);
                    date.setDate(today.getDate() - (6 - index));
                    return {
                        key: getDateKey(date),
                        name: date.toLocaleDateString('en-US', { weekday: 'short' }),
                    };
                });

                const netByDate = parsedNetIncome.reduce<Record<string, number>>((acc, row) => {
                    acc[row.date] = (acc[row.date] || 0) + row.net_cash;
                    return acc;
                }, {});

                const chartData = last7DateLabels.map((day) => ({
                    name: day.name,
                    net: netByDate[day.key] || 0,
                }));

                setNetChartData(chartData);
            }
            setIsLoading(false);
        };

        void fetchOrdersAndExpenses();
    }, []);

    const orderMetrics = useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfTomorrow = new Date(startOfToday);
        startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

        const startOfYesterday = new Date(startOfToday);
        startOfYesterday.setDate(startOfYesterday.getDate() - 1);

        const startOfWeek = new Date(startOfToday);
        const dayOfWeek = startOfWeek.getDay();
        const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startOfWeek.setDate(startOfWeek.getDate() - daysSinceMonday);

        const ordersWithDate = orders.map((order) => ({
            ...order,
            localDate: new Date(order.created_at),
        }));

        const completedOrders = ordersWithDate.filter((order) => order.status === 'Completed');
        const allOrders = completedOrders;
        const ordersToday = allOrders.filter(
            (order) => order.localDate >= startOfToday && order.localDate < startOfTomorrow,
        );
        const ordersYesterday = allOrders.filter(
            (order) => order.localDate >= startOfYesterday && order.localDate < startOfToday,
        );
        const ordersThisWeek = allOrders.filter(
            (order) => order.localDate >= startOfWeek && order.localDate < startOfTomorrow,
        );

        const ordersTodaySorted = [...ordersToday].sort(
            (a, b) => b.localDate.getTime() - a.localDate.getTime(),
        );

        const sumTotal = (items: Array<OrderRecord & { localDate: Date }>) =>
            items.reduce((total, item) => total + (Number(item.total_amount) || 0), 0);

        return {
            ordersToday: ordersTodaySorted,
            ordersYesterday,
            ordersThisWeek,
            allOrders,
            salesToday: sumTotal(ordersToday),
            salesYesterday: sumTotal(ordersYesterday),
            salesThisWeek: sumTotal(ordersThisWeek),
            salesOverall: sumTotal(allOrders),
            totalOrdersToday: ordersTodaySorted.length,
        };
    }, [orders]);

    const expensesTotal = useMemo(
        () => expensesToday.reduce((sum, expense) => sum + expense.amount, 0),
        [expensesToday],
    );

    const salesTrendData = useMemo(() => {
        const today = new Date();
        const dateLabels = Array.from({ length: 7 }, (_, index) => {
            const date = new Date(today);
            date.setDate(today.getDate() - (6 - index));
            return {
                day: date.toLocaleDateString('en-US', { weekday: 'short' }),
                dateKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
            };
        });

        return dateLabels.map((day) => ({
            ...day,
            sales: orderMetrics.allOrders
                .filter((order) => {
                    const localDate = order.localDate;
                    const key = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
                    return key === day.dateKey;
                })
                .reduce((sum, order) => sum + order.total_amount, 0),
        }));
    }, [orderMetrics.allOrders]);

    const formatCurrency = (value: number) =>
        `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, path: '/manager/dashboard' },
        { id: 'transactions', label: 'Transactions', icon: ReceiptText, path: '/manager/transactions' },
        { id: 'inventory', label: 'Inventory', icon: Box, path: '/manager/inventory' },
        { id: 'staff', label: 'Staff', icon: Users, path: '/manager/staff' },
    ];

    // Helper to format date
    const todayDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">

            {/* Sidebar */}
            <aside className="w-[240px] bg-white border-r border-slate-200 flex flex-col flex-shrink-0 h-full sticky top-0 z-20">
                <div className="p-6 flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                        <div className="w-3 h-3 border-2 border-white rounded-sm" />
                    </div>
                    <span className="font-bold text-lg tracking-tight text-slate-900">QuickServe</span>
                </div>

                <nav className="flex flex-col gap-1 px-4 flex-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeNav === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setActiveNav(item.id);
                                    if (item.path) router.push(item.path);
                                }}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all focus:outline-none group ${
                                    isActive
                                        ? 'bg-slate-100 text-slate-900 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                            >
                                <Icon className={`w-5 h-5 transition-all ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px] group-hover:stroke-[2.5px]'}`} />
                                {item.label}
                                {isActive && (
                                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-slate-900" />
                                )}
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-100 space-y-3">
                    <button
                        onClick={() => router.push('/')}
                        className="flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 text-sm font-medium transition-colors focus:outline-none"
                    >
                        <LogOut className="w-4 h-4" />
                        Log Out
                    </button>

                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 text-white shadow-lg">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                                System Status
                            </span>
                            <span className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Online
                            </span>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-slate-300">Pi 5 CPU</span>
                            <span className="text-xs font-bold text-emerald-400">42°C</span>
                        </div>
                        <div className="w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: '42%' }} />
                        </div>
                        <div className="flex items-center justify-between mt-2.5">
                            <span className="text-[10px] text-slate-400">Memory</span>
                            <span className="text-[10px] text-slate-300">3.2 / 8.0 GB</span>
                        </div>
                        <div className="w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden mt-1">
                            <div className="bg-blue-400 h-full rounded-full transition-all duration-1000" style={{ width: '40%' }} />
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
                            <span className="bg-slate-900 text-white p-1.5 rounded-xl">
                                <LayoutGrid className="w-5 h-5" />
                            </span>
                            Dashboard
                        </h1>
                        <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {todayDate}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => window.location.reload()}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium transition-all shadow-sm"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium transition-all shadow-sm">
                            <Download className="w-4 h-4" />
                            Export
                        </button>
                        <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition-all shadow-lg shadow-slate-900/10">
                            <Printer className="w-4 h-4" />
                            Print Report
                        </button>
                    </div>
                </div>

                {/* KPI Cards */}
                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 animate-pulse">
                                <div className="h-4 bg-slate-200 rounded w-1/2 mb-3" />
                                <div className="h-8 bg-slate-200 rounded w-3/4 mb-2" />
                                <div className="h-4 bg-slate-200 rounded w-1/3" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Today's Revenue</p>
                                    <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(orderMetrics.salesToday)}</p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                                    <TrendingUp className="w-5 h-5" />
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-3">{orderMetrics.totalOrdersToday} orders</p>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Yesterday's Revenue</p>
                                    <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(orderMetrics.salesYesterday)}</p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                                    <Calendar className="w-5 h-5" />
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-3">{orderMetrics.ordersYesterday.length} orders</p>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">This Week</p>
                                    <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(orderMetrics.salesThisWeek)}</p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                                    <BarChart3 className="w-5 h-5" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Total Revenue</p>
                                    <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(orderMetrics.salesOverall)}</p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                                    <DollarSign className="w-5 h-5" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Net Cash Today</p>
                                    <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(netStats.netToday)}</p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                                    <Wallet className="w-5 h-5" />
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-3">Expenses: {formatCurrency(netStats.expensesToday)}</p>
                        </div>
                    </div>
                )}

                {/* Sales Target Progress */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <div>
                            <h2 className="text-sm font-semibold text-slate-900">Today's Sales Target</h2>
                            <p className="text-xs text-slate-500">Progress toward Gold Rush goal</p>
                        </div>
                        <div className="text-sm font-medium text-slate-700">
                            {formatCurrency(orderMetrics.salesToday)} <span className="text-slate-400">/ ₱15,000</span>
                        </div>
                    </div>
                    <div className="relative">
                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-700"
                                style={{ width: `${Math.min((orderMetrics.salesToday / 15000) * 100, 100)}%` }}
                            />
                        </div>
                        <div className="flex justify-between mt-2 text-[10px] font-medium text-slate-400">
                            <span>₱5k</span>
                            <span>₱10k</span>
                            <span>₱12k</span>
                            <span>₱15k</span>
                        </div>
                        <div className="flex justify-between mt-1 text-[10px] font-medium text-slate-400">
                            <span>Break Even</span>
                            <span>Goal</span>
                            <span>Happy</span>
                            <span>Gold Rush</span>
                        </div>
                    </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Daily Sales Chart */}
                    <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-sm font-semibold text-slate-900">Daily Sales</h2>
                                <p className="text-xs text-slate-400">Last 7 days</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-teal-600" />
                                <span className="text-xs font-medium text-slate-600">Revenue</span>
                            </div>
                        </div>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={salesTrendData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                                    <XAxis dataKey="day" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis
                                        tickFormatter={(value) => `₱${value >= 1000 ? `${value / 1000}k` : value}`}
                                        tick={{ fill: '#94A3B8', fontSize: 11 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        formatter={(value) => formatCurrency(Number(value) || 0)}
                                        contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', background: 'white' }}
                                    />
                                    <Bar dataKey="sales" fill="#0F766E" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Live Feed & Expenses */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold text-slate-900">Live Feed</h2>
                            <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Live
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 max-h-48 pr-1">
                            {orderMetrics.ordersToday.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 text-sm">
                                    <Coffee className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                    No orders yet today
                                </div>
                            ) : (
                                orderMetrics.ordersToday.slice(0, 6).map((order) => (
                                    <div key={order.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                                        <div>
                                            <p className="text-sm font-medium text-slate-800">{order.order_number}</p>
                                            <p className="text-[10px] text-slate-400">
                                                {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <span className="text-sm font-bold text-slate-900">{formatCurrency(order.total_amount)}</span>
                                    </div>
                                ))
                            )}
                            {orderMetrics.ordersToday.length > 6 && (
                                <button className="text-xs text-slate-400 hover:text-slate-600 font-medium w-full text-center py-1">
                                    View all {orderMetrics.ordersToday.length} orders
                                </button>
                            )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Today's Expenses</p>
                                <span className="text-sm font-bold text-rose-600">{formatCurrency(expensesTotal)}</span>
                            </div>
                            <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                                {expensesToday.length === 0 ? (
                                    <p className="text-xs text-slate-400">No expenses logged.</p>
                                ) : (
                                    expensesToday.slice(0, 4).map((expense) => (
                                        <div key={expense.id} className="flex items-center justify-between text-xs">
                                            <span className="text-slate-600 truncate">{expense.item_name || expense.expensed_by}</span>
                                            <span className="font-medium text-slate-800">{formatCurrency(expense.amount)}</span>
                                        </div>
                                    ))
                                )}
                                {expensesToday.length > 4 && (
                                    <button className="text-[10px] text-slate-400 hover:text-slate-600 font-medium w-full text-center">
                                        +{expensesToday.length - 4} more
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Net Cash Chart */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-sm font-semibold text-slate-900">Daily Net Cash</h2>
                            <p className="text-xs text-slate-400">Last 7 days</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-emerald-500" />
                            <span className="text-xs font-medium text-slate-600">Net Cash</span>
                        </div>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={netChartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis
                                    tickFormatter={(value) => `₱${value >= 1000 ? `${value / 1000}k` : value}`}
                                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    formatter={(value) => formatCurrency(Number(value) || 0)}
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', background: 'white' }}
                                />
                                <Bar dataKey="net" fill="#10B981" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Additional Metrics: Net Income Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Net Yesterday</p>
                        <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(netStats.netYesterday)}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Net This Week</p>
                        <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(netStats.netWeek)}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Net This Month</p>
                        <p className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(netStats.netMonth)}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Today's Salaries</p>
                        <p className="text-xl font-bold text-indigo-600 mt-1">{formatCurrency(netStats.salariesToday)}</p>
                    </div>
                </div>

            </main>
        </div>
    );
}