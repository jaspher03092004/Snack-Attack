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
  LogOut
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

type InventoryItem = {
  id: string;
  product_name: string;
  category: string;
  current_stock: number;
  unit: string;
  minimum_stock: number;
  price_per_unit: number;
  status: string;
  updated_at?: string | null;
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

const formatLastUpdated = (dateValue?: string | null) => {
  if (!dateValue) return 'N/A';
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateValue));
};

const getStockStatusBadge = (item: InventoryItem) => {
  if (item.current_stock === 0) {
    return {
      label: '🔴 Out of Stock',
      className: 'bg-red-50 text-red-700 border border-red-200',
    };
  }

  if (item.current_stock <= item.minimum_stock && item.current_stock > 0) {
    return {
      label: '🟡 Low Stock',
      className: 'bg-amber-50 text-amber-700 border border-amber-200',
    };
  }

  return {
    label: '🟢 In Stock',
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  };
};

export default function InventoryScreen() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState('inventory');
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [todayLogs, setTodayLogs] = useState<InventoryLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
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

    void fetchInventoryData();
  }, []);

  const totalProducts = inventoryItems.length;

  const lowStockCount = inventoryItems.filter(
    (item) => item.current_stock <= item.minimum_stock && item.current_stock > 0
  ).length;

  const outOfStockCount = inventoryItems.filter(
    (item) => item.current_stock === 0
  ).length;

  const totalInventoryValue = inventoryItems.reduce(
    (sum, item) => sum + item.current_stock * item.price_per_unit,
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
      (item) => item.current_stock <= item.minimum_stock
    );
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

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, path: '/manager/dashboard' },
    { id: 'transactions', label: 'Transactions', icon: ReceiptText, path: '/manager/transactions' },
    { id: 'inventory', label: 'Inventory', icon: Box, path: '/manager/inventory' },
    { id: 'staff', label: 'Staff', icon: Users, path: '/manager/staff' },
  ];

  return (
    <div className="flex h-screen bg-[#F4F4F5] font-sans text-slate-900 overflow-hidden">
      
      {/* 1. Left Sidebar */}
      <aside className="w-[240px] bg-white border-r border-slate-200 flex flex-col flex-shrink-0 h-full relative z-20">
        <div className="p-6 flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-slate-900 rounded-[8px] flex items-center justify-center flex-shrink-0 shadow-sm">
            <div className="w-3 h-3 border-[2px] border-white rounded-[2px]" />
          </div>
          <span className="font-extrabold text-[19px] tracking-tight text-slate-900">
            QuickServe
          </span>
        </div>

        <nav className="flex flex-col gap-1.5 px-4 flex-1">
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
                className={`flex items-center gap-3 px-4 py-3 rounded-[12px] font-semibold text-[15px] transition-all focus:outline-none ${
                  isActive
                    ? 'bg-[#F1F5F9] text-slate-900'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Bottom Status & Actions */}
        <div className="p-4 flex flex-col gap-2 relative">
          {/* Log Out Button */}
          <button 
            onClick={() => router.push('/')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-semibold text-[13px] transition-colors mb-2 focus:outline-none"
          >
            <LogOut className="w-4 h-4 stroke-[2px]" />
            Log Out
          </button>

          <div className="bg-[#18181B] rounded-[16px] p-4 text-white shadow-md">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-3">
              SYSTEM HEALTH
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-bold text-slate-100">Pi 5 CPU</span>
              <span className="text-[12px] font-bold text-emerald-400">42°C</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1">
              <div className="bg-emerald-500 h-1 rounded-full" style={{ width: '42%' }}></div>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. Central Content Area (Inventory) */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="flex-1 p-10 max-w-[1200px] w-full mx-auto">
          
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-[32px] font-extrabold tracking-tight text-slate-900 mb-1 leading-none">
                Stock & Waste Control
              </h1>
              <p className="text-[15px] font-medium text-slate-500">
                Auto-deducting 12 ingredients via mapping
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 px-5 py-3 rounded-[14px] bg-[#FFF5F5] border border-[#FECACA] hover:bg-[#FEE2E2] text-red-500 font-bold text-[14px] transition-colors focus:outline-none focus:ring-4 focus:ring-red-100 active:scale-[0.98]">
                <Trash2 className="w-4 h-4 stroke-[2.5px]" />
                Log Accidental Waste
              </button>
              <button className="px-6 py-3 rounded-[14px] bg-slate-900 hover:bg-black text-white font-bold text-[14px] transition-colors shadow-md focus:outline-none focus:ring-4 focus:ring-slate-900/20 active:scale-[0.98]">
                Add New Ingredient
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-10">
            <div className="bg-white rounded-[20px] p-5 shadow-sm border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Total Products</div>
              <div className="text-[28px] font-black text-slate-900 leading-none">{totalProducts}</div>
            </div>
            <div className="bg-[#FFF7ED] rounded-[20px] p-5 shadow-sm border border-[#FED7AA]">
              <div className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-2">Low Stock Items</div>
              <div className="text-[28px] font-black text-orange-600 leading-none">{lowStockCount}</div>
            </div>
            <div className="bg-[#FFF5F5] rounded-[20px] p-5 shadow-sm border border-[#FECACA]">
              <div className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2">Out of Stock Items</div>
              <div className="text-[28px] font-black text-red-600 leading-none">{outOfStockCount}</div>
            </div>
            <div className="bg-white rounded-[20px] p-5 shadow-sm border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Total Inventory Value</div>
              <div className="text-[26px] font-black text-slate-900 leading-none tracking-tight">{formatCurrency(totalInventoryValue)}</div>
            </div>
            <div className="bg-[#ECFDF5] rounded-[20px] p-5 shadow-sm border border-[#A7F3D0]">
              <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2">Items Added Today</div>
              <div className="text-[28px] font-black text-emerald-600 leading-none">{itemsAddedToday}</div>
            </div>
            <div className="bg-[#FEF2F2] rounded-[20px] p-5 shadow-sm border border-[#FECACA]">
              <div className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-2">Items Used/Sold Today</div>
              <div className="text-[28px] font-black text-rose-600 leading-none">{itemsSoldToday}</div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex bg-white p-2 rounded-[20px] shadow-sm border border-slate-100 mb-8 items-center justify-between">
            <div className="relative flex-1 max-w-[400px]">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search ingredients (e.g. Buns, Patties)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-transparent text-[14px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
            <button className="flex items-center gap-6 px-4 py-2 bg-[#F8FAFC] hover:bg-slate-100 rounded-[12px] text-[13px] font-bold text-slate-500 transition-colors focus:outline-none border border-slate-200">
              Showing All Categories
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Inventory Table */}
          <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="py-5 px-8">PRODUCT</th>
                  <th className="py-5 px-6">CATEGORY</th>
                  <th className="py-5 px-6">CURRENT STOCK</th>
                  <th className="py-5 px-6">UNIT</th>
                  <th className="py-5 px-6">MINIMUM STOCK</th>
                  <th className="py-5 px-6">STATUS</th>
                  <th className="py-5 px-8">LAST UPDATED</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item) => {
                  const stockStatus = getStockStatusBadge(item);
                  return (
                    <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="py-5 px-8">
                        <div className="font-bold text-[15px] mb-0.5 text-slate-900">{item.product_name}</div>
                      </td>
                      <td className="py-5 px-6">
                        <span className="text-[13px] font-semibold text-slate-700">{item.category}</span>
                      </td>
                      <td className="py-5 px-6">
                        <span className="text-[13px] font-bold text-slate-900">{item.current_stock} {item.unit}</span>
                      </td>
                      <td className="py-5 px-6">
                        <span className="text-[13px] font-semibold text-slate-700">{item.unit}</span>
                      </td>
                      <td className="py-5 px-6">
                        <span className="text-[13px] font-bold text-slate-900">{item.minimum_stock} {item.unit}</span>
                      </td>
                      <td className="py-5 px-6">
                        <span className={`inline-flex px-3 py-1 rounded-[8px] text-[12px] font-bold ${stockStatus.className}`}>
                          {stockStatus.label}
                        </span>
                      </td>
                      <td className="py-5 px-8">
                        <span className="text-[12px] font-medium text-slate-500">{formatLastUpdated(item.updated_at)}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

        </div>
      </main>

      {/* 3. Right Sidebar */}
      <aside className="w-[360px] bg-white border-l border-slate-200 flex flex-col flex-shrink-0 h-full shadow-[-4px_0_24px_rgba(0,0,0,0.02)] z-10 relative">
        <header className="p-8 pb-6 border-b border-slate-100">
          <h2 className="text-[20px] font-bold text-slate-900 tracking-tight leading-tight">Inventory Insights</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            LIVE ALERTS AND TODAY&apos;S MOVEMENTS
          </p>
        </header>

        <div className="p-8 flex flex-col gap-8 flex-1 overflow-y-auto custom-scrollbar">
          <section>
            <h3 className="text-[14px] font-extrabold text-slate-900 tracking-tight mb-4">⚠ Needs Restocking</h3>
            <div className="bg-[#FFFBEB] rounded-[16px] border border-amber-100 p-4">
              {itemsNeedingRestock.length === 0 ? (
                <p className="text-[13px] font-medium text-emerald-700">All items are above minimum stock.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {itemsNeedingRestock.map((item) => (
                    <li key={item.id} className="text-[13px] font-semibold text-slate-800">
                      • {item.product_name} ({item.current_stock} {item.unit})
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-[14px] font-extrabold text-slate-900 tracking-tight mb-4">Recent Inventory Activity</h3>
            <div className="bg-slate-50 rounded-[16px] border border-slate-200 p-4">
              {recentActivityLogs.length === 0 ? (
                <p className="text-[13px] font-medium text-slate-500">No inventory activity logged today.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {recentActivityLogs.map((log) => {
                    const quantity = Number(log.quantity_changed);
                    const quantityLabel = quantity > 0 ? `+${quantity}` : `${quantity}`;
                    return (
                      <div key={log.id} className="bg-white rounded-[12px] border border-slate-200 p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[12px] font-bold text-slate-500">{formatActivityTime(log.created_at)}</span>
                          <span className={`text-[12px] font-bold ${quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {quantityLabel}
                          </span>
                        </div>
                        <div className="text-[13px] font-bold text-slate-900 mb-1">
                          {inventoryNameById[log.item_id] ?? 'Unknown Product'}
                        </div>
                        <div className="text-[12px] font-semibold text-slate-600">
                          {log.action} by {log.action_by}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
          
        </div>

        {/* Footer */}
        <div className="p-6 bg-white border-t border-slate-100 mt-auto">
          <div className="text-[12px] font-semibold text-slate-500">
            Showing {recentActivityLogs.length} activity log{recentActivityLogs.length === 1 ? '' : 's'} for today.
          </div>
        </div>
      </aside>

    </div>
  );
}
