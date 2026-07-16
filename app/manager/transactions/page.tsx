'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, ChevronDown, LayoutGrid, LogOut, ReceiptText, Search, Users, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

type TransactionStatus = 'Completed' | 'Voided' | 'Refunded';

type TransactionRecord = {
  id: string;
  createdAt: string | null;
  time: string;
  orderId: string;
  cashier: string;
  status: TransactionStatus;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  tax: number;
  totalAmount: number;
  transactionId: string;
  receiptNumber: string;
  managerApproval?: string;
  voidOrRefundReason?: string;
};

type OrderRow = {
  id: string;
  order_number: string | null;
  created_at: string | null;
  cashier_name: string | null;
  total_amount: number | null;
  status?: string | null;
};

const formatCurrency = (amount: number) =>
  `₱${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getStatusBadgeClassName = (status: TransactionStatus) => {
  if (status === 'Completed') {
    return 'bg-emerald-50 text-emerald-700';
  }

  if (status === 'Voided') {
    return 'bg-rose-50 text-rose-700';
  }

  return 'bg-amber-50 text-amber-700';
};

const getLocalDateBoundaries = () => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return {
    startOfToday,
    startOfTomorrow,
    startOfYesterday,
    startOfMonth,
  };
};

const matchesSearchAndCashier = (
  transaction: TransactionRecord,
  searchQuery: string,
  cashierFilter: string,
) => {
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const matchesSearch =
    normalizedSearch.length === 0 ||
    transaction.orderId.toLowerCase().includes(normalizedSearch) ||
    transaction.receiptNumber.toLowerCase().includes(normalizedSearch);

  const matchesCashier = cashierFilter === 'all' || transaction.cashier === cashierFilter;

  return matchesSearch && matchesCashier;
};

type TransactionTableProps = {
  title: string;
  subtitle: string;
  transactions: TransactionRecord[];
  onSelectTransaction: (transaction: TransactionRecord) => void;
};

const TransactionTable = ({ title, subtitle, transactions, onSelectTransaction }: TransactionTableProps) => (
  <section className="overflow-hidden rounded-[12px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
    <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
    </div>

    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80">
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Time</th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Order ID</th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Cashier</th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Total Amount</th>
          </tr>
        </thead>

        <tbody>
          {transactions.length > 0 ? (
            transactions.map((transaction) => (
              <tr
                key={transaction.id}
                onClick={() => onSelectTransaction(transaction)}
                className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
              >
                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">{transaction.time}</td>
                <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-900">{transaction.orderId}</td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">{transaction.cashier}</td>
                <td className="whitespace-nowrap px-5 py-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClassName(transaction.status)}`}
                  >
                    {transaction.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-slate-900">
                  {formatCurrency(transaction.totalAmount)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="px-5 py-10 text-center text-sm text-slate-500">
                No transactions match your filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </section>
);

export default function TransactionsAuditPage() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState('transactions');
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cashierFilter, setCashierFilter] = useState('all');
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionRecord | null>(null);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, path: '/manager/dashboard' },
    { id: 'transactions', label: 'Transactions', icon: ReceiptText, path: '/manager/transactions' },
    { id: 'inventory', label: 'Inventory', icon: Box, path: '/manager/inventory' },
    { id: 'staff', label: 'Staff', icon: Users, path: '/manager/staff' },
  ];

  useEffect(() => {
    const fetchOrders = async () => {
      if (!supabase) {
        return;
      }

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Orders fetch error:', error);
        return;
      }

      const parsedTransactions = ((data ?? []) as OrderRow[]).map((order) => {
        const amount = Number(order.total_amount ?? 0);
        const createdAt = order.created_at ? new Date(order.created_at) : null;
        const normalizedStatus = String(order.status ?? 'Completed').toLowerCase();
        const status: TransactionStatus = normalizedStatus === 'voided'
          ? 'Voided'
          : normalizedStatus === 'refunded'
            ? 'Refunded'
            : 'Completed';

        return {
          id: order.id,
          createdAt: order.created_at,
          time: createdAt
            ? createdAt.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })
            : '--:--',
          orderId: order.order_number || order.id,
          cashier: order.cashier_name || 'Unknown',
          status,
          items: [],
          subtotal: amount,
          tax: 0,
          totalAmount: amount,
          transactionId: order.id,
          receiptNumber: order.order_number || order.id,
        };
      });

      setTransactions(parsedTransactions);
    };

    void fetchOrders();
  }, []);

  const { todaysOrders, yesterdaysOrders, weeklyMonthlyOrders } = useMemo(() => {
    const { startOfToday, startOfTomorrow, startOfYesterday, startOfMonth } = getLocalDateBoundaries();

    const transactionsWithDates = transactions
      .map((transaction) => ({
        ...transaction,
        localCreatedAt: transaction.createdAt ? new Date(transaction.createdAt) : null,
      }))
      .filter((transaction) => transaction.localCreatedAt && !Number.isNaN(transaction.localCreatedAt.getTime()));

    const todays = transactionsWithDates.filter(
      (transaction) => transaction.localCreatedAt! >= startOfToday && transaction.localCreatedAt! < startOfTomorrow,
    );
    const yesterdays = transactionsWithDates.filter(
      (transaction) => transaction.localCreatedAt! >= startOfYesterday && transaction.localCreatedAt! < startOfToday,
    );
    const weeklyMonthly = transactionsWithDates.filter(
      (transaction) => transaction.localCreatedAt! >= startOfMonth && transaction.localCreatedAt! < startOfTomorrow,
    );

    return {
      todaysOrders: todays,
      yesterdaysOrders: yesterdays,
      weeklyMonthlyOrders: weeklyMonthly,
    };
  }, [transactions]);

  const filteredTodaysOrders = useMemo(
    () => todaysOrders.filter((transaction) => matchesSearchAndCashier(transaction, searchQuery, cashierFilter)),
    [cashierFilter, searchQuery, todaysOrders],
  );

  const filteredYesterdaysOrders = useMemo(
    () => yesterdaysOrders.filter((transaction) => matchesSearchAndCashier(transaction, searchQuery, cashierFilter)),
    [cashierFilter, searchQuery, yesterdaysOrders],
  );

  const filteredWeeklyMonthlyOrders = useMemo(
    () => weeklyMonthlyOrders.filter((transaction) => matchesSearchAndCashier(transaction, searchQuery, cashierFilter)),
    [cashierFilter, searchQuery, weeklyMonthlyOrders],
  );

  const summaryTiles = useMemo(
    () => [
      { label: "Today's Sales", value: formatCurrency(todaysOrders.reduce((sum, order) => sum + order.totalAmount, 0)) },
      {
        label: "Yesterday's Sales",
        value: formatCurrency(yesterdaysOrders.reduce((sum, order) => sum + order.totalAmount, 0)),
      },
      { label: 'Period Sales', value: formatCurrency(weeklyMonthlyOrders.reduce((sum, order) => sum + order.totalAmount, 0)) },
    ],
    [todaysOrders, weeklyMonthlyOrders, yesterdaysOrders],
  );

  const cashierOptions = Array.from(new Set(transactions.map((transaction) => transaction.cashier))).sort(
    (a, b) => a.localeCompare(b),
  );

  return (
    <div className="flex min-h-screen overflow-hidden bg-[#F4F4F5] font-sans text-slate-900">
      <aside className="fixed left-0 top-0 z-20 flex h-screen w-64 flex-col overflow-y-auto border-r border-slate-200 bg-white shadow-sm">
        <div className="p-6 flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-slate-900 rounded-[8px] flex items-center justify-center flex-shrink-0 shadow-sm">
            <div className="w-3 h-3 border-[2px] border-white rounded-[2px]" />
          </div>
          <span className="font-extrabold text-[19px] tracking-tight text-slate-900">QuickServe</span>
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
                  router.push(item.path);
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

        <div className="p-4 flex flex-col gap-2">
          <button
            onClick={() => router.push('/')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-[10px] text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-semibold text-[13px] transition-colors mb-2 focus:outline-none"
          >
            <LogOut className="w-4 h-4 stroke-[2px]" />
            Log Out
          </button>

          <div className="bg-[#F0F7FF] border border-[#E0EFFF] rounded-[12px] p-3">
            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">PI 5 STATUS</div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-slate-800">Temp: 42°C</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            </div>
          </div>
        </div>
      </aside>

      <main className="ml-64 min-h-screen flex-1 overflow-y-auto p-6 md:p-10">
        <div className="mx-auto w-full max-w-7xl space-y-6">
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Transactions &amp; Audit</h1>
              <p className="mt-1 text-sm text-slate-500">Monitor daily performance and review audit-ready transaction records.</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-[12px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Export Report
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-[12px] bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
              >
                End-of-Day (EOD) Reconciliation
              </button>
            </div>
          </header>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {summaryTiles.map((card) => (
              <article
                key={card.label}
                className="rounded-[12px] border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
              >
                <p className="text-sm font-medium text-slate-500">{card.label}</p>
                <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{card.value}</p>
              </article>
            ))}
          </section>

          <section className="flex flex-col gap-3 rounded-[12px] border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Order ID or Receipt Number"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-[12px] border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto">
              <div className="relative">
                <select
                  value={cashierFilter}
                  onChange={(event) => setCashierFilter(event.target.value)}
                  className="min-w-[150px] appearance-none rounded-[12px] border border-slate-200 bg-white px-3.5 py-2.5 pr-9 text-sm text-slate-600 shadow-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="all">All Cashiers</option>
                  {cashierOptions.map((cashier) => (
                    <option key={cashier} value={cashier}>
                      {cashier}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <TransactionTable
              title="Today"
              subtitle="Local-time orders placed today"
              transactions={filteredTodaysOrders}
              onSelectTransaction={setSelectedTransaction}
            />
            <TransactionTable
              title="Yesterday"
              subtitle="Local-time orders placed yesterday"
              transactions={filteredYesterdaysOrders}
              onSelectTransaction={setSelectedTransaction}
            />
            <TransactionTable
              title="This Week / Month"
              subtitle="Local-time orders for the current period"
              transactions={filteredWeeklyMonthlyOrders}
              onSelectTransaction={setSelectedTransaction}
            />
          </section>
        </div>
      </main>

      <div
        className={`fixed inset-0 z-40 transition ${
          selectedTransaction ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        <button
          type="button"
          aria-label="Close transaction drawer"
          onClick={() => setSelectedTransaction(null)}
          className={`absolute inset-0 bg-slate-900/20 transition-opacity ${
            selectedTransaction ? 'opacity-100' : 'opacity-0'
          }`}
        />

        <aside
          className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-[-12px_0_30px_rgba(15,23,42,0.14)] transition-transform duration-300 ${
            selectedTransaction ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-start justify-between border-b border-slate-200 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Transaction Details</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                {selectedTransaction?.orderId ?? 'Order'}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setSelectedTransaction(null)}
              className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {selectedTransaction && (
            <div className="flex flex-1 flex-col overflow-y-auto">
              <div className="space-y-6 p-5">
                <section className="space-y-3 rounded-[12px] border border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">Order ID</span>
                    <span className="text-sm font-semibold text-slate-900">{selectedTransaction.orderId}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">Status</span>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClassName(selectedTransaction.status)}`}
                    >
                      {selectedTransaction.status}
                    </span>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-slate-900">Order Items</h3>
                  <ul className="mt-3 space-y-2 rounded-[12px] border border-slate-200 p-4">
                    {selectedTransaction.items.length > 0 ? (
                      selectedTransaction.items.map((item) => (
                        <li key={`${item.name}-${item.quantity}`} className="flex items-start justify-between gap-3 text-sm">
                          <span className="text-slate-700">
                            {item.quantity}x {item.name}
                          </span>
                          <span className="font-medium text-slate-900">{formatCurrency(item.price * item.quantity)}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-slate-500">Item-level details are not available in this view.</li>
                    )}
                  </ul>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-slate-900">Payment Summary</h3>
                  <div className="mt-3 space-y-2 rounded-[12px] border border-slate-200 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Subtotal</span>
                      <span className="font-medium text-slate-900">{formatCurrency(selectedTransaction.subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Tax</span>
                      <span className="font-medium text-slate-900">{formatCurrency(selectedTransaction.tax)}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-sm">
                      <span className="font-semibold text-slate-900">Total</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(selectedTransaction.totalAmount)}</span>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-slate-900">Audit Info</h3>
                  <div className="mt-3 space-y-2 rounded-[12px] border border-slate-200 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Transaction ID</span>
                      <span className="font-medium text-slate-900">{selectedTransaction.transactionId}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Receipt Number</span>
                      <span className="font-medium text-slate-900">{selectedTransaction.receiptNumber}</span>
                    </div>
                  </div>
                </section>

                {(selectedTransaction.status === 'Voided' || selectedTransaction.status === 'Refunded') && (
                  <section className="rounded-[12px] border border-rose-200 bg-rose-50 p-4">
                    <h3 className="text-sm font-semibold text-rose-800">Void/Refund Reason</h3>
                    <p className="mt-2 text-sm text-rose-700">{selectedTransaction.voidOrRefundReason}</p>

                    <div className="mt-4 border-t border-rose-200 pt-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-rose-600">Manager Approval</p>
                      <p className="mt-1 text-sm font-semibold text-rose-800">{selectedTransaction.managerApproval}</p>
                    </div>
                  </section>
                )}
              </div>

              <div className="mt-auto border-t border-slate-200 p-5">
                <button
                  type="button"
                  className="w-full rounded-[12px] bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Reprint Receipt
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
