import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { Shield, ArrowRight, Lock, AlertCircle, ArrowLeft } from 'lucide-react';

export const AdminLogin: React.FC = () => {
  const { adminLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const user = await adminLogin(email.trim(), password);
      if (user.role === 'admin') {
        window.location.href = '/admin/dashboard';
      } else {
        setError('Access denied. Administrator privileges required.');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid administrator email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-700 to-slate-800 border border-slate-600 items-center justify-center text-emerald-400 shadow-xl mb-4">
          <Shield className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white">
          BookLeaf Operations Console
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-400">
          Internal administrative login for editorial, triage, and support staff
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-700 space-y-6">
          {error && (
            <div className="p-3.5 bg-red-950/80 border border-red-700 text-red-300 text-xs font-medium rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Admin Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@bookleaf.com"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Administrator Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-950 transition-all disabled:opacity-50 mt-2"
            >
              <Lock className="w-4 h-4" />
              <span>{isLoading ? 'Verifying Credentials...' : 'Authenticate as Administrator'}</span>
            </button>
          </form>

          <div className="pt-4 border-t border-slate-700/80 flex items-center justify-between text-xs text-slate-400">
            <a
              href="/login"
              className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Author Portal</span>
            </a>

            <span className="text-[11px] text-slate-500">
              Role-Enforced Access
            </span>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-slate-500">
          <p>Initial administrator accounts are provisioned via CLI:</p>
          <code className="text-emerald-400 font-mono text-[11px]">npm run create-admin</code>
        </div>
      </div>
    </div>
  );
};
