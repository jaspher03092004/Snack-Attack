'use client';

import React, { useState } from 'react';
import { 
  LayoutGrid, 
  ReceiptText, 
  Box, 
  Users, 
  ArrowLeft,
  Calculator,
  Search,
  ChevronDown,
  X,
  Printer,
  LogOut
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// --- Mock Data ---
const MOCK_TRANSACTIONS = [
  {
    id: '#ORD-142',
    time: '12:42 PM',
    cashier: 'Jasper (1234)',
    method: 'Cash',
    status: 'Completed',
    total: 431.20,
    contents: [
      { name: '1x Classic Cheeseburger', price: 150.00 },
      { name: '1x Double Smash Burger', price: 220.00 },
      { name: '1x Large Fries', price: 61.20 }
    ],
    transactionId: 'TX_9823475924',
    terminal: 'POS-01 (Kitchen Hub)'
  },
  {
    id: '#ORD-138',
    time: '12:28 PM',
    cashier: 'Jasper (1234)',
    method: 'GCash',
    status: 'VOIDED',
    total: -220.00,
    voidReason: '"Customer changed mind after punch-in. Accidentally ordered Double Patty instead of Solo."',
    authorizedBy: 'Admin (0001)',
    contents: [
      { 
        name: '1x Double Patty Smash', 
        price: 220.00, 
        subnote: '- Extra Cheese (₱20 included)' 
      }
    ],
    transactionId: 'TX_9823475923',
    terminal: 'POS-01 (Kitchen Hub)'
  },
  {
    id: '#ORD-137',
    time: '12:15 PM',
    cashier: 'Maria (5678)',
    method: 'Maya',
    status: 'Completed',
    total: 850.00,
    contents: [
      { name: '1x Family Pizza Combo', price: 850.00 }
    ],
    transactionId: 'TX_9823475920',
    terminal: 'POS-02 (Front)'
  }
];

export default function TransactionsAudit() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState('transactions');
  const [selectedOrder, setSelectedOrder] = useState<typeof MOCK_TRANSACTIONS[0] | null>(MOCK_TRANSACTIONS[1]); // Default to the voided one for preview
  const [searchQuery, setSearchQuery] = useState('');

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, path: '/manager/dashboard' },
    { id: 'transactions', label: 'Transactions', icon: ReceiptText, path: '/manager/transactions' },
    { id: 'inventory', label: 'Inventory', icon: Box, path: '/manager/inventory' },
    { id: 'staff', label: 'Staff', icon: Users, path: '/manager/staff' },
  ];

  return (
    <div className="flex min-h-screen bg-[#F4F4F5] font-sans text-slate-900 overflow-hidden">
      
      {/* 1. Left Sidebar */}
      <aside className="w-[240px] bg-white border-r border-slate-200 flex flex-col flex-shrink-0 h-screen sticky top-0 z-20 shadow-sm relative">
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
      <main className="flex-1 overflow-y-auto flex">
        
        {/* Table & Filters Section */}
        <div className="flex-1 p-10 max-w-full">
          
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-[32px] font-extrabold tracking-tight text-slate-900 mb-1 leading-none">
                Transactions & Audit
              </h1>
              <p className="text-[15px] font-medium text-slate-500">
                Verify sales integrity and reconcile drawer
              </p>
            </div>
            
            <button className="flex items-center gap-2 px-5 py-3 rounded-full bg-slate-900 hover:bg-black text-white font-bold text-[14px] transition-colors shadow-md focus:outline-none focus:ring-4 focus:ring-slate-900/20 active:scale-[0.98]">
              <Calculator className="w-4 h-4 stroke-[2.5px]" />
              EOD Reconciliation
            </button>
          </div>

          {/* Filters Bar */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-[360px]">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search Order ID / Receipt..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-[12px] text-[14px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all shadow-sm"
              />
            </div>

            <button className="flex items-center justify-between gap-10 bg-white border border-slate-200 px-4 py-3 rounded-[12px] text-[14px] font-semibold text-slate-800 hover:bg-slate-50 transition-colors shadow-sm focus:outline-none min-w-[150px]">
              Today: April 8
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            <button className="flex items-center justify-between gap-10 bg-white border border-slate-200 px-4 py-3 rounded-[12px] text-[14px] font-semibold text-slate-800 hover:bg-slate-50 transition-colors shadow-sm focus:outline-none min-w-[160px]">
              All Cashiers
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            <button className="flex items-center justify-between gap-10 bg-white border border-slate-200 px-4 py-3 rounded-[12px] text-[14px] font-semibold text-slate-800 hover:bg-slate-50 transition-colors shadow-sm focus:outline-none min-w-[150px]">
              All Methods
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-[24px] shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-slate-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-2">
                  <th className="py-5 px-6 font-bold w-[120px]">Time</th>
                  <th className="py-5 px-6 font-bold">Order ID</th>
                  <th className="py-5 px-6 font-bold">Cashier</th>
                  <th className="py-5 px-6 font-bold">Method</th>
                  <th className="py-5 px-6 font-bold">Status</th>
                  <th className="py-5 px-6 font-bold text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_TRANSACTIONS.map((txn, idx) => {
                  const isVoid = txn.status === 'VOIDED';
                  const isSelected = selectedOrder?.id === txn.id;
                  
                  return (
                    <tr 
                      key={txn.id}
                      onClick={() => setSelectedOrder(txn)}
                      className={`border-b border-slate-50 last:border-0 cursor-pointer transition-colors ${
                        isSelected 
                          ? (isVoid ? 'bg-red-50/40' : 'bg-slate-50') 
                          : 'hover:bg-slate-50/50'
                      }`}
                    >
                      <td className={`py-5 px-6 text-[14px] font-medium ${isVoid ? 'text-red-400' : 'text-slate-500'}`}>
                        {txn.time}
                      </td>
                      <td className={`py-5 px-6 text-[15px] font-bold ${isVoid ? 'text-red-600' : 'text-slate-900'}`}>
                        {txn.id}
                      </td>
                      <td className={`py-5 px-6 text-[14px] font-medium ${isVoid ? 'text-red-500' : 'text-slate-600'}`}>
                        {txn.cashier}
                      </td>
                      <td className={`py-5 px-6 text-[14px] font-medium ${isVoid ? 'text-red-500' : 'text-slate-600'}`}>
                        {txn.method}
                      </td>
                      <td className="py-5 px-6">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                          isVoid 
                            ? 'bg-red-500 text-white shadow-sm' 
                            : 'bg-emerald-100/50 text-emerald-600 border border-emerald-200/50'
                        }`}>
                          {txn.status}
                        </span>
                      </td>
                      <td className={`py-5 px-6 text-[15px] font-bold text-right ${isVoid ? 'text-red-600' : 'text-slate-900'}`}>
                        {isVoid && '-'}<span className="font-sans mr-0.5">₱</span>{Math.abs(txn.total).toFixed(2)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

        </div>

        {/* 3. Order Details Side-Panel (Right) */}
        {selectedOrder && (
          <aside className="w-[380px] bg-white border-l border-slate-200 flex flex-col flex-shrink-0 min-h-screen shadow-[-4px_0_24px_rgba(0,0,0,0.02)] z-10 sticky top-0 animate-in slide-in-from-right-8 duration-300">
            
            {/* Header */}
            <header className="flex items-center justify-between px-7 py-8 border-b border-slate-100">
              <div>
                <h2 className="text-[20px] font-bold text-slate-900 tracking-tight leading-tight">Order Details</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Digital Audit Trail</p>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-7 flex flex-col gap-8 custom-scrollbar">
              
              {/* Order ID & Badge Location */}
              <div className="flex items-center justify-between">
                <h3 className="text-[28px] font-black tracking-tight text-slate-900 leading-none">
                  {selectedOrder.id}
                </h3>
                {selectedOrder.status === 'VOIDED' && (
                  <span className="bg-red-50 text-red-600 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-md">
                    VOIDED
                  </span>
                )}
              </div>

              {/* Void Reason Box (Only if voided) */}
              {selectedOrder.status === 'VOIDED' && selectedOrder.voidReason && (
                <div className="bg-[#FFF5F5] rounded-[16px] p-5">
                  <div className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2.5">
                    VOID REASON
                  </div>
                  <p className="text-[15px] font-semibold text-[#991B1B] leading-snug">
                    {selectedOrder.voidReason}
                  </p>
                  
                  {selectedOrder.authorizedBy && (
                    <div className="mt-5">
                      <div className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2.5">
                        MANAGER AUTHORIZATION
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-slate-900 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                          AM
                        </div>
                        <span className="text-[13px] font-bold text-[#991B1B]">
                          Signed by: {selectedOrder.authorizedBy}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Order Contents */}
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                  ORDER CONTENTS
                </div>
                
                <div className="flex flex-col gap-4">
                  {selectedOrder.contents.map((item, i) => (
                    <div key={i} className="flex flex-col gap-1">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-[14px] text-slate-900">
                          {item.name}
                        </span>
                        <span className="font-bold text-[14px] text-slate-900 flex-shrink-0">
                          <span className="font-sans mr-[1px]">₱</span>{item.price.toFixed(2)}
                        </span>
                      </div>
                      {'subnote' in item && item.subnote && (
                        <span className="text-[13px] italic text-slate-400 font-medium">
                          {item.subnote}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-100"></div>

              {/* Technical Details */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-slate-500">Transaction ID</span>
                  <span className="text-[13px] font-medium text-slate-400 tabular-nums">{selectedOrder.transactionId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-slate-500">Terminal</span>
                  <span className="text-[13px] font-medium text-slate-400">{selectedOrder.terminal}</span>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-6 bg-white border-t border-slate-100 mt-auto">
              <button className="w-full py-4 rounded-[14px] bg-[#F8FAFC] hover:bg-slate-100 border border-slate-200 text-slate-900 font-bold text-[15px] flex items-center justify-center gap-2.5 transition-colors focus:outline-none focus:ring-4 focus:ring-slate-100 active:scale-[0.98]">
                <Printer className="w-4 h-4 stroke-[2.5px]" /> 
                Re-print Digital Receipt
              </button>
            </div>

          </aside>
        )}

      </main>
    </div>
  );
}
