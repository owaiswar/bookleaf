import { Router, Request, Response } from 'express';
import { store } from '../db/store.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/v1/books
router.get('/', requireAuth, (req: Request, res: Response) => {
  const user = req.user!;

  if (user.role === 'author') {
    if (!user.authorId) {
      return res.json({ data: [] });
    }
    const books = store.findBooksByAuthorId(user.authorId);
    return res.json({ data: books });
  }

  // Admin view
  const authorIdFilter = req.query.authorId as string | undefined;
  if (authorIdFilter) {
    const books = store.findBooksByAuthorId(authorIdFilter);
    return res.json({ data: books });
  }

  const allBooks = store.getBooks();
  return res.json({ data: allBooks });
});

// GET /api/v1/authors/me/dashboard
router.get('/dashboard', requireAuth, (req: Request, res: Response) => {
  const user = req.user!;

  if (user.role !== 'author' || !user.authorId) {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Only authors can access personal dashboard metrics.'
      }
    });
  }

  const author = store.findAuthorById(user.authorId);
  const books = store.findBooksByAuthorId(user.authorId);
  const tickets = store.getAuthorTickets(user.authorId);

  const totalBooks = books.length;
  const publishedBooks = books.filter(b => b.status === 'Published & Live').length;
  const inProductionBooks = books.filter(b => b.status !== 'Published & Live').length;

  let totalRoyaltyEarned = 0;
  let royaltyPaid = 0;
  let royaltyPending = 0;
  let totalCopiesSold = 0;

  for (const b of books) {
    if (typeof b.totalRoyaltyEarned === 'number') totalRoyaltyEarned += b.totalRoyaltyEarned;
    if (typeof b.royaltyPaid === 'number') royaltyPaid += b.royaltyPaid;
    if (typeof b.royaltyPending === 'number') royaltyPending += b.royaltyPending;
    if (typeof b.totalCopiesSold === 'number') totalCopiesSold += b.totalCopiesSold;
  }

  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;

  return res.json({
    data: {
      author,
      metrics: {
        totalBooks,
        publishedBooks,
        inProductionBooks,
        totalCopiesSold,
        totalRoyaltyEarned,
        royaltyPaid,
        royaltyPending,
        openTickets,
        totalTickets: tickets.length
      },
      recentBooks: books.slice(0, 5),
      recentTickets: tickets.slice(0, 5)
    }
  });
});

// GET /api/v1/books/:bookId
router.get('/:bookId', requireAuth, (req: Request, res: Response) => {
  const user = req.user!;
  const book = store.findBookById(req.params.bookId);

  if (!book) {
    return res.status(404).json({
      error: {
        code: 'BOOK_NOT_FOUND',
        message: 'The requested book could not be found.'
      }
    });
  }

  // Security check: author can only see their own book
  if (user.role === 'author' && book.authorId !== user.authorId) {
    return res.status(404).json({
      error: {
        code: 'BOOK_NOT_FOUND',
        message: 'The requested book could not be found.'
      }
    });
  }

  const author = store.findAuthorById(book.authorId);

  return res.json({
    data: {
      ...book,
      author: author ? { id: author.id, name: author.name, email: author.email } : null
    }
  });
});

export default router;
