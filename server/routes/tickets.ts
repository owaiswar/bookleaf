import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { store } from '../db/store.js';
import { requireAuth } from '../middleware/auth.js';
import { aiService } from '../services/ai.js';
import { sseManager } from '../services/sse.js';

const router = Router();

const createTicketSchema = z.object({
  bookId: z.string().nullable().optional(),
  subject: z.string().trim().min(3, 'Subject must be at least 3 characters long').max(200),
  description: z.string().trim().min(10, 'Description must be at least 10 characters long').max(4000)
});

// POST /api/v1/tickets (Author creates ticket)
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const user = req.user!;

  if (user.role !== 'author' || !user.authorId) {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Only authors can submit author support tickets.'
      }
    });
  }

  const result = createTicketSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please fill in all required ticket fields correctly.',
        details: result.error.issues
      }
    });
  }

  const { bookId, subject, description } = result.data;

  // Verify book ownership if bookId is supplied
  let validatedBookId: string | null = null;
  if (bookId && bookId !== 'general') {
    const book = store.findBookById(bookId);
    if (!book || book.authorId !== user.authorId) {
      return res.status(400).json({
        error: {
          code: 'INVALID_BOOK_SELECTION',
          message: 'The selected book does not belong to your account.'
        }
      });
    }
    validatedBookId = book.id;
  }

  // Classify ticket with AI or fallback heuristics
  let aiClassification;
  try {
    aiClassification = await aiService.classifyTicket(subject, description);
  } catch (err) {
    console.error('[TicketRoute] AI classification failed, using heuristics:', err);
    aiClassification = aiService.classifyWithHeuristics(subject, description);
  }

  const ticket = store.createTicket({
    authorId: user.authorId,
    bookId: validatedBookId,
    subject,
    description,
    category: aiClassification.category,
    priority: aiClassification.priority,
    aiCategoryRecommendation: aiClassification.category,
    aiPriorityRecommendation: aiClassification.priority,
    aiState: 'completed',
    aiModel: aiClassification.model,
    aiReason: aiClassification.reason
  });

  // Notify admin queue in real time
  sseManager.broadcastAdminQueueEvent('ticket.created', {
    ticketId: ticket.id,
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    category: ticket.category,
    priority: ticket.priority,
    authorName: user.name
  });

  return res.status(201).json({
    data: ticket
  });
});

// GET /api/v1/tickets (List author's tickets)
router.get('/', requireAuth, (req: Request, res: Response) => {
  const user = req.user!;

  if (user.role === 'author') {
    if (!user.authorId) return res.json({ data: [] });
    const tickets = store.getAuthorTickets(user.authorId);

    // Enrich with book title
    const enriched = tickets.map(t => {
      const book = t.bookId ? store.findBookById(t.bookId) : null;
      return {
        ...t,
        bookTitle: book ? book.title : 'General / Account Level'
      };
    });

    return res.json({ data: enriched });
  }

  // If admin hits this route, redirect or return author-scoped
  return res.json({ data: [] });
});

// GET /api/v1/tickets/:ticketId (Author ticket details)
router.get('/:ticketId', requireAuth, (req: Request, res: Response) => {
  const user = req.user!;
  const ticket = store.findTicketById(req.params.ticketId);

  if (!ticket) {
    return res.status(404).json({
      error: {
        code: 'TICKET_NOT_FOUND',
        message: 'The requested ticket does not exist.'
      }
    });
  }

  // Author isolation
  if (user.role === 'author' && ticket.authorId !== user.authorId) {
    return res.status(404).json({
      error: {
        code: 'TICKET_NOT_FOUND',
        message: 'The requested ticket does not exist.'
      }
    });
  }

  const book = ticket.bookId ? store.findBookById(ticket.bookId) : null;
  const author = store.findAuthorById(ticket.authorId);

  // Author ONLY sees public messages!
  const messages = store.getMessagesForTicket(ticket.id, user.role);

  return res.json({
    data: {
      ...ticket,
      book,
      author: author ? { id: author.id, name: author.name, email: author.email } : null,
      messages
    }
  });
});

// GET /api/v1/tickets/:ticketId/messages
router.get('/:ticketId/messages', requireAuth, (req: Request, res: Response) => {
  const user = req.user!;
  const ticket = store.findTicketById(req.params.ticketId);

  if (!ticket) {
    return res.status(404).json({
      error: { code: 'TICKET_NOT_FOUND', message: 'Ticket not found.' }
    });
  }

  if (user.role === 'author' && ticket.authorId !== user.authorId) {
    return res.status(404).json({
      error: { code: 'TICKET_NOT_FOUND', message: 'Ticket not found.' }
    });
  }

  // Role-based visibility filtering enforced in store.getMessagesForTicket
  const messages = store.getMessagesForTicket(ticket.id, user.role);
  return res.json({ data: messages });
});

// GET /api/v1/tickets/:ticketId/events (SSE stream for live ticket updates)
router.get('/:ticketId/events', (req: Request, res: Response) => {
  const ticket = store.findTicketById(req.params.ticketId);
  if (!ticket) {
    return res.status(404).end();
  }

  // Configure SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive'
  });

  const clientId = `sse-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // Determine user from cookie or query token
  let role: 'author' | 'admin' = 'author';
  let authorId = ticket.authorId;

  if (req.user) {
    role = req.user.role;
    authorId = req.user.authorId || ticket.authorId;
  }

  sseManager.register({
    id: clientId,
    res,
    role,
    authorId,
    ticketId: ticket.id
  });
});

export default router;
