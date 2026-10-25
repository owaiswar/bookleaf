import { Router, Request, Response } from 'express';
import { store } from '../db/store.js';
import { isMongoConnected } from '../db/connection.js';

const router = Router();

// GET /health
router.get('/health', (_req: Request, res: Response) => {
  return res.json({
    status: 'ok',
    database: isMongoConnected() ? 'connected' : 'file_store',
    timestamp: new Date().toISOString(),
    service: 'BookLeaf Author Support & Communication Portal API'
  });
});

// GET /ready
router.get('/ready', (_req: Request, res: Response) => {
  const mongoUp = isMongoConnected();
  const authors = store.getAuthors();
  const books = store.getBooks();

  return res.json({
    status: 'ready',
    database: mongoUp ? 'connected' : 'disconnected',
    authorsCount: authors.length,
    booksCount: books.length,
    timestamp: new Date().toISOString()
  });
});

// GET /api-docs (JSON summary of endpoints)
router.get('/api-docs', (_req: Request, res: Response) => {
  return res.json({
    title: 'BookLeaf Support Portal REST API',
    version: '1.0.0',
    basePath: '/api/v1',
    endpoints: [
      { method: 'POST', path: '/api/v1/auth/login', desc: 'Email/password authentication' },
      { method: 'POST', path: '/api/v1/auth/logout', desc: 'Clear session cookie' },
      { method: 'GET', path: '/api/v1/auth/me', desc: 'Current safe authenticated user profile' },
      { method: 'GET', path: '/api/v1/books', desc: 'Author books (author sees own; admin sees all)' },
      { method: 'GET', path: '/api/v1/books/:bookId', desc: 'Book details with ownership enforcement' },
      { method: 'GET', path: '/api/v1/authors/me/dashboard', desc: 'Author summary dashboard metrics' },
      { method: 'POST', path: '/api/v1/tickets', desc: 'Author creates support ticket' },
      { method: 'GET', path: '/api/v1/tickets', desc: 'List tickets for current author' },
      { method: 'GET', path: '/api/v1/tickets/:ticketId', desc: 'Ticket details (strictly public messages only)' },
      { method: 'GET', path: '/api/v1/tickets/:ticketId/events', desc: 'SSE stream for live ticket updates' },
      { method: 'GET', path: '/api/v1/admin/tickets', desc: 'Admin queue with filters, sorting, search' },
      { method: 'GET', path: '/api/v1/admin/tickets/:ticketId', desc: 'Admin ticket detail with internal notes' },
      { method: 'PATCH', path: '/api/v1/admin/tickets/:ticketId/status', desc: 'Change ticket status' },
      { method: 'PATCH', path: '/api/v1/admin/tickets/:ticketId/category', desc: 'Override AI category' },
      { method: 'PATCH', path: '/api/v1/admin/tickets/:ticketId/priority', desc: 'Override AI priority' },
      { method: 'PATCH', path: '/api/v1/admin/tickets/:ticketId/assignment', desc: 'Assign/unassign ticket' },
      { method: 'POST', path: '/api/v1/admin/tickets/:ticketId/notes', desc: 'Add internal note (admin-only)' },
      { method: 'POST', path: '/api/v1/admin/tickets/:ticketId/responses', desc: 'Send public response to author' },
      { method: 'POST', path: '/api/v1/admin/tickets/:ticketId/ai/classify', desc: 'Re-run AI classification' },
      { method: 'POST', path: '/api/v1/admin/tickets/:ticketId/ai/draft', desc: 'Generate AI drafted reply' },
      { method: 'GET', path: '/api/v1/admin/events', desc: 'Admin SSE queue stream' }
    ]
  });
});

export default router;
