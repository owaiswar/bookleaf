import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  BookOpen,
  LogOut,
  HelpCircle,
  Shield,
  User as UserIcon,
  LogIn
} from 'lucide-react';
import { KnowledgeBaseModal } from './KnowledgeBaseModal.js';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [showKb, setShowKb] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Portal Badge */}
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5 font-extrabold text-lg tracking-tight text-slate-900">
                  <span>BookLeaf</span>
                  <span className="text-emerald-700 font-semibold text-[11px] px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 rounded-md">
                    Publishing
                  </span>
                </div>
                <div className="text-[11px] font-medium text-slate-500 tracking-wide uppercase">
                  {user?.role === 'admin' ? 'Operations & Triage' : 'Author Support Portal'}
                </div>
              </div>
            </a>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Knowledge Base Link */}
            <button
              onClick={() => setShowKb(true)}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200/80"
              title="View BookLeaf Publishing Guidelines & Facts"
            >
              <HelpCircle className="w-4 h-4 text-emerald-600" />
              <span>Knowledge Base</span>
            </button>

            {/* Current User Pill & Logout */}
            {user ? (
              <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold uppercase shadow-xs text-white ${
                    user.role === 'admin' ? 'bg-slate-900' : 'bg-emerald-600'
                  }`}>
                    {user.name.charAt(0)}
                  </div>
                  <div className="hidden sm:block leading-tight text-left">
                    <p className="text-xs font-bold text-slate-900 truncate max-w-[140px]">{user.name}</p>
                    <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {user.role}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => logout()}
                  title="Sign out of account"
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <a
                  href="/login"
                  className="px-3.5 py-1.5 text-slate-700 hover:text-slate-900 font-semibold text-xs rounded-lg transition-colors"
                >
                  Sign In
                </a>
                <a
                  href="/register"
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors"
                >
                  Register
                </a>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Knowledge Base Modal */}
      <KnowledgeBaseModal isOpen={showKb} onClose={() => setShowKb(false)} />
    </>
  );
};
