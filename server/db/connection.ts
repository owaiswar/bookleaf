import mongoose from 'mongoose';
import { config } from '../config.js';

let isConnected = false;

export async function connectMongoDB(): Promise<boolean> {
  if (!config.mongodbUri || config.mongodbUri.includes('<db_password>')) {
    console.warn('[MongoDB] No valid MONGODB_URI configured (placeholder or empty). Operating in file/memory mode.');
    return false;
  }

  try {
    mongoose.connection.on('connected', () => {
      isConnected = true;
      console.log(`[MongoDB] Connected to database: ${mongoose.connection.name || config.mongodbDbName}`);
    });

    mongoose.connection.on('error', (err) => {
      console.error('[MongoDB] Connection error:', err.message || err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB] Disconnected from database.');
      isConnected = false;
    });

    await mongoose.connect(config.mongodbUri, {
      dbName: config.mongodbDbName || 'bookleaf',
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
    });

    isConnected = mongoose.connection.readyState === 1;
    return isConnected;
  } catch (error: any) {
    isConnected = false;
    // Sanitize error message to prevent accidental credential leakage in logs
    const sanitizedMsg = (error.message || '').replace(/:([^:@]{1,100})@/, ':****@');
    console.error(`[MongoDB] Failed to connect to database: ${sanitizedMsg}`);
    return false;
  }
}

export function isMongoConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}

export async function disconnectMongoDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('[MongoDB] Closed database connection.');
  }
}
