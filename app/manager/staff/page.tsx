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
  MoreHorizontal
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
  const [weeklySchedule, setWeeklySchedule] = useState<Array<{ id: string; day_of_week: string; assigned_staff: string[] }>>([]);
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

  const getWeeklySchedule = async () => {
    if (!supabase) return;

    const { data, error } = await supabase
      .from('weekly_schedule')
      .select('id, day_of_week, assigned_staff');

    if (error) {
      console.error('Weekly schedule fetch error:', error);
      return;
    }

    const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const parsed = (data ?? []).map((row: any) => ({
      id: row.id,
      day_of_week: row.day_of_week,
      assigned_staff: (row.assigned_staff ?? []) as string[],
    }));

    parsed.sort((a, b) => daysOrder.indexOf(a.day_of_week) - daysOrder.indexOf(b.day_of_week));

    setWeeklySchedule(parsed as Array<{ id: string; day_of_week: string; assigned_staff: string[] }>);
  };

  useEffect(() => {
    let subscription: any = null;

    const loadData = async () => {
      await Promise.all([getStaffDirectory(), getPayrollLogs(), getWeeklySchedule()]);
    };

    // run initial load, then create a uniquely named channel to avoid duplicate .on() bindings
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
    const { error } = await supabase
      .from('weekly_schedule')
      .update({ assigned_staff: editingAssigned })
      .eq('day_of_week', editingDay);

    if (error) {
      console.error('Weekly schedule update error:', error);
      return;
    }

    await getWeeklySchedule();
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

          <div className="bg-[#F0F7FF] border border-[#E0EFFF] rounded-[12px] p-3 flex flex-col gap-1.5">
            <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">
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
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto w-full max-w-[1200px] mx-auto">
        <div className="flex-1 p-8 lg:p-10 space-y-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[24px] shadow-sm border border-slate-100">
            <div>
              <h1 className="text-[28px] font-extrabold tracking-tight text-slate-900 mb-1 leading-none">
                People & Performance
              </h1>
              <p className="text-[15px] font-medium text-slate-500">
                Manage shifts, attendance, and sales targets
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  document.getElementById('weekly-schedule-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex items-center gap-2 px-5 py-3 rounded-[14px] bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-900 font-bold text-[14px] transition-colors focus:outline-none active:scale-[0.98]"
              >
                <Calendar className="w-4 h-4" />
                Schedule
              </button>
              <button
                type="button"
                onClick={openAddModal}
                className="flex items-center gap-2 px-6 py-3 rounded-[14px] bg-slate-900 hover:bg-black text-white font-bold text-[14px] transition-all shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-slate-900/20 active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                Add Staff
              </button>
            </div>
          </div>

          {/* Weekly Schedule Redesign */}
          <div id="weekly-schedule-section" className="bg-white rounded-[24px] p-7 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-[19px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-slate-400" />
                  Weekly Schedule
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Manage daily staff assignments and rotations.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {weeklySchedule.map((day) => (
                <div key={day.id} className="bg-[#F8FAFC] border border-slate-100 rounded-[20px] p-5 flex flex-col h-full relative group transition-all hover:border-slate-300 hover:shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 text-[16px]">{day.day_of_week}</h3>
                    <button
                      type="button"
                      onClick={() => openScheduleEditModal(day)}
                      className="p-1.5 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-300 transition-colors shadow-sm"
                      title={`Edit ${day.day_of_week} Schedule`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <div className="flex-1 flex flex-wrap gap-2 items-start content-start">
                    {day.assigned_staff && day.assigned_staff.length > 0 ? (
                      day.assigned_staff.map((name) => (
                        <span key={name} className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-2.5 py-1.5 text-[13px] font-medium text-slate-700 shadow-sm">
                          <User className="w-3 h-3 text-slate-400" />
                          {name}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-400 font-medium bg-slate-100 px-3 py-1.5 rounded-lg w-full text-center border border-dashed border-slate-300">
                        No staff assigned
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* Left Column: Team Earnings & Staff Directory */}
            <div className="xl:col-span-2 space-y-8">
              
              {/* Team Earnings Overview */}
              <div className="bg-white rounded-[24px] p-7 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="w-5 h-5 text-slate-400" />
                  <h2 className="text-[19px] font-bold text-slate-900 tracking-tight leading-tight">
                    Team Earnings Overview
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {teamEarnings.map((t) => (
                    <div key={t.id} className="bg-slate-50 border border-slate-100 rounded-[20px] p-5 hover:bg-slate-100 transition-colors cursor-default">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                        Team Member
                        <MoreHorizontal className="w-4 h-4 text-slate-300" />
                      </div>
                      <div className="text-[16px] font-semibold text-slate-700 mb-2">{t.name}</div>
                      <div className="text-[26px] font-black text-slate-900 leading-none tracking-tight">
                        {formatCurrency(t.overall_salary)}
                      </div>
                    </div>
                  ))}
                  {teamEarnings.length === 0 && (
                     <div className="col-span-full py-8 text-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-[20px]">
                        No earnings data available.
                     </div>
                  )}
                </div>
              </div>

              {/* Staff Directory */}
              <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
                <div className="flex items-center justify-between p-7 border-b border-slate-100">
                  <div>
                    <h2 className="text-[19px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
                      <Users className="w-5 h-5 text-slate-400" />
                      Staff Directory
                    </h2>
                  </div>
                </div>
                <div className="overflow-x-auto p-2">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="text-slate-400 uppercase tracking-[0.2em] text-[10px] font-bold">
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">PIN Code</th>
                        <th className="px-6 py-4">Base Salary</th>
                        <th className="px-6 py-4">Snack</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffMembers.map((staff) => (
                        <tr key={staff.id} className="border-b border-slate-50 last:border-none hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 text-slate-900 font-bold">{staff.name}</td>
                          <td className="px-6 py-4">
                            <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-mono text-xs tracking-widest">{staff.pin_code}</span>
                          </td>
                          <td className="px-6 py-4 text-slate-600 font-medium">{formatCurrency(staff.base_salary)}</td>
                          <td className="px-6 py-4 text-slate-600 font-medium">{formatCurrency(staff.snack_allowance)}</td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => openEditModal(staff)}
                              className="inline-flex items-center justify-center rounded-[10px] border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-bold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 shadow-sm"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                      {staffMembers.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-slate-400 font-medium">
                            No staff members found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column: Daily Payroll Logs */}
            <div className="xl:col-span-1">
              <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden h-full">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                  <h2 className="text-[18px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Clock className="w-5 h-5 text-slate-400" />
                    Payroll Logs
                  </h2>
                </div>

                <div className="overflow-x-auto p-2">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">
                        <th className="py-4 px-4">Details</th>
                        <th className="py-4 px-4 text-right">Final Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payrollLogs.map((log) => (
                        <tr key={log.id} className="border-b border-slate-50 last:border-none hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-4">
                            <div className="text-slate-900 font-bold text-[14px]">{log.employee_name}</div>
                            <div className="text-slate-500 text-[12px] mt-0.5">{new Date(log.shift_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                            <div className="text-slate-400 text-[11px] mt-1 flex gap-2">
                              <span>Base: {formatCurrency(log.base_salary)}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right align-top">
                            <div className="text-emerald-600 font-extrabold text-[15px] bg-emerald-50 inline-block px-2.5 py-1 rounded-lg">
                              {formatCurrency(log.final_total)}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {payrollLogs.length === 0 && (
                        <tr>
                          <td colSpan={2} className="px-4 py-10 text-center text-slate-400 font-medium">
                            No payroll records found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Modals */}
          {(isAddModalOpen || isEditModalOpen) && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 py-6">
              <div className="w-full max-w-lg rounded-[28px] bg-white p-8 shadow-2xl ring-1 ring-slate-200 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                      {isEditModalOpen ? 'Edit Staff Member' : 'Add New Staff'}
                    </h2>
                    <p className="mt-1.5 text-sm text-slate-500">
                      {isEditModalOpen
                        ? 'Update the name, PIN code, or compensation details.'
                        : 'Create a new staff record for clock-in access.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeStaffModal}
                    className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={isEditModalOpen ? handleEditStaff : handleAddStaff} className="mt-8 space-y-5">
                  <div>
                    <label className="block text-[13px] font-bold text-slate-700 uppercase tracking-wide mb-2">
                      Full Name
                    </label>
                    <input
                      value={formName}
                      onChange={(event) => setFormName(event.target.value)}
                      className="w-full rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 font-medium outline-none transition focus:border-slate-400 focus:bg-white"
                      placeholder="e.g. John Doe"
                      required
                    />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="block text-[13px] font-bold text-slate-700 uppercase tracking-wide mb-2">
                        4-Digit PIN
                      </label>
                      <input
                        value={formPin}
                        onChange={(event) => setFormPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="w-full rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 font-medium outline-none transition focus:border-slate-400 focus:bg-white tracking-[0.2em]"
                        placeholder="0000"
                        maxLength={4}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[13px] font-bold text-slate-700 uppercase tracking-wide mb-2">
                        Base Salary (₱)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formBaseSalary}
                        onChange={(event) => setFormBaseSalary(event.target.value)}
                        className="w-full rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 font-medium outline-none transition focus:border-slate-400 focus:bg-white"
                        placeholder="500"
                        required
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[13px] font-bold text-slate-700 uppercase tracking-wide mb-2">
                        Snack Allowance (₱)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formSnackAllowance}
                        onChange={(event) => setFormSnackAllowance(event.target.value)}
                        className="w-full rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 font-medium outline-none transition focus:border-slate-400 focus:bg-white"
                        placeholder="50"
                        required
                      />
                    </div>
                  </div>

                  {staffError && <p className="text-sm font-medium text-rose-500 bg-rose-50 p-3 rounded-xl">{staffError}</p>}
                  {staffSuccess && <p className="text-sm font-medium text-emerald-600 bg-emerald-50 p-3 rounded-xl">{staffSuccess}</p>}

                  <div className="flex flex-wrap justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={closeStaffModal}
                      className="rounded-[14px] border border-slate-200 bg-white px-6 py-3.5 text-[14px] font-bold text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-[14px] bg-slate-900 px-6 py-3.5 text-[14px] font-bold text-white transition hover:bg-black shadow-md hover:shadow-lg active:scale-[0.98]"
                    >
                      {isEditModalOpen ? 'Save Changes' : 'Create Staff Record'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {isScheduleModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4 py-6">
              <div className="w-full max-w-md rounded-[28px] bg-white p-7 shadow-2xl ring-1 ring-slate-200 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">Edit {editingDay}</h3>
                    <p className="mt-1 text-sm text-slate-500">Select staff to assign for this shift.</p>
                  </div>
                  <button onClick={closeScheduleModal} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition">
                    ×
                  </button>
                </div>

                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                  {staffMembers.map((s) => {
                    const isSelected = editingAssigned.includes(s.name);
                    return (
                      <label 
                        key={s.id} 
                        className={`flex items-center justify-between p-3 rounded-[14px] border transition-all cursor-pointer ${
                          isSelected ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isSelected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          <span className={`text-[15px] font-medium ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                            {s.name}
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleAssigned(s.name)}
                          className="w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                      </label>
                    );
                  })}
                  {staffMembers.length === 0 && (
                     <div className="text-center text-slate-400 text-sm py-4">No staff available. Please add staff first.</div>
                  )}
                </div>

                <div className="mt-8 flex justify-end gap-3">
                  <button onClick={closeScheduleModal} className="rounded-[12px] border border-slate-200 bg-white px-5 py-3 text-[14px] font-bold text-slate-700 transition hover:bg-slate-50">
                    Cancel
                  </button>
                  <button onClick={saveSchedule} className="rounded-[12px] bg-slate-900 px-5 py-3 text-[14px] font-bold text-white transition hover:bg-black shadow-md active:scale-[0.98]">
                    Save Schedule
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

    </div>
  );
}