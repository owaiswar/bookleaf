import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../api/client.js';
import { AuthorDashboardData, Book, Ticket } from '../../types/index.js';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Banknote,
  ArrowUpRight,
  PlusCircle,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge.js';
import { CategoryBadge } from '../../components/CategoryBadge.js';

export const AuthorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<AuthorDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    api.get<AuthorDashboardData>('/authors/me/dashboard')
      .then(res => {
        setData(res);
        setError(null);
      })
      .catch(err => {
        setError(err.message || 'Failed to load dashboard data.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const formatINR = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '—';
    return `₹${val.toLocaleString('en-IN')}`;
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-2xl"></div>
          ))}
        </div>
        <div className="h-64 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl">
          {error || 'Unable to load dashboard.'}
        </div>
      </div>
    );
  }

  const { metrics, recentBooks, recentTickets } = data;
  const isPendingBelowThreshold = metrics.royaltyPending > 0 && metrics.royaltyPending < 1000;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-6 md:p-8 rounded-3xl shadow-lg shadow-emerald-950/10">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-medium text-emerald-200">
            <span>Author Account: {data.author?.publishingPackage || 'Standard'}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-emerald-100/80 text-xs md:text-sm max-w-xl">
            Track your book production milestones, quarterly royalty disbursements, and active support tickets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/author/tickets/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs rounded-xl shadow-md transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Submit Support Query</span>
          </a>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Books */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Titles</span>
            <BookOpen className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{metrics.totalBooks}</p>
          <p className="text-[11px] text-slate-500">Under BookLeaf imprint</p>
        </div>

        {/* Published & Live */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Published & Live</span>
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-black text-teal-700">{metrics.publishedBooks}</p>
          <p className="text-[11px] text-slate-500">Live across retail channels</p>
        </div>

        {/* In Production */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>In Production</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-600">{metrics.inProductionBooks}</p>
          <p className="text-[11px] text-slate-500">Editing, design, or print</p>
        </div>

        {/* Royalty Paid */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Royalty Paid</span>
            <Banknote className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-indigo-700">{formatINR(metrics.royaltyPaid)}</p>
          <p className="text-[11px] text-slate-500">Disbursed via bank transfer</p>
        </div>

        {/* Royalty Pending */}
        <div className={`p-5 rounded-2xl border shadow-xs space-y-2 ${
          metrics.royaltyPending > 0
            ? 'bg-emerald-50/50 border-emerald-200'
            : 'bg-white border-slate-200/80'
        }`}>
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span className={metrics.royaltyPending > 0 ? 'text-emerald-900 font-bold' : ''}>
              Royalty Pending
            </span>
            <Banknote className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-800">{formatINR(metrics.royaltyPending)}</p>
          <p className="text-[11px] text-slate-500">
            {metrics.royaltyPending >= 1000 ? (
              <span className="text-emerald-700 font-medium">Eligible for next payout</span>
            ) : isPendingBelowThreshold ? (
              <span className="text-amber-700 font-medium">Rolls over (min ₹1,000 threshold)</span>
            ) : (
              'All earnings settled'
            )}
          </p>
        </div>
      </div>

      {/* Threshold Rollover Policy Notice if applicable */}
      {isPendingBelowThreshold && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Quarterly Payout Policy Notice</p>
            <p className="text-amber-800 mt-0.5">
              Under BookLeaf policy, royalties are calculated quarterly and disbursed to your registered bank account within 45 days of quarter-end. The minimum disbursement threshold is ₹1,000. Your current pending royalty of {formatINR(metrics.royaltyPending)} will roll over to the subsequent quarterly cycle once the threshold is reached.
            </p>
          </div>
        </div>
      )}

      {/* Two Column Layout: Recent Books & Active Support Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Books Section */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">My Publications</h2>
              <p className="text-xs text-slate-500">Overview of your registered BookLeaf titles</p>
            </div>
            <a
              href="/author/books"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
            >
              <span>View All ({metrics.totalBooks})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {recentBooks.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
              <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">No books registered yet</p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Once your manuscript is submitted and assigned to an imprint, your title details will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentBooks.map(book => (
                <a
                  key={book.id}
                  href={`/author/books/${book.id}`}
                  className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200/80 hover:border-emerald-200 rounded-xl transition-all group"
                >
                  <div className="space-y-1 truncate pr-3">
                    <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-950 truncate">
                      {book.title}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {book.isbn ? `ISBN: ${book.isbn}` : 'ISBN: In Production'} • {book.genre}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      book.status === 'Published & Live'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {book.status}
                    </span>
                    <p className="text-[11px] font-bold text-slate-700 mt-1">
                      {book.royaltyPending !== null ? `Pending: ${formatINR(book.royaltyPending)}` : '—'}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Support Tickets Section */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Support Queries</h2>
              <p className="text-xs text-slate-500">Direct communication with BookLeaf operations</p>
            </div>
            <a
              href="/author/tickets"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
            >
              <span>View All ({metrics.totalTickets})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {recentTickets.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-3">
              <HelpCircle className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">No support tickets submitted yet</p>
              <a
                href="/author/tickets/new"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Submit Query</span>
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTickets.map(ticket => (
                <a
                  key={ticket.id}
                  href={`/author/tickets/${ticket.id}`}
                  className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200/80 hover:border-emerald-200 rounded-xl transition-all group"
                >
                  <div className="space-y-1 truncate pr-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-200/70 px-1.5 py-0.5 rounded">
                        {ticket.ticketNumber}
                      </span>
                      <CategoryBadge category={ticket.category} />
                    </div>
                    <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-950 truncate">
                      {ticket.subject}
                    </p>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <StatusBadge status={ticket.status} />
                    <p className="text-[10px] text-slate-400">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
