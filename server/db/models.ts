import mongoose, { Schema, Document } from 'mongoose';
import {
  User,
  Author,
  Book,
  Ticket,
  TicketMessage,
  TicketAuditEvent
} from './store.js';

// User Schema
const UserSchema = new Schema<User & Document>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['author', 'admin'], required: true, default: 'author' },
    authorId: { type: String, default: undefined },
    isActive: { type: Boolean, default: true },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
  },
  { collection: 'users', timestamps: false, versionKey: false }
);

// Author Schema
const AuthorSchema = new Schema<Author & Document>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    phone: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    bio: { type: String, default: '' },
    publishingPackage: { type: String, default: 'Standard Free' },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  { collection: 'authors', timestamps: false, versionKey: false }
);

// Book Schema
const BookSchema = new Schema<Book & Document>(
  {
    id: { type: String, required: true, unique: true, index: true },
    authorId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    isbn: { type: String, default: null },
    genre: { type: String, default: 'General' },
    publicationDate: { type: String, default: null },
    status: { type: String, required: true },
    mrp: { type: Number, default: null },
    currency: { type: String, default: 'INR' },
    totalCopiesSold: { type: Number, default: null },
    totalRoyaltyEarned: { type: Number, default: null },
    royaltyPaid: { type: Number, default: null },
    royaltyPending: { type: Number, default: null },
    distributionChannels: { type: [String], default: [] },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
  },
  { collection: 'books', timestamps: false, versionKey: false }
);

// Ticket Schema
const TicketSchema = new Schema<Ticket & Document>(
  {
    id: { type: String, required: true, unique: true, index: true },
    ticketNumber: { type: String, required: true, unique: true, index: true },
    authorId: { type: String, required: true, index: true },
    bookId: { type: String, default: null, index: true },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
      index: true
    },
    category: { type: String, required: true, index: true },
    aiCategoryRecommendation: { type: String, required: true },
    categorySource: { type: String, enum: ['ai', 'admin', 'default'], default: 'ai' },
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
      index: true
    },
    aiPriorityRecommendation: { type: String, required: true },
    prioritySource: { type: String, enum: ['ai', 'admin', 'default'], default: 'ai' },
    aiState: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'not_requested'],
      default: 'completed'
    },
    aiModel: { type: String },
    aiReason: { type: String },
    assigneeId: { type: String, default: null, index: true },
    createdAt: { type: String, default: () => new Date().toISOString(), index: true },
    updatedAt: { type: String, default: () => new Date().toISOString() },
    lastPublicResponseAt: { type: String, default: null },
  },
  { collection: 'tickets', timestamps: false, versionKey: false }
);

// Ticket Message Schema
const TicketMessageSchema = new Schema<TicketMessage & Document>(
  {
    id: { type: String, required: true, unique: true, index: true },
    ticketId: { type: String, required: true, index: true },
    senderId: { type: String, required: true },
    senderRole: { type: String, enum: ['author', 'admin'], required: true },
    senderName: { type: String, required: true },
    visibility: { type: String, enum: ['public', 'internal'], required: true, index: true },
    body: { type: String, required: true },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  { collection: 'ticket_messages', timestamps: false, versionKey: false }
);

// Ticket Audit Event Schema
const TicketAuditEventSchema = new Schema<TicketAuditEvent & Document>(
  {
    id: { type: String, required: true, unique: true, index: true },
    ticketId: { type: String, required: true, index: true },
    actorId: { type: String, required: true },
    actorName: { type: String, required: true },
    action: { type: String, required: true },
    details: { type: String, required: true },
    previousValue: { type: String },
    newValue: { type: String },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  { collection: 'ticket_audit_events', timestamps: false, versionKey: false }
);

// Counter Schema for sequence generation
const CounterSchema = new Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 1000 },
  },
  { collection: 'counters', timestamps: false, versionKey: false }
);

export const UserModel = mongoose.models.User || mongoose.model<User & Document>('User', UserSchema);
export const AuthorModel = mongoose.models.Author || mongoose.model<Author & Document>('Author', AuthorSchema);
export const BookModel = mongoose.models.Book || mongoose.model<Book & Document>('Book', BookSchema);
export const TicketModel = mongoose.models.Ticket || mongoose.model<Ticket & Document>('Ticket', TicketSchema);
export const MessageModel = mongoose.models.TicketMessage || mongoose.model<TicketMessage & Document>('TicketMessage', TicketMessageSchema);
export const AuditEventModel = mongoose.models.TicketAuditEvent || mongoose.model<TicketAuditEvent & Document>('TicketAuditEvent', TicketAuditEventSchema);
export const CounterModel = mongoose.models.Counter || mongoose.model('Counter', CounterSchema);
