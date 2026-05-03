'use client';

import React, { useState } from 'react';
import { 
  LayoutGrid, 
  ReceiptText, 
  Box, 
  Users, 
  Search,
  ChevronDown,
  Trash2,
  ArrowLeft,
  LogOut
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const INITIAL_INVENTORY = [
  { 
    id: 'inv-1', 
    name: 'Beef Patties (Frozen)', 
    category: 'MEAT / MAIN', 
    level: 420, 
    threshold: 50, 
    capacity: 500, 
    mappingCount: 4, 
    isOnline: true 
  },
  { 
    id: 'inv-2', 
    name: 'Brioche Buns', 
    category: 'BAKERY / BREAD', 
    level: 32, 
    threshold: 50, 
    capacity: 100, 
    mappingCount: 2, 
    isOnline: false 
  }
];

export default function InventoryScreen() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState('inventory');
  const [inventory, setInventory] = useState(INITIAL_INVENTORY);
  const [searchQuery, setSearchQuery] = useState('');
  const [alertThreshold, setAlertThreshold] = useState('50');

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, path: '/manager/dashboard' },
    { id: 'transactions', label: 'Transactions', icon: ReceiptText, path: '/manager/transactions' },
    { id: 'inventory', label: 'Inventory', icon: Box, path: '/manager/inventory' },
    { id: 'staff', label: 'Staff', icon: Users, path: '/manager/staff' },
  ];

  const handleToggleSwitch = (id: string) => {
    setInventory(prev => prev.map(item => 
      item.id === id ? { ...item, isOnline: !item.isOnline } : item
    ));
  };

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
          <div className="grid grid-cols-4 gap-6 mb-10">
            <div className="bg-white rounded-[20px] p-6 shadow-sm border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">STOCK VALUE</div>
              <div className="text-[28px] font-black text-slate-900 leading-none">
                <span className="font-sans mr-1">₱</span>84,200
              </div>
            </div>
            <div className="bg-[#FFF5F5] rounded-[20px] p-6 shadow-sm border border-[#FEE2E2]">
              <div className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2">CRITICAL ALERTS</div>
              <div className="text-[28px] font-black text-red-500 leading-none tracking-tight">
                3 Items
              </div>
            </div>
            <div className="bg-white rounded-[20px] p-6 shadow-sm border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">WASTE TODAY</div>
              <div className="text-[28px] font-black text-[#EA580C] leading-none">
                <span className="font-sans mr-1">₱</span>1,420
              </div>
            </div>
            <div className="bg-white rounded-[20px] p-6 shadow-sm border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">SYNC STATUS</div>
              <div className="text-[28px] font-black text-emerald-500 leading-none tracking-tight">
                Live
              </div>
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
                  <th className="py-5 px-8">INGREDIENT</th>
                  <th className="py-5 px-6">CURRENT LEVEL</th>
                  <th className="py-5 px-6">THRESHOLD</th>
                  <th className="py-5 px-6">MAPPING</th>
                  <th className="py-5 px-8">86 MASTER SWITCH</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => {
                  const isCritical = item.level <= item.threshold;
                  return (
                    <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="py-5 px-8">
                        <div className={`font-bold text-[15px] mb-0.5 ${isCritical ? 'text-red-500 italic' : 'text-slate-900'}`}>
                          {item.name}
                        </div>
                        <div className={`text-[10px] font-bold uppercase tracking-wider ${isCritical ? 'text-red-300' : 'text-slate-400'}`}>
                          {item.category}
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-3">
                          <span className={`font-bold text-[18px] w-10 ${isCritical ? 'text-red-500' : 'text-slate-900'}`}>
                            {item.level}
                          </span>
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden flex-shrink-0">
                            <div 
                              className={`h-full rounded-full ${isCritical ? 'bg-red-400' : 'bg-emerald-500'}`} 
                              style={{ width: `${Math.min(100, Math.max(0, (item.level / item.capacity) * 100))}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        <span className={`inline-flex px-3 py-1 rounded-[8px] text-[12px] font-bold ${
                          isCritical ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {item.threshold} units
                        </span>
                      </td>
                      <td className="py-5 px-6">
                        <a href="#" className={`text-[13px] font-semibold underline underline-offset-4 ${isCritical ? 'text-red-400 hover:text-red-500' : 'text-slate-400 hover:text-slate-600'}`}>
                          {item.mappingCount} Menu Items
                        </a>
                      </td>
                      <td className="py-5 px-8">
                        <div className="flex flex-col items-start justify-center h-full">
                          <button 
                            onClick={() => handleToggleSwitch(item.id)}
                            className="relative w-12 h-6 rounded-full transition-colors duration-200 ease-in-out focus:outline-none"
                            style={{ backgroundColor: item.isOnline ? '#10B981' : '#E2E8F0' }}
                          >
                            <div 
                              className={`absolute top-[2px] w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out ${
                                item.isOnline ? 'translate-x-[26px]' : 'translate-x-[2px]'
                              }`} 
                            />
                          </button>
                          {!item.isOnline && (
                            <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider mt-1.5 absolute translate-y-6">
                              OFFLINE IN POS
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

        </div>
      </main>

      {/* 3. Right Sidebar (Ingredient Mapping) */}
      <aside className="w-[360px] bg-white border-l border-slate-200 flex flex-col flex-shrink-0 h-full shadow-[-4px_0_24px_rgba(0,0,0,0.02)] z-10 relative">
        <header className="p-8 pb-6 border-b border-slate-100">
          <h2 className="text-[20px] font-bold text-slate-900 tracking-tight leading-tight">Ingredient Mapping</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            RULES FOR &quot;BRIOCHE BUNS&quot;
          </p>
        </header>

        <div className="p-8 flex flex-col gap-8 flex-1 overflow-y-auto custom-scrollbar">
          
          {/* Mapping Card */}
          <div className="bg-[#18181B] rounded-[24px] p-6 shadow-md text-white">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
              AUTO-DEDUCT RULES
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-slate-700/50 pb-4">
                <span className="font-bold text-[14px]">Cheeseburger</span>
                <span className="font-semibold text-[13px] text-slate-300">1 unit / sale</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-[14px]">Double Patty Burger</span>
                <span className="font-semibold text-[13px] text-slate-300">1 unit / sale</span>
              </div>
            </div>
          </div>

          {/* Alert Settings */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">
              ALERT SETTINGS
            </div>
            <div className="bg-slate-50 rounded-[16px] p-5 border border-slate-100">
              <label className="block text-[13px] font-bold text-slate-900 mb-3">
                Notification Threshold
              </label>
              <div className="flex items-center gap-3">
                <input 
                  type="text" 
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(e.target.value)}
                  className="w-[80px] px-4 py-3 bg-white border border-slate-200 rounded-[12px] text-[15px] font-bold text-slate-900 text-center focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all shadow-sm"
                />
                <span className="text-[13px] font-medium text-slate-500">
                  units remaining
                </span>
              </div>
            </div>
          </div>
          
        </div>

        {/* Footer Button */}
        <div className="p-6 bg-white border-t border-slate-100 mt-auto">
          <button className="w-full py-4 rounded-[16px] bg-[#F4F4F5] hover:bg-slate-200 text-slate-900 font-bold text-[15px] flex items-center justify-center transition-colors focus:outline-none focus:ring-4 focus:ring-slate-100 active:scale-[0.98]">
            Save Logic Changes
          </button>
        </div>
      </aside>

    </div>
  );
}
