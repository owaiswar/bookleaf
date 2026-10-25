import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { store, TicketCategory, TicketPriority, TicketStatus } from '../db/store.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { aiService } from '../services/ai.js';
import { sseManager } from '../services/sse.js';

const router = Router();

// Enforce admin role on all routes in this router
router.use(requireAuth, requireRole('admin'));

// GET /api/v1/admin/tickets (Queue with filters & search)
router.get('/tickets', (req: Request, res: Response) => {
  const {
    status,
    category,
    priority,
    assigneeId,
    q,
    from,
    to,
    page = '1',
    limit = '20',
    sortBy = 'priority',
    sortOrder = 'desc'
  } = req.query as Record<string, string | undefined>;

  let tickets = [...store.getTickets()];

  // Filter by status
  if (status && status !== 'all') {
    tickets = tickets.filter(t => t.status === status);
  }

  // Filter by category
  if (category && category !== 'all') {
    tickets = tickets.filter(t => t.category === category);
  }

  // Filter by priority
  if (priority && priority !== 'all') {
    tickets = tickets.filter(t => t.priority === priority);
  }

  // Filter by assignee
  if (assigneeId) {
    if (assigneeId === 'unassigned') {
      tickets = tickets.filter(t => !t.assigneeId);
    } else {
      tickets = tickets.filter(t => t.assigneeId === assigneeId);
    }
  }

  // Date range filter
  if (from) {
    const fromTime = new Date(from).getTime();
    if (!isNaN(fromTime)) {
      tickets = tickets.filter(t => new Date(t.createdAt).getTime() >= fromTime);
    }
  }
  if (to) {
    const toTime = new Date(to).getTime();
    if (!isNaN(toTime)) {
      tickets = tickets.filter(t => new Date(t.createdAt).getTime() <= toTime);
    }
  }

  // Text search query
  if (q && q.trim()) {
    const query = q.toLowerCase().trim();
    tickets = tickets.filter(t => {
      const author = store.findAuthorById(t.authorId);
      const book = t.bookId ? store.findBookById(t.bookId) : null;
      return (
        t.ticketNumber.toLowerCase().includes(query) ||
        t.subject.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        (author && (author.name.toLowerCase().includes(query) || author.email.toLowerCase().includes(query))) ||
        (book && book.title.toLowerCase().includes(query))
      );
    });
  }

  // Sorting
  const priorityWeight: Record<TicketPriority, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
  };

  tickets.sort((a, b) => {
    if (sortBy === 'priority') {
      const diff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (diff !== 0) return sortOrder === 'asc' ? -diff : diff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === 'createdAt') {
      const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return sortOrder === 'asc' ? -diff : diff;
    }
    if (sortBy === 'updatedAt') {
      const diff = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      return sortOrder === 'asc' ? -diff : diff;
    }
    return 0;
  });

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const total = tickets.length;
  const totalPages = Math.ceil(total / limitNum);
  const paginated = tickets.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  // Enrich with author & book summaries
  const enriched = paginated.map(t => {
    const author = store.findAuthorById(t.authorId);
    const book = t.bookId ? store.findBookById(t.bookId) : null;
    const assignee = t.assigneeId ? store.findUserById(t.assigneeId) : null;
    return {
      ...t,
      author: author ? { id: author.id, name: author.name, email: author.email } : null,
      bookTitle: book ? book.title : 'General / Account Level',
      assigneeName: assignee ? assignee.name : null
    };
  });

  return res.json({
    data: enriched,
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages
    }
  });
});

// GET /api/v1/admin/stats
router.get('/stats', (_req: Request, res: Response) => {
  const tickets = store.getTickets();
  const authors = store.getAuthors();
  const books = store.getBooks();

  const totalTickets = tickets.length;
  const openTickets = tickets.filter(t => t.status === 'open').length;
  const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length;
  const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
  const criticalTickets = tickets.filter(t => t.priority === 'critical').length;
  const highTickets = tickets.filter(t => t.priority === 'high').length;
  const unassignedTickets = tickets.filter(t => !t.assigneeId && t.status !== 'resolved' && t.status !== 'closed').length;

  return res.json({
    data: {
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      criticalTickets,
      highTickets,
      unassignedTickets,
      totalAuthors: authors.length,
      totalBooks: books.length
    }
  });
});

// GET /api/v1/admin/tickets/:ticketId
router.get('/tickets/:ticketId', (req: Request, res: Response) => {
  const ticket = store.findTicketById(req.params.ticketId);
  if (!ticket) {
    return res.status(404).json({
      error: { code: 'TICKET_NOT_FOUND', message: 'Ticket not found.' }
    });
  }

  const author = store.findAuthorById(ticket.authorId);
  const book = ticket.bookId ? store.findBookById(ticket.bookId) : null;
  const authorBooks = store.findBooksByAuthorId(ticket.authorId);
  const assignee = ticket.assigneeId ? store.findUserById(ticket.assigneeId) : null;
  const messages = store.getMessagesForTicket(ticket.id, 'admin');
  const auditEvents = store.getAuditEventsForTicket(ticket.id);

  return res.json({
    data: {
      ...ticket,
      author,
      book,
      authorBooks,
      assignee: assignee ? { id: assignee.id, name: assignee.name, email: assignee.email } : null,
      messages,
      auditEvents
    }
  });
});

// PATCH /api/v1/admin/tickets/:ticketId/status
router.patch('/tickets/:ticketId/status', (req: Request, res: Response) => {
  const schema = z.object({
    status: z.enum(['open', 'in_progress', 'resolved', 'closed'])
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid status provided.' }
    });
  }

  const user = req.user!;
  const updated = store.updateTicket(
    req.params.ticketId,
    { status: parsed.data.status },
    { id: user.id, name: user.name }
  );

  if (!updated) {
    return res.status(404).json({
      error: { code: 'TICKET_NOT_FOUND', message: 'Ticket not found.' }
    });
  }

  // Broadcast event to author and admins
  sseManager.broadcastTicketEvent({
    eventType: 'ticket.status.changed',
    ticketId: updated.id,
    ticketAuthorId: updated.authorId,
    data: { ticketId: updated.id, status: updated.status }
  });

  sseManager.broadcastAdminQueueEvent('ticket.queue.updated', {
    ticketId: updated.id,
    status: updated.status
  });

  return res.json({ data: updated });
});

// PATCH /api/v1/admin/tickets/:ticketId/category
router.patch('/tickets/:ticketId/category', (req: Request, res: Response) => {
  const schema = z.object({
    category: z.enum([
      'Royalty & Payments',
      'ISBN & Metadata Issues',
      'Printing & Quality',
      'Distribution & Availability',
      'Book Status & Production Updates',
      'General Inquiry'
    ])
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid category provided.' }
    });
  }

  const user = req.user!;
  const updated = store.updateTicket(
    req.params.ticketId,
    { category: parsed.data.category },
    { id: user.id, name: user.name }
  );

  if (!updated) {
    return res.status(404).json({
      error: { code: 'TICKET_NOT_FOUND', message: 'Ticket not found.' }
    });
  }

  sseManager.broadcastTicketEvent({
    eventType: 'ticket.category.changed',
    ticketId: updated.id,
    ticketAuthorId: updated.authorId,
    data: { ticketId: updated.id, category: updated.category }
  });

  return res.json({ data: updated });
});

// PATCH /api/v1/admin/tickets/:ticketId/priority
router.patch('/tickets/:ticketId/priority', (req: Request, res: Response) => {
  const schema = z.object({
    priority: z.enum(['critical', 'high', 'medium', 'low'])
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid priority provided.' }
    });
  }

  const user = req.user!;
  const updated = store.updateTicket(
    req.params.ticketId,
    { priority: parsed.data.priority },
    { id: user.id, name: user.name }
  );

  if (!updated) {
    return res.status(404).json({
      error: { code: 'TICKET_NOT_FOUND', message: 'Ticket not found.' }
    });
  }

  sseManager.broadcastAdminQueueEvent('ticket.queue.updated', {
    ticketId: updated.id,
    priority: updated.priority
  });

  return res.json({ data: updated });
});

// PATCH /api/v1/admin/tickets/:ticketId/assignment
router.patch('/tickets/:ticketId/assignment', (req: Request, res: Response) => {
  const schema = z.object({
    assigneeId: z.string().nullable()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid assignee ID format.' }
    });
  }

  const { assigneeId } = parsed.data;
  if (assigneeId) {
    const assignee = store.findUserById(assigneeId);
    if (!assignee || assignee.role !== 'admin') {
      return res.status(400).json({
        error: { code: 'INVALID_ASSIGNEE', message: 'Assignee must be an active admin user.' }
      });
    }
  }

  const user = req.user!;
  const updated = store.updateTicket(
    req.params.ticketId,
    { assigneeId },
    { id: user.id, name: user.name }
  );

  if (!updated) {
    return res.status(404).json({
      error: { code: 'TICKET_NOT_FOUND', message: 'Ticket not found.' }
    });
  }

  sseManager.broadcastAdminQueueEvent('ticket.assignment.changed', {
    ticketId: updated.id,
    assigneeId: updated.assigneeId
  });

  return res.json({ data: updated });
});

// POST /api/v1/admin/tickets/:ticketId/notes (Internal Note - Admin ONLY)
router.post('/tickets/:ticketId/notes', (req: Request, res: Response) => {
  const schema = z.object({
    body: z.string().trim().min(2, 'Note cannot be empty')
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Please provide note text.' }
    });
  }

  const user = req.user!;
  const ticket = store.findTicketById(req.params.ticketId);

  if (!ticket) {
    return res.status(404).json({
      error: { code: 'TICKET_NOT_FOUND', message: 'Ticket not found.' }
    });
  }

  const message = store.addMessage({
    ticketId: ticket.id,
    senderId: user.id,
    senderRole: 'admin',
    senderName: user.name,
    visibility: 'internal',
    body: parsed.data.body
  });

  // Broadcast ONLY to admin clients with isInternalOnly = true!
  sseManager.broadcastTicketEvent({
    eventType: 'ticket.internal_note.created',
    ticketId: ticket.id,
    ticketAuthorId: ticket.authorId,
    data: message,
    isInternalOnly: true
  });

  return res.status(201).json({ data: message });
});

// POST /api/v1/admin/tickets/:ticketId/responses (Public response to author)
router.post('/tickets/:ticketId/responses', (req: Request, res: Response) => {
  const schema = z.object({
    body: z.string().trim().min(5, 'Response body must be at least 5 characters long')
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Please provide a valid response message.' }
    });
  }

  const user = req.user!;
  const ticket = store.findTicketById(req.params.ticketId);

  if (!ticket) {
    return res.status(404).json({
      error: { code: 'TICKET_NOT_FOUND', message: 'Ticket not found.' }
    });
  }

  const message = store.addMessage({
    ticketId: ticket.id,
    senderId: user.id,
    senderRole: 'admin',
    senderName: user.name,
    visibility: 'public',
    body: parsed.data.body
  });

  // Broadcast to author and admin listeners
  sseManager.broadcastTicketEvent({
    eventType: 'ticket.response.created',
    ticketId: ticket.id,
    ticketAuthorId: ticket.authorId,
    data: message,
    isInternalOnly: false
  });

  return res.status(201).json({ data: message });
});

// POST /api/v1/admin/tickets/:ticketId/ai/classify (Re-run classification)
router.post('/tickets/:ticketId/ai/classify', async (req: Request, res: Response) => {
  const ticket = store.findTicketById(req.params.ticketId);
  if (!ticket) {
    return res.status(404).json({
      error: { code: 'TICKET_NOT_FOUND', message: 'Ticket not found.' }
    });
  }

  const result = await aiService.classifyTicket(ticket.subject, ticket.description);

  const updated = store.updateTicket(ticket.id, {
    aiCategoryRecommendation: result.category,
    aiPriorityRecommendation: result.priority,
    aiModel: result.model,
    aiReason: result.reason,
    aiState: 'completed'
  });

  return res.json({
    data: {
      recommendation: result,
      ticket: updated
    }
  });
});

// POST /api/v1/admin/tickets/:ticketId/ai/draft (Generate AI response draft)
router.post('/tickets/:ticketId/ai/draft', async (req: Request, res: Response) => {
  const ticket = store.findTicketById(req.params.ticketId);
  if (!ticket) {
    return res.status(404).json({
      error: { code: 'TICKET_NOT_FOUND', message: 'Ticket not found.' }
    });
  }

  const author = store.findAuthorById(ticket.authorId);
  if (!author) {
    return res.status(400).json({
      error: { code: 'AUTHOR_NOT_FOUND', message: 'Associated author account not found.' }
    });
  }

  const book = ticket.bookId ? store.findBookById(ticket.bookId) : null;
  const messages = store.getMessagesForTicket(ticket.id, 'admin');
  const publicMessages = messages
    .filter(m => m.visibility === 'public')
    .map(m => ({ senderRole: m.senderRole, body: m.body, createdAt: m.createdAt }));

  try {
    const draftResult = await aiService.draftResponse({
      author,
      book: book || null,
      subject: ticket.subject,
      description: ticket.description,
      category: ticket.category,
      priority: ticket.priority,
      ticketNumber: ticket.ticketNumber,
      existingMessages: publicMessages
    });

    return res.json({ data: draftResult });
  } catch (err: any) {
    return res.status(500).json({
      error: {
        code: 'AI_DRAFT_ERROR',
        message: 'Failed to generate AI draft response. Please write response manually.',
        details: err.message
      }
    });
  }
});

// POST /api/v1/admin/data/reset-sample (Re-seed data)
router.post('/data/reset-sample', (_req: Request, res: Response) => {
  try {
    const result = store.seedFromSampleData();
    return res.json({
      data: {
        message: 'Successfully re-seeded database from bookleaf_sample_data.json',
        ...result
      }
    });
  } catch (err: any) {
    return res.status(500).json({
      error: {
        code: 'SEED_ERROR',
        message: err.message
      }
    });
  }
});

// GET /api/v1/admin/events (Admin SSE queue stream)
router.get('/events', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive'
  });

  const clientId = `admin-sse-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  sseManager.register({
    id: clientId,
    res,
    role: 'admin'
  });
});

export default router;
