import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { Book } from '../../types/index.js';
import { BookOpen, HelpCircle, ArrowRight, CheckCircle2, Clock, PlusCircle } from 'lucide-react';

export const AuthorBooks: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    api.get<Book[]>('/books')
      .then(res => {
        setBooks(res);
        setError(null);
      })
      .catch(err => {
        setError(err.message || 'Failed to load books.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const formatCurrency = (val: number | null | undefined, currency = 'INR') => {
    if (val === null || val === undefined) return '—';
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const formatNumber = (val: number | null | undefined) => {
    if (val === null || val === undefined) return '—';
    return val.toLocaleString('en-IN');
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Not published';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Not published';
      return d.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Not published';
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-4 animate-pulse">
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
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">My Books</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Authoritative sales, royalty figures, and production lifecycle stages for your titles
          </p>
        </div>

        <a
          href="/author/tickets/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Ask About a Book</span>
        </a>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
          {error}
        </div>
      )}

      {/* Zero Books Empty State */}
      {books.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h2 className="text-base font-bold text-slate-900">No books registered yet</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              You are signed up as a BookLeaf author. Once your manuscript is submitted and entered into our publishing pipeline, your ISBN, production progress, and sales royalties will be displayed here.
            </p>
          </div>
          <div>
            <a
              href="/author/tickets/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
            >
              <span>Submit General Query</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      ) : (
        /* Books Table */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Title & Genre</th>
                  <th className="py-3.5 px-4">ISBN</th>
                  <th className="py-3.5 px-4">Production Status</th>
                  <th className="py-3.5 px-4">Published Date</th>
                  <th className="py-3.5 px-4 text-right">MRP</th>
                  <th className="py-3.5 px-4 text-right">Copies Sold</th>
                  <th className="py-3.5 px-4 text-right">Royalty Earned</th>
                  <th className="py-3.5 px-4 text-right">Royalty Paid</th>
                  <th className="py-3.5 px-4 text-right">Royalty Pending</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {books.map(book => {
                  const isLive = book.status === 'Published & Live';

                  return (
                    <tr key={book.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Title & Genre */}
                      <td className="py-4 px-4 max-w-[200px]">
                        <p className="font-bold text-slate-900 truncate" title={book.title}>
                          {book.title}
                        </p>
                        <p className="text-[11px] text-slate-400">{book.genre}</p>
                      </td>

                      {/* ISBN */}
                      <td className="py-4 px-4 font-mono text-[11px]">
                        {book.isbn ? (
                          <span className="text-slate-800">{book.isbn}</span>
                        ) : (
                          <span className="text-slate-400 italic">In Production</span>
                        )}
                      </td>

                      {/* Production Status */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isLive
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {isLive ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Clock className="w-3 h-3 text-amber-600" />
                          )}
                          {book.status}
                        </span>
                      </td>

                      {/* Published Date */}
                      <td className="py-4 px-4 text-slate-600">
                        {formatDate(book.publicationDate)}
                      </td>

                      {/* MRP */}
                      <td className="py-4 px-4 text-right text-slate-700 font-mono">
                        {formatCurrency(book.mrp)}
                      </td>

                      {/* Copies Sold */}
                      <td className="py-4 px-4 text-right text-slate-800 font-mono font-semibold">
                        {formatNumber(book.totalCopiesSold)}
                      </td>

                      {/* Royalty Earned */}
                      <td className="py-4 px-4 text-right text-slate-800 font-mono">
                        {formatCurrency(book.totalRoyaltyEarned)}
                      </td>

                      {/* Royalty Paid */}
                      <td className="py-4 px-4 text-right text-slate-600 font-mono">
                        {formatCurrency(book.royaltyPaid)}
                      </td>

                      {/* Royalty Pending */}
                      <td className="py-4 px-4 text-right font-mono font-bold">
                        {book.royaltyPending !== null && book.royaltyPending !== undefined ? (
                          <span className={book.royaltyPending > 0 ? 'text-emerald-700' : 'text-slate-600'}>
                            {formatCurrency(book.royaltyPending)}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">—</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-4 text-center">
                        <a
                          href={`/author/books/${book.id}`}
                          className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-200"
                        >
                          Details
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <span>
              Showing {books.length} registered {books.length === 1 ? 'book' : 'books'}
            </span>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Published & Live
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> In Production Workflow
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
