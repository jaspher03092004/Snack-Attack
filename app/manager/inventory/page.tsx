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
  Clock
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

const getStockStatusBadge = (item: InventoryItem) => {
  const normalizedStatus = item.status.toLowerCase();
  const piecesStock = Number(item.pieces_stock ?? 0);

  if (normalizedStatus.includes('critical') || normalizedStatus.includes('out') || piecesStock === 0) {
    return {
      label: 'Out of Stock',
      className: 'bg-red-50 text-red-700 border border-red-200',
      dot: 'bg-red-500'
    };
  }

  if (normalizedStatus.includes('low')) {
    return {
      label: 'Low Stock',
      className: 'bg-orange-50 text-orange-700 border border-orange-200',
      dot: 'bg-orange-500'
    };
  }

  return {
    label: 'In Stock',
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    dot: 'bg-emerald-500'
  };
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

  const fetchInventoryData = async () => {
    if (!supabase) {
      setInventoryItems([]);
      setTodayLogs([]);
      return;
    }

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

  const handleRefillSubmit = async () => {
    if (!supabase || !selectedItem || isSubmittingRefill) return;

    const bulkToAdd = Math.max(0, Number(addBulk) || 0);
    const piecesToAdd = Math.max(0, Number(addPieces) || 0);

    if (bulkToAdd === 0 && piecesToAdd === 0) return;

    setIsSubmittingRefill(true);

    const newBulkStock = Number(selectedItem.bulk_stock ?? 0) + bulkToAdd;
    const newPiecesStock = Number(selectedItem.pieces_stock ?? 0) + piecesToAdd;

    const { error: updateError } = await supabase
      .from('inventory')
      .update({
        bulk_stock: newBulkStock,
        pieces_stock: newPiecesStock,
      })
      .eq('id', selectedItem.id);

    if (!updateError) {
      await supabase.from('inventory_logs').insert({
        item_id: selectedItem.id,
        action: 'Refill',
        quantity_changed: bulkToAdd + piecesToAdd,
        action_by: 'Manager',
      });

      await fetchInventoryData();
      closeRefillModal();
    }

    setIsSubmittingRefill(false);
  };

  const totalProducts = inventoryItems.length;

  const lowStockCount = inventoryItems.filter(
    (item) => item.status.toLowerCase().includes('low')
  ).length;

  const outOfStockCount = inventoryItems.filter(
    (item) => item.status.toLowerCase().includes('critical') || item.status.toLowerCase().includes('out') || Number(item.pieces_stock ?? 0) === 0
  ).length;

  const totalInventoryValue = inventoryItems.reduce(
    (sum, item) => sum + Number(item.current_stock ?? 0) * Number(item.price_per_unit ?? 0),
    0
  );

  const itemsAddedToday = todayLogs
    .filter((log) => log.action === 'Stock In')
    .reduce((sum, log) => sum + Number(log.quantity_changed), 0);

  const itemsSoldToday = todayLogs
    .filter((log) => log.action === 'Sold')
    .reduce((sum, log) => sum + Math.abs(Number(log.quantity_changed)), 0);

  const filteredInventory = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return inventoryItems;
    return inventoryItems.filter((item) => {
      return (
        item.product_name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      );
    });
  }, [inventoryItems, searchQuery]);

  const itemsNeedingRestock = useMemo(() => {
    return inventoryItems.filter(
      (item) => {
        const status = item.status.toLowerCase();
        return status.includes('low') || status.includes('critical') || status.includes('out');
      }
    );
  }, [inventoryItems]);

  const mainInventoryItems = useMemo(() => {
    return filteredInventory.filter((item) => item.inventory_type === 'main');
  }, [filteredInventory]);

  const subInventoryItems = useMemo(() => {
    return filteredInventory.filter((item) => item.inventory_type === 'sub');
  }, [filteredInventory]);

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

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, path: '/manager/dashboard' },
    { id: 'transactions', label: 'Transactions', icon: ReceiptText, path: '/manager/transactions' },
    { id: 'inventory', label: 'Inventory', icon: Box, path: '/manager/inventory' },
    { id: 'staff', label: 'Staff', icon: Users, path: '/manager/staff' },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      
      {/* 1. Left Sidebar */}
      <aside className="w-[240px] bg-white border-r border-slate-200 flex flex-col flex-shrink-0 h-full relative z-20">
        <div className="p-6 flex items-center gap-3 mb-2">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
            <div className="w-3 h-3 border-2 border-white rounded-sm" />
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-900">
            QuickServe
          </span>
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
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all focus:outline-none ${
                  isActive
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Bottom Status & Actions */}
        <div className="p-4 flex flex-col gap-3 relative">
          <button 
            onClick={() => router.push('/')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 text-sm font-medium transition-colors focus:outline-none"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>

          <div className="bg-slate-900 rounded-xl p-4 text-white shadow-sm">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
              System Health
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-200">Pi 5 CPU</span>
              <span className="text-xs font-semibold text-emerald-400">42°C</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: '42%' }}></div>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. Central Content Area (Inventory) */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="flex-1 p-8 lg:p-10 max-w-[1400px] w-full mx-auto">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">
                Stock & Waste Control
              </h1>
              <p className="text-sm text-slate-500">
                Auto-deducting 12 ingredients via mapping
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 hover:text-red-600 text-slate-700 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200 shadow-sm">
                <Trash2 className="w-4 h-4" />
                Log Waste
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <div className="text-xs font-medium text-slate-500 mb-1">Total Products</div>
              <div className="text-2xl font-bold text-slate-900">{totalProducts}</div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <div className="text-xs font-medium text-slate-500 mb-1">Low Stock</div>
              <div className="text-2xl font-bold text-orange-600">{lowStockCount}</div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <div className="text-xs font-medium text-slate-500 mb-1">Out of Stock</div>
              <div className="text-2xl font-bold text-red-600">{outOfStockCount}</div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <div className="text-xs font-medium text-slate-500 mb-1">Total Value</div>
              <div className="text-2xl font-bold text-slate-900 tracking-tight">{formatCurrency(totalInventoryValue)}</div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <div className="text-xs font-medium text-slate-500 mb-1">Added Today</div>
              <div className="text-2xl font-bold text-emerald-600">{itemsAddedToday}</div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
              <div className="text-xs font-medium text-slate-500 mb-1">Sold Today</div>
              <div className="text-2xl font-bold text-blue-600">{itemsSoldToday}</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search ingredients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 shadow-sm transition-shadow"
              />
            </div>
            <button className="flex items-center justify-between gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 rounded-xl text-sm font-medium text-slate-700 transition-colors focus:outline-none border border-slate-200 shadow-sm sm:min-w-[200px]">
              All Categories
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Main Inventory Table */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <h2 className="text-sm font-semibold text-slate-900">Main Inventory</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Bulk Stock</th>
                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Pieces Stock</th>
                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mainInventoryItems.map((item) => {
                    const stockStatus = getStockStatusBadge(item);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="py-4 px-6">
                          <div className="font-semibold text-sm text-slate-900">{item.product_name}</div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm text-slate-600">{item.category}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm font-medium text-slate-900">{item.bulk_stock} {item.bulk_unit}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm font-medium text-slate-900">{item.pieces_stock} {item.pieces_unit}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${stockStatus.className}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${stockStatus.dot}`}></span>
                            {stockStatus.label}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => openRefillModal(item)}
                            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors"
                          >
                            Refill
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {mainInventoryItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center">
                        <p className="text-sm text-slate-500">No main inventory items found matching your criteria.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Sub-Inventory Table */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
              <h2 className="text-sm font-semibold text-slate-900">Sub-Inventory</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Bulk Stock</th>
                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Pieces Stock</th>
                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subInventoryItems.map((item) => {
                    const stockStatus = getStockStatusBadge(item);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="py-4 px-6">
                          <div className="font-semibold text-sm text-slate-900">{item.product_name}</div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm text-slate-600">{item.category}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm font-medium text-slate-900">{item.bulk_stock} {item.bulk_unit}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm font-medium text-slate-900">{item.pieces_stock} {item.pieces_unit}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${stockStatus.className}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${stockStatus.dot}`}></span>
                            {stockStatus.label}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => openRefillModal(item)}
                            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors"
                          >
                            Refill
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {subInventoryItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center">
                        <p className="text-sm text-slate-500">No sub-inventory items found matching your criteria.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

        </div>
      </main>

      {/* 3. Right Sidebar */}
      <aside className="w-[320px] bg-white border-l border-slate-200 flex flex-col flex-shrink-0 h-full z-10 relative">
        <header className="p-6 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Insights & Activity</h2>
          <p className="text-xs text-slate-500 mt-1">
            Live alerts and today&apos;s movements
          </p>
        </header>

        <div className="p-6 flex flex-col gap-8 flex-1 overflow-y-auto custom-scrollbar">
          
          <section>
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900">Needs Restocking</h3>
            </div>
            
            {itemsNeedingRestock.length === 0 ? (
              <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 text-center">
                <p className="text-sm text-slate-500">All items are sufficiently stocked.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {itemsNeedingRestock.map((item) => (
                  <div key={item.id} className="bg-orange-50/50 rounded-xl border border-orange-100 p-3 flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-800">{item.product_name}</span>
                    <span className="text-xs font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-md">
                      {item.pieces_stock} {item.pieces_unit}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900">Recent Activity</h3>
            </div>
            
            {recentActivityLogs.length === 0 ? (
              <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 text-center">
                <p className="text-sm text-slate-500">No activity logged today.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 relative before:absolute before:inset-y-2 before:left-[11px] before:w-px before:bg-slate-200">
                {recentActivityLogs.map((log) => {
                  const quantity = Number(log.quantity_changed);
                  const isPositive = quantity > 0;
                  const quantityLabel = isPositive ? `+${quantity}` : `${quantity}`;
                  
                  return (
                    <div key={log.id} className="relative pl-8">
                      <div className={`absolute left-0 top-1.5 w-[22px] h-[22px] rounded-full border-2 border-white flex items-center justify-center ${isPositive ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      </div>
                      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                        <div className="flex items-start justify-between mb-1">
                          <span className="text-sm font-medium text-slate-900">
                            {inventoryNameById[log.item_id] ?? 'Unknown'}
                          </span>
                          <span className={`text-xs font-bold ${isPositive ? 'text-emerald-600' : 'text-slate-600'}`}>
                            {quantityLabel}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-slate-500">
                            {log.action} by {log.action_by}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {formatActivityTime(log.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
          
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 mt-auto">
          <div className="text-xs text-center text-slate-500">
            Showing {recentActivityLogs.length} activity log{recentActivityLogs.length === 1 ? '' : 's'} today
          </div>
        </div>
      </aside>

      {isRefillModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Refill Stock</h3>
            <p className="text-sm text-slate-500 mb-5">{selectedItem.product_name}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Add Bulk</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={addBulk}
                  onChange={(e) => setAddBulk(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Add Pieces</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={addPieces}
                  onChange={(e) => setAddPieces(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={closeRefillModal}
                className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
                disabled={isSubmittingRefill}
              >
                Cancel
              </button>
              <button
                onClick={() => void handleRefillSubmit()}
                className="px-4 py-2 rounded-lg bg-slate-900 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                disabled={isSubmittingRefill}
              >
                {isSubmittingRefill ? 'Saving...' : 'Save Refill'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}