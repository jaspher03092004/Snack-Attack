"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileText, Search, X } from 'lucide-react';
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
    const isConfirmed = window.confirm(`Are you sure you want to mark this order as ${newStatus}?`);
    if (!isConfirmed) return;

    if (!supabase) {
      alert('SUPABASE UPDATE ERROR: Supabase client is not configured.');
      return;
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: newStatus, total_amount: -Math.abs(order.total_amount) })
      .eq('id', order.id);

    if (updateError) {
      alert("SUPABASE UPDATE ERROR: " + updateError.message);
      return;
    }

    if (newStatus === 'Refunded') {
      const { error: expenseError } = await supabase
        .from('expenses')
        .insert({
          expense_date: new Date(order.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }),
          item_name: `Refund for Order ${order.order_number || order.id}`,
          amount: Math.abs(order.total_amount),
          expensed_by: 'Refund'
        });

      if (expenseError) {
        alert("Order was refunded, but failed to write to expenses table: " + expenseError.message);
        return;
      }
    }

    alert(`Success! Order marked as ${newStatus}.`);
    window.location.reload(); // Force hard refresh to update UI immediately
  };

  useEffect(() => {
    const loadDashboard = async () => {
      const client = supabase;

      if (!client) {
        setFetchError('Supabase client is not configured.');
        return;
      }

      // Use Asia/Manila local date strings for expense/payroll records.
      const todayDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
      // Compute tomorrow in Asia/Manila by parsing the todayDate and adding one day.
      const tomorrowDateObj = new Date(todayDate);
      tomorrowDateObj.setDate(tomorrowDateObj.getDate() + 1);
      const tomorrowDate = tomorrowDateObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

      // Match dashboard-style local start/end day boundaries for order sales.
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
      const isCompleted = order.status === 'Completed' || !order.status; // Fallback for old records
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

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link
                href="/start-order"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
              <p className="mt-4 text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Order History</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                Past Transactions
              </h1>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
              <FileText className="h-5 w-5" />
              <span>{todaysCompletedOrders.length} completed orders today</span>
            </div>
          </div>
        </header>

        <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <label className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Search className="h-5 w-5 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by order number"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap gap-2">
                {filterOptions.map((filter) => {
                  const isActive = filter === activeFilter;
                  return (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setActiveFilter(filter)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {filter}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setIsSalesReportOpen(true)}
                className="rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
              >
                Sales Report
              </button>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-3 py-3 font-semibold">#</th>
                  <th className="px-3 py-3 font-semibold">Order Number</th>
                  <th className="px-3 py-3 font-semibold">Total Amount</th>
                  <th className="px-3 py-3 font-semibold">Date</th>
                  <th>Status</th>
                  <th className="px-3 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-3 py-4 font-semibold text-slate-700">{order.id}</td>
                    <td className="px-3 py-4 font-semibold text-slate-900">{order.order_number}</td>
                    <td className="px-3 py-4 text-slate-700">{formatCurrency(order.total_amount)}</td>
                    <td className="px-3 py-4 text-slate-700">{formatDate(order.created_at)}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${order.status === 'Voided' ? 'bg-red-100 text-red-700' : order.status === 'Refunded' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                        {order.status || 'Completed'}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          View Details
                        </button>
                        {order.status === 'Completed' && (
                          <>
                            <button type="button" onClick={(e) => { e.preventDefault(); handleUpdateOrderStatus(order, 'Voided'); }} className="text-red-500 hover:text-red-700 mx-2 text-sm font-bold cursor-pointer">Void</button>
                            <button type="button" onClick={(e) => { e.preventDefault(); handleUpdateOrderStatus(order, 'Refunded'); }} className="text-orange-500 hover:text-orange-700 mx-2 text-sm font-bold cursor-pointer">Refund</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {isSalesReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 print:hidden">
          <div className="w-[95vw] max-w-4xl max-h-[85vh] overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Daily Summary</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">Sales Report</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsSalesReportOpen(false)}
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close sales report"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-6">
                  <div className="space-y-5">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Today&apos;s Total Sales</p>
                      <p className="mt-2 text-4xl font-black text-slate-900">{formatCurrency(todayTotalSales)}</p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-rose-500">Total Expenses</p>
                        <p className="mt-2 text-2xl font-bold text-rose-600">{formatCurrency(storeExpenseTotal)}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Employee Salaries (Shift)</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-700">{formatCurrency(totalEmployeePayroll)}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-600">Net Cash</p>
                      <p className="mt-2 text-3xl font-black text-emerald-700">{formatCurrency(netCash)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-lg font-bold text-slate-900">Expenses Breakdown</h3>
                  <div className="mt-4 space-y-2">
                    {storeExpenses.length > 0 ? (
                      storeExpenses.map((expense) => (
                        <div key={expense.id} className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 text-sm text-slate-600">
                          <span>{expense.item_name}</span>
                          <span className="font-semibold text-slate-900">{formatCurrency(expense.amount)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl bg-white px-3 py-2 text-sm text-slate-500">
                        No store expenses recorded today.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-lg font-bold text-slate-900">Employee Breakdown</h3>
                  <div className="mt-4 space-y-3">
                    {employeeTotals.map((employee) => (
                      <div key={employee.name} className="rounded-2xl border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold text-slate-900">{employee.name}</span>
                          <span className="text-sm font-bold text-slate-900">{formatCurrency(employee.finalTotal)}</span>
                        </div>
                        <div className="mt-2 space-y-1 text-sm text-slate-600">
                          <p>Base Salary: {formatCurrency(employee.baseSalary)}</p>
                          <p>Incentive: {formatCurrency(employee.incentive)}</p>
                          <p>Snack Allowance: {formatCurrency(employee.snackAllowance)}</p>
                          <div className="mt-2 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
                            <p className="font-semibold text-slate-900">Expenses</p>
                            {employee.employeeExpenses.length > 0 ? (
                              <ul className="mt-2 list-disc space-y-1 pl-5">
                                {employee.employeeExpenses.map((expense) => (
                                  <li key={expense.id} className="text-slate-600">
                                    {expense.item_name}: -{formatCurrency(expense.amount)}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="mt-1 text-slate-500">No employee expenses</p>
                            )}
                          </div>
                          <p className="font-semibold text-slate-800">Final Total: {formatCurrency(employee.finalTotal)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Print Report
              </button>
              <button
                type="button"
                onClick={() => setIsSalesReportOpen(false)}
                className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Close
              </button>
            </div>

            <div className="hidden print:block print:w-[48mm] print:absolute print:top-0 print:left-0 print:m-0 print:p-0 print:bg-white print:text-black font-mono text-xs">
              <div className="flex flex-col gap-2 p-2">
                <div className="text-center">
                  <p className="text-sm font-extrabold uppercase">END OF DAY REPORT</p>
                  <p>{todayLabel}</p>
                </div>
                <div className="border-t border-dashed border-black pt-2" />
                <div className="flex items-center justify-between font-semibold">
                  <span>TODAY&apos;S SALES</span>
                  <span className="font-extrabold">{formatCurrency(todayTotalSales)}</span>
                </div>
                <div className="border-t border-dashed border-black pt-2" />
                <div className="space-y-1">
                  <p className="font-bold">EXPENSES</p>
                  {storeExpenses.length > 0 ? (
                    storeExpenses.map((expense) => (
                      <div key={expense.id} className="flex items-center justify-between">
                        <span>{expense.item_name}</span>
                        <span>{formatCurrency(expense.amount)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-between text-slate-500">
                      <span>No store expenses</span>
                      <span>{formatCurrency(0)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between font-semibold">
                    <span>TOTAL EXPENSES</span>
                    <span>{formatCurrency(storeExpenseTotal)}</span>
                  </div>
                </div>
                <div className="border-t border-dashed border-black pt-2" />
                <div className="space-y-1">
                  <p className="font-bold">SALARIES</p>
                  {employeeTotals.map((employee) => (
                    <div key={employee.name} className="flex items-center justify-between">
                      <span>{employee.name}</span>
                      <span>{formatCurrency(employee.finalTotal)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between font-semibold">
                    <span>TOTAL SALARIES</span>
                    <span>{formatCurrency(totalEmployeePayroll)}</span>
                  </div>
                </div>
                <div className="border-t border-dashed border-black pt-2" />
                <div className="flex items-center justify-between text-sm font-extrabold">
                  <span>NET CASH</span>
                  <span>{formatCurrency(netCash)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6">
          <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Receipt Summary</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">{selectedOrder.order_number}</h2>
                <p className="mt-1 text-sm text-slate-500">{formatDate(selectedOrder.created_at)}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close order details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-6">
              <div className="space-y-4">
                {selectedOrder.order_items.map((item, index) => (
                  <div key={`${selectedOrder.id}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{item.quantity}x {item.item_name}</p>
                        {item.modifiers && item.modifiers.length > 0 && (
                          <p className="mt-1 text-sm text-slate-500">{item.modifiers.join(', ')}</p>
                        )}
                      </div>
                      <p className="font-semibold text-slate-900">{formatCurrency(item.total_price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-6">
              <div className="flex flex-col gap-2 text-sm text-slate-600 sm:items-end">
                <div className="flex w-full max-w-xs items-center justify-between gap-4">
                  <span>Total Amount</span>
                  <span className="text-lg font-black text-slate-900">{formatCurrency(selectedOrder.total_amount)}</span>
                </div>
                <div className="flex w-full max-w-xs items-center justify-between gap-4">
                  <span>Amount Tendered</span>
                  <span className="text-lg font-black text-slate-900">{formatCurrency(selectedOrder.amount_tendered)}</span>
                </div>
                <div className="flex w-full max-w-xs items-center justify-between gap-4">
                  <span>Change</span>
                  <span className="text-lg font-black text-emerald-600">{formatCurrency(selectedOrder.change_due)}</span>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
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
      )}
    </div>
  );
}
