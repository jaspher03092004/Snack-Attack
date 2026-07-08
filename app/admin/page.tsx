'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!supabase) {
      setErrorMessage('Supabase is not configured yet.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.session) {
        setErrorMessage(error?.message ?? 'Invalid login credentials.');
        return;
      }

      router.push('/manager/dashboard');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to sign in right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 font-sans">
      
      {/* Header Section */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-[52px] h-[52px] bg-[#0F172A] rounded-[14px] flex items-center justify-center shadow-md mb-5">
          <div className="w-5 h-5 border-[2.5px] border-white rounded-[4px]" />
        </div>
        <h1 className="text-[32px] font-extrabold tracking-tight text-slate-900 mb-1.5 leading-none">
          Snack Attack
        </h1>
        <p className="text-[16px] font-medium text-slate-500">
          4-Prince
        </p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-[420px] bg-white rounded-[32px] p-10 shadow-[0_8px_40px_rgba(0,0,0,0.03)] border border-slate-100/50">
        <form onSubmit={handleSignIn} className="flex flex-col gap-6">
          
          {/* Email Field */}
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-bold text-slate-800 tracking-wide">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-[16px] text-[15px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all shadow-sm"
              placeholder="admin@quickserve.pos"
              required
            />
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-bold text-slate-800 tracking-wide">
                Password
              </label>
              <button 
                type="button" 
                className="text-[13px] font-semibold text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
              >
                Forgot?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-4 pr-12 py-3.5 bg-white border border-slate-200 rounded-[16px] text-[15px] font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all shadow-sm"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Keep me signed in toggle */}
          <div className="flex items-center gap-3 mt-1 cursor-pointer" onClick={() => setKeepSignedIn(!keepSignedIn)}>
            <div 
              role="switch"
              aria-checked={keepSignedIn}
              tabIndex={0}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${
                keepSignedIn ? 'bg-[#10B981]' : 'bg-slate-200'
              }`}
            >
              <div 
                className={`absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out ${
                  keepSignedIn ? 'translate-x-5' : 'translate-x-0'
                }`} 
              />
            </div>
            <span className="text-[14px] font-semibold text-slate-600 select-none">
              Keep me signed in
            </span>
          </div>

          {errorMessage ? (
            <div className="rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
              {errorMessage}
            </div>
          ) : null}

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#0F172A] hover:bg-black disabled:cursor-not-allowed disabled:bg-slate-400 text-white font-bold text-[16px] py-[18px] rounded-[16px] mt-2 transition-all active:scale-[0.98] shadow-md focus:outline-none focus:ring-4 focus:ring-slate-900/20"
          >
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>

      {/* Footer Links */}
      <div className="mt-8 flex flex-col items-center gap-8">
        <Link
          href="/admin/create-account"
          className="text-[#10B981] hover:text-[#059669] font-bold text-[15px] transition-colors focus:outline-none"
        >
          Create Account
        </Link>

        <button 
          onClick={() => router.push('/')}
          className="flex items-center text-slate-400 hover:text-slate-600 transition-colors font-semibold text-[14px] group focus:outline-none"
        >
          <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
          Return to POS Terminal
        </button>
      </div>

    </div>
  );
}
