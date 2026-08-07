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
    PackagePlus,
    PackageOpen,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

type InventoryItem = {
    id: string;
    product_name: string;
    category: string;
    pieces_stock: number;
    inventory_type?: string;
};

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
    const [totalExpenses, setTotalExpenses] = useState(0);
    const [isProductInOpen, setIsProductInOpen] = useState(false);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [isOpenPackModalOpen, setIsOpenPackModalOpen] = useState(false);
    const [selectedPackId, setSelectedPackId] = useState('');
    const [addBulk, setAddBulk] = useState('0');
    const [addPieces, setAddPieces] = useState('0');
    const [productInTab, setProductInTab] = useState('Main');
    const [productSearch, setProductSearch] = useState('');
    const [toastMessage, setToastMessage] = useState('');
    const currentCash = todaysStats.revenue - totalExpenses;

    const showToast = (message: string) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(''), 3000);
    };

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
                setTotalExpenses(0);
                return;
            }

            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);
            const todayDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

            const [ordersResult, expensesResult] = await Promise.all([
                supabase
                    .from('orders')
                    .select('id, total_amount, status, created_at, order_items(quantity)')
                    .gte('created_at', startOfDay.toISOString())
                    .lte('created_at', endOfDay.toISOString())
                    .order('created_at', { ascending: false }),
                supabase
                    .from('expenses')
                    .select('*')
                    .eq('expense_date', todayDate),
            ]);

            const ordersData = ordersResult.data;
            const ordersError = ordersResult.error;
            const expensesData = expensesResult.data;
            const expensesError = expensesResult.error;

            if (ordersError || expensesError) {
                console.error('Today stats fetch error:', {
                    ordersError,
                    expensesError,
                });
                setTodaysStats({
                    orders: 0,
                    revenue: 0,
                    itemsSold: 0,
                    peakHour: 'No data yet',
                });
                setTotalExpenses(0);
                return;
            }

            const expensesToday = (expensesData ?? []).map((expense: any) => ({
                id: expense.id,
                expense_date: expense.expense_date,
                item_name: expense.item_name,
                amount: Number(expense.amount),
                expensed_by: expense.expensed_by,
            }));

            const shopOnlyExpenses = expensesToday.filter(
                (expense) => String(expense.expensed_by ?? '').trim().toLowerCase() === 'shop',
            );

            const totalShopExpenses = shopOnlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
            setTotalExpenses(totalShopExpenses);

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

    const getBulkMultiplier = (productName: string) => {
        const name = (productName || '').toLowerCase();
        if (name.includes('cup')) return 100;
        if (name.includes('halo-halo')) return 50;
        if (name.includes('egg') || name.includes('itlog')) return 30;
        if (name.includes('pizza')) return 5;
        if (name.includes('fries')) return 4;
        if (name.includes('hotdog') || name.includes('cheese')) return 12;
        if (name.includes('siomai')) return 60;
        if (name.includes('patty') || name.includes('7up') || name.includes('coke') || name.includes('pepsi') || name.includes('water')) return 24;
        if (name.includes('chips')) return 10;
        return 1;
    };

    const getBulkLabel = (productName: string) => {
        const name = (productName || '').toLowerCase();
        if (name.includes('halo-halo')) return '(1 pack = 50 cups)';
        if (name.includes('hotdog')) return '(1 pack = 12 pcs)';
        if (name.includes('egg') || name.includes('itlog')) return '(1 tray = 30 pcs)';
        if (name.includes('pizza')) return '(1 pack = 5 pcs)';
        if (name.includes('fries')) return '(1kg pack = 4 servings)';
        if (name.includes('siomai')) return '(1 pack = 60 pcs)';
        if (name.includes('7up') || name.includes('coke') || name.includes('pepsi') || name.includes('water')) return '(1 case = 24 pcs)';
        if (name.includes('chips')) return '(1 pack = 10 pcs)';
        return '(Bulk)';
    };

    const openProductInModal = async () => {
        if (!supabase) {
            alert('Supabase client is not configured.');
            return;
        }

        const { data, error } = await supabase
            .from('inventory')
            .select('id, product_name, category, pieces_stock')
            .order('product_name', { ascending: true });

        if (error) {
            console.error('Inventory fetch error:', error);
            alert('Failed to load inventory products.');
            return;
        }

        const items = (data ?? []) as InventoryItem[];
        setInventoryItems(items);
        setSelectedProductId(items[0]?.id ?? '');
        setAddBulk('0');
        setAddPieces('0');
        setProductInTab('Main');
        setProductSearch('');
        setIsProductInOpen(true);
    };

    const handleProductInSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!supabase || !selectedProductId) return;

        const selectedItem = inventoryItems.find((item) => item.id === selectedProductId);
        if (!selectedItem) return;

        const addedPiecesFromBulk = Number(addBulk || 0) * getBulkMultiplier(selectedItem.product_name);
        const newTotalPieces = Number(selectedItem.pieces_stock || 0) + addedPiecesFromBulk + Number(addPieces || 0);

        const { error } = await supabase
            .from('inventory')
            .update({ pieces_stock: newTotalPieces })
            .eq('id', selectedProductId);

        if (error) {
            console.error('Product In update error:', error);
            alert('Failed to update stock.');
            return;
        }

        showToast('Product stock updated successfully.');
        setIsProductInOpen(false);
        setSelectedProductId('');
        setAddBulk('0');
        setAddPieces('0');
    };

    const openOpenPackModal = async () => {
        if (!supabase) {
            alert('Supabase client is not configured.');
            return;
        }

        const { data, error } = await supabase
            .from('inventory')
            .select('id, product_name, category, pieces_stock, inventory_type')
            .order('product_name', { ascending: true });

        if (error) {
            console.error('Inventory fetch error:', error);
            alert('Failed to load inventory products.');
            return;
        }

        const items = (data ?? []) as InventoryItem[];
        setInventoryItems(items);

        const subInventoryItems = items.filter((item) => {
            const normalizedCategory = (item.category || '').toLowerCase();
            const normalizedType = (item.inventory_type || '').toLowerCase();
            return normalizedCategory !== 'main inventory' && normalizedType !== 'main';
        });

        setSelectedPackId(subInventoryItems[0]?.id ?? '');
        setIsOpenPackModalOpen(true);
    };

    const handleOpenPackSubmit = async () => {
        if (!supabase || !selectedPackId) return;

        const selectedItem = inventoryItems.find((item) => item.id === selectedPackId);
        if (!selectedItem) return;

        const newStock = Number(selectedItem.pieces_stock || 0) - 1;

        const { error } = await supabase
            .from('inventory')
            .update({ pieces_stock: newStock })
            .eq('id', selectedPackId);

        if (error) {
            console.error('Open Pack update error:', error);
            alert('Failed to open pack.');
            return;
        }

        showToast('Pack opened and stock deducted successfully.');
        setIsOpenPackModalOpen(false);
        setSelectedPackId('');
    };

    const selectedProduct = inventoryItems.find((item) => item.id === selectedProductId) ?? null;
    const isSubInventory = selectedProduct?.category?.toLowerCase() !== 'main inventory' && selectedProduct?.category?.toLowerCase() !== 'main';
    const isBun = selectedProduct?.product_name?.toLowerCase().includes('bun');
    const isBulkOnly = isSubInventory && !isBun;
    const filteredInventory = inventoryItems.filter((item) => {
        const normalizedCategory = (item.category || '').toLowerCase();
        const normalizedType = (item.inventory_type || '').toLowerCase();
        const matchesTab = productInTab === 'Main'
            ? normalizedCategory === 'main inventory' || normalizedType === 'main'
            : normalizedCategory !== 'main inventory' && normalizedType !== 'main';

        const matchesSearch = item.product_name.toLowerCase().includes(productSearch.toLowerCase());

        return matchesTab && matchesSearch;
    });
    const subInventoryItems = inventoryItems.filter((item) => {
        const normalizedCategory = (item.category || '').toLowerCase();
        const normalizedType = (item.inventory_type || '').toLowerCase();
        return normalizedCategory !== 'main inventory' && normalizedType !== 'main';
    });

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
        <div className="relative min-h-screen flex flex-col w-full overflow-y-auto overflow-x-hidden bg-slate-50 font-sans text-slate-900">
            {/* Decorative background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.08),_transparent_35%)] pointer-events-none" />
            <div className="absolute left-0 bottom-0 h-[500px] w-[500px] -translate-x-1/4 translate-y-1/4 rounded-full bg-slate-200/50 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-1 flex-col pb-2 md:pb-0">
                {/* Header */}
                <header className="flex flex-wrap items-center justify-between gap-2 md:gap-3 p-1.5 md:p-6 bg-white/80 backdrop-blur-sm border-b border-slate-200/70 shadow-sm">
                    <div className="flex w-full flex-wrap items-center gap-1.5 md:gap-3 xl:w-auto">
                        <div className="flex items-center gap-2 md:gap-3 rounded-2xl bg-slate-900 px-2 md:px-4 py-1 md:py-2.5 shadow-lg">
                            <div className="flex h-1.5 w-1.5 md:h-2.5 md:w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.2)] md:shadow-[0_0_0_6px_rgba(16,185,129,0.2)]" />
                            <span className="text-[8px] md:text-xs font-bold uppercase tracking-[0.1em] md:tracking-[0.2em] text-white/80">
                                TERMINAL 01 • ONLINE
                            </span>
                        </div>
                        <div className="flex w-full md:w-auto gap-1.5 md:gap-2 flex-wrap">
                            <button
                                type="button"
                                onClick={() => {
                                    setExpenseMode('employee');
                                    setIsExpensesModalOpen(true);
                                }}
                                className="flex h-9 md:h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 md:px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md"
                            >
                                <Users className="h-4 w-4" />
                                <span className="hidden md:inline">Staff Expense</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setExpenseMode('shop');
                                    setIsExpensesModalOpen(true);
                                }}
                                className="flex h-9 md:h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 md:px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md"
                            >
                                <DollarSign className="h-4 w-4" />
                                <span className="hidden md:inline">Shop Expense</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    void openProductInModal();
                                }}
                                className="flex h-9 md:h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 md:px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md"
                            >
                                <PackagePlus className="h-4 w-4" />
                                <span className="hidden md:inline">Product In</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    void openOpenPackModal();
                                }}
                                className="flex h-9 md:h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 md:px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md"
                            >
                                <PackageOpen className="h-4 w-4" />
                                <span className="hidden md:inline">Open Pack</span>
                            </button>
                            <Link
                                href="/time-in"
                                className="flex h-9 w-9 md:h-11 md:w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow-md"
                            >
                                <Clock3 className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>

                    <div className="flex w-full md:w-auto items-center justify-between md:justify-end gap-2 md:gap-3">
                        <div className="flex items-center gap-1 md:gap-2 rounded-2xl border border-slate-200 bg-white px-2 md:px-3 py-1 md:py-1.5 shadow-sm">
                            <Link
                                href="/history"
                                className="flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                            >
                                <History className="h-4 w-4" />
                            </Link>
                            <button
                                type="button"
                                onClick={() => router.push('/')}
                                className="flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                            >
                                <LogOut className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="flex items-center gap-2 md:gap-3 rounded-2xl border border-slate-200 bg-white px-2 md:px-4 py-1 md:py-1.5 shadow-sm">
                            <div className="text-right">
                                <p className="text-xs md:text-sm font-bold text-slate-800">{time || ' '}</p>
                                <p className="text-[8px] md:text-[10px] font-medium uppercase tracking-wider text-slate-400">
                                    {cashierName}
                                </p>
                            </div>
                            <div className="flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-full bg-slate-900 text-xs md:text-sm font-bold text-white shadow-md">
                                {cashierName.charAt(0).toUpperCase()}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex flex-1 items-center justify-center px-2 md:px-6 py-2 md:py-8">
                    <div className="grid w-full max-w-6xl gap-4 md:gap-8 lg:grid-cols-5">
                        {/* Left panel: stats and info */}
                        <div className="lg:col-span-2 space-y-3 md:space-y-4">
                            <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-3 md:p-6 shadow-xl backdrop-blur-sm">
                                <h2 className="text-xs md:text-sm font-semibold uppercase tracking-wider text-slate-400">
                                    Today's Summary
                                </h2>
                                <div className="mt-3 md:mt-4 grid grid-cols-2 gap-2 md:block md:space-y-4">
                                    <div className="flex flex-col items-center md:flex-row md:items-center md:justify-between border-b-0 md:border-b border-slate-100 pb-0 md:pb-3">
                                        <span className="text-[10px] md:text-sm font-medium text-slate-600">Orders</span>
                                        <span className="text-base md:text-xl font-bold text-slate-900">{todaysStats.orders}</span>
                                    </div>
                                    <div className="flex flex-col items-center md:flex-row md:items-center md:justify-between border-b-0 md:border-b border-slate-100 pb-0 md:pb-3">
                                        <span className="text-[10px] md:text-sm font-medium text-slate-600">Total Expenses</span>
                                        <span className="text-base md:text-xl font-bold text-rose-600">
                                            ₱{totalExpenses.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-center md:flex-row md:items-center md:justify-between border-b-0 md:border-b border-slate-100 pb-0 md:pb-3">
                                        <div className="flex flex-col items-center md:items-start">
                                            <span className="text-[10px] md:text-sm font-medium text-slate-600">Current Cash</span>
                                            <span className="text-[8px] md:text-xs text-slate-400">revenue - expenses</span>
                                        </div>
                                        <span className="text-base md:text-xl font-bold text-slate-900">
                                            ₱{currentCash.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-center md:flex-row md:items-center md:justify-between border-b-0 md:border-b border-slate-100 pb-0 md:pb-3">
                                        <span className="text-[10px] md:text-sm font-medium text-slate-600">Revenue</span>
                                        <span className="text-base md:text-xl font-bold text-emerald-600">
                                            ₱{todaysStats.revenue.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-center md:flex-row md:items-center md:justify-between col-span-2 md:col-span-1 pt-1 md:pt-0">
                                        <span className="text-[10px] md:text-sm font-medium text-slate-600">Items Sold</span>
                                        <span className="text-base md:text-xl font-bold text-slate-900">{todaysStats.itemsSold}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white/90 p-3 md:p-6 shadow-xl backdrop-blur-sm">
                                <div className="flex items-center gap-2 md:gap-3">
                                    <div className="rounded-2xl bg-emerald-100 p-1.5 md:p-2.5 text-emerald-700">
                                        <TrendingUp className="h-4 w-4 md:h-5 md:w-5" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] md:text-sm font-semibold text-slate-800">Peak Hour</p>
                                        <p className="text-[10px] md:text-xs text-slate-400">{todaysStats.peakHour}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right panel: main action */}
                        <div className="lg:col-span-3 flex flex-grow flex-col justify-end items-center">
                            <div className="relative mt-2 md:mt-8 w-full max-w-lg overflow-hidden rounded-[40px] border border-slate-200/70 bg-white/90 p-3 md:p-10 shadow-2xl backdrop-blur-xl">
                                <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(248,250,252,0.7),_transparent_40%)]" />
                                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-slate-100/50 blur-3xl" />

                                <div className="relative z-10 flex flex-col items-center gap-4 md:gap-8 text-center">
                                    <div className="flex h-20 w-20 md:h-28 md:w-28 items-center justify-center rounded-3xl bg-slate-900 shadow-xl shadow-slate-900/20">
                                        <Coffee className="h-10 w-10 md:h-12 md:w-12 text-white" strokeWidth={2} />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-slate-900">
                                            Snack Attack
                                        </h1>
                                        <p className="mt-2 md:mt-3 text-[11px] md:text-sm font-medium uppercase tracking-[0.1em] md:tracking-[0.2em] text-slate-400">
                                            Ready for next customer
                                        </p>
                                    </div>

                                    <button
                                        onClick={() => setShowOrderTypeSelection(true)}
                                        className="group inline-flex w-full items-center justify-center gap-2 md:gap-3 rounded-full bg-slate-900 px-6 md:px-10 py-3 md:py-6 text-base md:text-lg font-semibold text-white shadow-xl shadow-slate-900/20 transition-all hover:-translate-y-1 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-slate-900/10"
                                    >
                                        Tap to Start Order
                                        <ArrowRight className="h-4 w-4 md:h-5 md:w-5 transition-transform group-hover:translate-x-1" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="py-2 md:py-5 text-center">
                    <p className="text-[8px] md:text-[10px] font-semibold uppercase tracking-[0.1em] md:tracking-[0.3em] text-slate-400">
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

            {isProductInOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">Product In</h2>
                                <p className="mt-1 text-sm text-slate-500">Select a product and add stock.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsProductInOpen(false)}
                                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleProductInSubmit} className="mt-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Product</label>
                                <div className="mt-1.5 space-y-3">
                                    <div className="flex gap-2 rounded-xl bg-slate-100 p-1">
                                        <button
                                            type="button"
                                            onClick={() => setProductInTab('Main')}
                                            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                                                productInTab === 'Main'
                                                    ? 'bg-slate-900 text-white'
                                                    : 'bg-transparent text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            Main Inventory
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setProductInTab('Sub')}
                                            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                                                productInTab === 'Sub'
                                                    ? 'bg-slate-900 text-white'
                                                    : 'bg-transparent text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            Sub Inventory
                                        </button>
                                    </div>

                                    <input
                                        type="text"
                                        value={productSearch}
                                        onChange={(e) => setProductSearch(e.target.value)}
                                        placeholder="Search product..."
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
                                    />

                                    <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
                                        {filteredInventory.length > 0 ? (
                                            filteredInventory.map((item) => {
                                                const isSelected = selectedProductId === item.id;
                                                return (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedProductId(item.id);
                                                            setAddBulk('0');
                                                            setAddPieces('0');
                                                        }}
                                                        className={`mb-2 w-full rounded-lg border px-3 py-2 text-left transition last:mb-0 ${
                                                            isSelected
                                                                ? 'border-emerald-400 bg-emerald-50'
                                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                                        }`}
                                                    >
                                                        <p className="text-sm font-semibold text-slate-900">{item.product_name}</p>
                                                        <p className="text-xs text-slate-500">Current: {Number(item.pieces_stock || 0)} pcs</p>
                                                    </button>
                                                );
                                            })
                                        ) : (
                                            <p className="px-2 py-3 text-sm text-slate-500">No matching products found.</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700">
                                    Add Bulk {getBulkLabel(selectedProduct?.product_name || '')}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={addBulk}
                                    onChange={(e) => setAddBulk(e.target.value)}
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
                                />
                            </div>

                            {!isBulkOnly && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Add Pieces</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={addPieces}
                                        onChange={(e) => setAddPieces(e.target.value)}
                                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
                                    />
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsProductInOpen(false)}
                                    className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 focus:ring-4 focus:ring-slate-200"
                                >
                                    Save Stock
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isOpenPackModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">Open Pack</h2>
                                <p className="mt-1 text-sm text-slate-500">Select a sub-inventory flavor to deduct 1 pack.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsOpenPackModalOpen(false)}
                                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mt-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Sub-Inventory Item</label>
                                <select
                                    value={selectedPackId}
                                    onChange={(e) => setSelectedPackId(e.target.value)}
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
                                >
                                    {subInventoryItems.length === 0 ? (
                                        <option value="" disabled>No sub-inventory items found</option>
                                    ) : (
                                        subInventoryItems.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.product_name} (Current: {Number(item.pieces_stock || 0)} packs)
                                            </option>
                                        ))
                                    )}
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsOpenPackModalOpen(false)}
                                    className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        void handleOpenPackSubmit();
                                    }}
                                    disabled={!selectedPackId || subInventoryItems.length === 0}
                                    className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-300"
                                >
                                    Open Pack
                                </button>
                            </div>
                        </div>
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

            {toastMessage && (
                <div className="fixed bottom-10 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                    {toastMessage}
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