'use client';

import React, { useEffect, useState } from 'react';
import {
  LayoutGrid,
  ReceiptText,
  Box,
  Users,
  Star,
  LogOut,
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

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([getStaffDirectory(), getPayrollLogs()]);
    };

    loadData();
  }, []);

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
              <button
                type="button"
                onClick={openAddModal}
                className="px-6 py-3 rounded-[14px] bg-slate-900 hover:bg-black text-white font-bold text-[14px] transition-colors shadow-md focus:outline-none focus:ring-4 focus:ring-slate-900/20 active:scale-[0.98]"
              >
                Add New Staff
              </button>
            </div>
          </div>

          {/* Staff Directory */}
          <div className="bg-white rounded-[24px] p-7 shadow-sm border border-slate-100 mb-8">
            <div className="flex items-center justify-between mb-5 gap-4">
              <div>
                <h2 className="text-[19px] font-bold text-slate-900 tracking-tight leading-tight">
                  Staff Directory
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Manage staff names and clock-in PIN codes for employee time tracking.
                </p>
              </div>
              <button
                type="button"
                onClick={openAddModal}
                className="px-5 py-3 rounded-[14px] bg-slate-900 hover:bg-black text-white font-bold text-[14px] transition-colors shadow-md focus:outline-none focus:ring-4 focus:ring-slate-900/20 active:scale-[0.98]"
              >
                Add New Staff
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-[0.24em] text-[11px]">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">PIN Code</th>
                    <th className="px-4 py-3">Base Salary</th>
                    <th className="px-4 py-3">Snack Allowance</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staffMembers.map((staff) => (
                    <tr key={staff.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4 text-slate-900 font-semibold">{staff.name}</td>
                      <td className="px-4 py-4 text-slate-700">{staff.pin_code}</td>
                      <td className="px-4 py-4 text-slate-700">{formatCurrency(staff.base_salary)}</td>
                      <td className="px-4 py-4 text-slate-700">{formatCurrency(staff.snack_allowance)}</td>
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openEditModal(staff)}
                          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {staffMembers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                        No staff members found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {(isAddModalOpen || isEditModalOpen) && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6">
              <div className="w-full max-w-lg rounded-[28px] bg-white p-8 shadow-2xl ring-1 ring-slate-200">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      {isEditModalOpen ? 'Edit Staff Member' : 'Add New Staff'}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      {isEditModalOpen
                        ? 'Update the name or PIN code for this employee.'
                        : 'Create a new staff record for clock-in access.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeStaffModal}
                    className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                    aria-label="Close staff modal"
                  >
                    ×
                  </button>
                </div>

                <form
                  onSubmit={isEditModalOpen ? handleEditStaff : handleAddStaff}
                  className="mt-6 space-y-5"
                >
                  <div>
                    <label className="block text-sm font-semibold text-slate-700">
                      Name
                      <input
                        value={formName}
                        onChange={(event) => setFormName(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                        placeholder="Employee name"
                        required
                      />
                    </label>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">
                        PIN Code
                        <input
                          value={formPin}
                          onChange={(event) => setFormPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                          placeholder="0000"
                          maxLength={4}
                          required
                        />
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700">
                        Base Salary
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formBaseSalary}
                          onChange={(event) => setFormBaseSalary(event.target.value)}
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                          placeholder="500"
                          required
                        />
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700">
                        Snack Allowance
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formSnackAllowance}
                          onChange={(event) => setFormSnackAllowance(event.target.value)}
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                          placeholder="50"
                          required
                        />
                      </label>
                    </div>
                  </div>

                  {staffError && <p className="text-sm text-rose-600">{staffError}</p>}
                  {staffSuccess && <p className="text-sm text-emerald-600">{staffSuccess}</p>}

                  <div className="flex flex-wrap justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={closeStaffModal}
                      className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      {isEditModalOpen ? 'Save Changes' : 'Create Staff'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

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

          {/* Daily Payroll Logs */}
          <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between p-6 pb-2">
              <h2 className="text-[19px] font-bold text-slate-900 tracking-tight leading-tight">
                Daily Payroll Logs
              </h2>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                RECENT SHIFTS
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="py-4 px-6 font-bold">STAFF MEMBER</th>
                    <th className="py-4 px-6 font-bold">DATE</th>
                    <th className="py-4 px-6 font-bold">BASE SALARY</th>
                    <th className="py-4 px-6 font-bold">INCENTIVES</th>
                    <th className="py-4 px-6 font-bold">SNACK ALLOWANCE</th>
                    <th className="py-4 px-6 font-bold text-right">FINAL TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollLogs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-5 px-6 text-slate-900 font-semibold">{log.employee_name}</td>
                      <td className="py-5 px-6 text-slate-700">{new Date(log.shift_date).toLocaleDateString('en-US')}</td>
                      <td className="py-5 px-6 text-slate-700">{formatCurrency(log.base_salary)}</td>
                      <td className="py-5 px-6 text-slate-700">{formatCurrency(log.incentives)}</td>
                      <td className="py-5 px-6 text-slate-700">{formatCurrency(log.snack_allowance)}</td>
                      <td className="py-5 px-6 text-right text-slate-900 font-semibold">{formatCurrency(log.final_total)}</td>
                    </tr>
                  ))}
                  {payrollLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                        No payroll records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>

      {/* 3. Right sidebar removed; main content now uses full width */}

    </div>
  );
}
