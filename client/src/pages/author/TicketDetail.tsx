import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import { Ticket, TicketMessage } from '../../types/index.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import { CategoryBadge } from '../../components/CategoryBadge.js';
import {
  ArrowLeft,
  Clock,
  User,
  Shield,
  BookOpen,
  LifeBuoy,
  MessageSquare,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

interface TicketDetailProps {
  ticketId: string;
}

export const TicketDetail: React.FC<TicketDetailProps> = ({ ticketId }) => {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  const fetchTicket = () => {
    api.get<Ticket>(`/tickets/${ticketId}`)
      .then(res => {
        setTicket(res);
        setError(null);
      })
      .catch(err => {
        setError(err.message || 'Ticket could not be loaded.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchTicket();

    // Setup SSE for near-real-time replies
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/v1/tickets/${ticketId}/events`);

      eventSource.onopen = () => {
        setIsLiveConnected(true);
      };

      eventSource.addEventListener('ticket.response.created', (e) => {
        const newMsg: TicketMessage = JSON.parse(e.data);
        setTicket(prev => {
          if (!prev) return prev;
          const existing = prev.messages || [];
          if (existing.some(m => m.id === newMsg.id)) return prev;
          return {
            ...prev,
            messages: [...existing, newMsg]
          };
        });
      });

      eventSource.addEventListener('ticket.status.changed', (e) => {
        const update = JSON.parse(e.data);
        setTicket(prev => (prev ? { ...prev, status: update.status } : prev));
      });

      eventSource.onerror = () => {
        setIsLiveConnected(false);
      };
    } catch {
      setIsLiveConnected(false);
    }

    // Polling fallback every 8 seconds in case SSE is interrupted
    const interval = setInterval(fetchTicket, 8000);

    return () => {
      clearInterval(interval);
      if (eventSource) eventSource.close();
    };
  }, [ticketId]);

  if (isLoading) {
    return (
      <div className="p-8 space-y-4 animate-pulse max-w-4xl mx-auto">
        <div className="h-6 bg-slate-200 rounded w-1/6"></div>
        <div className="h-40 bg-slate-200 rounded-2xl"></div>
        <div className="h-64 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <a href="/author/tickets" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" /> Back to My Tickets
        </a>
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
          {error || 'Ticket not found.'}
        </div>
      </div>
    );
  }

  const publicReplies = (ticket.messages || []).filter(m => m.visibility === 'public');

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Back button & live indicator */}
      <div className="flex items-center justify-between">
        <a
          href="/author/tickets"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Tickets</span>
        </a>

        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className={`w-2 h-2 rounded-full ${isLiveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
          <span>{isLiveConnected ? 'Live updates active' : 'Syncing updates'}</span>
        </div>
      </div>

      {/* Ticket Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              {ticket.ticketNumber}
            </span>
            <CategoryBadge category={ticket.category} />
            <StatusBadge status={ticket.status} />
          </div>

          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Submitted {new Date(ticket.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </span>
        </div>

        <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
          {ticket.subject}
        </h1>

        {ticket.book ? (
          <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 font-medium">
            <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Associated Book: <strong className="text-slate-900">{ticket.book.title}</strong></span>
            {ticket.book.isbn && <span className="text-slate-400 font-mono">({ticket.book.isbn})</span>}
          </div>
        ) : (
          <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-500 font-medium">
            <LifeBuoy className="w-4 h-4 text-slate-400 shrink-0" />
            <span>General / Account-Level Query</span>
          </div>
        )}
      </div>

      {/* Message Thread */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
          <MessageSquare className="w-4 h-4 text-emerald-600" />
          <span>Ticket Communication Thread</span>
        </div>

        {/* Original Query Message */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                <User className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Your Original Query</p>
                <p className="text-[10px] text-slate-400">Author Submission</p>
              </div>
            </div>
            <span className="text-[11px] text-slate-400">
              {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
            {ticket.description}
          </div>
        </div>

        {/* Public Replies from Admin */}
        {publicReplies.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
            <Clock className="w-6 h-6 text-slate-400 mx-auto" />
            <p className="text-xs font-bold text-slate-800">Operations desk has received your ticket</p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              Our support team is reviewing your account data and BookLeaf guidelines. Responses will appear here in real time.
            </p>
          </div>
        ) : (
          publicReplies.map(msg => (
            <div
              key={msg.id}
              className="bg-emerald-50/40 rounded-2xl border border-emerald-200/80 p-6 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-slate-900">{msg.senderName}</p>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                        BookLeaf Staff
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500">Official Support Response</p>
                  </div>
                </div>

                <span className="text-[11px] text-slate-400">
                  {new Date(msg.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short'
                  })}{' '}
                  at{' '}
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>

              <div className="text-xs sm:text-sm text-slate-900 leading-relaxed whitespace-pre-wrap font-sans">
                {msg.body}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
