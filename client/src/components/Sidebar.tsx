import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  LayoutDashboard,
  BookMarked,
  LifeBuoy,
  PlusCircle,
  Inbox,
  Database,
  ShieldAlert,
  FileQuestion,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  currentPath: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPath }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const authorNav = [
    { label: 'Dashboard', path: '/author/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: 'My Books', path: '/author/books', icon: <BookMarked className="w-4 h-4" /> },
    { label: 'Submit Query', path: '/author/tickets/new', icon: <PlusCircle className="w-4 h-4" /> },
    { label: 'My Tickets', path: '/author/tickets', icon: <LifeBuoy className="w-4 h-4" /> }
  ];

  const adminNav = [
    { label: 'Overview', path: '/admin/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: 'Ticket Queue', path: '/admin/tickets', icon: <Inbox className="w-4 h-4" /> },
    { label: 'Data & Sample Seeding', path: '/admin/data', icon: <Database className="w-4 h-4" /> }
  ];

  const navItems = isAdmin ? adminNav : authorNav;

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-slate-200 hidden md:flex flex-col justify-between py-6 px-4">
      <div className="space-y-6">
        {/* User Card */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
          <p className="text-xs font-bold text-slate-800 truncate">{user?.name}</p>
          <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
          {user?.author && (
            <div className="pt-2 mt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-600 font-medium">
              <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                {user.author.publishingPackage}
              </span>
              <span>{user.author.city}</span>
            </div>
          )}
        </div>

        {/* Navigation items */}
        <nav className="space-y-1">
          <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {isAdmin ? 'Operations Console' : 'Author Portal'}
          </p>
          {navItems.map(item => {
            const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path) && item.path !== '/admin/tickets' && currentPath !== '/admin/tickets');
            const isExactActive = currentPath === item.path;
            const highlighted = isExactActive || (item.path !== '/author/dashboard' && item.path !== '/admin/dashboard' && currentPath.startsWith(item.path));

            return (
              <a
                key={item.path}
                href={item.path}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  highlighted
                    ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {highlighted && <ChevronRight className="w-3.5 h-3.5 opacity-80" />}
              </a>
            );
          })}
        </nav>
      </div>

      {/* Footer Support Tip */}
      <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl text-xs space-y-1 text-emerald-950">
        <p className="font-bold flex items-center gap-1.5 text-emerald-800">
          <FileQuestion className="w-3.5 h-3.5 text-emerald-600" />
          {isAdmin ? 'AI Guidelines' : 'Need help fast?'}
        </p>
        <p className="text-[11px] text-emerald-800/80 leading-relaxed">
          {isAdmin
            ? 'Review AI drafts thoroughly before sending. Author replies cannot be un-sent.'
            : 'Check My Books for your quarterly royalty status and print production stages.'}
        </p>
      </div>
    </aside>
  );
};
