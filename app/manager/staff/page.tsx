'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  LayoutGrid,
  ReceiptText,
  Box,
  Users,
  LogOut,
  Plus,
  Calendar,
  Edit2,
  TrendingUp,
  Clock,
  User,
  MoreHorizontal,
  Trash2,
  UserPlus,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
  DollarSign,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

type PayrollLog = {
  id: string;
  employee_name: string;
  shift_date: string;
  base_salary: number;
  incentives: number;
  snack_allowance: number;
  final_total: number;
};

export default function StaffScreen() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState('staff');
  const [staffMembers, setStaffMembers] = useState<Array<{ id: string; name: string; pin_code: string; base_salary: number; snack_allowance: number }>>([]);
  const [payrollLogs, setPayrollLogs] = useState<PayrollLog[]>([]);
  const [monthlySchedule, setMonthlySchedule] = useState<Array<{ id: string; date: string; staff_name: string }>>([]);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [selectedShiftDate, setSelectedShiftDate] = useState<string | null>(null);
  const [staffToAdd, setStaffToAdd] = useState('');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editingAssigned, setEditingAssigned] = useState<string[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formPin, setFormPin] = useState('');
  const [formBaseSalary, setFormBaseSalary] = useState('500');
  const [formSnackAllowance, setFormSnackAllowance] = useState('50');
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [staffError, setStaffError] = useState('');
  const [staffSuccess, setStaffSuccess] = useState('');

  const formatCurrency = (value: number) => `₱${value.toFixed(2)}`;

  const teamEarnings = useMemo(() => {
    return staffMembers.map((s) => {
      const total = payrollLogs
        .filter((p) => p.employee_name === s.name)
        .reduce((sum, p) => sum + (Number(p.final_total) || 0), 0);

      return {
        id: s.id,
        name: s.name,
        overall_salary: total,
      };
    });
  }, [staffMembers, payrollLogs]);

  const getStaffDirectory = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('staff')
      .select('id, name, pin_code, base_salary, snack_allowance')
      .order('name');
    if (error) {
      console.error('Staff fetch error:', error);
      return;
    }
    const staff = (data ?? []).map((row: any) => ({
      id: row.id,
      name: row.name,
      pin_code: row.pin_code,
      base_salary: Number(row.base_salary ?? 500),
      snack_allowance: Number(row.snack_allowance ?? 50),
    }));
    setStaffMembers(staff);
  };

  const getPayrollLogs = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('payroll')
      .select('id, employee_name, shift_date, base_salary, incentives, snack_allowance, final_total')
      .order('shift_date', { ascending: false });

    if (error) {
      console.error('Payroll fetch error:', error);
      return;
    }

    const parsedPayroll = (data ?? []).map((row: any) => ({
      id: row.id,
      employee_name: row.employee_name,
      shift_date: row.shift_date,
      base_salary: Number(row.base_salary),
      incentives: Number(row.incentives),
      snack_allowance: Number(row.snack_allowance),
      final_total: Number(row.final_total),
    })) as PayrollLog[];

    setPayrollLogs(parsedPayroll);
  };

  const getMonthlySchedule = async () => {
    if (!supabase) return;

    const { data, error } = await supabase
      .from('monthly_schedule')
      .select('*');

    if (error) {
      console.error('Schedule fetch error:', error?.message || error);
      return;
    }

    const parsed = (data ?? []).map((row: any) => ({
      id: row.id,
      date: String(row.date ?? ''),
      staff_name: String(row.staff_name ?? ''),
    }));

    parsed.sort((a, b) => a.date.localeCompare(b.date));

    setMonthlySchedule(parsed as Array<{ id: string; date: string; staff_name: string }>);
  };

  const handleAddStaffToShift = async () => {
    if (!staffToAdd || !selectedShiftDate) return;
    if (!supabase) return;

    const { error: insertError } = await supabase
      .from('monthly_schedule')
      .insert([
        {
          date: selectedShiftDate,
          staff_name: staffToAdd,
        },
      ]);

    if (insertError) {
      console.error('Add staff to shift error:', insertError?.message || insertError);
      return;
    }

    await getMonthlySchedule();
    setStaffToAdd('');
  };

  const handleRemoveStaffFromShift = async (recordId: string) => {
    if (!supabase) return;

    const { error } = await supabase
      .from('monthly_schedule')
      .delete()
      .eq('id', recordId);

    if (error) {
      console.error('Remove staff from shift error:', error);
      return;
    }

    await getMonthlySchedule();
  };

  useEffect(() => {
    let subscription: any = null;

    const loadData = async () => {
      await Promise.all([getStaffDirectory(), getPayrollLogs(), getMonthlySchedule()]);
    };

    loadData()
      .then(() => {
        try {
          if (!supabase) return;
          const subName = `payroll_changes_${Date.now()}`;
          const sub = supabase
            .channel(subName)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payroll' }, () => {
              void getPayrollLogs();
            })
            .subscribe();

          subscription = sub;
        } catch (err) {
          console.error('Realtime subscription error:', err);
        }
      })
      .catch((err) => console.error('Initial load error:', err));

    return () => {
      if (subscription) {
        // @ts-ignore
        supabase?.removeChannel(subscription);
      }
    };
  }, []);

  const openScheduleEditModal = (day: { id: string; day_of_week: string; assigned_staff: string[] }) => {
    setEditingDay(day.day_of_week);
    setEditingAssigned(day.assigned_staff ?? []);
    setIsScheduleModalOpen(true);
  };

  const closeScheduleModal = () => {
    setIsScheduleModalOpen(false);
    setEditingDay(null);
    setEditingAssigned([]);
  };

  const toggleAssigned = (name: string) => {
    setEditingAssigned((current) => {
      if (current.includes(name)) return current.filter((n) => n !== name);
      return [...current, name];
    });
  };

  const saveSchedule = async () => {
    if (!editingDay) return;
    await getMonthlySchedule();
    closeScheduleModal();
  };

  const closeStaffModal = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setFormName('');
    setFormPin('');
    setFormBaseSalary('500');
    setFormSnackAllowance('50');
    setEditingStaffId(null);
    setStaffError('');
    setStaffSuccess('');
  };

  const handleAddStaff = async (event: React.FormEvent) => {
    event.preventDefault();
    setStaffError('');
    setStaffSuccess('');

    if (!supabase) {
      setStaffError('Supabase client is not configured.');
      return;
    }

    if (!formName.trim() || formPin.trim().length !== 4) {
      setStaffError('Please enter a valid name and 4-digit PIN code.');
      return;
    }

    const baseSalary = parseFloat(formBaseSalary);
    const snackAllowance = parseFloat(formSnackAllowance);
    if (Number.isNaN(baseSalary) || baseSalary < 0 || Number.isNaN(snackAllowance) || snackAllowance < 0) {
      setStaffError('Please enter valid salary and allowance values.');
      return;
    }

    const { error } = await supabase.from('staff').insert([
      {
        name: formName.trim(),
        pin_code: formPin.trim(),
        base_salary: baseSalary,
        snack_allowance: snackAllowance,
      },
    ]);

    if (error) {
      console.error('Add staff error:', error);
      setStaffError(error.message);
      return;
    }

    setStaffSuccess('Staff member added.');
    closeStaffModal();
    getStaffDirectory();
  };

  const handleEditStaff = async (event: React.FormEvent) => {
    event.preventDefault();
    setStaffError('');
    setStaffSuccess('');
    if (!editingStaffId) return;

    if (!supabase) {
      setStaffError('Supabase client is not configured.');
      return;
    }

    if (!formName.trim() || formPin.trim().length !== 4) {
      setStaffError('Please enter a valid name and 4-digit PIN code.');
      return;
    }

    const baseSalary = parseFloat(formBaseSalary);
    const snackAllowance = parseFloat(formSnackAllowance);
    if (Number.isNaN(baseSalary) || baseSalary < 0 || Number.isNaN(snackAllowance) || snackAllowance < 0) {
      setStaffError('Please enter valid salary and allowance values.');
      return;
    }

    const { error } = await supabase
      .from('staff')
      .update({
        name: formName.trim(),
        pin_code: formPin.trim(),
        base_salary: baseSalary,
        snack_allowance: snackAllowance,
      })
      .eq('id', editingStaffId);

    if (error) {
      console.error('Edit staff error:', error);
      setStaffError(error.message);
      return;
    }

    setStaffSuccess('Staff member updated.');
    closeStaffModal();
    getStaffDirectory();
  };

  const openAddModal = () => {
    setStaffError('');
    setStaffSuccess('');
    setFormName('');
    setFormPin('');
    setFormBaseSalary('500');
    setFormSnackAllowance('50');
    setEditingStaffId(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (staff: { id: string; name: string; pin_code: string; base_salary: number; snack_allowance: number }) => {
    setStaffError('');
    setStaffSuccess('');
    setFormName(staff.name);
    setFormPin(staff.pin_code);
    setFormBaseSalary(String(staff.base_salary ?? 500));
    setFormSnackAllowance(String(staff.snack_allowance ?? 50));
    setEditingStaffId(staff.id);
    setIsEditModalOpen(true);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, path: '/manager/dashboard' },
    { id: 'transactions', label: 'Transactions', icon: ReceiptText, path: '/manager/transactions' },
    { id: 'inventory', label: 'Inventory', icon: Box, path: '/manager/inventory' },
    { id: 'staff', label: 'Staff', icon: Users, path: '/manager/staff' },
  ];

  const getDaysInMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = now.toLocaleDateString('en-US', { month: 'short' });

    return Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(year, month, i + 1);
      return {
        fullDateString: date.toISOString().split('T')[0],
        dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }),
        displayDate: `${monthName} ${date.getDate()}`,
      };
    });
  };

  const currentMonthDays = getDaysInMonth();

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">

      {/* Sidebar */}
      <aside className="w-[240px] bg-white border-r border-slate-200 flex flex-col flex-shrink-0 h-full sticky top-0 z-20 shadow-sm">
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          <div className="w-9 h-9 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
            <div className="w-3.5 h-3.5 border-2 border-white rounded-sm" />
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-900">SnackAttack</span>
        </div>

        <nav className="flex flex-col gap-1 px-4 flex-1 mt-4">
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
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none group ${
                  isActive
                    ? 'bg-slate-100 text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-5 h-5 transition-all ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px] group-hover:stroke-[2.5px]'}`} />
                {item.label}
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-slate-900" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-3 mt-auto">
          <button
            onClick={() => router.push('/')}
            className="flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 text-sm font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 text-white shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                System Health
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-300">Pi 5 CPU</span>
              <span className="text-xs font-bold text-emerald-400">42°C</span>
            </div>
            <div className="w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: '42%' }} />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6 bg-slate-50/80">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              <span className="bg-slate-900 text-white p-1.5 rounded-xl">
                <Users className="w-5 h-5" />
              </span>
              People & Performance
            </h1>
            <p className="text-sm text-slate-500 mt-1">Manage shifts, attendance, and sales targets</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                document.getElementById('weekly-schedule-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium transition-all shadow-sm"
            >
              <Calendar className="w-4 h-4" />
              Schedule
            </button>
            <button
              type="button"
              onClick={openAddModal}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition-all shadow-lg shadow-slate-900/10"
            >
              <Plus className="w-4 h-4" />
              Add Staff
            </button>
          </div>
        </div>

        {/* Monthly Schedule */}
        <div id="weekly-schedule-section" className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-slate-400" />
                Monthly Schedule
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Manage daily staff assignments for the current month</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
            {currentMonthDays.map((day) => {
              const dayAssignments = monthlySchedule.filter((assignment) => assignment.date === day.fullDateString);
              return (
                <div
                  key={day.fullDateString}
                  onClick={() => {
                    setSelectedShiftDate(day.fullDateString);
                    setIsShiftModalOpen(true);
                  }}
                  className="bg-slate-50 rounded-xl border border-slate-200 p-4 hover:border-slate-400 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{day.displayDate}</p>
                      <p className="text-[10px] font-medium text-slate-400">{day.dayOfWeek}</p>
                    </div>
                    {dayAssignments.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle className="w-3 h-3" />
                        {dayAssignments.length}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {dayAssignments.length > 0 ? (
                      dayAssignments.slice(0, 2).map((record) => (
                        <div key={record.id} className="flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white rounded-lg px-2 py-1 border border-slate-200 shadow-sm">
                          <User className="w-3 h-3 text-slate-400" />
                          <span className="truncate">{record.staff_name}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-400 bg-slate-100 rounded-lg px-2 py-1.5 text-center border border-dashed border-slate-300">
                        No staff
                      </div>
                    )}
                    {dayAssignments.length > 2 && (
                      <div className="text-[10px] text-slate-400 text-center">+{dayAssignments.length - 2} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Team Earnings & Staff Directory / Payroll Logs */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left column: Earnings + Staff Directory */}
          <div className="xl:col-span-2 space-y-6">
            {/* Team Earnings */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp className="w-5 h-5 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-900">Team Earnings Overview</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {teamEarnings.map((t) => (
                  <div key={t.id} className="bg-slate-50 rounded-xl p-5 border border-slate-200 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-slate-500">{t.name}</span>
                      <MoreHorizontal className="w-4 h-4 text-slate-300" />
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(t.overall_salary)}</p>
                  </div>
                ))}
                {teamEarnings.length === 0 && (
                  <div className="col-span-full py-8 text-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                    No earnings data available.
                  </div>
                )}
              </div>
            </div>

            {/* Staff Directory */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-slate-400" />
                  Staff Directory
                </h2>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  {staffMembers.length}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50/60 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-6 py-3 text-left">Name</th>
                      <th className="px-6 py-3 text-left">PIN</th>
                      <th className="px-6 py-3 text-left">Base Salary</th>
                      <th className="px-6 py-3 text-left">Snack</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staffMembers.map((staff) => (
                      <tr key={staff.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-800">{staff.name}</td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded-lg tracking-wider">{staff.pin_code}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{formatCurrency(staff.base_salary)}</td>
                        <td className="px-6 py-4 text-slate-600">{formatCurrency(staff.snack_allowance)}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => openEditModal(staff)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 shadow-sm"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                    {staffMembers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-sm">
                          No staff members found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right column: Payroll Logs */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden h-full">
              <div className="px-6 py-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-slate-400" />
                    Payroll Logs
                  </h2>
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                    {payrollLogs.length}
                  </span>
                </div>
              </div>
              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                {payrollLogs.length === 0 ? (
                  <div className="px-6 py-10 text-center text-slate-400 text-sm">
                    No payroll records found.
                  </div>
                ) : (
                  payrollLogs.slice(0, 10).map((log) => (
                    <div key={log.id} className="px-6 py-4 hover:bg-slate-50/70 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-800">{log.employee_name}</p>
                          <p className="text-xs text-slate-400">
                            {new Date(log.shift_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="inline-block text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                            {formatCurrency(log.final_total)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-[10px] text-slate-400">
                        <span>Base: {formatCurrency(log.base_salary)}</span>
                        <span>Incentive: {formatCurrency(log.incentives)}</span>
                        <span>Snack: {formatCurrency(log.snack_allowance)}</span>
                      </div>
                    </div>
                  ))
                )}
                {payrollLogs.length > 10 && (
                  <div className="px-6 py-3 text-center text-xs text-slate-400 border-t border-slate-100">
                    + {payrollLogs.length - 10} more records
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        {/* Add/Edit Staff Modal */}
        {(isAddModalOpen || isEditModalOpen) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {isEditModalOpen ? 'Edit Staff Member' : 'Add New Staff'}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {isEditModalOpen ? 'Update staff details and compensation.' : 'Create a new staff record for clock-in access.'}
                  </p>
                </div>
                <button
                  onClick={closeStaffModal}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={isEditModalOpen ? handleEditStaff : handleAddStaff} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Full Name
                  </label>
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                    placeholder="e.g. John Doe"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      4-Digit PIN
                    </label>
                    <input
                      value={formPin}
                      onChange={(e) => setFormPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-slate-200 tracking-[0.2em]"
                      placeholder="0000"
                      maxLength={4}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                      Base Salary (₱)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formBaseSalary}
                      onChange={(e) => setFormBaseSalary(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                      placeholder="500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                    Snack Allowance (₱)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formSnackAllowance}
                    onChange={(e) => setFormSnackAllowance(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                    placeholder="50"
                    required
                  />
                </div>

                {staffError && (
                  <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200">
                    <AlertCircle className="w-4 h-4" />
                    {staffError}
                  </div>
                )}
                {staffSuccess && (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                    <CheckCircle className="w-4 h-4" />
                    {staffSuccess}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeStaffModal}
                    className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 shadow-md"
                  >
                    {isEditModalOpen ? 'Save Changes' : 'Create Staff'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Shift Management Modal */}
        {isShiftModalOpen && selectedShiftDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Manage Shift</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {new Date(selectedShiftDate + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsShiftModalOpen(false);
                    setStaffToAdd('');
                  }}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                {monthlySchedule.filter((record) => record.date === selectedShiftDate).length === 0 ? (
                  <div className="text-center text-sm text-slate-400 py-8 border-2 border-dashed border-slate-200 rounded-xl">
                    No staff assigned to this shift.
                  </div>
                ) : (
                  monthlySchedule
                    .filter((record) => record.date === selectedShiftDate)
                    .map((record) => (
                      <div key={record.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                            {record.staff_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-800">{record.staff_name}</span>
                        </div>
                        <button
                          onClick={() => void handleRemoveStaffFromShift(record.id)}
                          className="rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-200"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                )}
              </div>

              <div className="mt-6 flex gap-3">
                <select
                  value={staffToAdd}
                  onChange={(e) => setStaffToAdd(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="">Select Staff</option>
                  {staffMembers.map((staff) => (
                    <option key={staff.id} value={staff.name}>
                      {staff.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => void handleAddStaffToShift()}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 shadow-md"
                >
                  Add
                </button>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setIsShiftModalOpen(false);
                    setStaffToAdd('');
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Legacy Schedule Modal (kept for compatibility) */}
        {isScheduleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Edit {editingDay}</h3>
                  <p className="text-sm text-slate-500 mt-1">Select staff to assign for this shift.</p>
                </div>
                <button onClick={closeScheduleModal} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {staffMembers.map((s) => {
                  const isSelected = editingAssigned.includes(s.name);
                  return (
                    <label
                      key={s.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          isSelected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <span className={`text-sm font-medium ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                          {s.name}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleAssigned(s.name)}
                        className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                    </label>
                  );
                })}
                {staffMembers.length === 0 && (
                  <div className="text-center text-sm text-slate-400 py-4">No staff available.</div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button onClick={closeScheduleModal} className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                  Cancel
                </button>
                <button onClick={saveSchedule} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 shadow-md">
                  Save Schedule
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}