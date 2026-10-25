import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

import { config } from './config.js';
import { authenticate } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import booksRoutes from './routes/books.js';
import ticketRoutes from './routes/tickets.js';
import adminRoutes from './routes/admin.js';
import healthRoutes from './routes/health.js';
import { store } from './db/store.js';
import { disconnectMongoDB } from './db/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const clientDir = path.resolve(rootDir, 'client');

async function startServer() {
  const app = express();

  // Basic request parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // CORS headers
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    next();
  });

  // Global authentication pass
  app.use(authenticate);

  // Mount health & doc endpoints
  app.use('/', healthRoutes);

  // API v1
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/books', booksRoutes);
  app.use('/api/v1/authors/me', booksRoutes);
  app.use('/api/v1/tickets', ticketRoutes);
  app.use('/api/v1/admin', adminRoutes);

  // Convenience /api alias
  app.use('/api/auth', authRoutes);
  app.use('/api/books', booksRoutes);
  app.use('/api/authors/me', booksRoutes);
  app.use('/api/tickets', ticketRoutes);
  app.use('/api/admin', adminRoutes);

  // Development: Mount Vite middleware
  if (config.nodeEnv !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {}
      },
      appType: 'spa',
      root: clientDir,
      configFile: path.resolve(rootDir, 'vite.config.ts')
    });
    app.use(vite.middlewares);
  } else {
    // Production: Serve static build
    const distDir = path.resolve(rootDir, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  // Centralized Error Handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[ServerError]', err);
    return res.status(err.status || 500).json({
      error: {
        code: err.code || 'INTERNAL_SERVER_ERROR',
        message: err.message || 'An unexpected server error occurred.'
      }
    });
  });

  // Initialize database layer
  await store.initMongo();

  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(` BookLeaf Support & Communication Portal Running!   `);
    console.log(` Local URL: http://localhost:${config.port}         `);
    console.log(` API Base:  http://localhost:${config.port}/api/v1  `);
    console.log(`====================================================`);
  });

  const handleShutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Gracefully shutting down server...`);
    server.close(async () => {
      await disconnectMongoDB();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
}

startServer().catch(err => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
