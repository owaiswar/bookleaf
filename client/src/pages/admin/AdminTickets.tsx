import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { Ticket, TicketCategory, TicketPriority, TicketStatus } from '../../types/index.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import { PriorityBadge } from '../../components/PriorityBadge.js';
import { CategoryBadge } from '../../components/CategoryBadge.js';
import {
  Search,
  Filter,
  ArrowUpDown,
  Inbox,
  User,
  Clock,
  Sparkles,
  RefreshCw,
  Check
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const AdminTickets: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters state
  const [status, setStatus] = useState<string>('all');
  const [category, setCategory] = useState<string>('all');
  const [priority, setPriority] = useState<string>('all');
  const [assignee, setAssignee] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('priority');
  const [sortOrder, setSortOrder] = useState<string>('desc');

  const fetchTickets = () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (status !== 'all') params.set('status', status);
    if (category !== 'all') params.set('category', category);
    if (priority !== 'all') params.set('priority', priority);
    if (assignee !== 'all') params.set('assigneeId', assignee === 'mine' ? (user?.id || '') : assignee);
    if (search.trim()) params.set('q', search.trim());
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);

    api.get<{ data: Ticket[]; meta: { total: number } } | Ticket[]>(`/admin/tickets?${params.toString()}`)
      .then(res => {
        if (Array.isArray(res)) {
          setTickets(res);
          setTotalCount(res.length);
        } else {
          setTickets((res as any).data || []);
          setTotalCount((res as any).meta?.total || 0);
        }
      })
      .catch(err => {
        console.error('Failed to fetch admin tickets:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchTickets();
  }, [status, category, priority, assignee, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTickets();
  };

  const handleAssignToMe = async (ticketId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.patch(`/admin/tickets/${ticketId}/assignment`, {
        assigneeId: user?.id
      });
      fetchTickets();
    } catch (err) {
      console.error('Failed to assign ticket:', err);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Inbox className="w-6 h-6 text-emerald-600" />
            <span>Ticket Triage & Support Queue</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Operations desk for reviewing AI categorization, urgency scoring, and responding to authors
          </p>
        </div>

        <button
          onClick={fetchTickets}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        {/* Search input */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by ticket number (e.g. BL-1001), author name, author email, book title, or query keywords..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-slate-900 text-white font-bold text-xs rounded-lg hover:bg-slate-800 transition-colors"
          >
            Search
          </button>
        </form>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          {/* Status */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-emerald-500 truncate"
            >
              <option value="all">All 6 Categories</option>
              <option value="Royalty & Payments">Royalty & Payments</option>
              <option value="ISBN & Metadata Issues">ISBN & Metadata Issues</option>
              <option value="Printing & Quality">Printing & Quality</option>
              <option value="Distribution & Availability">Distribution & Availability</option>
              <option value="Book Status & Production Updates">Book Status & Production</option>
              <option value="General Inquiry">General Inquiry</option>
            </select>
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Assignee
            </label>
            <select
              value={assignee}
              onChange={e => setAssignee(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-emerald-500"
            >
              <option value="all">All Staff</option>
              <option value="mine">Assigned to Me</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Sort Order
            </label>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={e => {
                const [sb, so] = e.target.value.split('-');
                setSortBy(sb);
                setSortOrder(so);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-emerald-500"
            >
              <option value="priority-desc">Urgency (Critical First)</option>
              <option value="createdAt-asc">Oldest Unresolved First</option>
              <option value="createdAt-desc">Newest First</option>
              <option value="updatedAt-desc">Recently Updated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Results */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500 animate-pulse">
          Loading triage queue records...
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No support tickets match criteria</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try resetting your status, priority, or search filters to view more queue records.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Ticket</th>
                  <th className="py-3.5 px-4">Author & Title</th>
                  <th className="py-3.5 px-4">Subject</th>
                  <th className="py-3.5 px-4">AI Category</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Assignee</th>
                  <th className="py-3.5 px-4">Created</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {tickets.map(t => {
                  const isCriticalOrHigh = t.priority === 'critical' || t.priority === 'high';

                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCriticalOrHigh && t.status === 'open' ? 'bg-red-50/30' : ''
                      }`}
                    >
                      {/* Ticket Number */}
                      <td className="py-4 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <a
                          href={`/admin/tickets/${t.id}`}
                          className="hover:text-emerald-700 underline decoration-slate-300"
                        >
                          {t.ticketNumber}
                        </a>
                      </td>

                      {/* Author & Book */}
                      <td className="py-4 px-4 max-w-[180px]">
                        <p className="font-bold text-slate-900 truncate">
                          {t.author?.name || 'Author'}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate" title={t.bookTitle}>
                          {t.bookTitle || 'General'}
                        </p>
                      </td>

                      {/* Subject */}
                      <td className="py-4 px-4 max-w-[240px]">
                        <a
                          href={`/admin/tickets/${t.id}`}
                          className="font-bold text-slate-900 hover:text-emerald-700 line-clamp-1"
                        >
                          {t.subject}
                        </a>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{t.description}</p>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <CategoryBadge category={t.category} />
                      </td>

                      {/* Priority */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <PriorityBadge priority={t.priority} />
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <StatusBadge status={t.status} />
                      </td>

                      {/* Assignee */}
                      <td className="py-4 px-4 text-slate-600 whitespace-nowrap">
                        {t.assigneeName ? (
                          <span className="font-semibold text-slate-800">{t.assigneeName}</span>
                        ) : (
                          <button
                            onClick={e => handleAssignToMe(t.id, e)}
                            className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded transition-colors"
                          >
                            + Assign to me
                          </button>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="py-4 px-4 text-slate-400 whitespace-nowrap text-[11px]">
                        {new Date(t.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short'
                        })}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <a
                          href={`/admin/tickets/${t.id}`}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors shadow-2xs"
                        >
                          Triage & Reply
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {tickets.length} support {tickets.length === 1 ? 'ticket' : 'tickets'}
            </span>
            <span className="text-[11px] text-slate-400">
              Sorted by: {sortBy === 'priority' ? 'Urgency Severity' : sortBy} ({sortOrder})
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
