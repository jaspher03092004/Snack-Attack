'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CreateAccountPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verifyPassword, setVerifyPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!emailRegex.test(email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (password !== verifyPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (!supabase) {
      setErrorMessage('Supabase credentials are not configured yet.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      const response = await fetch('/api/request-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, userId: data.user?.id ?? null }),
      });

      if (!response.ok) {
        throw new Error('Unable to send the account request right now.');
      }

      setEmail('');
      setPassword('');
      setVerifyPassword('');
      setSuccessMessage('Account request sent! Please wait for developer approval');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 font-sans">
      <div className="flex flex-col items-center mb-8">
        <div className="w-[52px] h-[52px] bg-[#0F172A] rounded-[14px] flex items-center justify-center shadow-md mb-5">
          <div className="w-5 h-5 border-[2.5px] border-white rounded-[4px]" />
        </div>
        <h1 className="text-[32px] font-extrabold tracking-tight text-slate-900 mb-1.5 leading-none">
          Snack Attack
        </h1>
        <p className="text-[16px] font-medium text-slate-500">4-Prince</p>
      </div>

      <div className="w-full max-w-[420px] bg-white rounded-[32px] p-10 shadow-[0_8px_40px_rgba(0,0,0,0.03)] border border-slate-100/50">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-bold text-slate-800 tracking-wide">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-[16px] text-[15px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all shadow-sm"
              placeholder="admin@quickserve.pos"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-bold text-slate-800 tracking-wide">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-[16px] text-[15px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all shadow-sm"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-bold text-slate-800 tracking-wide">
              Verify Password
            </label>
            <input
              type="password"
              value={verifyPassword}
              onChange={(event) => setVerifyPassword(event.target.value)}
              className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-[16px] text-[15px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all shadow-sm"
              placeholder="••••••••"
              required
            />
          </div>

          {errorMessage ? (
            <div className="rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-[14px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-600">
              {successMessage}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#0F172A] hover:bg-black disabled:cursor-not-allowed disabled:bg-slate-400 text-white font-bold text-[16px] py-[18px] rounded-[16px] mt-2 transition-all active:scale-[0.98] shadow-md focus:outline-none focus:ring-4 focus:ring-slate-900/20"
          >
            {isSubmitting ? 'Sending Request...' : 'Request Account'}
          </button>
        </form>
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        <Link
          href="/admin"
          className="flex items-center text-slate-400 hover:text-slate-600 transition-colors font-semibold text-[14px] group focus:outline-none"
        >
          <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
