import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { ShieldCheck, Lock, Mail, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.login({ email, password });
      if (res?.token) {
        localStorage.setItem('dailybuild_token', res.token);
        navigate('/admin');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6FB] dark:bg-[#080d17] flex items-center justify-center p-4">
      <div className="max-w-md w-full clay-card p-8">
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="flex items-center justify-center mb-3">
            <img
              src="/logo-light.png"
              alt="Daily Build"
              className="h-9 w-auto max-w-[220px] object-contain dark:hidden"
            />
            <img
              src="/logo-dark.png"
              alt="Daily Build"
              className="h-9 w-auto max-w-[220px] object-contain hidden dark:block"
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Sign in to manage technology publications, workflows &amp; AI models.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Admin Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@dailybuild.tech"
                className="w-full pl-10 pr-4 py-2.5 clay-input text-xs text-slate-900 dark:text-white font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 clay-input text-xs text-slate-900 dark:text-white font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 clay-btn-primary disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2"
          >
            {loading ? 'Authenticating...' : (
              <>Sign In to Dashboard <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 text-center text-xs text-gray-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> End-to-end encrypted session
        </div>
      </div>
    </div>
  );
};
