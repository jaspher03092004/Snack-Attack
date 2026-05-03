'use client';

import React, { useState } from 'react';
import { 
  LayoutGrid, 
  ReceiptText, 
  Box, 
  Users, 
  ArrowUp, 
  ArrowLeft,
  LogOut
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ManagerDashboard() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState('dashboard');

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, path: '/manager/dashboard' },
    { id: 'transactions', label: 'Transactions', icon: ReceiptText, path: '/manager/transactions' },
    { id: 'inventory', label: 'Inventory', icon: Box, path: '/manager/inventory' },
    { id: 'staff', label: 'Staff', icon: Users, path: '/manager/staff' },
  ];

  return (
    <div className="flex min-h-screen bg-[#F4F4F5] font-sans text-slate-900">
      
      {/* 1. Left Sidebar */}
      <aside className="w-[240px] bg-white border-r border-slate-200 flex flex-col flex-shrink-0 h-screen sticky top-0">
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
        <div className="p-4 flex flex-col gap-2">
          {/* Log Out Button */}
          <button 
            onClick={() => router.push('/')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-semibold text-[13px] transition-colors mb-2 focus:outline-none"
          >
            <LogOut className="w-4 h-4 stroke-[2px]" />
            Log Out
          </button>

          {/* Status Box */}
          <div className="bg-[#F0F7FF] border border-[#E0EFFF] rounded-[12px] p-3">
            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">
              PI 5 STATUS
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-slate-800">
                Temp: 42°C
              </span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <main className="flex-1 p-10 overflow-y-auto">
        
        {/* Header Section */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="text-[32px] font-extrabold tracking-tight text-slate-900 mb-1 leading-none">
              Dashboard Overview
            </h1>
            <p className="text-[15px] font-medium text-slate-500">
              Wednesday, April 8, 2026
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-5 py-2.5 rounded-full bg-white border border-slate-200 text-slate-900 font-bold text-[14px] hover:bg-slate-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10">
              Export CSV
            </button>
            <button className="px-5 py-2.5 rounded-full bg-slate-900 text-white font-bold text-[14px] hover:bg-black transition-colors shadow-md focus:outline-none focus:ring-4 focus:ring-slate-900/20">
              Print Report
            </button>
          </div>
        </div>

        {/* KPI Card Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          
          {/* Card 1: Revenue */}
          <div className="bg-white rounded-[24px] p-7 shadow-sm border border-slate-100/50">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">
              TOTAL REVENUE TODAY
            </div>
            <div className="text-[40px] font-black text-slate-900 leading-none mb-3 flex items-start tracking-tight">
              <span className="text-2xl mt-1.5 mr-1 font-sans">₱</span>24,850.00
            </div>
            <div className="flex items-center text-emerald-600 font-bold text-[13px]">
              <ArrowUp className="w-4 h-4 mr-1 stroke-[2.5px]" />
              12% vs yesterday
            </div>
          </div>

          {/* Card 2: Orders */}
          <div className="bg-white rounded-[24px] p-7 shadow-sm border border-slate-100/50 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                TOTAL ORDERS
              </div>
              <div className="text-[40px] font-black text-slate-900 leading-none tracking-tight">
                142
              </div>
            </div>
            <div className="text-slate-500 font-medium text-[13px] mt-3">
              Average bill: <span className="font-sans">₱</span>175.00
            </div>
          </div>

          {/* Card 3: Alerts */}
          <div className="bg-white rounded-[24px] p-7 shadow-sm border border-slate-100/50 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                INVENTORY ALERTS
              </div>
              <div className="text-[40px] font-black text-red-500 leading-none tracking-tight">
                3
              </div>
            </div>
            <div className="text-red-500 font-bold text-[13px] mt-3">
              Buns, Patties, Mayo
            </div>
          </div>

        </div>

        {/* Main Visuals Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Chart Placeholder (Takes up 2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-[24px] p-8 shadow-sm border border-slate-100/50 h-[380px] flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-[18px] font-bold text-slate-900">Hourly Sales</h2>
              <div className="bg-slate-100 rounded-full px-4 py-1.5 flex items-center select-none cursor-pointer">
                <span className="text-[13px] font-bold text-slate-800">Today</span>
              </div>
            </div>
            
            {/* Mock Chart Area */}
            <div className="flex-1 bg-[#F8FAFC] rounded-[16px] flex items-end justify-center p-6 gap-2">
              <div className="w-[12%] bg-[#E2E8F0] rounded-t-[8px] h-[15%]" />
              <div className="w-[12%] bg-[#E2E8F0] rounded-t-[8px] h-[30%]" />
              <div className="w-[12%] bg-[#E2E8F0] rounded-t-[8px] h-[45%]" />
              <div className="w-[16%] bg-slate-900 rounded-t-[8px] h-[85%]" />
              <div className="w-[12%] bg-[#E2E8F0] rounded-t-[8px] h-[60%]" />
              <div className="w-[12%] bg-[#E2E8F0] rounded-t-[8px] h-[30%]" />
              <div className="w-[12%] bg-[#E2E8F0] rounded-t-[8px] h-[40%]" />
            </div>
          </div>

          {/* Live Feed (Takes up 1 col) */}
          <div className="bg-white rounded-[24px] p-8 shadow-sm border border-slate-100/50 h-[380px] flex flex-col">
            <h2 className="text-[18px] font-bold text-slate-900 mb-6">Live Feed</h2>
            
            <div className="flex flex-col gap-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              
              {/* Entry 1 */}
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-[15px] text-slate-900 mb-0.5">Order #142</div>
                  <div className="font-medium text-[12px] text-slate-400">2m ago • Cash</div>
                </div>
                <div className="font-bold text-[15px] text-slate-900">
                  <span className="font-sans mr-[1px]">₱</span>431.20
                </div>
              </div>

              {/* Entry 2 */}
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-[15px] text-slate-900 mb-0.5">Order #141</div>
                  <div className="font-medium text-[12px] text-slate-400">8m ago • GCash</div>
                </div>
                <div className="font-bold text-[15px] text-slate-900">
                  <span className="font-sans mr-[1px]">₱</span>150.00
                </div>
              </div>

              {/* Entry 3 (Void) */}
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-[15px] text-red-500 mb-0.5">VOID: Order #138</div>
                  <div className="font-medium text-[12px] text-red-400">15m ago • Manager Required</div>
                </div>
                <div className="font-bold text-[15px] text-red-500">
                  -<span className="font-sans mr-[1px]">₱</span>220.00
                </div>
              </div>

            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
