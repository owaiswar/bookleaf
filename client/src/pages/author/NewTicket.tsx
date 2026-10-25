import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { Book, Ticket } from '../../types/index.js';
import { ArrowLeft, Send, Paperclip, HelpCircle, CheckCircle2, AlertCircle } from 'lucide-react';

export const NewTicket: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check URL params for preselected bookId
    const urlParams = new URLSearchParams(window.location.search);
    const preselected = urlParams.get('bookId');
    if (preselected) setSelectedBookId(preselected);

    api.get<Book[]>('/books')
      .then(res => setBooks(res))
      .catch(() => {});
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachmentName(file.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setError('Please provide both a subject and a description.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const ticket = await api.post<Ticket>('/tickets', {
        bookId: selectedBookId && selectedBookId !== 'general' ? selectedBookId : null,
        subject: subject.trim(),
        description: description.trim()
      });

      // Navigate to created ticket
      window.location.href = `/author/tickets/${ticket.id}`;
    } catch (err: any) {
      setError(err.message || 'Failed to submit support ticket.');
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-3xl mx-auto">
      {/* Back button */}
      <a
        href="/author/tickets"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to My Tickets</span>
      </a>

      {/* Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Submit a Support Query
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Our support desk will classify and respond to your request within standard operational timelines.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Book Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Associated Book
            </label>
            <select
              value={selectedBookId}
              onChange={e => setSelectedBookId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="general">General / Account Level (No specific title)</option>
              {books.map(b => (
                <option key={b.id} value={b.id}>
                  {b.title} {b.isbn ? `(${b.isbn})` : `[${b.status}]`}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Select one of your registered titles, or leave as General for account, contract, or payment questions.
            </p>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Subject Line *
            </label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={200}
              placeholder="e.g., Royalty payout status for Q3 or Print defect in author copies"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Detailed Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Detailed Description *
            </label>
            <textarea
              required
              rows={6}
              minLength={10}
              maxLength={4000}
              placeholder="Please provide complete context: order numbers, specific ISBNs, retailer marketplace links, or photographic details to help us resolve your query quickly."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            <p className="text-[11px] text-slate-400 mt-1 text-right">
              {description.length} / 4000 characters
            </p>
          </div>

          {/* Optional Attachment UI */}
          <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer">
                <Paperclip className="w-4 h-4 text-emerald-600" />
                <span>Attach Photos or Documents (Optional)</span>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                />
              </label>
              {attachmentName && (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  {attachmentName}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Useful for print defect verification (cover binding, page misprints). Note: In this demonstration sandbox, attachment selection is simulated in the browser UI.
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <a
              href="/author/tickets"
              className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </a>

            <button
              type="submit"
              disabled={isLoading || !subject.trim() || !description.trim()}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isLoading ? 'Submitting & Classifying...' : 'Submit Support Query'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
