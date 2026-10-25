import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { Book } from '../../types/index.js';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  Banknote,
  Truck,
  PlusCircle,
  HelpCircle,
  Barcode
} from 'lucide-react';

interface BookDetailProps {
  bookId: string;
}

export const BookDetail: React.FC<BookDetailProps> = ({ bookId }) => {
  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    api.get<Book>(`/books/${bookId}`)
      .then(res => {
        setBook(res);
        setError(null);
      })
      .catch(err => {
        setError(err.message || 'Book could not be found.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [bookId]);

  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '—';
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Not published yet';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Not published yet';
      return d.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Not published yet';
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-4 animate-pulse max-w-5xl mx-auto">
        <div className="h-6 bg-slate-200 rounded w-1/6"></div>
        <div className="h-48 bg-slate-200 rounded-2xl"></div>
        <div className="h-64 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-4">
        <a href="/author/books" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" /> Back to My Books
        </a>
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
          {error || 'Book not found.'}
        </div>
      </div>
    );
  }

  const isLive = book.status === 'Published & Live';

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto">
      {/* Back Button */}
      <a
        href="/author/books"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to My Books</span>
      </a>

      {/* Hero Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {book.genre}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isLive
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                {isLive ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Clock className="w-3.5 h-3.5 text-amber-600" />}
                {book.status}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              {book.title}
            </h1>
            <p className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
              <Barcode className="w-4 h-4 text-slate-400" />
              {book.isbn ? `Official ISBN: ${book.isbn}` : 'Official ISBN: Under Production Allocation'}
            </p>
          </div>

          <a
            href={`/author/tickets/new?bookId=${book.id}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors self-start"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Submit Ticket for this Book</span>
          </a>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100 text-xs">
          <div>
            <p className="text-slate-400 text-[11px] font-semibold">Retail Price (MRP)</p>
            <p className="text-base font-bold text-slate-900 font-mono mt-0.5">
              {formatCurrency(book.mrp)}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-[11px] font-semibold">Copies Sold</p>
            <p className="text-base font-bold text-slate-900 font-mono mt-0.5">
              {book.totalCopiesSold !== null ? book.totalCopiesSold.toLocaleString('en-IN') : '—'}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-[11px] font-semibold">Publication Date</p>
            <p className="text-xs font-semibold text-slate-800 mt-0.5">
              {formatDate(book.publicationDate)}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-[11px] font-semibold">Pending Royalty</p>
            <p className="text-base font-bold text-emerald-700 font-mono mt-0.5">
              {formatCurrency(book.royaltyPending)}
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Royalty Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 text-slate-900 font-bold text-sm">
          <Banknote className="w-5 h-5 text-emerald-600" />
          <h2>Royalty Financial Reconciliation</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <span className="text-slate-500 font-medium text-[11px]">Total Royalty Earned (80% Net)</span>
            <p className="text-xl font-bold font-mono text-slate-900">{formatCurrency(book.totalRoyaltyEarned)}</p>
            <p className="text-[10px] text-slate-400">Computed per quarterly sales cycles</p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <span className="text-slate-500 font-medium text-[11px]">Total Royalty Disbursed</span>
            <p className="text-xl font-bold font-mono text-indigo-700">{formatCurrency(book.royaltyPaid)}</p>
            <p className="text-[10px] text-slate-400">Electronic NEFT/IMPS bank transfers</p>
          </div>

          <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-1">
            <span className="text-emerald-900 font-medium text-[11px]">Current Pending Balance</span>
            <p className="text-xl font-bold font-mono text-emerald-800">{formatCurrency(book.royaltyPending)}</p>
            <p className="text-[10px] text-emerald-700">
              {book.royaltyPending && book.royaltyPending >= 1000
                ? 'Scheduled for upcoming quarter payout'
                : 'Rolls over until minimum ₹1,000 threshold'}
            </p>
          </div>
        </div>
      </div>

      {/* Distribution Channels */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 text-slate-900 font-bold text-sm">
          <Truck className="w-5 h-5 text-sky-600" />
          <h2>Retail & Marketplace Distribution</h2>
        </div>

        {book.distributionChannels.length === 0 ? (
          <p className="text-xs text-slate-500 italic">
            Distribution channels will be activated once typesetting, proofreading, and ISBN assignment are complete.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {book.distributionChannels.map(channel => (
              <div
                key={channel}
                className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200/80 rounded-xl font-medium text-slate-800"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{channel}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
