import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { Ticket, TicketStatus } from '../../types/index.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import { CategoryBadge } from '../../components/CategoryBadge.js';
import { PlusCircle, LifeBuoy, ArrowRight, Clock } from 'lucide-react';

export const AuthorTickets: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    api.get<Ticket[]>('/tickets')
      .then(res => {
        setTickets(res);
        setError(null);
      })
      .catch(err => {
        setError(err.message || 'Failed to fetch tickets.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const filteredTickets = tickets.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'active') return t.status === 'open' || t.status === 'in_progress';
    return t.status === filter;
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-4 animate-pulse max-w-7xl mx-auto">
        <div className="h-8 bg-slate-200 rounded w-1/4"></div>
        <div className="h-64 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Support Queries</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Follow ticket status, review public admin responses, and communicate with operations
          </p>
        </div>

        <a
          href="/author/tickets/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Query</span>
        </a>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
          {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {[
          { id: 'all', label: `All Queries (${tickets.length})` },
          { id: 'active', label: `Active (${tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length})` },
          { id: 'open', label: `Open (${tickets.filter(t => t.status === 'open').length})` },
          { id: 'in_progress', label: `In Progress (${tickets.filter(t => t.status === 'in_progress').length})` },
          { id: 'resolved', label: `Resolved (${tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
              filter === tab.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
            <LifeBuoy className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h2 className="text-base font-bold text-slate-900">No support tickets found</h2>
            <p className="text-xs text-slate-500">
              {filter === 'all'
                ? "You haven't submitted any support queries yet. Need assistance with your royalties, ISBN, or printing?"
                : 'No tickets match the selected filter category.'}
            </p>
          </div>
          <div>
            <a
              href="/author/tickets/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors"
            >
              <span>Submit a Query</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {filteredTickets.map(ticket => (
            <a
              key={ticket.id}
              href={`/author/tickets/${ticket.id}`}
              className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors group block"
            >
              <div className="space-y-2 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {ticket.ticketNumber}
                  </span>
                  <CategoryBadge category={ticket.category} />
                  <span className="text-[11px] text-slate-500 font-medium">
                    {ticket.bookTitle || 'General / Account Level'}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  {ticket.subject}
                </h3>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {ticket.description}
                </p>
              </div>

              <div className="flex items-center md:flex-col md:items-end justify-between gap-2 shrink-0 text-xs">
                <StatusBadge status={ticket.status} />
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(ticket.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};
