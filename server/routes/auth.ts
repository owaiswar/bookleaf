import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { store, User } from '../db/store.js';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// In-memory rate limiting tracker for authentication endpoints (per IP/Email)
interface RateLimitRecord {
  attempts: number;
  blockedUntil?: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();

function checkRateLimit(key: string, maxAttempts = 5, windowMs = 15 * 60 * 1000): { allowed: boolean; remainingSecs: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (record && record.blockedUntil && record.blockedUntil > now) {
    return { allowed: false, remainingSecs: Math.ceil((record.blockedUntil - now) / 1000) };
  }

  if (record && record.blockedUntil && record.blockedUntil <= now) {
    rateLimitMap.delete(key);
  }

  return { allowed: true, remainingSecs: 0 };
}

function recordFailedAttempt(key: string, maxAttempts = 5, lockDurationMs = 15 * 60 * 1000) {
  const now = Date.now();
  const record = rateLimitMap.get(key) || { attempts: 0 };
  record.attempts += 1;

  if (record.attempts >= maxAttempts) {
    record.blockedUntil = now + lockDurationMs;
  }

  rateLimitMap.set(key, record);
}

function clearRateLimit(key: string) {
  rateLimitMap.delete(key);
}

// Schemas
const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Full name must be at least 2 characters long').max(100),
    email: z.string().trim().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password must not exceed 128 characters')
      .regex(/[A-Za-z]/, 'Password must contain at least one letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
    phone: z.string().trim().optional(),
    city: z.string().trim().optional(),
    state: z.string().trim().optional(),
    publishingPackage: z.string().trim().optional()
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required')
});

function createSessionToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      authorId: user.authorId
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as any }
  );
}

function setAuthCookie(res: Response, token: string) {
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  });
}

function formatSafeUser(user: User) {
  const author = user.authorId ? store.findAuthorById(user.authorId) : null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    authorId: user.authorId,
    author
  };
}

// ==========================================
// POST /api/v1/auth/register (Public User Registration)
// ==========================================
router.post('/register', async (req: Request, res: Response) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const rateLimitKey = `register:${clientIp}`;

  const { allowed, remainingSecs } = checkRateLimit(rateLimitKey, 10, 15 * 60 * 1000);
  if (!allowed) {
    return res.status(429).json({
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: `Too many registration attempts from this IP. Please try again in ${remainingSecs} seconds.`
      }
    });
  }

  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please correct the highlighted fields.',
        details: result.error.issues
      }
    });
  }

  const { name, email, password, phone, city, state, publishingPackage } = result.data;
  const normalizedEmail = email.toLowerCase().trim();

  // Check if account already exists
  if (store.findUserByEmail(normalizedEmail)) {
    recordFailedAttempt(rateLimitKey);
    return res.status(409).json({
      error: {
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'An account with this email address already exists. Please sign in instead.'
      }
    });
  }

  // Hash password with bcrypt
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    // Create new author user (role is STRICTLY 'author', never client-controlled)
    const { user: newUser } = store.createUser({
      name,
      email: normalizedEmail,
      passwordHash,
      phone,
      city,
      state,
      publishingPackage
    });

    clearRateLimit(rateLimitKey);

    const token = createSessionToken(newUser);
    setAuthCookie(res, token);

    return res.status(201).json({
      data: {
        user: formatSafeUser(newUser),
        token
      }
    });
  } catch (err: any) {
    return res.status(500).json({
      error: {
        code: 'REGISTRATION_FAILED',
        message: err.message || 'An error occurred during account registration.'
      }
    });
  }
});

// ==========================================
// POST /api/v1/auth/login (User & Author Login)
// ==========================================
router.post('/login', async (req: Request, res: Response) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid email or password format.',
        details: result.error.issues
      }
    });
  }

  const { email, password } = result.data;
  const normalizedEmail = email.toLowerCase().trim();
  const rateLimitKey = `login:${normalizedEmail}`;

  const { allowed, remainingSecs } = checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000);
  if (!allowed) {
    return res.status(429).json({
      error: {
        code: 'ACCOUNT_TEMPORARILY_LOCKED',
        message: `Too many failed login attempts. Please wait ${remainingSecs} seconds before trying again.`
      }
    });
  }

  const user = store.findUserByEmail(normalizedEmail);
  if (!user || !user.isActive) {
    recordFailedAttempt(rateLimitKey);
    return res.status(401).json({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.'
      }
    });
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    recordFailedAttempt(rateLimitKey);
    return res.status(401).json({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.'
      }
    });
  }

  clearRateLimit(rateLimitKey);

  const token = createSessionToken(user);
  setAuthCookie(res, token);

  return res.json({
    data: {
      user: formatSafeUser(user),
      token
    }
  });
});

// ==========================================
// POST /api/v1/admin/auth/login (Dedicated Administrator Login)
// ==========================================
router.post(['/admin/login', '/admin-login'], async (req: Request, res: Response) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid email or password format.',
        details: result.error.issues
      }
    });
  }

  const { email, password } = result.data;
  const normalizedEmail = email.toLowerCase().trim();
  const rateLimitKey = `admin_login:${normalizedEmail}`;

  const { allowed, remainingSecs } = checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000);
  if (!allowed) {
    return res.status(429).json({
      error: {
        code: 'ACCOUNT_TEMPORARILY_LOCKED',
        message: `Too many failed administrator login attempts. Please wait ${remainingSecs} seconds before trying again.`
      }
    });
  }

  const user = store.findUserByEmail(normalizedEmail);
  if (!user || !user.isActive) {
    recordFailedAttempt(rateLimitKey);
    return res.status(401).json({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid administrator email or password.'
      }
    });
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    recordFailedAttempt(rateLimitKey);
    return res.status(401).json({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid administrator email or password.'
      }
    });
  }

  // Strictly enforce server-assigned admin role
  if (user.role !== 'admin') {
    recordFailedAttempt(rateLimitKey);
    return res.status(403).json({
      error: {
        code: 'ADMIN_ACCESS_REQUIRED',
        message: 'Access denied. This account does not possess administrator privileges.'
      }
    });
  }

  clearRateLimit(rateLimitKey);

  const token = createSessionToken(user);
  setAuthCookie(res, token);

  return res.json({
    data: {
      user: formatSafeUser(user),
      token
    }
  });
});

// ==========================================
// POST /api/v1/auth/logout (Clear Session Cookie)
// ==========================================
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie(config.cookieName, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax'
  });
  return res.json({ data: { message: 'Logged out successfully.' } });
});

// ==========================================
// GET /api/v1/auth/me (Current Authenticated User Profile)
// ==========================================
router.get('/me', requireAuth, (req: Request, res: Response) => {
  const user = store.findUserById(req.user!.id);
  if (!user || !user.isActive) {
    return res.status(401).json({
      error: {
        code: 'SESSION_EXPIRED',
        message: 'Your session is no longer active. Please sign in again.'
      }
    });
  }

  return res.json({
    data: {
      user: formatSafeUser(user)
    }
  });
});

export default router;
