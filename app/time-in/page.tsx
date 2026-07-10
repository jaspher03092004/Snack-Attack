'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

export default function TimeInPage() {
  const [staffList, setStaffList] = useState<Array<{ name: string; pin_code: string; base_salary: number; snack_allowance: number }>>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleClockIn = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!supabase) {
      setErrorMessage('Supabase client is not configured.');
      return;
    }

    const selectedStaff = staffList.find((staff) => staff.name === selectedEmployee);
    if (!selectedStaff) {
      setErrorMessage('Please select a registered employee.');
      return;
    }

    if (pin !== selectedStaff.pin_code) {
      setErrorMessage('Invalid PIN code.');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const { data: existingRecords, error: existingError } = await supabase
      .from('payroll')
      .select('id')
      .eq('employee_name', selectedEmployee)
      .eq('shift_date', todayDate)
      .limit(1);

    if (existingError) {
      console.error('Payroll lookup error:', existingError);
      setErrorMessage(existingError.message);
      return;
    }

    if (existingRecords && existingRecords.length > 0) {
      setErrorMessage('You have already timed in today.');
      return;
    }

    const { error } = await supabase.from('payroll').insert([
      {
        employee_name: selectedEmployee,
        shift_date: todayDate,
        base_salary: selectedStaff.base_salary,
        incentives: 0,
        snack_allowance: selectedStaff.snack_allowance,
        final_total: selectedStaff.base_salary + selectedStaff.snack_allowance,
      },
    ]);

    if (error) {
      console.error('Clock-in insert error:', error);
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage('Clock in recorded successfully.');
    setPin('');
  };

  useEffect(() => {
    const loadStaffList = async () => {
      if (!supabase) return;

      const { data, error } = await supabase
        .from('staff')
        .select('name, pin_code, base_salary, snack_allowance')
        .order('name');

      if (error) {
        console.error('Staff list fetch error:', error);
        return;
      }

      const staff = (data ?? []).map((row: any) => ({
        name: row.name as string,
        pin_code: row.pin_code as string,
        base_salary: Number(row.base_salary ?? 500),
        snack_allowance: Number(row.snack_allowance ?? 50),
      }));

      setStaffList(staff);
      if (staff.length > 0) {
        setSelectedEmployee(staff[0].name);
      }
    };

    loadStaffList();
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_35%)] px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[80vh] max-w-2xl flex-col justify-center rounded-[36px] border border-slate-200 bg-white/90 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Employee Actions</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900">Employee Time In</h1>
          <p className="mt-3 text-sm text-slate-600">Select your account and enter your PIN to clock in for the shift.</p>
        </div>

        <div className="mt-8 space-y-5 rounded-[28px] border border-slate-200 bg-slate-50 p-6">
          <label className="block text-sm font-semibold text-slate-700">
            <span className="mb-2 block">Registered Account</span>
            <select
              value={selectedEmployee}
              onChange={(event) => setSelectedEmployee(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400"
            >
              {staffList.map((staff) => (
                <option key={staff.name} value={staff.name}>
                  {staff.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            <span className="mb-2 block">PIN</span>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
              placeholder="Enter 4-digit PIN"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400"
            />
          </label>

          <button
            type="button"
            onClick={handleClockIn}
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Clock In
          </button>
          {errorMessage && <p className="mt-3 text-sm text-rose-600">{errorMessage}</p>}
          {successMessage && <p className="mt-3 text-sm text-emerald-600">{successMessage}</p>}
        </div>

        <Link
          href="/start-order"
          className="mt-6 inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Back to Start Order
        </Link>
      </div>
    </div>
  );
}
