import React, { useState, useEffect } from 'react';
import { api } from '../../api/client.js';
import {
  Ticket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  TicketMessage,
  AIDraftResponse
} from '../../types/index.js';
import { StatusBadge } from '../../components/StatusBadge.js';
import { PriorityBadge } from '../../components/PriorityBadge.js';
import { CategoryBadge } from '../../components/CategoryBadge.js';
import {
  ArrowLeft,
  Shield,
  User,
  BookOpen,
  Sparkles,
  Send,
  Lock,
  MessageSquare,
  Clock,
  History,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Edit3,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { KnowledgeBaseModal } from '../../components/KnowledgeBaseModal.js';

interface AdminTicketDetailProps {
  ticketId: string;
}

export const AdminTicketDetail: React.FC<AdminTicketDetailProps> = ({ ticketId }) => {
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Response & Note states
  const [responseDraft, setResponseDraft] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [aiDraftMeta, setAiDraftMeta] = useState<AIDraftResponse | null>(null);
  const [showKb, setShowKb] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState(false);

  const fetchTicket = () => {
    api.get<Ticket>(`/admin/tickets/${ticketId}`)
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

    // SSE connection for real-time updates
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/v1/tickets/${ticketId}/events`);

      eventSource.addEventListener('ticket.response.created', (e) => {
        const newMsg: TicketMessage = JSON.parse(e.data);
        setTicket(prev => {
          if (!prev) return prev;
          const msgs = prev.messages || [];
          if (msgs.some(m => m.id === newMsg.id)) return prev;
          return { ...prev, messages: [...msgs, newMsg] };
        });
      });

      eventSource.addEventListener('ticket.internal_note.created', (e) => {
        const newMsg: TicketMessage = JSON.parse(e.data);
        setTicket(prev => {
          if (!prev) return prev;
          const msgs = prev.messages || [];
          if (msgs.some(m => m.id === newMsg.id)) return prev;
          return { ...prev, messages: [...msgs, newMsg] };
        });
      });

      eventSource.addEventListener('ticket.status.changed', (e) => {
        const update = JSON.parse(e.data);
        setTicket(prev => (prev ? { ...prev, status: update.status } : prev));
      });
    } catch {
      // ignore
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [ticketId]);

  // Status Change
  const handleStatusChange = async (newStatus: TicketStatus) => {
    try {
      const updated = await api.patch<Ticket>(`/admin/tickets/${ticketId}/status`, {
        status: newStatus
      });
      setTicket(prev => (prev ? { ...prev, status: updated.status } : prev));
      fetchTicket();
    } catch (err: any) {
      alert(err.message || 'Failed to update status.');
    }
  };

  // Category Override
  const handleCategoryOverride = async (newCategory: TicketCategory) => {
    try {
      const updated = await api.patch<Ticket>(`/admin/tickets/${ticketId}/category`, {
        category: newCategory
      });
      setTicket(prev => (prev ? { ...prev, category: updated.category, categorySource: 'admin' } : prev));
      fetchTicket();
    } catch (err: any) {
      alert(err.message || 'Failed to override category.');
    }
  };

  // Priority Override
  const handlePriorityOverride = async (newPriority: TicketPriority) => {
    try {
      const updated = await api.patch<Ticket>(`/admin/tickets/${ticketId}/priority`, {
        priority: newPriority
      });
      setTicket(prev => (prev ? { ...prev, priority: updated.priority, prioritySource: 'admin' } : prev));
      fetchTicket();
    } catch (err: any) {
      alert(err.message || 'Failed to override priority.');
    }
  };

  // Assignment
  const handleAssignment = async (assigneeId: string | null) => {
    try {
      const updated = await api.patch<Ticket>(`/admin/tickets/${ticketId}/assignment`, {
        assigneeId
      });
      setTicket(prev => (prev ? { ...prev, assigneeId: updated.assigneeId } : prev));
      fetchTicket();
    } catch (err: any) {
      alert(err.message || 'Failed to update assignment.');
    }
  };

  // Generate AI Draft
  const handleGenerateAIDraft = async () => {
    setIsGeneratingDraft(true);
    try {
      const res = await api.post<AIDraftResponse>(`/admin/tickets/${ticketId}/ai/draft`);
      setResponseDraft(res.draft);
      setAiDraftMeta(res);
    } catch (err: any) {
      alert(err.message || 'Failed to generate AI draft.');
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  // Send Public Response
  const handleSendPublicResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responseDraft.trim() || isSendingReply) return;

    setIsSendingReply(true);
    try {
      await api.post(`/admin/tickets/${ticketId}/responses`, {
        body: responseDraft.trim()
      });
      setResponseDraft('');
      setAiDraftMeta(null);
      fetchTicket();
    } catch (err: any) {
      alert(err.message || 'Failed to send public response.');
    } finally {
      setIsSendingReply(false);
    }
  };

  // Add Internal Note
  const handleAddInternalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!internalNote.trim() || isAddingNote) return;

    setIsAddingNote(true);
    try {
      await api.post(`/admin/tickets/${ticketId}/notes`, {
        body: internalNote.trim()
      });
      setInternalNote('');
      fetchTicket();
    } catch (err: any) {
      alert(err.message || 'Failed to add internal note.');
    } finally {
      setIsAddingNote(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6 animate-pulse max-w-7xl mx-auto">
        <div className="h-6 bg-slate-200 rounded w-1/6"></div>
        <div className="h-32 bg-slate-200 rounded-2xl"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 bg-slate-200 rounded-2xl lg:col-span-2"></div>
          <div className="h-96 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-4">
        <a href="/admin/tickets" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" /> Back to Queue
        </a>
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
          {error || 'Ticket could not be found.'}
        </div>
      </div>
    );
  }

  const publicMessages = (ticket.messages || []).filter(m => m.visibility === 'public');
  const internalNotes = (ticket.messages || []).filter(m => m.visibility === 'internal');

  return (
    <>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Top Bar Navigation & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <a
            href="/admin/tickets"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Triage Queue</span>
          </a>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Knowledge Base Modal Button */}
            <button
              onClick={() => setShowKb(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors flex items-center gap-1.5"
            >
              <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Reference Knowledge Base</span>
            </button>

            {/* Audit Trail Toggle */}
            <button
              onClick={() => setShowAuditTrail(!showAuditTrail)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors flex items-center gap-1.5"
            >
              <History className="w-3.5 h-3.5 text-slate-500" />
              <span>Audit Trail ({ticket.auditEvents?.length || 0})</span>
            </button>
          </div>
        </div>

        {/* Master Ticket Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-2 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                  {ticket.ticketNumber}
                </span>
                <PriorityBadge priority={ticket.priority} />
                <CategoryBadge category={ticket.category} />
                <StatusBadge status={ticket.status} />
                {ticket.categorySource === 'admin' && (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                    Category Manually Overridden
                  </span>
                )}
                {ticket.prioritySource === 'admin' && (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                    Priority Manually Overridden
                  </span>
                )}
              </div>

              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                {ticket.subject}
              </h1>
            </div>

            {/* Quick Status Transition Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                Change Status:
              </span>
              {(['open', 'in_progress', 'resolved', 'closed'] as TicketStatus[]).map(st => (
                <button
                  key={st}
                  onClick={() => handleStatusChange(st)}
                  className={`px-2.5 py-1 rounded-lg font-bold capitalize transition-colors ${
                    ticket.status === st
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Assignment Bar */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <User className="w-4 h-4 text-slate-400" />
              <span>Assignee:</span>
              <strong className="text-slate-900">
                {ticket.assignee ? ticket.assignee.name : 'Unassigned'}
              </strong>
            </div>

            <div className="flex items-center gap-2">
              {ticket.assigneeId !== user?.id ? (
                <button
                  onClick={() => handleAssignment(user?.id || null)}
                  className="px-3 py-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 font-bold rounded-lg transition-colors"
                >
                  Assign to Me
                </button>
              ) : (
                <button
                  onClick={() => handleAssignment(null)}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors"
                >
                  Unassign
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Audit Trail Drawer (if open) */}
        {showAuditTrail && (
          <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <History className="w-4 h-4" />
                <span>Ticket Lifecycle Audit Trail</span>
              </h3>
              <button
                onClick={() => setShowAuditTrail(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto text-xs font-mono">
              {(ticket.auditEvents || []).map(evt => (
                <div key={evt.id} className="flex items-start gap-3 p-2 bg-slate-800/80 rounded-lg">
                  <span className="text-slate-400 shrink-0">
                    {new Date(evt.createdAt).toLocaleTimeString()}
                  </span>
                  <span className="text-emerald-400 font-bold shrink-0">[{evt.action}]</span>
                  <span className="text-slate-200">{evt.details}</span>
                  <span className="text-slate-500 ml-auto shrink-0 font-sans text-[11px]">{evt.actorName}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2-Column Main Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Query, Internal Notes, AI Drafter, Public Thread */}
          <div className="lg:col-span-2 space-y-6">
            {/* Original Author Query */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                    {ticket.author?.name.charAt(0) || 'A'}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{ticket.author?.name}</p>
                    <p className="text-[10px] text-slate-400">{ticket.author?.email}</p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400">
                  {new Date(ticket.createdAt).toLocaleString()}
                </span>
              </div>

              <div className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                {ticket.description}
              </div>
            </div>

            {/* INTERNAL NOTES (Strictly Admin-Only) */}
            <div className="bg-amber-50/60 rounded-2xl border border-amber-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-xs">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                      Internal Operations Notes
                    </h3>
                    <p className="text-[10px] text-amber-800 font-medium">
                      Confidential staff notes • Strictly invisible to authors
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                  {internalNotes.length} notes
                </span>
              </div>

              {/* Existing notes */}
              {internalNotes.length > 0 && (
                <div className="space-y-2.5 max-h-52 overflow-y-auto">
                  {internalNotes.map(n => (
                    <div key={n.id} className="p-3 bg-white rounded-xl border border-amber-200/80 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[10px] text-amber-900 font-bold">
                        <span>{n.senderName}</span>
                        <span className="text-slate-400 font-normal">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-800 whitespace-pre-wrap">{n.body}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Note Form */}
              <form onSubmit={handleAddInternalNote} className="space-y-2 pt-2">
                <textarea
                  rows={2}
                  placeholder="Add private note for colleagues (e.g. checked printer queue, verified bank IFSC with accounts desk)..."
                  value={internalNote}
                  onChange={e => setInternalNote(e.target.value)}
                  className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isAddingNote || !internalNote.trim()}
                    className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isAddingNote ? 'Saving...' : 'Add Internal Note'}
                  </button>
                </div>
              </form>
            </div>

            {/* AI RESPONSE DRAFTING & SENDER */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">AI Response Drafting Desk</h3>
                    <p className="text-[11px] text-slate-500">
                      Generate grounded drafts using BookLeaf policies, then edit before sending
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateAIDraft}
                  disabled={isGeneratingDraft}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs rounded-xl transition-all shadow-2xs self-start"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isGeneratingDraft ? 'Synthesizing Policy...' : 'Generate AI Draft'}</span>
                </button>
              </div>

              {/* Missing Information / Escalation Flags from AI */}
              {aiDraftMeta && (
                <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Grounded AI Draft Generated ({aiDraftMeta.model})
                    </span>
                    {aiDraftMeta.escalationRecommended && (
                      <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded">
                        Escalation Recommended
                      </span>
                    )}
                  </div>
                  {aiDraftMeta.missingInformation && aiDraftMeta.missingInformation.length > 0 && (
                    <div className="text-[11px] text-amber-800">
                      <strong>Missing context noted:</strong> {aiDraftMeta.missingInformation.join(', ')}
                    </div>
                  )}
                </div>
              )}

              {/* Draft Editor Form */}
              <form onSubmit={handleSendPublicResponse} className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <label className="font-bold text-slate-700 flex items-center gap-1">
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Response Body (Review & Edit Before Sending)</span>
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Dispatched directly to author portal
                    </span>
                  </div>
                  <textarea
                    rows={8}
                    required
                    placeholder="Click 'Generate AI Draft' or write your response manually..."
                    value={responseDraft}
                    onChange={e => setResponseDraft(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-sans leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <p className="text-[11px] text-slate-400 italic">
                    Rule: AI drafts are never sent automatically. Admin review required.
                  </p>

                  <button
                    type="submit"
                    disabled={isSendingReply || !responseDraft.trim()}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSendingReply ? 'Dispatching...' : 'Send Response to Author'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Public Message History */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>Sent Public Responses ({publicMessages.length})</span>
              </h3>

              {publicMessages.length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  No public replies sent yet. Use the drafting desk above to respond.
                </p>
              ) : (
                <div className="space-y-3">
                  {publicMessages.map(msg => (
                    <div key={msg.id} className="p-4 bg-emerald-50/40 border border-emerald-200 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pb-2 border-b border-emerald-100">
                        <strong className="text-slate-900">{msg.senderName}</strong>
                        <span>{new Date(msg.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: AI Triage & Author/Book Context */}
          <div className="space-y-6">
            {/* AI Classification & Urgency Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>AI Triage & Classification</span>
                </h3>
                <button
                  onClick={() => api.post(`/admin/tickets/${ticketId}/ai/classify`).then(fetchTicket)}
                  title="Re-run AI classification"
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Rationale explanation */}
              {ticket.aiReason && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    AI Rationale
                  </span>
                  <p className="text-slate-700 leading-normal">{ticket.aiReason}</p>
                </div>
              )}

              {/* Manual Category Override */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  Category (Override if needed)
                </label>
                <select
                  value={ticket.category}
                  onChange={e => handleCategoryOverride(e.target.value as TicketCategory)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-emerald-500 truncate"
                >
                  <option value="Royalty & Payments">Royalty & Payments</option>
                  <option value="ISBN & Metadata Issues">ISBN & Metadata Issues</option>
                  <option value="Printing & Quality">Printing & Quality</option>
                  <option value="Distribution & Availability">Distribution & Availability</option>
                  <option value="Book Status & Production Updates">Book Status & Production Updates</option>
                  <option value="General Inquiry">General Inquiry</option>
                </select>
              </div>

              {/* Manual Priority Override */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  Urgency Priority (Override if needed)
                </label>
                <select
                  value={ticket.priority}
                  onChange={e => handlePriorityOverride(e.target.value as TicketPriority)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-emerald-500"
                >
                  <option value="critical">Critical (Immediate Escalation)</option>
                  <option value="high">High (ISBN/Payout Overdue)</option>
                  <option value="medium">Medium (Standard Triage)</option>
                  <option value="low">Low (Routine General)</option>
                </select>
              </div>
            </div>

            {/* Author Profile Context Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-emerald-600" />
                <span>Author Account Context</span>
              </h3>

              {ticket.author ? (
                <div className="space-y-2 text-xs">
                  <div>
                    <strong className="text-slate-900 text-sm block">{ticket.author.name}</strong>
                    <span className="text-slate-500">{ticket.author.email}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 space-y-1 text-slate-600">
                    <p>
                      <strong>Publishing Package:</strong> {ticket.author.publishingPackage || 'Standard Free'}
                    </p>
                    <p>
                      <strong>Location:</strong> {ticket.author.city}, {ticket.author.state}
                    </p>
                    <p>
                      <strong>Contact:</strong> {ticket.author.phone || '—'}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Author record unavailable.</p>
              )}
            </div>

            {/* Associated Book Context Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span>Associated Title Record</span>
              </h3>

              {ticket.book ? (
                <div className="space-y-2 text-xs">
                  <div>
                    <strong className="text-slate-900 text-sm block">{ticket.book.title}</strong>
                    <span className="text-slate-500 font-mono">
                      {ticket.book.isbn ? `ISBN: ${ticket.book.isbn}` : 'ISBN: In Production'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 space-y-1 text-slate-600">
                    <p>
                      <strong>Production Status:</strong>{' '}
                      <span className="text-emerald-700 font-bold">{ticket.book.status}</span>
                    </p>
                    <p>
                      <strong>Genre:</strong> {ticket.book.genre}
                    </p>
                    <p>
                      <strong>Retail MRP:</strong>{' '}
                      {ticket.book.mrp !== null ? `₹${ticket.book.mrp}` : '—'}
                    </p>
                    <p>
                      <strong>Copies Sold:</strong>{' '}
                      {ticket.book.totalCopiesSold !== null ? ticket.book.totalCopiesSold.toLocaleString('en-IN') : '—'}
                    </p>
                    <p>
                      <strong>Pending Royalty:</strong>{' '}
                      <span className="text-emerald-700 font-bold font-mono">
                        {ticket.book.royaltyPending !== null ? `₹${ticket.book.royaltyPending.toLocaleString('en-IN')}` : '—'}
                      </span>
                    </p>
                    {ticket.book.distributionChannels.length > 0 && (
                      <p className="pt-1 text-[11px] text-slate-500">
                        <strong>Channels:</strong> {ticket.book.distributionChannels.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  General inquiry — no specific title linked.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <KnowledgeBaseModal isOpen={showKb} onClose={() => setShowKb(false)} />
    </>
  );
};
