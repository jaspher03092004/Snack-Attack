'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft, FileText, Search, X } from 'lucide-react';

type OrderItem = {
  name: string;
  quantity: number;
  price: number;
  modifiers?: string[];
};

type OrderRecord = {
  id: number;
  orderNumber: string;
  totalAmount: number;
  amountTendered: number;
  change: number;
  createdAt: string;
  items: OrderItem[];
};

const createDate = (daysAgo: number, hour: number, minute: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const mockOrders: OrderRecord[] = [
  {
    id: 1,
    orderNumber: 'ORD-1042',
    totalAmount: 431.2,
    amountTendered: 500,
    change: 68.8,
    createdAt: createDate(0, 14, 25),
    items: [
      { name: 'Classic Cheeseburger', quantity: 2, price: 150, modifiers: ['No Onions', 'Extra Mayo'] },
      { name: 'Large Fries', quantity: 1, price: 85, modifiers: [] },
    ],
  },
  {
    id: 2,
    orderNumber: 'ORD-1041',
    totalAmount: 275.5,
    amountTendered: 300,
    change: 24.5,
    createdAt: createDate(1, 19, 40),
    items: [
      { name: 'Chicken Rice Bowl', quantity: 1, price: 185, modifiers: ['Spicy'] },
      { name: 'Iced Tea', quantity: 2, price: 45.25, modifiers: [] },
    ],
  },
  {
    id: 3,
    orderNumber: 'ORD-1040',
    totalAmount: 612.75,
    amountTendered: 700,
    change: 87.25,
    createdAt: createDate(2, 11, 5),
    items: [
      { name: 'Pizza Slice Combo', quantity: 3, price: 180, modifiers: ['Extra Cheese'] },
      { name: 'Milk Tea', quantity: 2, price: 36.25, modifiers: ['Less Sugar'] },
    ],
  },
  {
    id: 4,
    orderNumber: 'ORD-1039',
    totalAmount: 158.0,
    amountTendered: 200,
    change: 42.0,
    createdAt: createDate(3, 16, 50),
    items: [
      { name: 'Siomai Box', quantity: 1, price: 120, modifiers: ['Hot Sauce'] },
      { name: 'Softdrinks', quantity: 2, price: 19, modifiers: [] },
    ],
  },
  {
    id: 5,
    orderNumber: 'ORD-1038',
    totalAmount: 840.0,
    amountTendered: 1000,
    change: 160.0,
    createdAt: createDate(6, 21, 15),
    items: [
      { name: 'Family Pizza', quantity: 2, price: 350, modifiers: ['Thin Crust'] },
      { name: 'Garlic Bread', quantity: 2, price: 70, modifiers: [] },
    ],
  },
];

const filterOptions = ['Today', 'Yesterday', 'This Week'] as const;
type FilterOption = (typeof filterOptions)[number];

const formatCurrency = (value: number) =>
  `₱${value.toFixed(2)}`;

const getIncentive = (totalSales: number) => {
  if (totalSales > 18000) return 300;
  if (totalSales > 15000) return 200;
  if (totalSales > 11000) return 100;
  return 0;
};

const expenseBreakdown = [
  { label: 'Ice', amount: 150 },
  { label: 'Syrup', amount: 500 },
  { label: 'Employee 1 Expense', amount: 100 },
  { label: 'Cleaning Supplies', amount: 80 },
];

const employeeBreakdown = [
  { name: 'Employee 1', baseSalary: 400 },
  { name: 'Employee 2', baseSalary: 380 },
  { name: 'Employee 3', baseSalary: 450 },
];

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
  const [isSalesReportOpen, setIsSalesReportOpen] = useState(false);

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);

    return mockOrders.filter((order) => {
      const orderDate = new Date(order.createdAt);
      const matchesSearch = !query || order.orderNumber.toLowerCase().includes(query);
      const matchesFilter =
        activeFilter === 'Today'
          ? orderDate >= todayStart
          : activeFilter === 'Yesterday'
            ? orderDate >= yesterdayStart && orderDate < todayStart
            : orderDate >= weekStart;

      return matchesSearch && matchesFilter;
    });
  }, [activeFilter, searchQuery]);

  const todayTotalSales = 15430;
  const totalExpenses = 1200;
  const snackAllowance = 50;
  const incentive = getIncentive(todayTotalSales);
  const employeeTotals = employeeBreakdown.map((employee) => ({
    ...employee,
    incentive,
    snackAllowance,
    finalTotal: employee.baseSalary + snackAllowance + incentive,
  }));
  const totalEmployeePayroll = employeeTotals.reduce((sum, employee) => sum + employee.finalTotal, 0);
  const netCash = todayTotalSales - totalExpenses - totalEmployeePayroll;
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
              <span>{mockOrders.length} completed orders</span>
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
                  <th className="px-3 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-3 py-4 font-semibold text-slate-700">{order.id}</td>
                    <td className="px-3 py-4 font-semibold text-slate-900">{order.orderNumber}</td>
                    <td className="px-3 py-4 text-slate-700">{formatCurrency(order.totalAmount)}</td>
                    <td className="px-3 py-4 text-slate-700">{formatDate(order.createdAt)}</td>
                    <td className="px-3 py-4">
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(order)}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        View Details
                      </button>
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
                        <p className="mt-2 text-2xl font-bold text-rose-600">{formatCurrency(totalExpenses)}</p>
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
                    {expenseBreakdown.map((expense) => (
                      <div key={expense.label} className="flex items-center justify-between rounded-2xl bg-white px-3 py-2 text-sm text-slate-600">
                        <span>{expense.label}</span>
                        <span className="font-semibold text-slate-900">{formatCurrency(expense.amount)}</span>
                      </div>
                    ))}
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
                  {expenseBreakdown.map((expense) => (
                    <div key={expense.label} className="flex items-center justify-between">
                      <span>{expense.label}</span>
                      <span>{formatCurrency(expense.amount)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between font-semibold">
                    <span>TOTAL EXPENSES</span>
                    <span>{formatCurrency(totalExpenses)}</span>
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
                <h2 className="mt-2 text-2xl font-black text-slate-900">{selectedOrder.orderNumber}</h2>
                <p className="mt-1 text-sm text-slate-500">{formatDate(selectedOrder.createdAt)}</p>
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
                {selectedOrder.items.map((item, index) => (
                  <div key={`${selectedOrder.id}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{item.quantity}x {item.name}</p>
                        {item.modifiers && item.modifiers.length > 0 && (
                          <p className="mt-1 text-sm text-slate-500">{item.modifiers.join(', ')}</p>
                        )}
                      </div>
                      <p className="font-semibold text-slate-900">{formatCurrency(item.price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-6">
              <div className="flex flex-col gap-2 text-sm text-slate-600 sm:items-end">
                <div className="flex w-full max-w-xs items-center justify-between gap-4">
                  <span>Total Amount</span>
                  <span className="text-lg font-black text-slate-900">{formatCurrency(selectedOrder.totalAmount)}</span>
                </div>
                <div className="flex w-full max-w-xs items-center justify-between gap-4">
                  <span>Amount Tendered</span>
                  <span className="text-lg font-black text-slate-900">{formatCurrency(selectedOrder.amountTendered)}</span>
                </div>
                <div className="flex w-full max-w-xs items-center justify-between gap-4">
                  <span>Change</span>
                  <span className="text-lg font-black text-emerald-600">{formatCurrency(selectedOrder.change)}</span>
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
