"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileText, Search, X, Receipt, Calendar, DollarSign, Users, TrendingUp, TrendingDown, Printer, Eye, MoreVertical, CheckCircle, AlertCircle } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { IntentLauncher } from '@capgo/capacitor-intent-launcher';
import { supabase } from '@/lib/supabase/client';

type OrderItem = {
  id: string;
  order_id: string;
  item_name: string;
  quantity: number;
  total_price: number;
  modifiers?: string[];
};

type OrderRecord = {
  id: string;
  order_number: string;
  status?: string;
  total_amount: number;
  amount_tendered: number;
  change_due: number;
  created_at: string;
  order_items: OrderItem[];
};
 
type OrderSummary = {
  id: string;
  total_amount: number;
  created_at: string;
  status?: string;
};
 
type ExpenseRecord = {
  id: string;
  expense_date: string;
  item_name: string;
  amount: number;
  expensed_by: string | null;
};
 
type PayrollRecord = {
  id: string;
  shift_date: string;
  employee_name: string;
  base_salary: number;
  incentives: number;
  snack_allowance: number;
  final_total: number;
};
 
type EmployeePayrollSummary = {
  name: string;
  baseSalary: number;
  incentive: number;
  snackAllowance: number;
  employeeExpenses: ExpenseRecord[];
  totalEmployeeExpenses: number;
  finalTotal: number;
};

const filterOptions = ['Today', 'Yesterday', 'This Week'] as const;
type FilterOption = (typeof filterOptions)[number];

const RAWBT_PACKAGE = 'ru.a402d.rawbtprinter';
const ACTION_SEND = 'android.intent.action.SEND';
const MIME_TEXT = 'text/plain';
const EXTRA_TEXT_KEY = 'android.intent.extra.TEXT';
const RESULT_CANCELED = 0;

const formatCurrency = (value: number) =>
  `₱${value.toFixed(2)}`;

const getPayrollTiers = (totalSales: number) => {
  if (totalSales >= 18000) return { incentive: 300, snackAllowance: 150 };
  if (totalSales >= 15000) return { incentive: 200, snackAllowance: 100 };
  if (totalSales >= 11000) return { incentive: 100, snackAllowance: 100 };
  return { incentive: 0, snackAllowance: 50 };
};

const formatDate = (value: string) =>
  new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const formatShortDate = (value: string) =>
  new Date(value).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

export default function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('Today');
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [todaySales, setTodaySales] = useState(0);
  const [storeExpenses, setStoreExpenses] = useState<ExpenseRecord[]>([]);
  const [employeeExpenses, setEmployeeExpenses] = useState<ExpenseRecord[]>([]);
  const [payrollPeople, setPayrollPeople] = useState<PayrollRecord[]>([]);
  const [isSalesReportOpen, setIsSalesReportOpen] = useState(false);
  const [isEodModalOpen, setIsEodModalOpen] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [hasClosedToday, setHasClosedToday] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; type: '' | 'void' | 'refund'; order: OrderRecord | null; message: string }>({
    isOpen: false,
    type: '',
    order: null,
    message: '',
  });
  const [historyToast, setHistoryToast] = useState('');

  const showHistoryToast = (message: string) => {
    setHistoryToast(message);
    setTimeout(() => setHistoryToast(''), 3000);
  };

  const fetchOrders = async () => {
    const client = supabase;

    if (!client) {
      setFetchError('Supabase client is not configured.');
      return;
    }

    setIsLoading(true);
    const { data, error } = await client
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });
    setIsLoading(false);

    if (error) {
      console.error(error);
      setFetchError(error.message);
      return;
    }

    const parsedOrders = (data ?? []).map((order) => ({
      ...order,
      status: (order as any).status,
      total_amount: Number((order as any).total_amount),
      amount_tendered: Number((order as any).amount_tendered),
      change_due: Number((order as any).change_due),
      order_items: ((order as any).order_items ?? []).map((item: any) => ({
        ...item,
        quantity: Number(item.quantity),
        total_price: Number(item.total_price),
        modifiers: item.modifiers ?? [],
      })),
    })) as OrderRecord[];

    setOrders(parsedOrders);
  };

  const handleUpdateOrderStatus = async (order: OrderRecord, newStatus: 'Voided' | 'Refunded') => {
    if (!supabase) {
      showHistoryToast('SUPABASE UPDATE ERROR: Supabase client is not configured.');
      setConfirmDialog({ isOpen: false, type: '', order: null, message: '' });
      return;
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: newStatus, total_amount: -Math.abs(order.total_amount) })
      .eq('id', order.id);

    if (updateError) {
      showHistoryToast('SUPABASE UPDATE ERROR: ' + updateError.message);
      setConfirmDialog({ isOpen: false, type: '', order: null, message: '' });
      return;
    }

    if (newStatus === 'Refunded') {
      // Create a shop expense for the refunded order
      const refundExpense = {
        expense_date: new Date(order.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }),
        item_name: `Refund - Order ${order.order_number || order.id}`,
        amount: Math.abs(order.total_amount),
        expensed_by: 'shop'
      };

      const { error: expenseError } = await supabase
        .from('expenses')
        .insert([refundExpense]);

      if (expenseError) {
        console.error("Failed to log refund as expense:", expenseError);
      } else {
        console.log("Refund successfully logged as a shop expense.");
      }
    }

    showHistoryToast(`Success! Order marked as ${newStatus}.`);
    setConfirmDialog({ isOpen: false, type: '', order: null, message: '' });
    setTimeout(() => window.location.reload(), 600);
  };

  const handleEodClose = async () => {
    if (pinCode.length !== 4) {
      showHistoryToast('Invalid PIN');
      return;
    }
    if (!supabase) {
      showHistoryToast('SUPABASE UPDATE ERROR: Supabase client is not configured.');
      return;
    }

    const today = new Date();
    const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const currentCashier = typeof window !== 'undefined' ? localStorage.getItem('activeCashier') : null;
    if (!currentCashier) {
      showHistoryToast('Active cashier not found. Please log in again.');
      return;
    }

    const { data: staffRecord, error: staffError } = await supabase
      .from('staff')
      .select('pin_code')
      .eq('name', currentCashier)
      .limit(1)
      .single();

    if (staffError || !staffRecord) {
      showHistoryToast('Unable to validate PIN.');
      return;
    }

    if (String(staffRecord.pin_code) !== pinCode) {
      showHistoryToast('Invalid PIN');
      return;
    }

    // Prevent duplicate EOD closes in case the status changed while modal is open.
    const { data: existingClose, error: existingCloseError } = await supabase
      .from('net_income')
      .select('id')
      .eq('date', todayDate)
      .maybeSingle();

    if (existingCloseError) {
      showHistoryToast('EOD CHECK ERROR: ' + existingCloseError.message);
      return;
    }

    if (existingClose) {
      setHasClosedToday(true);
      setIsEodModalOpen(false);
      setPinCode('');
      try {
        await handleSalesReportPrint();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to print report.';
        showHistoryToast(message);
      }
      return;
    }

    const { error: insertError } = await supabase.from('net_income').insert([
      {
        date: todayDate,
        total_sales: todayTotalSales,
        total_expenses: storeExpenseTotal,
        total_salaries: totalEmployeePayroll,
        net_cash: netCash,
        closed_by: currentCashier,
      },
    ]);

    if (insertError) {
      showHistoryToast('EOD SAVE ERROR: ' + insertError.message);
      return;
    }

    setHasClosedToday(true);
    setPinCode('');
    setIsEodModalOpen(false);

    // Give React time to unmount the modal before the print dialog blocks the UI thread.
    setTimeout(() => {
      void handleSalesReportPrint().catch((error) => {
        const message = error instanceof Error ? error.message : 'Unable to print report.';
        showHistoryToast(message);
      });
    }, 100);
  };

  useEffect(() => {
    const loadDashboard = async () => {
      const client = supabase;

      if (!client) {
        setFetchError('Supabase client is not configured.');
        return;
      }

      const todayDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
      const tomorrowDateObj = new Date(todayDate);
      tomorrowDateObj.setDate(tomorrowDateObj.getDate() + 1);
      const tomorrowDate = tomorrowDateObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const [salesResult, expenseResult, payrollResult] = await Promise.all([
        client
          .from('orders')
          .select('id, total_amount, created_at, status')
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString()),
        client
          .from('expenses')
          .select('*')
          .eq('expense_date', todayDate),
        client
          .from('payroll')
          .select('*')
          .eq('shift_date', todayDate),
      ]);

      if (salesResult.error || expenseResult.error || payrollResult.error) {
        console.error('Dashboard fetch error:', {
          salesError: salesResult.error,
          expenseError: expenseResult.error,
          payrollError: payrollResult.error,
        });
        setFetchError(
          salesResult.error?.message || expenseResult.error?.message || payrollResult.error?.message ||
            'Unable to load dashboard data.',
        );
        return;
      }

      const ordersToday = (salesResult.data ?? []).map((order: any) => ({
        id: order.id,
        total_amount: Number(order.total_amount),
        created_at: order.created_at,
        status: order.status,
      })) as OrderSummary[];

      const completedOrdersToday = ordersToday.filter((order) => order.status === 'Completed');
      const todaySalesTotal = completedOrdersToday.reduce((sum, order) => sum + order.total_amount, 0);
      setTodaySales(todaySalesTotal);

      const expensesToday = (expenseResult.data ?? []).map((expense: any) => ({
        id: expense.id,
        expense_date: expense.expense_date,
        item_name: expense.item_name,
        amount: Number(expense.amount),
        expensed_by: expense.expensed_by,
      })) as ExpenseRecord[];

      const shopOnlyExpenses = expensesToday.filter(
        (expense) => String(expense.expensed_by ?? '').trim().toLowerCase() === 'shop',
      );
      const employeeOnlyExpenses = expensesToday.filter(
        (expense) => {
          const owner = String(expense.expensed_by ?? '').trim().toLowerCase();
          return owner !== '' && owner !== 'shop';
        },
      );

      setStoreExpenses(shopOnlyExpenses);
      setEmployeeExpenses(employeeOnlyExpenses);

      const payrollToday = (payrollResult.data ?? []).map((row: any) => ({
        id: row.id,
        shift_date: row.shift_date,
        employee_name: row.employee_name,
        base_salary: Number(row.base_salary),
        incentives: Number(row.incentives),
        snack_allowance: Number(row.snack_allowance),
        final_total: Number(row.final_total),
      })) as PayrollRecord[];

      const payrollTiers = getPayrollTiers(todaySalesTotal);
      try {
          const updatedPayrollRows = await Promise.all(
          payrollToday.map(async (employee) => {
            const employeeExpenseList = employeeOnlyExpenses.filter(
              (expense) => expense.expensed_by === employee.employee_name,
            );
            const totalEmployeeExpenses = employeeExpenseList.reduce(
              (sum, expense) => sum + expense.amount,
              0,
            );
            const finalTotal =
              employee.base_salary + payrollTiers.incentive + payrollTiers.snackAllowance - totalEmployeeExpenses;

            const { error: payrollUpdateError } = await client
              .from('payroll')
              .update({
                incentives: payrollTiers.incentive,
                snack_allowance: payrollTiers.snackAllowance,
                final_total: finalTotal,
              })
              .eq('id', employee.id)
              .eq('shift_date', todayDate);

            if (payrollUpdateError) {
              throw payrollUpdateError;
            }

            return {
              ...employee,
              incentives: payrollTiers.incentive,
              snack_allowance: payrollTiers.snackAllowance,
              final_total: finalTotal,
            };
          }),
        );

        setPayrollPeople(updatedPayrollRows);
      } catch (updateError: any) {
        console.error('Payroll update error:', updateError);
        setFetchError(updateError?.message || 'Unable to update payroll incentives.');
        return;
      }
    };

    fetchOrders();
    loadDashboard();
  }, []);

  useEffect(() => {
    const checkEodStatus = async () => {
      if (!supabase) return;

      const today = new Date();
      const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('net_income')
        .select('id')
        .eq('date', todayDate)
        .maybeSingle();

      if (error) {
        console.error('EOD status check error:', error);
        return;
      }

      if (data) {
        setHasClosedToday(true);
      }
    };

    void checkEodStatus();
  }, []);

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);

    return orders.filter((order) => {
      const orderDate = new Date(order.created_at);
      const matchesSearch = !query || order.order_number.toLowerCase().includes(query);
      const matchesFilter =
        activeFilter === 'Today'
          ? orderDate >= todayStart
          : activeFilter === 'Yesterday'
            ? orderDate >= yesterdayStart && orderDate < todayStart
            : orderDate >= weekStart;

      return matchesSearch && matchesFilter;
    });
  }, [activeFilter, searchQuery, orders]);

  const todaysCompletedOrders = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    return orders.filter(order => {
      const orderDateStr = new Date(order.created_at).toLocaleDateString('en-CA');
      const isCompleted = order.status === 'Completed' || !order.status;
      return orderDateStr === todayStr && isCompleted;
    });
  }, [orders]);

  const todayTotalSales = todaySales;
  const storeExpenseTotal = storeExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const payrollTiers = getPayrollTiers(todayTotalSales);
  const employeeTotals = payrollPeople.map((employee) => {
    const employeeExpenseList = employeeExpenses.filter(
      (expense) => expense.expensed_by === employee.employee_name,
    );
    const totalEmployeeExpenses = employeeExpenseList.reduce((sum, expense) => sum + expense.amount, 0);
    return {
      name: employee.employee_name,
      baseSalary: employee.base_salary,
      incentive: payrollTiers.incentive,
      snackAllowance: payrollTiers.snackAllowance,
      employeeExpenses: employeeExpenseList,
      totalEmployeeExpenses,
      finalTotal: employee.base_salary + payrollTiers.incentive + payrollTiers.snackAllowance - totalEmployeeExpenses,
    } as EmployeePayrollSummary;
  });
  const totalEmployeePayroll = employeeTotals.reduce((sum, employee) => sum + employee.finalTotal, 0);
  const netCash = todayTotalSales - storeExpenseTotal - totalEmployeePayroll;
  const todayLabel = new Date().toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const receiptDateLabel = new Date().toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const buildSalesReportTextPayload = () => {
    const lines: string[] = [
      '4 prince SNACK ATTACK',
      'DAILY SALES REPORT',
      receiptDateLabel,
      '--------------------------------',
      `TODAY REVENUE: ₱${todayTotalSales.toFixed(2)}`,
      `TOTAL EXPENSES: ₱${storeExpenseTotal.toFixed(2)}`,
      `EMPLOYEE SALARIES: ₱${totalEmployeePayroll.toFixed(2)}`,
      '--------------------------------',
    ];

    if (storeExpenses.length > 0) {
      storeExpenses.forEach((expense) => {
        lines.push(`${expense.item_name}: ₱${expense.amount.toFixed(2)}`);
      });
    } else {
      lines.push('No store expenses: ₱0.00');
    }

    lines.push('--------------------------------');

    employeeTotals.forEach((employee) => {
      lines.push(`${employee.name}: ₱${employee.finalTotal.toFixed(2)}`);
      lines.push(`Base Salary: ₱${employee.baseSalary.toFixed(2)}`);
      lines.push(`Deductions: ₱${employee.totalEmployeeExpenses.toFixed(2)}`);
      lines.push(`Final Payout: ₱${employee.finalTotal.toFixed(2)}`);
      lines.push('');
    });

    lines.push('--------------------------------');
    lines.push(`NET CASH: ₱${netCash.toFixed(2)}`);

    return lines.join('\n');
  };

  const handleSalesReportPrint = async () => {
    const isAndroidNative = Capacitor.getPlatform() === 'android' && Capacitor.isNativePlatform();

    if (!isAndroidNative) {
      window.print();
      return;
    }

    const textPayload = buildSalesReportTextPayload();
    const result = await IntentLauncher.startActivityAsync({
      action: ACTION_SEND,
      type: MIME_TEXT,
      packageName: RAWBT_PACKAGE,
      extra: {
        [EXTRA_TEXT_KEY]: textPayload,
      },
    });

    if (result.resultCode === RESULT_CANCELED) {
      throw new Error('Printing canceled by user.');
    }
  };

  return (
    <>
    <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8 print:hidden">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header */}
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link
                href="/start-order"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
              <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-slate-400">Transaction History</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                Past Orders
              </h1>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
              <FileText className="h-5 w-5 text-slate-400" />
              <span>{todaysCompletedOrders.length} orders completed today</span>
            </div>
          </div>
        </header>

        {/* Filters & Search */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                suppressHydrationWarning={true}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by order number..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none placeholder:text-slate-400 focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-4">
              <div className="flex flex-wrap gap-2">
                {filterOptions.map((filter) => {
                  const isActive = filter === activeFilter;
                  return (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setActiveFilter(filter)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${(
                        isActive
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      )}`}
                    >
                      {filter}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setIsSalesReportOpen(true)}
                className="flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
              >
                <Receipt className="h-4 w-4" />
                Sales Report
              </button>
            </div>
          </div>
        </section>

        {/* Orders Table - Refactored for better mobile compactness */}
        <section>
          <div className="w-full overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-100">
            <table className="w-full text-left min-w-[0px] md:min-w-[600px]">
              <thead className="bg-slate-50/80 text-[10px] md:text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-left whitespace-nowrap">#</th>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-left whitespace-nowrap">Order #</th>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-left whitespace-nowrap">Total</th>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-left whitespace-nowrap">Date</th>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-left whitespace-nowrap">Status</th>
                  <th className="px-2 md:px-4 py-2 md:py-3 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-2 md:px-4 py-3 md:py-4 whitespace-nowrap">
                          <div className="h-4 w-16 md:w-20 rounded bg-slate-200" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500 whitespace-nowrap">
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="h-8 w-8 text-slate-300" />
                        <p>No orders found</p>
                        <p className="text-xs text-slate-400">Try adjusting your search or filters</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const status = order.status || 'Completed';
                    const statusColor =
                      status === 'Voided' ? 'bg-red-100 text-red-700' :
                      status === 'Refunded' ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700';
                    return (
                      <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-2 md:px-4 py-3 md:py-4 font-mono text-[10px] md:text-xs text-slate-500 whitespace-nowrap">{order.id.slice(0, 6)}</td>
                        <td className="px-2 md:px-4 py-3 md:py-4 font-medium text-slate-900 whitespace-nowrap text-[11px] md:text-sm">{order.order_number}</td>
                        <td className="px-2 md:px-4 py-3 md:py-4 font-semibold text-slate-800 whitespace-nowrap text-[11px] md:text-sm">{formatCurrency(order.total_amount)}</td>
                        <td className="px-2 md:px-4 py-3 md:py-4 text-slate-600 whitespace-nowrap text-[10px] md:text-sm">{formatDate(order.created_at)}</td>
                        <td className="px-2 md:px-4 py-3 md:py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center rounded-full px-2 md:px-3 py-0.5 md:py-1 text-[9px] md:text-xs font-semibold ${statusColor}`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-2 md:px-4 py-3 md:py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1 md:gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedOrder(order)}
                              className="rounded-full border border-slate-200 bg-white px-2 md:px-4 py-0.5 md:py-1.5 text-[9px] md:text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                              <Eye className="inline h-3 w-3 md:h-4 md:w-4 mr-0.5 md:mr-1" />
                              <span className="hidden sm:inline">View</span>
                            </button>
                            {status === 'Completed' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirmDialog({
                                      isOpen: true,
                                      type: 'void',
                                      order,
                                      message: 'Are you sure you want to mark this order as Voided?',
                                    })
                                  }
                                  className="text-red-500 hover:text-red-700 text-[9px] md:text-xs font-medium px-1.5 md:px-2 py-0.5 md:py-1 rounded-full border border-red-200 hover:bg-red-50 transition"
                                >
                                  Void
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirmDialog({
                                      isOpen: true,
                                      type: 'refund',
                                      order,
                                      message: 'Are you sure you want to mark this order as Refunded?',
                                    })
                                  }
                                  className="text-amber-500 hover:text-amber-700 text-[9px] md:text-xs font-medium px-1.5 md:px-2 py-0.5 md:py-1 rounded-full border border-amber-200 hover:bg-amber-50 transition"
                                >
                                  Refund
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Sales Report Modal - Refactored UI/UX */}
      {isSalesReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-2 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[calc(100dvh-1rem)] sm:max-h-[90vh]">
            
            {/* Sticky Header */}
            <div className="flex-shrink-0 flex items-start justify-between gap-3 p-4 sm:p-6 border-b border-slate-100">
              <div>
                <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-slate-400">Daily Summary</p>
                <h2 className="mt-1 text-xl sm:text-2xl font-bold text-slate-900">Sales Report</h2>
                <p className="text-xs sm:text-sm text-slate-500">{receiptDateLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsSalesReportOpen(false)}
                className="rounded-full border border-slate-200 p-1.5 sm:p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-2 sm:p-4 shadow-sm">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="rounded-lg bg-emerald-100 p-1.5 sm:p-2 text-emerald-600">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs font-medium uppercase text-slate-400">Total Sales</p>
                      <p className="text-sm sm:text-xl font-bold text-slate-900">{formatCurrency(todayTotalSales)}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-2 sm:p-4 shadow-sm">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="rounded-lg bg-rose-100 p-1.5 sm:p-2 text-rose-600">
                      <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs font-medium uppercase text-slate-400">Expenses</p>
                      <p className="text-sm sm:text-xl font-bold text-rose-600">{formatCurrency(storeExpenseTotal)}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-2 sm:p-4 shadow-sm">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="rounded-lg bg-blue-100 p-1.5 sm:p-2 text-blue-600">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs font-medium uppercase text-slate-400">Salaries</p>
                      <p className="text-sm sm:text-xl font-bold text-slate-900">{formatCurrency(totalEmployeePayroll)}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-emerald-50 p-2 sm:p-4 shadow-sm">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="rounded-lg bg-emerald-200 p-1.5 sm:p-2 text-emerald-700">
                      <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs font-medium uppercase text-emerald-600">Net Cash</p>
                      <p className="text-sm sm:text-xl font-bold text-emerald-700">{formatCurrency(netCash)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm">
                  <h3 className="text-xs sm:text-sm font-semibold text-slate-900">Store Expenses</h3>
                  <div className="mt-2 sm:mt-3 space-y-1.5 sm:space-y-2">
                    {storeExpenses.length > 0 ? (
                      storeExpenses.map((expense) => (
                        <div key={expense.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-sm">
                          <span className="text-slate-600 truncate max-w-[80px] sm:max-w-full">{expense.item_name}</span>
                          <span className="font-semibold text-slate-800 whitespace-nowrap">{formatCurrency(expense.amount)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] sm:text-sm text-slate-400">No store expenses recorded today.</p>
                    )}
                    <div className="mt-1.5 sm:mt-2 flex items-center justify-between border-t border-slate-200 pt-1.5 sm:pt-2 font-semibold text-[10px] sm:text-sm">
                      <span>Total</span>
                      <span>{formatCurrency(storeExpenseTotal)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-5 shadow-sm">
                  <h3 className="text-xs sm:text-sm font-semibold text-slate-900">Employee Payouts</h3>
                  <div className="mt-2 sm:mt-3 space-y-3 sm:space-y-4">
                    {employeeTotals.map((employee) => (
                      <div key={employee.name} className="rounded-lg border border-slate-100 bg-slate-50 p-2 sm:p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm font-medium text-slate-800">{employee.name}</span>
                          <span className="text-xs sm:text-sm font-bold text-slate-900">{formatCurrency(employee.finalTotal)}</span>
                        </div>
                        <div className="mt-1.5 grid grid-cols-2 gap-1 sm:gap-2 text-[10px] sm:text-xs text-slate-500">
                          <div>
                            <span className="block font-medium text-slate-400">Base</span>
                            {formatCurrency(employee.baseSalary)}
                          </div>
                          <div>
                            <span className="block font-medium text-slate-400">Incentive</span>
                            {formatCurrency(employee.incentive)}
                          </div>
                          <div>
                            <span className="block font-medium text-slate-400">Snack</span>
                            {formatCurrency(employee.snackAllowance)}
                          </div>
                        </div>
                        {employee.employeeExpenses.length > 0 && (
                          <div className="mt-1.5 rounded-lg bg-white p-1.5 sm:p-2 text-[9px] sm:text-xs">
                            <p className="font-medium text-slate-600">Deductions:</p>
                            {employee.employeeExpenses.map((exp) => (
                              <div key={exp.id} className="flex justify-between text-slate-500">
                                <span className="truncate max-w-[80px] sm:max-w-full">{exp.item_name}</span>
                                <span>-{formatCurrency(exp.amount)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 sm:mt-3 flex items-center justify-between border-t border-slate-200 pt-2 sm:pt-2 font-semibold text-[10px] sm:text-sm">
                    <span>Total Salaries</span>
                    <span>{formatCurrency(totalEmployeePayroll)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="flex-shrink-0 flex flex-wrap justify-end gap-2 sm:gap-3 p-3 sm:p-6 border-t border-slate-100 bg-white rounded-b-2xl sm:rounded-b-3xl">
              <button
                type="button"
                onClick={() => {
                  if (hasClosedToday) {
                    void handleSalesReportPrint().catch((error) => {
                      const message = error instanceof Error ? error.message : 'Unable to print report.';
                      showHistoryToast(message);
                    });
                    return;
                  }
                  setPinCode('');
                  setIsEodModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-blue-600 px-3 py-1.5 sm:px-5 sm:py-2.5 text-[10px] sm:text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{hasClosedToday ? 'Reprint Report' : 'Close Shop & Print'}</span>
                <span className="sm:hidden">{hasClosedToday ? 'Reprint' : 'Close & Print'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSalesReportOpen(false)}
                className="rounded-full bg-slate-900 px-3 py-1.5 sm:px-5 sm:py-2.5 text-[10px] sm:text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {isEodModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900">Close Shop for Today?</h3>
            <p className="mt-2 text-sm text-slate-500">
              This will finalize today's net income. Enter your 4-digit PIN to confirm.
            </p>

            <div className="mt-5">
              <label htmlFor="eod-pin" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                PIN Code
              </label>
              <input
                id="eod-pin"
                type="password"
                autoComplete="off"
                maxLength={4}
                value={pinCode}
                onChange={(event) => setPinCode(event.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-200"
                placeholder="Enter 4-digit PIN"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsEodModalOpen(false);
                  setPinCode('');
                }}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleEodClose();
                }}
                className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal - Fixed Layout */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
          <div className="flex w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-8 max-h-[90vh]">
            <div className="flex-shrink-0 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Order Details</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">{selectedOrder.order_number}</h2>
                <p className="text-sm text-slate-500">{formatDate(selectedOrder.created_at)}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-full border border-slate-200 p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex-1 min-h-0 overflow-y-auto border-t border-slate-200 pt-4">
              <div className="space-y-3 pb-4">
                {selectedOrder.order_items.map((item, index) => (
                  <div key={`${selectedOrder.id}-${index}`} className="flex items-start justify-between rounded-lg border border-slate-100 bg-slate-50 p-3 sm:p-4">
                    <div className="pr-4">
                      <p className="text-sm font-medium text-slate-900 sm:text-base">{item.quantity}x {item.item_name}</p>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <p className="mt-1 text-xs text-slate-500 sm:text-sm">{item.modifiers.join(', ')}</p>
                      )}
                    </div>
                    <span className="flex-shrink-0 text-sm font-semibold text-slate-800 sm:text-base">{formatCurrency(item.total_price)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-shrink-0 mt-4 border-t border-slate-200 pt-4">
              <div className="flex flex-col gap-2 text-sm sm:text-base">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total</span>
                  <span className="font-bold text-slate-900">{formatCurrency(selectedOrder.total_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount Tendered</span>
                  <span className="font-bold text-slate-900">{formatCurrency(selectedOrder.amount_tendered)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Change</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(selectedOrder.change_due)}</span>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-4 text-slate-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Confirm Action</h3>
                <p className="text-sm text-slate-500">{confirmDialog.message}</p>
              </div>
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setConfirmDialog({ isOpen: false, type: '', order: null, message: '' })}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!confirmDialog.order) return;
                  void handleUpdateOrderStatus(
                    confirmDialog.order,
                    confirmDialog.type === 'refund' ? 'Refunded' : 'Voided',
                  );
                }}
                className="rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-rose-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {historyToast && (
        <div className="fixed bottom-10 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-300">
          <CheckCircle className="h-5 w-5 text-emerald-400" />
          {historyToast}
        </div>
      )}
    </div>

    {/* Print-only receipt version */}
    <div className="hidden print:block print:w-[58mm] print:bg-white print:p-0 print:m-0 font-mono text-[10px] leading-tight text-black">
      <div className="mx-auto w-full px-2 py-2">
        <div className="text-center font-bold uppercase">4 prince SNACK ATTACK</div>
        <div className="mt-1 text-center font-semibold uppercase">DAILY SALES REPORT</div>
        <div className="mt-1 text-center">{receiptDateLabel}</div>
        <div className="mt-2 text-center">--------------------------------</div>

        <div className="mt-2 space-y-1">
          <div className="flex justify-between gap-2">
            <span>TODAY REVENUE:</span>
            <span>₱{todayTotalSales.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>TOTAL EXPENSES:</span>
            <span>₱{storeExpenseTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span>EMPLOYEE SALARIES:</span>
            <span>₱{totalEmployeePayroll.toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-2 text-center">--------------------------------</div>

        <div className="mt-2 space-y-1">
          {storeExpenses.length > 0 ? (
            storeExpenses.map((expense) => (
              <div key={expense.id} className="flex justify-between gap-2">
                <span className="pr-2 break-words">{expense.item_name}</span>
                <span className="whitespace-nowrap">₱{expense.amount.toFixed(2)}</span>
              </div>
            ))
          ) : (
            <div className="flex justify-between gap-2 text-black/60">
              <span>No store expenses</span>
              <span>₱0.00</span>
            </div>
          )}
        </div>

        <div className="mt-2 text-center">--------------------------------</div>

        <div className="mt-2 space-y-2">
          {employeeTotals.map((employee) => (
            <div key={employee.name} className="space-y-1">
              <div className="flex justify-between gap-2 font-semibold">
                <span className="pr-2 break-words">{employee.name}</span>
                <span className="whitespace-nowrap">₱{employee.finalTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Base Salary</span>
                <span>₱{employee.baseSalary.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Deductions</span>
                <span>₱{employee.totalEmployeeExpenses.toFixed(2)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Final Payout</span>
                <span>₱{employee.finalTotal.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-2 text-center">--------------------------------</div>

        <div className="mt-2 flex justify-between gap-2 text-sm font-bold">
          <span>NET CASH:</span>
          <span>₱{netCash.toFixed(2)}</span>
        </div>
      </div>
    </div>
    </>
  );
}