'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
    LayoutGrid,
    ReceiptText,
    Box,
    Users,
    Search,
    ChevronDown,
    Trash2,
    LogOut,
    AlertCircle,
    Clock,
    Package,
    PackageOpen,
    TrendingUp,
    TrendingDown,
    Plus,
    Filter,
    ArrowUpDown,
    MoreHorizontal,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Info,
    RefreshCw,
    Zap,
    Layers,
    ShoppingBag,
    DollarSign,
    BarChart3,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

type InventoryItem = {
    id: string;
    product_name: string;
    category: string;
    inventory_type: 'main' | 'sub';
    bulk_stock: number;
    bulk_unit: string;
    pieces_stock: number;
    pieces_unit: string;
    pieces_per_bulk?: number | null;
    status: string;
    updated_at?: string | null;
    created_at?: string | null;
    current_stock?: number;
    minimum_stock?: number;
    price_per_unit?: number;
    base_price?: number | null;
    selling_price?: number | null;
    unit?: string;
};

type InventoryLog = {
    id: string;
    item_id: string;
    action: string;
    quantity_changed: number;
    action_by: string;
    created_at: string;
};

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        maximumFractionDigits: 2,
    }).format(value);

const getStockStatus = (item: InventoryItem) => {
    const normalizedStatus = item.status.toLowerCase();
    const piecesStock = Number(item.pieces_stock ?? 0);

    if (normalizedStatus.includes('critical') || normalizedStatus.includes('out') || piecesStock === 0) {
        return { label: 'Out of Stock', variant: 'critical' as const, dot: 'bg-red-500' };
    }

    if (normalizedStatus.includes('low')) {
        return { label: 'Low Stock', variant: 'warning' as const, dot: 'bg-amber-500' };
    }

    return { label: 'In Stock', variant: 'success' as const, dot: 'bg-emerald-500' };
};

const statusConfig = {
    critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', ring: 'ring-red-400/30' },
    warning: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', ring: 'ring-amber-400/30' },
    success: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', ring: 'ring-emerald-400/30' },
};

export default function InventoryScreen() {
    const router = useRouter();
    const [activeNav, setActiveNav] = useState('inventory');
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [todayLogs, setTodayLogs] = useState<InventoryLog[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isRefillModalOpen, setIsRefillModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [addBulk, setAddBulk] = useState('0');
    const [addPieces, setAddPieces] = useState('0');
    const [isSubmittingRefill, setIsSubmittingRefill] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'main' | 'sub'>('all');
    const [sortField, setSortField] = useState<keyof InventoryItem>('product_name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const fetchInventoryData = async () => {
        if (!supabase) {
            setInventoryItems([]);
            setTodayLogs([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);

        const [inventoryResponse, logsResponse] = await Promise.all([
            supabase
                .from('inventory')
                .select('*')
                .order('product_name', { ascending: true }),
            supabase
                .from('inventory_logs')
                .select('*')
                .gte('created_at', startOfDay.toISOString())
                .lte('created_at', endOfDay.toISOString())
                .order('created_at', { ascending: false }),
        ]);

        if (!inventoryResponse.error) {
            setInventoryItems((inventoryResponse.data ?? []) as InventoryItem[]);
        }

        if (!logsResponse.error) {
            setTodayLogs((logsResponse.data ?? []) as InventoryLog[]);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        void fetchInventoryData();
    }, []);

    const openRefillModal = (item: InventoryItem) => {
        setSelectedItem(item);
        setAddBulk('0');
        setAddPieces('0');
        setIsRefillModalOpen(true);
    };

    const closeRefillModal = () => {
        setIsRefillModalOpen(false);
        setSelectedItem(null);
        setAddBulk('0');
        setAddPieces('0');
    };

    const getBulkMultiplier = (productName: string) => {
        const name = productName.toLowerCase();
        if (name.includes('cup')) return 100;
        if (name.includes('halo-halo')) return 50;
        if (name.includes('egg') || name.includes('itlog')) return 30; // 1 tray = 30 pcs
        if (name.includes('pizza')) return 5; // 1 pack = 5 pcs
        if (name.includes('fries')) return 4; // 1kg pack = 4 servings (1/4kg)
        if (name.includes('hotdog') || name.includes('cheese')) return 12;
        if (name.includes('siomai')) return 60; // 1 pack = 60 pcs
        if (name.includes('chips')) return 24; // 1 pack = 24 pcs
        if (name.includes('patty') || name.includes('7up') || name.includes('coke') || name.includes('pepsi') || name.includes('water')) return 24;
        return 1; // Default fallback
    };

    const getBulkLabel = (productName: string) => {
        const name = productName.toLowerCase();
        if (name.includes('halo-halo')) return '(1 pack = 50 cups)';
        if (name.includes('hotdog')) return '(1 pack = 12 pcs)';
        if (name.includes('egg') || name.includes('itlog')) return '(1 tray = 30 pcs)';
        if (name.includes('pizza')) return '(1 pack = 5 pcs)';
        if (name.includes('fries')) return '(1kg pack = 4 servings)';
        if (name.includes('siomai')) return '(1 pack = 60 pcs)';
        if (name.includes('7up') || name.includes('coke') || name.includes('pepsi') || name.includes('water')) return '(1 case = 24 pcs)';
        return '(Bulk)';
    };

    const handleRefillSubmit = async () => {
        if (!supabase || !selectedItem || isSubmittingRefill) return;

        const addBulkInput = Math.max(0, Number(addBulk) || 0);
        const addPiecesInput = Math.max(0, Number(addPieces) || 0);

        if (addBulkInput === 0 && addPiecesInput === 0) return;

        setIsSubmittingRefill(true);

        const multiplier = getBulkMultiplier(selectedItem.product_name);
        const addedPiecesFromBulk = addBulkInput * multiplier;
        const addedRawPieces = addPiecesInput;
        const currentPiecesStock = Number(selectedItem.pieces_stock ?? 0);
        const newTotalPieces = currentPiecesStock + addedPiecesFromBulk + addedRawPieces;

        const { error: updateError } = await supabase
            .from('inventory')
            .update({
                pieces_stock: newTotalPieces,
            })
            .eq('id', selectedItem.id);

        if (!updateError) {
            await supabase.from('inventory_logs').insert({
                item_id: selectedItem.id,
                action: 'Refill',
                quantity_changed: addedPiecesFromBulk + addedRawPieces,
                action_by: 'Manager',
            });

            await fetchInventoryData();
            closeRefillModal();
        }

        setIsSubmittingRefill(false);
    };

    const currentBulkDisplay = selectedItem
        ? Math.floor(Number(selectedItem.pieces_stock ?? 0) / getBulkMultiplier(selectedItem.product_name))
        : 0;

    const isSubInventory = selectedItem?.category?.toLowerCase() !== 'main inventory' && selectedItem?.category?.toLowerCase() !== 'main';
    const isBun = selectedItem?.product_name?.toLowerCase().includes('bun');
    const isBulkOnly = isSubInventory && !isBun;

    const totalProducts = inventoryItems.length;

    const outOfStockCount = inventoryItems.filter(
        (item) => Number(item.pieces_stock ?? 0) === 0
    ).length;

    const lowStockCount = inventoryItems.filter((item) => {
        const piecesStock = Number(item.pieces_stock ?? 0);
        return piecesStock > 0 && piecesStock <= 10;
    }).length;

    const totalInventoryValue = inventoryItems.reduce(
        (sum, item) => sum + Number(item.base_price ?? 0) * Number(item.pieces_stock ?? 0),
        0
    );

    const potentialProfit = inventoryItems.reduce(
        (sum, item) =>
            sum + (Number(item.selling_price ?? 0) - Number(item.base_price ?? 0)) * Number(item.pieces_stock ?? 0),
        0
    );

    const filteredInventory = useMemo(() => {
        let items = inventoryItems;
        const query = searchQuery.trim().toLowerCase();
        if (query) {
            items = items.filter((item) =>
                item.product_name.toLowerCase().includes(query) ||
                item.category.toLowerCase().includes(query)
            );
        }

        if (activeTab === 'main') {
            items = items.filter((item) => item.inventory_type === 'main');
        } else if (activeTab === 'sub') {
            items = items.filter((item) => item.inventory_type === 'sub');
        }

        // Sort
        const sorted = [...items];
        const a = sorted as any[];
        a.sort((x, y) => {
            const valA = x[sortField] ?? '';
            const valB = y[sortField] ?? '';
            const comparison = String(valA).localeCompare(String(valB));
            return sortDirection === 'asc' ? comparison : -comparison;
        });

        return sorted;
    }, [inventoryItems, searchQuery, activeTab, sortField, sortDirection]);

    const itemsNeedingRestock = useMemo(() => {
        return inventoryItems.filter((item) => {
            const status = item.status.toLowerCase();
            return status.includes('low') || status.includes('critical') || status.includes('out');
        });
    }, [inventoryItems]);

    const inventoryNameById = useMemo(() => {
        return inventoryItems.reduce<Record<string, string>>((acc, item) => {
            acc[item.id] = item.product_name;
            return acc;
        }, {});
    }, [inventoryItems]);

    const recentActivityLogs = useMemo(() => {
        return [...todayLogs].sort(
            (a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }, [todayLogs]);

    const formatActivityTime = (dateValue: string) => {
        return new Intl.DateTimeFormat('en-PH', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        }).format(new Date(dateValue));
    };

    const handleSort = (field: keyof InventoryItem) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const handlePriceUpdate = async (id: string, field: 'base_price' | 'selling_price', newValue: string) => {
        if (!supabase) return;

        const parsedValue = parseFloat(newValue);
        if (Number.isNaN(parsedValue)) {
            alert('Please enter a valid price.');
            return;
        }

        const { error } = await supabase
            .from('inventory')
            .update({ [field]: parseFloat(newValue) })
            .eq('id', id);

        if (error) {
            alert('Failed to update price: ' + error.message);
            return;
        }

        setInventoryItems((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, [field]: parsedValue } : item,
            ),
        );
    };

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, path: '/manager/dashboard' },
        { id: 'transactions', label: 'Transactions', icon: ReceiptText, path: '/manager/transactions' },
        { id: 'inventory', label: 'Inventory', icon: Box, path: '/manager/inventory' },
        { id: 'staff', label: 'Staff', icon: Users, path: '/manager/staff' },
    ];

    const kpiData = [
        {
            label: 'Total Products',
            value: totalProducts,
            icon: Package,
            color: 'bg-blue-50 text-blue-700',
            iconColor: 'text-blue-600',
            trend: null,
        },
        {
            label: 'Low Stock',
            value: lowStockCount,
            icon: AlertTriangle,
            color: 'bg-amber-50 text-amber-700',
            iconColor: 'text-amber-600',
            trend: lowStockCount > 0 ? 'warning' : 'good',
        },
        {
            label: 'Out of Stock',
            value: outOfStockCount,
            icon: XCircle,
            color: 'bg-red-50 text-red-700',
            iconColor: 'text-red-600',
            trend: outOfStockCount > 0 ? 'critical' : 'good',
        },
        {
            label: 'Total Value',
            value: formatCurrency(totalInventoryValue),
            icon: DollarSign,
            color: 'bg-emerald-50 text-emerald-700',
            iconColor: 'text-emerald-600',
            trend: null,
        },
        {
            label: 'Inventory Cost',
            value: formatCurrency(totalInventoryValue),
            icon: TrendingUp,
            color: 'bg-indigo-50 text-indigo-700',
            iconColor: 'text-indigo-600',
            trend: totalInventoryValue > 0 ? 'up' : 'neutral',
        },
        {
            label: 'Potential Profit',
            value: formatCurrency(potentialProfit),
            icon: TrendingDown,
            color: 'bg-purple-50 text-purple-700',
            iconColor: 'text-purple-600',
            trend: potentialProfit > 0 ? 'down' : 'neutral',
        },
    ];

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">

            {/* ===== SIDEBAR (Hidden on Mobile) ===== */}
            <aside className="hidden lg:flex w-[240px] bg-white border-r border-slate-200 flex-col flex-shrink-0 h-full relative z-20">
                <div className="p-5 flex items-center gap-3 border-b border-slate-100">
                    <div className="w-9 h-9 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                        <div className="w-3.5 h-3.5 border-2 border-white rounded-sm" />
                    </div>
                    <span className="font-bold text-lg tracking-tight text-slate-900">
                        SnackAttack
                    </span>
                </div>

                <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
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
                                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none group ${isActive
                                        ? 'bg-slate-100 text-slate-900 font-semibold shadow-sm'
                                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                    }`}
                            >
                                <Icon className={`w-4 h-4 transition-all ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px] group-hover:stroke-[2.5px]'}`} />
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

            {/* ===== MAIN CONTENT ===== */}
            <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-slate-50/80 pb-24 lg:pb-0">
                <div className="flex-1 p-3 sm:p-4 lg:p-8 max-w-[1600px] w-full mx-auto">

                    {/* Header */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 lg:gap-4 mb-5 lg:mb-6">
                        <div>
                            <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
                                <span className="bg-slate-900 text-white p-1.5 rounded-xl">
                                    <Box className="w-4 h-4 lg:w-5 lg:h-5" />
                                </span>
                                Inventory Management
                            </h1>
                            <p className="text-[10px] lg:text-sm text-slate-500 mt-1 flex flex-wrap items-center gap-1.5 lg:gap-2">
                                <span>Auto-deducting 12 ingredients via mapping</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300 hidden sm:inline-block" />
                                <span className="flex items-center gap-1 text-slate-400 hidden sm:flex">
                                    <RefreshCw className="w-3 h-3" />
                                    Live
                                </span>
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 lg:gap-2.5">
                            <button
                                onClick={() => void fetchInventoryData()}
                                className="flex items-center gap-1.5 lg:gap-2 px-3 py-1.5 lg:px-4 lg:py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs lg:text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-slate-200 shadow-sm"
                            >
                                <RefreshCw className="w-3 h-3 lg:w-4 lg:h-4" />
                                <span className="hidden sm:inline">Refresh</span>
                            </button>
                            <button className="flex items-center gap-1.5 lg:gap-2 px-3 py-1.5 lg:px-4 lg:py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-slate-700 text-xs lg:text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-red-200 shadow-sm">
                                <Trash2 className="w-3 h-3 lg:w-4 lg:h-4" />
                                <span className="hidden sm:inline">Log Waste</span>
                            </button>
                            <button className="flex items-center gap-1.5 lg:gap-2 px-3.5 py-1.5 lg:px-5 lg:py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs lg:text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-slate-300 shadow-lg shadow-slate-900/10">
                                <Plus className="w-3 h-3 lg:w-4 lg:h-4" />
                                <span className="hidden sm:inline">Add Product</span>
                            </button>
                        </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3.5 mb-5 lg:mb-7">
                        {kpiData.map((kpi, idx) => {
                            const Icon = kpi.icon;
                            let trendIcon = null;
                            let trendColor = 'text-slate-400';
                            if (kpi.trend === 'up') {
                                trendIcon = <TrendingUp className="w-3 h-3" />;
                                trendColor = 'text-emerald-500';
                            } else if (kpi.trend === 'down') {
                                trendIcon = <TrendingDown className="w-3 h-3" />;
                                trendColor = 'text-blue-500';
                            } else if (kpi.trend === 'warning') {
                                trendIcon = <AlertTriangle className="w-3 h-3" />;
                                trendColor = 'text-amber-500';
                            } else if (kpi.trend === 'critical') {
                                trendIcon = <XCircle className="w-3 h-3" />;
                                trendColor = 'text-red-500';
                            } else if (kpi.trend === 'good') {
                                trendIcon = <CheckCircle2 className="w-3 h-3" />;
                                trendColor = 'text-emerald-500';
                            }

                            return (
                                <div key={idx} className="bg-white rounded-2xl p-3 lg:p-4 shadow-sm border border-slate-200/80 hover:border-slate-300 transition-all hover:shadow-md group">
                                    <div className="flex items-start justify-between">
                                        <div className={`w-7 h-7 lg:w-8 lg:h-8 rounded-xl flex items-center justify-center ${kpi.color} transition-all group-hover:scale-105`}>
                                            <Icon className={`w-3.5 h-3.5 lg:w-4 lg:h-4 ${kpi.iconColor}`} />
                                        </div>
                                        {trendIcon && (
                                            <span className={`${trendColor} flex items-center gap-0.5 text-[9px] lg:text-[10px] font-medium bg-slate-50 px-1.5 py-0.5 rounded-md`}>
                                                {trendIcon}
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-2 lg:mt-2.5">
                                        <div className="text-base lg:text-xl font-bold text-slate-900 tracking-tight">
                                            {typeof kpi.value === 'string' ? kpi.value : kpi.value}
                                        </div>
                                        <div className="text-[10px] lg:text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                                            {kpi.label}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Filter Bar */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4 lg:mb-5">
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                                <Search className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search products, categories..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 lg:pl-10 pr-4 py-2 lg:py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 shadow-sm transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                                >
                                    <XCircle className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                                </button>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                                {(['all', 'main', 'sub'] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-3 py-1 lg:px-3.5 lg:py-1.5 rounded-lg text-[10px] lg:text-xs font-medium transition-all capitalize ${activeTab === tab
                                                ? 'bg-slate-900 text-white shadow-sm'
                                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                            }`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                            <button className="flex items-center gap-1.5 lg:gap-2 px-3 py-2 lg:px-4 lg:py-2.5 bg-white hover:bg-slate-50 rounded-xl text-xs lg:text-sm font-medium text-slate-700 transition-all border border-slate-200 shadow-sm">
                                <Filter className="w-3 h-3 lg:w-4 lg:h-4 text-slate-400" />
                                <span className="hidden sm:inline">Filter</span>
                                <ChevronDown className="w-3 h-3 lg:w-3.5 lg:h-3.5 text-slate-400" />
                            </button>
                        </div>
                    </div>

                    {/* --- Inventory Card Grid (Replaces Table) --- */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                        {/* Grid Header with Tabs */}
                        <div className="flex items-center justify-between px-4 lg:px-6 py-2.5 lg:py-3.5 border-b border-slate-100 bg-slate-50/60">
                            <div className="flex items-center gap-2 lg:gap-3">
                                <div className="flex items-center gap-2">
                                    <Layers className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-slate-400" />
                                    <span className="text-xs lg:text-sm font-semibold text-slate-800">
                                        {activeTab === 'all' ? 'All Inventory' : activeTab === 'main' ? 'Main Stock' : 'Sub-Inventory'}
                                    </span>
                                </div>
                                <span className="text-[10px] lg:text-xs font-medium text-slate-400 bg-white px-2 py-0.5 lg:px-2.5 lg:py-0.5 rounded-full border border-slate-200">
                                    {filteredInventory.length} items
                                </span>
                            </div>
                            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
                                <span>Last updated: {new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </div>

                        {/* Product Grid */}
                        <div className="p-4 sm:p-6">
                            {isLoading ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {Array.from({ length: 8 }).map((_, i) => (
                                        <div key={i} className="bg-slate-50 rounded-2xl p-5 border border-slate-200 animate-pulse">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-slate-200 rounded-xl" />
                                                    <div className="space-y-1.5">
                                                        <div className="h-4 w-24 bg-slate-200 rounded" />
                                                        <div className="h-3 w-12 bg-slate-200 rounded" />
                                                    </div>
                                                </div>
                                                <div className="h-6 w-16 bg-slate-200 rounded-full" />
                                            </div>
                                            <div className="mt-4 grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <div className="h-3 w-12 bg-slate-200 rounded" />
                                                    <div className="h-5 w-full bg-slate-200 rounded" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="h-3 w-12 bg-slate-200 rounded" />
                                                    <div className="h-5 w-full bg-slate-200 rounded" />
                                                </div>
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end">
                                                <div className="h-8 w-16 bg-slate-200 rounded-lg" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : filteredInventory.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                                        <PackageOpen className="w-7 h-7 text-slate-300" />
                                    </div>
                                    <p className="text-sm font-medium text-slate-600">No inventory items found</p>
                                    <p className="text-xs text-slate-400">Try adjusting your search or filters</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {filteredInventory.map((item) => {
                                        const status = getStockStatus(item);
                                        const config = statusConfig[status.variant];
                                        const isLow = status.variant === 'warning' || status.variant === 'critical';
                                        const isSub = activeTab === 'sub';

                                        return (
                                            <div key={item.id} className={`flex flex-col rounded-2xl border p-4 sm:p-5 shadow-sm hover:shadow-md transition-all bg-white ${isLow ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'}`}>
                                                {/* Top Section: Name & Status */}
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex items-center gap-3 min-w-0 pr-2">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${isLow ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                                            {item.product_name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h3 className="font-semibold text-sm sm:text-base text-slate-900 truncate">{item.product_name}</h3>
                                                            <span className="text-[10px] text-slate-400 font-medium block">ID: {item.id.slice(0, 8)}</span>
                                                        </div>
                                                    </div>
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium flex-shrink-0 ${config.bg} ${config.text} border ${config.border} shadow-sm ${config.ring}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot} ${isLow ? 'animate-pulse' : ''}`} />
                                                        {status.label}
                                                    </span>
                                                </div>

                                                {/* Middle Section: Details */}
                                                <div className={`grid ${isSub ? 'grid-cols-1' : 'grid-cols-2'} gap-x-4 gap-y-3 text-sm mb-4`}>
                                                    {/* Category */}
                                                    <div className={isSub ? "" : ""}>
                                                        <span className="text-xs text-slate-400 font-medium block mb-0.5">Category</span>
                                                        <span className="text-[10px] lg:text-xs font-medium text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-100 inline-block">
                                                            {item.category}
                                                        </span>
                                                    </div>

                                                    {/* Base & Selling Price (Hidden for Sub) */}
                                                    {!isSub && (
                                                        <>
                                                            <div>
                                                                <span className="text-xs text-slate-400 font-medium block mb-0.5">Base Price</span>
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    defaultValue={item.base_price ?? 0}
                                                                    onBlur={(e) => void handlePriceUpdate(item.id, 'base_price', e.target.value)}
                                                                    className="w-full bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none text-sm text-right sm:text-left"
                                                                />
                                                            </div>
                                                            <div>
                                                                <span className="text-xs text-slate-400 font-medium block mb-0.5">Selling Price</span>
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    defaultValue={item.selling_price ?? 0}
                                                                    onBlur={(e) => void handlePriceUpdate(item.id, 'selling_price', e.target.value)}
                                                                    className="w-full bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none text-sm text-right sm:text-left"
                                                                />
                                                            </div>
                                                        </>
                                                    )}

                                                    {/* Stock Info */}
                                                    <div className={isSub ? "col-span-1" : ""}>
                                                        <span className="text-xs text-slate-400 font-medium block mb-0.5">Stock</span>
                                                        <div className="flex items-baseline gap-1">
                                                            <span className={`text-sm font-semibold ${isLow ? 'text-amber-700' : 'text-slate-800'}`}>
                                                                {item.pieces_stock}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 font-medium">
                                                                {isSub ? (item.product_name.toLowerCase().includes('bun') ? 'Piece' : 'Pack') : item.pieces_unit}
                                                            </span>
                                                            {isLow && (
                                                                <span className="text-[10px] text-amber-500 font-medium ml-1">⚠️ Needs Restock</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Bottom Section: Action */}
                                                <div className="mt-auto pt-3 border-t border-slate-100 flex justify-end">
                                                    <button
                                                        onClick={() => openRefillModal(item)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-all shadow-sm hover:shadow-md active:scale-95"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                        Refill
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Table Footer */}
                        {filteredInventory.length > 0 && (
                            <div className="px-4 lg:px-6 py-3 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between text-[10px] lg:text-xs text-slate-400">
                                <span>Showing {filteredInventory.length} of {inventoryItems.length} items</span>
                                <div className="flex items-center gap-2">
                                    <button className="px-2 py-1 lg:px-3 lg:py-1 rounded-lg border border-slate-200 hover:bg-white transition-colors disabled:opacity-40" disabled>
                                        Prev
                                    </button>
                                    <span className="px-1.5 py-0.5 lg:px-2 lg:py-0.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-600">1</span>
                                    <button className="px-2 py-1 lg:px-3 lg:py-1 rounded-lg border border-slate-200 hover:bg-white transition-colors disabled:opacity-40" disabled>
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Mobile-only Insights (Collapsed) */}
                    <div className="lg:hidden mt-6 space-y-6">
                        <section>
                            <div className="flex items-center justify-between mb-3.5">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-slate-400" />
                                    <h3 className="text-sm font-semibold text-slate-800">Needs Restocking</h3>
                                </div>
                                <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                    {itemsNeedingRestock.length}
                                </span>
                            </div>
                            {itemsNeedingRestock.length === 0 ? (
                                <div className="bg-emerald-50/60 rounded-xl border border-emerald-100 p-4 text-center">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1.5" />
                                    <p className="text-sm font-medium text-emerald-700">All stocked up!</p>
                                    <p className="text-xs text-emerald-500/70">No items need restocking right now.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {itemsNeedingRestock.slice(0, 5).map((item) => {
                                        const status = getStockStatus(item);
                                        const isCritical = status.variant === 'critical';
                                        return (
                                            <div key={item.id} className={`flex items-center justify-between p-3 rounded-xl border ${isCritical ? 'bg-red-50/60 border-red-100' : 'bg-amber-50/60 border-amber-100'} transition-all hover:shadow-sm`}>
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${isCritical ? 'bg-red-200 text-red-700' : 'bg-amber-200 text-amber-700'}`}>
                                                        {item.product_name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-800 truncate">
                                                        {item.product_name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <span className={`text-xs font-bold ${isCritical ? 'text-red-600' : 'text-amber-600'}`}>
                                                        {item.pieces_stock} {item.pieces_unit}
                                                    </span>
                                                    <button
                                                        onClick={() => openRefillModal(item)}
                                                        className="p-1.5 rounded-lg bg-white/80 hover:bg-white border border-slate-200 shadow-sm text-slate-600 hover:text-slate-900 transition-all"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {itemsNeedingRestock.length > 5 && (
                                        <button className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors w-full text-center py-1">
                                            +{itemsNeedingRestock.length - 5} more items
                                        </button>
                                    )}
                                </div>
                            )}
                        </section>

                        <section>
                            <div className="flex items-center justify-between mb-3.5">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-slate-400" />
                                    <h3 className="text-sm font-semibold text-slate-800">Recent Activity</h3>
                                </div>
                                <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                    {recentActivityLogs.length}
                                </span>
                            </div>

                            {recentActivityLogs.length === 0 ? (
                                <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 text-center">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2">
                                        <Clock className="w-5 h-5 text-slate-300" />
                                    </div>
                                    <p className="text-sm font-medium text-slate-500">No activity today</p>
                                    <p className="text-xs text-slate-400">Transactions will appear here</p>
                                </div>
                            ) : (
                                <div className="space-y-3 relative before:absolute before:inset-y-2 before:left-[13px] before:w-px before:bg-slate-200 before:rounded-full">
                                    {recentActivityLogs.slice(0, 6).map((log) => {
                                        const quantity = Number(log.quantity_changed);
                                        const isPositive = quantity > 0;
                                        const quantityLabel = isPositive ? `+${quantity}` : `${quantity}`;
                                        const actionColors: Record<string, { bg: string; text: string; dot: string }> = {
                                            'Refill': { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500' },
                                            'Stock In': { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500' },
                                            'Sold': { bg: 'bg-purple-50', text: 'text-purple-600', dot: 'bg-purple-500' },
                                            'Waste': { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
                                        };
                                        const colors = actionColors[log.action] ?? { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' };

                                        return (
                                            <div key={log.id} className="relative pl-9">
                                                <div className={`absolute left-0 top-1.5 w-[26px] h-[26px] rounded-full border-2 border-white flex items-center justify-center ${colors.bg} shadow-sm`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                                                </div>
                                                <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm hover:shadow-md transition-shadow">
                                                    <div className="flex items-start justify-between">
                                                        <span className="text-sm font-medium text-slate-800">
                                                            {inventoryNameById[log.item_id] ?? 'Unknown'}
                                                        </span>
                                                        <span className={`text-xs font-bold ${isPositive ? 'text-emerald-600' : 'text-slate-500'}`}>
                                                            {quantityLabel}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-1.5">
                                                        <span className={`text-[10px] font-semibold uppercase tracking-wide ${colors.text}`}>
                                                            {log.action}
                                                            <span className="text-slate-400 font-normal ml-1">by {log.action_by}</span>
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-medium">
                                                            {formatActivityTime(log.created_at)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {recentActivityLogs.length > 6 && (
                                        <button className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors w-full text-center py-1">
                                            View all {recentActivityLogs.length} activities
                                        </button>
                                    )}
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Spacer for mobile scroll */}
                    <div className="h-4" />
                </div>
            </main>

            {/* ===== RIGHT SIDEBAR (Hidden on Mobile) ===== */}
            <aside className="hidden lg:flex w-[340px] bg-white border-l border-slate-200 flex-col flex-shrink-0 h-full z-10 relative">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                            Insights
                        </h2>
                        <p className="text-[11px] text-slate-400 font-medium">Live alerts & today's movements</p>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">

                    {/* Restock Section */}
                    <section>
                        <div className="flex items-center justify-between mb-3.5">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-slate-400" />
                                <h3 className="text-sm font-semibold text-slate-800">Needs Restocking</h3>
                            </div>
                            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                {itemsNeedingRestock.length}
                            </span>
                        </div>

                        {itemsNeedingRestock.length === 0 ? (
                            <div className="bg-emerald-50/60 rounded-xl border border-emerald-100 p-4 text-center">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1.5" />
                                <p className="text-sm font-medium text-emerald-700">All stocked up!</p>
                                <p className="text-xs text-emerald-500/70">No items need restocking right now.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {itemsNeedingRestock.slice(0, 5).map((item) => {
                                    const status = getStockStatus(item);
                                    const isCritical = status.variant === 'critical';
                                    return (
                                        <div key={item.id} className={`flex items-center justify-between p-3 rounded-xl border ${isCritical ? 'bg-red-50/60 border-red-100' : 'bg-amber-50/60 border-amber-100'} transition-all hover:shadow-sm`}>
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${isCritical ? 'bg-red-200 text-red-700' : 'bg-amber-200 text-amber-700'}`}>
                                                    {item.product_name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-sm font-medium text-slate-800 truncate">
                                                    {item.product_name}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className={`text-xs font-bold ${isCritical ? 'text-red-600' : 'text-amber-600'}`}>
                                                    {item.pieces_stock} {item.pieces_unit}
                                                </span>
                                                <button
                                                    onClick={() => openRefillModal(item)}
                                                    className="p-1.5 rounded-lg bg-white/80 hover:bg-white border border-slate-200 shadow-sm text-slate-600 hover:text-slate-900 transition-all"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {itemsNeedingRestock.length > 5 && (
                                    <button className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors w-full text-center py-1">
                                        +{itemsNeedingRestock.length - 5} more items
                                    </button>
                                )}
                            </div>
                        )}
                    </section>

                    {/* Recent Activity */}
                    <section>
                        <div className="flex items-center justify-between mb-3.5">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-slate-400" />
                                <h3 className="text-sm font-semibold text-slate-800">Recent Activity</h3>
                            </div>
                            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                {recentActivityLogs.length}
                            </span>
                        </div>

                        {recentActivityLogs.length === 0 ? (
                            <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 text-center">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2">
                                    <Clock className="w-5 h-5 text-slate-300" />
                                </div>
                                <p className="text-sm font-medium text-slate-500">No activity today</p>
                                <p className="text-xs text-slate-400">Transactions will appear here</p>
                            </div>
                        ) : (
                            <div className="space-y-3 relative before:absolute before:inset-y-2 before:left-[13px] before:w-px before:bg-slate-200 before:rounded-full">
                                {recentActivityLogs.slice(0, 6).map((log) => {
                                    const quantity = Number(log.quantity_changed);
                                    const isPositive = quantity > 0;
                                    const quantityLabel = isPositive ? `+${quantity}` : `${quantity}`;
                                    const actionColors: Record<string, { bg: string; text: string; dot: string }> = {
                                        'Refill': { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500' },
                                        'Stock In': { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500' },
                                        'Sold': { bg: 'bg-purple-50', text: 'text-purple-600', dot: 'bg-purple-500' },
                                        'Waste': { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
                                    };
                                    const colors = actionColors[log.action] ?? { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' };

                                    return (
                                        <div key={log.id} className="relative pl-9">
                                            <div className={`absolute left-0 top-1.5 w-[26px] h-[26px] rounded-full border-2 border-white flex items-center justify-center ${colors.bg} shadow-sm`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                                            </div>
                                            <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex items-start justify-between">
                                                    <span className="text-sm font-medium text-slate-800">
                                                        {inventoryNameById[log.item_id] ?? 'Unknown'}
                                                    </span>
                                                    <span className={`text-xs font-bold ${isPositive ? 'text-emerald-600' : 'text-slate-500'}`}>
                                                        {quantityLabel}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between mt-1.5">
                                                    <span className={`text-[10px] font-semibold uppercase tracking-wide ${colors.text}`}>
                                                        {log.action}
                                                        <span className="text-slate-400 font-normal ml-1">by {log.action_by}</span>
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-medium">
                                                        {formatActivityTime(log.created_at)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {recentActivityLogs.length > 6 && (
                                    <button className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors w-full text-center py-1">
                                        View all {recentActivityLogs.length} activities
                                    </button>
                                )}
                            </div>
                        )}
                    </section>

                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span>{recentActivityLogs.length} log{recentActivityLogs.length === 1 ? '' : 's'} today</span>
                    <span className="flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        {new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                </div>
            </aside>

            {/* ===== MOBILE BOTTOM NAVIGATION ===== */}
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 flex items-center justify-around pb-safe pt-2 lg:hidden z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
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
                            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-colors w-full max-w-[70px] ${
                                isActive ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            <Icon className={`w-5 h-5 transition-all ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
                            <span className="text-[10px] font-medium whitespace-nowrap">{item.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* ===== REFILL MODAL ===== */}
            {isRefillModalOpen && selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Refill Stock</h3>
                                <p className="text-sm text-slate-500 flex items-center gap-2 mt-0.5">
                                    <span className="bg-slate-100 px-2 py-0.5 rounded-lg text-xs font-medium">
                                        {selectedItem?.product_name}
                                    </span>
                                </p>
                            </div>
                            <button
                                onClick={closeRefillModal}
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-5">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="text-slate-400 text-xs font-medium">Current Bulk</span>
                                    <div className="font-semibold text-slate-800">{currentBulkDisplay} {selectedItem?.bulk_unit}</div>
                                </div>
                                <div>
                                    <span className="text-slate-400 text-xs font-medium">{isBulkOnly ? 'Current Stock' : 'Current Pieces'}</span>
                                    <div className="font-semibold text-slate-800">{selectedItem?.pieces_stock ?? 0} {selectedItem?.pieces_unit}</div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    Add Bulk
                                    <span className="text-slate-400 font-normal text-xs ml-1">{getBulkLabel(selectedItem?.product_name ?? '')}</span>
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={addBulk}
                                    onChange={(e) => setAddBulk(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 transition-all bg-white"
                                    placeholder="0"
                                />
                            </div>

                            {!isBulkOnly && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                        Add Pieces
                                        <span className="text-slate-400 font-normal text-xs ml-1">({selectedItem?.pieces_unit})</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={addPieces}
                                        onChange={(e) => setAddPieces(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 transition-all bg-white"
                                        placeholder="0"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex items-center justify-end gap-2.5">
                            <button
                                onClick={closeRefillModal}
                                className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all focus:outline-none focus:ring-2 focus:ring-slate-100"
                                disabled={isSubmittingRefill}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => void handleRefillSubmit()}
                                disabled={isSubmittingRefill || (Number(addBulk) === 0 && Number(addPieces) === 0)}
                                className="px-5 py-2.5 rounded-xl bg-slate-900 text-sm font-medium text-white hover:bg-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-slate-300 shadow-lg shadow-slate-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isSubmittingRefill ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4" />
                                        Save Refill
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 99px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
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