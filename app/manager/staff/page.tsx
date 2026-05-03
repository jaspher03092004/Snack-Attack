'use client';

import React, { useState } from 'react';
import { 
  LayoutGrid, 
  ReceiptText, 
  Box, 
  Users, 
  Star,
  LogOut
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function StaffScreen() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState('staff');
  const [activeRole, setActiveRole] = useState('CASHIER');

  // Toggle states based on the image
  const [permissions, setPermissions] = useState({
    takeOrders: true,
    smallRefunds: false,
    voidOrders: false,
  });

  const handleToggle = (key: keyof typeof permissions) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
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

        {/* Bottom Status */}
        <div className="p-4 flex flex-col gap-2">
          {/* Log Out Button */}
          <button 
            onClick={() => router.push('/')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-semibold text-[13px] transition-colors mb-2 focus:outline-none"
          >
            <LogOut className="w-4 h-4 stroke-[2px]" />
            Log Out
          </button>

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

      {/* 2. Central Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto w-full max-w-[1000px]">
        <div className="flex-1 p-10">
          
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-[32px] font-extrabold tracking-tight text-slate-900 mb-1 leading-none">
                People & Performance
              </h1>
              <p className="text-[15px] font-medium text-slate-500">
                Manage shifts, attendance, and sales targets
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button className="px-5 py-3 rounded-[14px] bg-white border border-slate-200 hover:bg-slate-50 text-slate-900 font-bold text-[14px] transition-colors focus:outline-none focus:ring-4 focus:ring-slate-100 active:scale-[0.98]">
                Weekly Schedule
              </button>
              <button className="px-6 py-3 rounded-[14px] bg-slate-900 hover:bg-black text-white font-bold text-[14px] transition-colors shadow-md focus:outline-none focus:ring-4 focus:ring-slate-900/20 active:scale-[0.98]">
                Add New Staff
              </button>
            </div>
          </div>

          {/* Upsell Leaderboard */}
          <div className="bg-white rounded-[24px] p-7 shadow-sm border border-slate-100 mb-8">
            <h2 className="text-[19px] font-bold text-slate-900 tracking-tight leading-tight mb-5">
              Upsell Leaderboard (AOV)
            </h2>
            <div className="flex gap-4">
              {/* Rank 1 */}
              <div className="flex-1 bg-[#18181B] rounded-[20px] p-6 relative overflow-hidden shadow-md">
                <Star className="absolute -right-4 -top-2 w-32 h-32 text-white/5 fill-current" />
                <div className="relative z-10">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    RANK #1
                  </div>
                  <div className="text-[20px] font-bold text-white mb-4">
                    Jasper
                  </div>
                  <div className="text-[32px] font-black text-emerald-400 leading-none tracking-tight mb-1">
                    <span className="font-sans mr-1">₱</span>242.50
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    AVG. BILL VALUE
                  </div>
                </div>
              </div>

              {/* Rank 2 */}
              <div className="flex-1 bg-slate-50 border border-slate-100 rounded-[20px] p-6">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  RANK #2
                </div>
                <div className="text-[20px] font-bold text-slate-900 mb-4">
                  Maria
                </div>
                <div className="text-[32px] font-black text-slate-900 leading-none tracking-tight mb-1">
                  <span className="font-sans mr-1">₱</span>198.20
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  AVG. BILL VALUE
                </div>
              </div>

              {/* Rank 3 */}
              <div className="flex-1 bg-slate-50 border border-slate-100 rounded-[20px] p-6">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  RANK #3
                </div>
                <div className="text-[20px] font-bold text-slate-900 mb-4">
                  Kevin
                </div>
                <div className="text-[32px] font-black text-slate-900 leading-none tracking-tight mb-1">
                  <span className="font-sans mr-1">₱</span>165.00
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  AVG. BILL VALUE
                </div>
              </div>
            </div>
          </div>

          {/* Attendance Logs */}
          <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between p-6 pb-2">
              <h2 className="text-[19px] font-bold text-slate-900 tracking-tight leading-tight">
                Attendance Logs
              </h2>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                APRIL 8, 2026
              </div>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <th className="py-4 px-6 font-bold w-[280px]">STAFF MEMBER</th>
                  <th className="py-4 px-6 font-bold w-[160px]">CLOCK IN</th>
                  <th className="py-4 px-6 font-bold w-[160px]">CLOCK OUT</th>
                  <th className="py-4 px-6 font-bold w-[140px]">TOTAL HOURS</th>
                  <th className="py-4 px-6 font-bold text-right">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {/* Row 1 - Complete */}
                <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="py-5 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200"></div>
                      <span className="font-bold text-[14px] text-slate-900">Jasper (1234)</span>
                    </div>
                  </td>
                  <td className="py-5 px-6 text-[14px] font-medium text-slate-800">
                    08:00 AM
                  </td>
                  <td className="py-5 px-6 text-[14px] font-medium text-slate-800">
                    04:00 PM
                  </td>
                  <td className="py-5 px-6 text-[14px] font-bold text-slate-900">
                    8.0 hrs
                  </td>
                  <td className="py-5 px-6 text-right">
                    <a href="#" className="text-[12px] font-bold text-blue-600 hover:text-blue-800 underline underline-offset-4">
                      EDIT
                    </a>
                  </td>
                </tr>

                {/* Row 2 - Incomplete/Alert */}
                <tr className="bg-[#FFFDF5] hover:bg-[#FFF9EA] transition-colors">
                  <td className="py-5 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200"></div>
                      <span className="font-bold text-[14px] text-slate-900">Maria (5678)</span>
                    </div>
                  </td>
                  <td className="py-5 px-6 text-[14px] font-medium text-slate-800">
                    09:15 AM
                  </td>
                  <td className="py-5 px-6 text-[14px] font-bold text-[#EA580C]">
                    MISSING
                  </td>
                  <td className="py-5 px-6 text-[14px] font-medium text-slate-500">
                    --
                  </td>
                  <td className="py-5 px-6 text-right">
                    <button className="px-4 py-1.5 bg-[#18181B] text-white rounded-full text-[11px] font-bold tracking-widest shadow-sm hover:bg-black transition-colors focus:outline-none">
                      MANUAL OUT
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </main>

      {/* 3. Right Sidebar (Role Permissions) */}
      <aside className="w-[360px] bg-white border-l border-slate-200 flex flex-col flex-shrink-0 h-full shadow-[-4px_0_24px_rgba(0,0,0,0.02)] z-10 relative">
        <div className="p-8 pb-6">
          <h2 className="text-[20px] font-bold text-slate-900 tracking-tight leading-tight">Role Permissions</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            EDIT ACCESS LEVELS
          </p>
        </div>

        <div className="p-8 pt-0 flex flex-col gap-8 flex-1 overflow-y-auto custom-scrollbar">
          
          {/* Segmented Control */}
          <div className="bg-slate-100 p-1 rounded-[16px] flex items-center">
            {['CASHIER', 'SENIOR', 'MANAGER'].map(role => (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all rounded-[12px] focus:outline-none ${
                  activeRole === role 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          {/* Permisison Toggles */}
          <div className="flex flex-col gap-6">
            
            {/* Toggle 1: Take Orders */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-[14px] text-slate-900 mb-0.5">Take Orders</div>
                <div className="font-medium text-[12px] text-slate-400">Access register terminal</div>
              </div>
              <button 
                onClick={() => handleToggle('takeOrders')}
                className="relative w-12 h-6 rounded-full transition-colors duration-200 ease-in-out focus:outline-none"
                style={{ backgroundColor: permissions.takeOrders ? '#10B981' : '#E2E8F0' }}
              >
                <div 
                  className={`absolute top-[2px] w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out ${
                    permissions.takeOrders ? 'translate-x-[26px]' : 'translate-x-[2px]'
                  }`} 
                />
              </button>
            </div>

            {/* Toggle 2: Small Refunds */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-[14px] text-slate-900 mb-0.5">Small Refunds</div>
                <div className="font-medium text-[12px] text-slate-400">Up to ₱500 per shift</div>
              </div>
              <button 
                onClick={() => handleToggle('smallRefunds')}
                className="relative w-12 h-6 rounded-full transition-colors duration-200 ease-in-out focus:outline-none"
                style={{ backgroundColor: permissions.smallRefunds ? '#10B981' : '#E2E8F0' }}
              >
                <div 
                  className={`absolute top-[2px] w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out ${
                    permissions.smallRefunds ? 'translate-x-[26px]' : 'translate-x-[2px]'
                  }`} 
                />
              </button>
            </div>

            {/* Toggle 3: Void Orders */}
            <div className="flex items-center justify-between opacity-60">
              <div>
                <div className="font-bold text-[14px] text-slate-900 mb-0.5">Void Orders</div>
                <div className="font-medium text-[12px] text-slate-400">Remove paid items</div>
              </div>
              <button 
                onClick={() => handleToggle('voidOrders')}
                className="relative w-12 h-6 rounded-full transition-colors duration-200 ease-in-out focus:outline-none"
                style={{ backgroundColor: permissions.voidOrders ? '#10B981' : '#E2E8F0' }}
              >
                <div 
                  className={`absolute top-[2px] w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out ${
                    permissions.voidOrders ? 'translate-x-[26px]' : 'translate-x-[2px]'
                  }`} 
                />
              </button>
            </div>

          </div>

          {/* Shift Schedule Card */}
          <div className="mt-auto bg-[#18181B] rounded-[24px] p-6 text-white shadow-md">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
              SHIFT SCHEDULE
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-slate-700/50 pb-4">
                <span className="font-bold text-[13px]">MON - FRI</span>
                <span className="font-bold text-[13px] text-emerald-400">8AM - 4PM</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-[13px]">SAT - SUN</span>
                <span className="font-bold text-[13px] text-slate-500">OFF</span>
              </div>
            </div>
          </div>
          
        </div>
      </aside>

    </div>
  );
}
