'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { 
  LayoutGrid, 
  ReceiptText, 
  Box, 
  Users, 
  ArrowUp, 
  ArrowLeft,
  LogOut
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
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

export default function ManagerDashboard() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState('dashboard');
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [expensesToday, setExpensesToday] = useState<ExpenseRecord[]>([]);

  const getTodayDateString = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  useEffect(() => {
    const fetchOrdersAndExpenses = async () => {
      if (!supabase) {
        console.error('Supabase client is not configured.');
        return;
      }

      const todayDate = getTodayDateString();
      const [ordersResult, expensesResult] = await Promise.all([
        supabase
          .from('orders')
          .select('id, order_number, status, total_amount, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('expenses')
          .select('id, item_name, amount, expense_date, expensed_by')
          .eq('expense_date', todayDate)
          .order('id', { ascending: false }),
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
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 mb-6">
          <div className="bg-white rounded-[24px] p-7 shadow-sm border border-slate-100/50">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">
              Total Revenue Today
            </div>
            <div className="text-[32px] font-black text-slate-900 leading-none mb-2">
              {formatCurrency(orderMetrics.salesToday)}
            </div>
            <div className="text-slate-500 text-[13px]">Orders: {orderMetrics.ordersToday.length}</div>
          </div>

          <div className="bg-white rounded-[24px] p-7 shadow-sm border border-slate-100/50">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">
              Total Revenue Yesterday
            </div>
            <div className="text-[32px] font-black text-slate-900 leading-none">
              {formatCurrency(orderMetrics.salesYesterday)}
            </div>
          </div>

          <div className="bg-white rounded-[24px] p-7 shadow-sm border border-slate-100/50">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">
              Total Revenue This Week
            </div>
            <div className="text-[32px] font-black text-slate-900 leading-none">
              {formatCurrency(orderMetrics.salesThisWeek)}
            </div>
          </div>

          <div className="bg-white rounded-[24px] p-7 shadow-sm border border-slate-100/50">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">
              Total Revenue Overall
            </div>
            <div className="text-[32px] font-black text-slate-900 leading-none">
              {formatCurrency(orderMetrics.salesOverall)}
            </div>
          </div>

          <div className="bg-white rounded-[24px] p-7 shadow-sm border border-slate-100/50">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">
              Total Orders Today
            </div>
            <div className="text-[32px] font-black text-slate-900 leading-none">
              {orderMetrics.totalOrdersToday}
            </div>
          </div>
        </div>

        {/* Today&apos;s Sales Target */}
        <div className="bg-white rounded-[24px] p-7 shadow-sm border border-slate-100/50 mb-6">
          <div className="flex items-center justify-between mb-5 gap-4">
            <div>
              <h2 className="text-[18px] font-bold text-slate-900">Today&apos;s Sales Target</h2>
              <p className="text-sm text-slate-500 mt-1">Watch progress toward Gold Rush.</p>
            </div>
            <div className="text-sm font-semibold text-slate-700">
              {formatCurrency(orderMetrics.salesToday)} / ₱15,000
            </div>
          </div>

          <div className="rounded-full bg-slate-200 h-4 overflow-hidden relative">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${Math.min((orderMetrics.salesToday / 15000) * 100, 100)}%` }}
            />
          </div>

          <div className="mt-4 grid grid-cols-4 text-[11px] font-semibold text-slate-500 uppercase tracking-widest gap-2">
            <div className="text-left">₱5,000</div>
            <div className="text-center">₱10,000</div>
            <div className="text-center">₱12,000</div>
            <div className="text-right">₱15,000</div>
          </div>
          <div className="mt-2 flex justify-between text-[13px] text-slate-500">
            <span>Break Even</span>
            <span>Goal</span>
            <span>Happy Sales</span>
            <span>Gold Rush</span>
          </div>
        </div>

        {/* Main Visuals Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Daily Sales Chart (Takes up 2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-[24px] p-8 shadow-sm border border-slate-100/50 h-[380px] flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-[18px] font-bold text-slate-900">Daily Sales</h2>
              <div className="bg-slate-100 rounded-full px-4 py-1.5 flex items-center select-none cursor-pointer">
                <span className="text-[13px] font-bold text-slate-800">Last 7 days</span>
              </div>
            </div>

            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesTrendData} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis tickFormatter={(value) => `₱${value >= 1000 ? `${value / 1000}k` : value}`} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value) || 0)} />
                  <Bar dataKey="sales" fill="#0f766e" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Live Feed (Takes up 1 col) */}
          <div className="bg-white rounded-[24px] p-8 shadow-sm border border-slate-100/50 flex flex-col">
            <h2 className="text-[18px] font-bold text-slate-900 mb-6">Live Feed</h2>

            <div className="flex flex-col gap-4 flex-1 overflow-y-auto pr-2 custom-scrollbar mb-6 h-[220px]">
              {orderMetrics.ordersToday.length === 0 ? (
                <div className="text-slate-500 text-sm">No orders yet today.</div>
              ) : (
                orderMetrics.ordersToday.map((order) => (
                  <div key={order.id} className="flex justify-between items-center rounded-[18px] bg-slate-50 p-4">
                    <div>
                      <div className="font-bold text-[15px] text-slate-900">{order.order_number}</div>
                    </div>
                    <div className="font-bold text-[15px] text-slate-900">
                      {formatCurrency(order.total_amount)}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="bg-slate-50 rounded-[24px] p-5 border border-slate-100/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Expenses Today</p>
                  <h3 className="text-[20px] font-bold text-slate-900">{formatCurrency(expensesTotal)}</h3>
                </div>
              </div>

              <div className="space-y-3 max-h-44 overflow-y-auto pr-2 custom-scrollbar">
                {expensesToday.length === 0 ? (
                  <p className="text-sm text-slate-500">No expenses logged for today.</p>
                ) : (
                  expensesToday.map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between rounded-[18px] bg-white px-4 py-3 shadow-sm">
                      <div>
                        <div className="font-semibold text-slate-900">{expense.item_name || expense.expensed_by}</div>
                        <div className="text-[12px] text-slate-500">{expense.expensed_by}</div>
                      </div>
                      <div className="text-sm font-bold text-slate-900">{formatCurrency(expense.amount)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
