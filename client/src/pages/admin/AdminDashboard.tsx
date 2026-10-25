import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { AdminStatsData, Ticket } from '../../types/index.js';
import {
  Inbox,
  AlertCircle,
  Clock,
  CheckCircle2,
  Users,
  BookOpen,
  ArrowRight,
  Shield,
  LifeBuoy,
  Sparkles
} from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge.js';
import { PriorityBadge } from '../../components/PriorityBadge.js';
import { CategoryBadge } from '../../components/CategoryBadge.js';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStatsData | null>(null);
  const [urgentTickets, setUrgentTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      api.get<AdminStatsData>('/admin/stats'),
      api.get<Ticket[]>('/admin/tickets?limit=8&sortBy=priority&sortOrder=desc')
    ])
      .then(([statsRes, ticketsRes]) => {
        setStats(statsRes);
        setUrgentTickets(ticketsRes);
      })
      .catch(err => {
        console.error('Failed to load admin stats:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div className="p-8 space-y-6 animate-pulse max-w-7xl mx-auto">
        <div className="h-8 bg-slate-200 rounded w-1/4"></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-2xl"></div>
          ))}
        </div>
        <div className="h-64 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  const criticalAndHigh = (stats?.criticalTickets || 0) + (stats?.highTickets || 0);

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-white/10 rounded-full text-xs font-semibold text-emerald-400">
            <Shield className="w-3.5 h-3.5" />
            <span>Operations Triage Console</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            Author Support Operations Center
          </h1>
          <p className="text-slate-400 text-xs md:text-sm max-w-xl">
            Prioritize inquiries, inspect AI classification and severity scores, and dispatch knowledge-grounded responses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/admin/tickets"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
          >
            <Inbox className="w-4 h-4" />
            <span>Open Triage Queue</span>
          </a>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Open Tickets */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Open Queries</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-3xl font-black text-blue-700">{stats?.openTickets ?? 0}</p>
          <p className="text-[11px] text-slate-400">Awaiting support response</p>
        </div>

        {/* Critical & High Urgency */}
        <div className={`p-5 rounded-2xl border shadow-xs space-y-2 ${
          criticalAndHigh > 0 ? 'bg-red-50/60 border-red-200' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold text-red-900">
            <span>Critical / High Severity</span>
            <AlertCircle className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-3xl font-black text-red-700">{criticalAndHigh}</p>
          <p className="text-[11px] text-red-600/80 font-medium">ISBN mismatches & royalty delays</p>
        </div>

        {/* In Progress */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>In Progress</span>
            <LifeBuoy className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-3xl font-black text-amber-600">{stats?.inProgressTickets ?? 0}</p>
          <p className="text-[11px] text-slate-400">Under operational review</p>
        </div>

        {/* Resolved / Closed */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-3xl font-black text-emerald-700">{stats?.resolvedTickets ?? 0}</p>
          <p className="text-[11px] text-slate-400">Successfully closed cases</p>
        </div>
      </div>

      {/* Dataset Summary Snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-600">Total System Tickets</span>
          <span className="font-bold text-slate-900 font-mono text-sm">{stats?.totalTickets ?? 0}</span>
        </div>
        <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-600">Seeded Author Accounts</span>
          <span className="font-bold text-slate-900 font-mono text-sm">{stats?.totalAuthors ?? 10}</span>
        </div>
        <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-600">Seeded Book Titles</span>
          <span className="font-bold text-slate-900 font-mono text-sm">{stats?.totalBooks ?? 18}</span>
        </div>
      </div>

      {/* Priority Triage Queue Preview */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Inbox className="w-4 h-4 text-emerald-600" />
              <span>Priority Triage Queue</span>
            </h2>
            <p className="text-xs text-slate-500">Unresolved tickets prioritized by AI urgency score</p>
          </div>
          <a
            href="/admin/tickets"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
          >
            <span>Full Queue ({stats?.totalTickets})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="divide-y divide-slate-100 overflow-hidden">
          {urgentTickets.map(ticket => (
            <a
              key={ticket.id}
              href={`/admin/tickets/${ticket.id}`}
              className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 -mx-6 px-6 transition-colors group block"
            >
              <div className="space-y-1.5 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {ticket.ticketNumber}
                  </span>
                  <PriorityBadge priority={ticket.priority} />
                  <CategoryBadge category={ticket.category} />
                  <span className="text-xs text-slate-500 font-medium">
                    {ticket.author?.name} ({ticket.author?.email})
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  {ticket.subject}
                </h3>

                <p className="text-xs text-slate-600 line-clamp-1">
                  {ticket.description}
                </p>
              </div>

              <div className="flex items-center md:flex-col md:items-end justify-between gap-1.5 shrink-0 text-xs">
                <StatusBadge status={ticket.status} />
                <span className="text-[11px] text-slate-400">
                  {ticket.assigneeName ? `Assigned: ${ticket.assigneeName}` : 'Unassigned'}
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};
