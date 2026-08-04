'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    Box,
    ChevronDown,
    LayoutGrid,
    LogOut,
    ReceiptText,
    Search,
    Users,
    X,
    Calendar,
    Clock,
    DollarSign,
    TrendingUp,
    AlertCircle,
    Printer,
    FileText,
    Filter,
    MoreHorizontal,
    Eye,
    CheckCircle,
    XCircle,
    AlertTriangle,
    ArrowUpRight,
    ArrowDownRight,
    Zap,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

type TransactionStatus = 'Completed' | 'Voided' | 'Refunded';

type TransactionRecord = {
    id: string;
    createdAt: string | null;
    time: string;
    orderId: string;
    cashier: string;
    status: TransactionStatus;
    items: Array<{
        name: string;
        quantity: number;
        price: number;
    }>;
    subtotal: number;
    tax: number;
    totalAmount: number;
    transactionId: string;
    receiptNumber: string;
    managerApproval?: string;
    voidOrRefundReason?: string;
};

type OrderRow = {
    id: string;
    order_number: string | null;
    created_at: string | null;
    cashier_name: string | null;
    total_amount: number | null;
    status?: string | null;
};

const formatCurrency = (amount: number) =>
    `₱${amount.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

const getStatusBadge = (status: TransactionStatus) => {
    const configs = {
        Completed: {
            bg: 'bg-emerald-50',
            text: 'text-emerald-700',
            border: 'border-emerald-200',
            dot: 'bg-emerald-500',
            icon: CheckCircle,
            label: 'Completed',
        },
        Voided: {
            bg: 'bg-rose-50',
            text: 'text-rose-700',
            border: 'border-rose-200',
            dot: 'bg-rose-500',
            icon: XCircle,
            label: 'Voided',
        },
        Refunded: {
            bg: 'bg-amber-50',
            text: 'text-amber-700',
            border: 'border-amber-200',
            dot: 'bg-amber-500',
            icon: AlertTriangle,
            label: 'Refunded',
        },
    };
    return configs[status];
};

const getLocalDateBoundaries = () => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
        startOfToday,
        startOfTomorrow,
        startOfYesterday,
        startOfMonth,
    };
};

const matchesSearchAndCashier = (
    transaction: TransactionRecord,
    searchQuery: string,
    cashierFilter: string,
) => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const matchesSearch =
        normalizedSearch.length === 0 ||
        transaction.orderId.toLowerCase().includes(normalizedSearch) ||
        transaction.receiptNumber.toLowerCase().includes(normalizedSearch);

    const matchesCashier = cashierFilter === 'all' || transaction.cashier === cashierFilter;

    return matchesSearch && matchesCashier;
};

type TransactionTableProps = {
    title: string;
    subtitle: string;
    transactions: TransactionRecord[];
    onSelectTransaction: (transaction: TransactionRecord) => void;
    isLoading?: boolean;
};

const TransactionTable = ({ title, subtitle, transactions, onSelectTransaction, isLoading }: TransactionTableProps) => (
    <section className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md">
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
                        {title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
                </div>
                <span className="text-xs font-semibold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                    {transactions.length}
                </span>
            </div>
        </div>
        <div className="overflow-x-auto flex-1">
            {isLoading ? (
                <div className="p-6 space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="animate-pulse flex items-center gap-4">
                            <div className="h-4 w-16 bg-slate-200 rounded" />
                            <div className="h-4 w-24 bg-slate-200 rounded" />
                            <div className="h-4 w-20 bg-slate-200 rounded" />
                            <div className="h-6 w-16 bg-slate-200 rounded-full" />
                            <div className="h-4 w-20 bg-slate-200 rounded ml-auto" />
                        </div>
                    ))}
                </div>
            ) : transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                        <FileText className="h-8 w-8" strokeWidth={1.5} />
                    </div>
                    <p className="text-sm font-medium text-slate-500">No transactions</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your filters</p>
                </div>
            ) : (
                <table className="min-w-full">
                    <thead className="bg-slate-50/60 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <tr>
                            <th className="px-6 py-3 text-left">Time</th>
                            <th className="px-6 py-3 text-left">Order ID</th>
                            <th className="px-6 py-3 text-left">Cashier</th>
                            <th className="px-6 py-3 text-left">Status</th>
                            <th className="px-6 py-3 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {transactions.map((transaction, index) => {
                            const statusConfig = getStatusBadge(transaction.status);
                            const StatusIcon = statusConfig.icon;
                            return (
                                <tr
                                    key={transaction.id}
                                    onClick={() => onSelectTransaction(transaction)}
                                    className={`cursor-pointer transition-all hover:bg-slate-50/80 group ${
                                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                                    }`}
                                >
                                    <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                                            {transaction.time}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-800">
                                        {transaction.orderId}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{transaction.cashier}</td>
                                    <td className="px-6 py-4">
                                        <span
                                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}
                                        >
                                            <StatusIcon className="w-3 h-3" />
                                            {transaction.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-semibold text-slate-800">
                                        {formatCurrency(transaction.totalAmount)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    </section>
);

export default function TransactionsAuditPage() {
    const router = useRouter();
    const [activeNav, setActiveNav] = useState('transactions');
    const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
    const [statusCounts, setStatusCounts] = useState({
        todayCompleted: 0, overallCompleted: 0,
        todayVoided: 0, overallVoided: 0,
        todayRefunded: 0, overallRefunded: 0,
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [cashierFilter, setCashierFilter] = useState('all');
    const [selectedTransaction, setSelectedTransaction] = useState<TransactionRecord | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, path: '/manager/dashboard' },
        { id: 'transactions', label: 'Transactions', icon: ReceiptText, path: '/manager/transactions' },
        { id: 'inventory', label: 'Inventory', icon: Box, path: '/manager/inventory' },
        { id: 'staff', label: 'Staff', icon: Users, path: '/manager/staff' },
    ];

    useEffect(() => {
        const fetchOrders = async () => {
            if (!supabase) {
                setIsLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Orders fetch error:', error);
                setIsLoading(false);
                return;
            }

            const parsedTransactions = ((data ?? []) as OrderRow[]).map((order) => {
                const amount = Number(order.total_amount ?? 0);
                const createdAt = order.created_at ? new Date(order.created_at) : null;
                const normalizedStatus = String(order.status ?? 'Completed').toLowerCase();
                const status: TransactionStatus = normalizedStatus === 'voided'
                    ? 'Voided'
                    : normalizedStatus === 'refunded'
                        ? 'Refunded'
                        : 'Completed';

                return {
                    id: order.id,
                    createdAt: order.created_at,
                    time: createdAt
                        ? createdAt.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })
                        : '--:--',
                    orderId: order.order_number || order.id,
                    cashier: order.cashier_name || 'Unknown',
                    status,
                    items: [],
                    subtotal: amount,
                    tax: 0,
                    totalAmount: amount,
                    transactionId: order.id,
                    receiptNumber: order.order_number || order.id,
                };
            });

            const now = new Date();
            const todayString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            let tComp = 0, oComp = 0, tVoid = 0, oVoid = 0, tRef = 0, oRef = 0;

            parsedTransactions.forEach((order) => {
                if (!order.createdAt) return;
                const orderDate = new Date(order.createdAt);
                const orderDateString = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')}`;
                const isToday = orderDateString === todayString;

                if (order.status === 'Completed') {
                    oComp++;
                    if (isToday) tComp++;
                } else if (order.status === 'Voided') {
                    oVoid++;
                    if (isToday) tVoid++;
                } else if (order.status === 'Refunded') {
                    oRef++;
                    if (isToday) tRef++;
                }
            });

            setStatusCounts({
                todayCompleted: tComp, overallCompleted: oComp,
                todayVoided: tVoid, overallVoided: oVoid,
                todayRefunded: tRef, overallRefunded: oRef,
            });

            setTransactions(parsedTransactions);
            setIsLoading(false);
        };

        void fetchOrders();
    }, []);

    const { todaysOrders, yesterdaysOrders, weeklyMonthlyOrders } = useMemo(() => {
        const { startOfToday, startOfTomorrow, startOfYesterday, startOfMonth } = getLocalDateBoundaries();

        const transactionsWithDates = transactions
            .map((transaction) => ({
                ...transaction,
                localCreatedAt: transaction.createdAt ? new Date(transaction.createdAt) : null,
            }))
            .filter((transaction) => transaction.localCreatedAt && !Number.isNaN(transaction.localCreatedAt.getTime()));

        const todays = transactionsWithDates.filter(
            (transaction) => transaction.localCreatedAt! >= startOfToday && transaction.localCreatedAt! < startOfTomorrow,
        );
        const yesterdays = transactionsWithDates.filter(
            (transaction) => transaction.localCreatedAt! >= startOfYesterday && transaction.localCreatedAt! < startOfToday,
        );
        const weeklyMonthly = transactionsWithDates.filter(
            (transaction) => transaction.localCreatedAt! >= startOfMonth && transaction.localCreatedAt! < startOfTomorrow,
        );

        return {
            todaysOrders: todays,
            yesterdaysOrders: yesterdays,
            weeklyMonthlyOrders: weeklyMonthly,
        };
    }, [transactions]);

    const filteredTodaysOrders = useMemo(
        () => todaysOrders.filter((transaction) => matchesSearchAndCashier(transaction, searchQuery, cashierFilter)),
        [cashierFilter, searchQuery, todaysOrders],
    );

    const filteredYesterdaysOrders = useMemo(
        () => yesterdaysOrders.filter((transaction) => matchesSearchAndCashier(transaction, searchQuery, cashierFilter)),
        [cashierFilter, searchQuery, yesterdaysOrders],
    );

    const filteredWeeklyMonthlyOrders = useMemo(
        () => weeklyMonthlyOrders.filter((transaction) => matchesSearchAndCashier(transaction, searchQuery, cashierFilter)),
        [cashierFilter, searchQuery, weeklyMonthlyOrders],
    );

    const summaryTiles = useMemo(
        () => [
            {
                label: "Today's Sales",
                value: formatCurrency(
                    todaysOrders
                        .filter((order) => order.status === 'Completed' || !order.status)
                        .reduce((sum, order) => sum + Number(order.totalAmount), 0),
                ),
                icon: TrendingUp,
                color: 'text-emerald-600',
                bg: 'bg-emerald-50',
                trend: '+12%',
                trendUp: true,
            },
            {
                label: "Yesterday's Sales",
                value: formatCurrency(
                    yesterdaysOrders
                        .filter((order) => order.status === 'Completed' || !order.status)
                        .reduce((sum, order) => sum + Number(order.totalAmount), 0),
                ),
                icon: Calendar,
                color: 'text-blue-600',
                bg: 'bg-blue-50',
                trend: '-3%',
                trendUp: false,
            },
            {
                label: 'Period Sales',
                value: formatCurrency(
                    weeklyMonthlyOrders
                        .filter((order) => order.status === 'Completed' || !order.status)
                        .reduce((sum, order) => sum + Number(order.totalAmount), 0),
                ),
                icon: DollarSign,
                color: 'text-indigo-600',
                bg: 'bg-indigo-50',
                trend: '+8%',
                trendUp: true,
            },
        ],
        [todaysOrders, weeklyMonthlyOrders, yesterdaysOrders],
    );

    const cashierOptions = Array.from(new Set(transactions.map((transaction) => transaction.cashier))).sort(
        (a, b) => a.localeCompare(b),
    );

    // Helper to render status icon in drawer
    const renderStatusIcon = (status: TransactionStatus) => {
        const config = getStatusBadge(status);
        const Icon = config.icon;
        return <Icon className="w-3 h-3" />;
    };

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">

            {/* Sidebar */}
            <aside className="w-[240px] bg-white border-r border-slate-200 flex flex-col flex-shrink-0 h-full sticky top-0 z-20 shadow-sm">
                <div className="p-6 flex items-center gap-3 border-b border-slate-100">
                    <div className="w-9 h-9 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                        <div className="w-3.5 h-3.5 border-2 border-white rounded-sm" />
                    </div>
                    <span className="font-bold text-lg tracking-tight text-slate-900">QuickServe</span>
                </div>

                <nav className="flex flex-col gap-1 px-4 flex-1 mt-4">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeNav === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setActiveNav(item.id);
                                    router.push(item.path);
                                }}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none group ${
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

                <div className="p-4 border-t border-slate-100 space-y-3 mt-auto">
                    <button
                        onClick={() => router.push('/')}
                        className="flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 text-sm font-medium transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Log Out
                    </button>
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 text-white shadow-lg">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                                System Health
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
                            <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: '42%' }} />
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6 bg-slate-50/80">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
                            <span className="bg-slate-900 text-white p-1.5 rounded-xl">
                                <ReceiptText className="w-5 h-5" />
                            </span>
                            Transactions & Audit
                        </h1>
                        <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {new Date().toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium transition-all shadow-sm hover:shadow-md">
                            <FileText className="w-4 h-4" />
                            Export
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition-all shadow-lg shadow-slate-900/10 hover:shadow-xl">
                            <Printer className="w-4 h-4" />
                            EOD Reconciliation
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {summaryTiles.map((card) => {
                        const Icon = card.icon;
                        return (
                            <div key={card.label} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 hover:shadow-md transition-all group">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{card.label}</p>
                                        <p className="text-2xl font-bold text-slate-900 mt-1.5">{card.value}</p>
                                        {card.trend && (
                                            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${card.trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {card.trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                                {card.trend}
                                            </div>
                                        )}
                                    </div>
                                    <div className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center ${card.color} group-hover:scale-105 transition-transform`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Status Cards - Today vs Overall */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 hover:shadow-md transition-all">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Completed</p>
                                <div className="flex items-baseline gap-3 mt-1">
                                    <span className="text-2xl font-bold text-emerald-600">{statusCounts.todayCompleted}</span>
                                    <span className="text-sm text-slate-400">today</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">Overall: {statusCounts.overallCompleted}</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <CheckCircle className="w-5 h-5" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 hover:shadow-md transition-all">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Refunded</p>
                                <div className="flex items-baseline gap-3 mt-1">
                                    <span className="text-2xl font-bold text-amber-600">{statusCounts.todayRefunded}</span>
                                    <span className="text-sm text-slate-400">today</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">Overall: {statusCounts.overallRefunded}</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 hover:shadow-md transition-all">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Voided</p>
                                <div className="flex items-baseline gap-3 mt-1">
                                    <span className="text-2xl font-bold text-rose-600">{statusCounts.todayVoided}</span>
                                    <span className="text-sm text-slate-400">today</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">Overall: {statusCounts.overallVoided}</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                                <XCircle className="w-5 h-5" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80">
                    <div className="flex flex-col md:flex-row gap-4 md:items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by Order ID or Receipt Number..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                            />
                        </div>
                        <div className="relative min-w-[200px]">
                            <select
                                value={cashierFilter}
                                onChange={(e) => setCashierFilter(e.target.value)}
                                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-9 text-sm text-slate-700 outline-none transition focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                            >
                                <option value="all">All Cashiers</option>
                                {cashierOptions.map((cashier) => (
                                    <option key={cashier} value={cashier}>
                                        {cashier}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                    </div>
                </div>

                {/* Transaction Tables */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <TransactionTable
                        title="Today"
                        subtitle="Local-time orders placed today"
                        transactions={filteredTodaysOrders}
                        onSelectTransaction={setSelectedTransaction}
                        isLoading={isLoading}
                    />
                    <TransactionTable
                        title="Yesterday"
                        subtitle="Local-time orders placed yesterday"
                        transactions={filteredYesterdaysOrders}
                        onSelectTransaction={setSelectedTransaction}
                        isLoading={isLoading}
                    />
                    <TransactionTable
                        title="This Month"
                        subtitle="Local-time orders for the current month"
                        transactions={filteredWeeklyMonthlyOrders}
                        onSelectTransaction={setSelectedTransaction}
                        isLoading={isLoading}
                    />
                </div>
            </main>

            {/* Transaction Detail Drawer */}
            <div
                className={`fixed inset-0 z-40 transition-opacity duration-300 ${
                    selectedTransaction ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
            >
                <button
                    type="button"
                    aria-label="Close transaction drawer"
                    onClick={() => setSelectedTransaction(null)}
                    className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
                />

                <aside
                    className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
                        selectedTransaction ? 'translate-x-0' : 'translate-x-full'
                    }`}
                >
                    {/* Drawer Header */}
                    <div className="flex items-start justify-between border-b border-slate-200 p-5 bg-slate-50/60">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Transaction Details</p>
                            <h2 className="mt-1 text-xl font-bold text-slate-900">
                                {selectedTransaction?.orderId ?? 'Order'}
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                                <Clock className="w-3 h-3" />
                                {selectedTransaction?.time} • {selectedTransaction?.cashier}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSelectedTransaction(null)}
                            className="rounded-full border border-slate-200 p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {selectedTransaction && (
                        <div className="flex-1 overflow-y-auto p-5 space-y-6">
                            {/* Status & Summary */}
                            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 border border-slate-200">
                                <div>
                                    <p className="text-xs font-medium text-slate-500">Status</p>
                                    <span
                                        className={`inline-flex items-center gap-1.5 mt-1 rounded-full px-3 py-1 text-sm font-semibold ${
                                            getStatusBadge(selectedTransaction.status).bg
                                        } ${getStatusBadge(selectedTransaction.status).text} border ${
                                            getStatusBadge(selectedTransaction.status).border
                                        }`}
                                    >
                                        {renderStatusIcon(selectedTransaction.status)}
                                        {selectedTransaction.status}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-medium text-slate-500">Total Amount</p>
                                    <p className="text-xl font-bold text-slate-900">
                                        {formatCurrency(selectedTransaction.totalAmount)}
                                    </p>
                                </div>
                            </div>

                            {/* Order Items */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800 mb-3">Order Items</h3>
                                <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 bg-slate-50/50">
                                    {selectedTransaction.items.length > 0 ? (
                                        selectedTransaction.items.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between px-4 py-3 text-sm">
                                                <span className="text-slate-700">
                                                    {item.quantity}x {item.name}
                                                </span>
                                                <span className="font-medium text-slate-800">
                                                    {formatCurrency(item.price * item.quantity)}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="px-4 py-6 text-center text-sm text-slate-400">
                                            Item-level details not available
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Payment Summary */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800 mb-3">Payment Summary</h3>
                                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Subtotal</span>
                                        <span className="font-medium text-slate-800">{formatCurrency(selectedTransaction.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Tax</span>
                                        <span className="font-medium text-slate-800">{formatCurrency(selectedTransaction.tax)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm border-t border-slate-200 pt-2 font-semibold">
                                        <span className="text-slate-800">Total</span>
                                        <span className="text-slate-900">{formatCurrency(selectedTransaction.totalAmount)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Audit Info */}
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800 mb-3">Audit Information</h3>
                                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Transaction ID</span>
                                        <span className="font-mono text-slate-700">{selectedTransaction.transactionId}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Receipt Number</span>
                                        <span className="font-mono text-slate-700">{selectedTransaction.receiptNumber}</span>
                                    </div>
                                    {selectedTransaction.createdAt && (
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Date</span>
                                            <span className="text-slate-700">
                                                {new Date(selectedTransaction.createdAt).toLocaleDateString('en-PH', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                })}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Void/Refund Details */}
                            {(selectedTransaction.status === 'Voided' || selectedTransaction.status === 'Refunded') && (
                                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                                    <h4 className="text-sm font-semibold text-rose-800">Void/Refund Reason</h4>
                                    <p className="mt-1 text-sm text-rose-700">{selectedTransaction.voidOrRefundReason || 'No reason provided'}</p>
                                    {selectedTransaction.managerApproval && (
                                        <div className="mt-3 pt-3 border-t border-rose-200">
                                            <p className="text-xs font-medium uppercase tracking-wider text-rose-600">Manager Approval</p>
                                            <p className="text-sm font-semibold text-rose-800">{selectedTransaction.managerApproval}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Drawer Footer */}
                    <div className="border-t border-slate-200 p-5 bg-slate-50/60">
                        <button className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 flex items-center justify-center gap-2 shadow-md">
                            <Printer className="w-4 h-4" />
                            Reprint Receipt
                        </button>
                    </div>
                </aside>
            </div>
        </div>
    );
}