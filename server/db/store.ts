import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { connectMongoDB, isMongoConnected } from './connection.js';
import {
  UserModel,
  AuthorModel,
  BookModel,
  TicketModel,
  MessageModel,
  AuditEventModel,
  CounterModel
} from './models.js';

export type UserRole = 'author' | 'admin';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketCategory =
  | 'Royalty & Payments'
  | 'ISBN & Metadata Issues'
  | 'Printing & Quality'
  | 'Distribution & Availability'
  | 'Book Status & Production Updates'
  | 'General Inquiry';

export type TicketPriority = 'critical' | 'high' | 'medium' | 'low';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  authorId?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface Author {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  bio: string;
  publishingPackage: string;
  createdAt: string;
}

export interface Book {
  id: string;
  authorId: string;
  title: string;
  isbn: string | null;
  genre: string;
  publicationDate: string | null;
  status: string;
  mrp: number | null;
  currency: string;
  totalCopiesSold: number | null;
  totalRoyaltyEarned: number | null;
  royaltyPaid: number | null;
  royaltyPending: number | null;
  distributionChannels: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  authorId: string;
  bookId: string | null;
  subject: string;
  description: string;
  status: TicketStatus;
  category: TicketCategory;
  aiCategoryRecommendation: TicketCategory;
  categorySource: 'ai' | 'admin' | 'default';
  priority: TicketPriority;
  aiPriorityRecommendation: TicketPriority;
  prioritySource: 'ai' | 'admin' | 'default';
  aiState: 'pending' | 'completed' | 'failed' | 'not_requested';
  aiModel?: string;
  aiReason?: string;
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
  lastPublicResponseAt: string | null;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderRole: UserRole;
  senderName: string;
  visibility: 'public' | 'internal';
  body: string;
  createdAt: string;
}

export interface TicketAuditEvent {
  id: string;
  ticketId: string;
  actorId: string;
  actorName: string;
  action:
    | 'created'
    | 'status_changed'
    | 'category_changed'
    | 'priority_changed'
    | 'assigned'
    | 'response_sent'
    | 'internal_note_added'
    | 'ai_generated';
  details: string;
  previousValue?: string;
  newValue?: string;
  createdAt: string;
}

export interface DatabaseSchema {
  users: User[];
  authors: Author[];
  books: Book[];
  tickets: Ticket[];
  messages: TicketMessage[];
  auditEvents: TicketAuditEvent[];
  lastTicketCounter: number;
}

export class Store {
  private dbPath: string;
  private sampleDataPath: string;
  private data: DatabaseSchema;
  private mongoInitialized: boolean = false;

  constructor() {
    this.dbPath = path.resolve(process.cwd(), 'data', 'bookleaf_store.json');
    this.sampleDataPath = path.resolve(process.cwd(), 'data', 'bookleaf_sample_data.json');
    this.data = {
      users: [],
      authors: [],
      books: [],
      tickets: [],
      messages: [],
      auditEvents: [],
      lastTicketCounter: 1000
    };
    this.initFileStore();
  }

  private initFileStore() {
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (fs.existsSync(this.dbPath)) {
      try {
        const raw = fs.readFileSync(this.dbPath, 'utf-8');
        this.data = JSON.parse(raw);
        console.log(`[Store] Loaded file database from ${this.dbPath} (${this.data.authors.length} authors, ${this.data.books.length} books, ${this.data.tickets.length} tickets)`);
        return;
      } catch (err) {
        console.error('[Store] Failed to parse existing db, seeding from sample:', err);
      }
    }

    this.seedFromSampleData();
  }

  public async initMongo(): Promise<boolean> {
    const connected = await connectMongoDB();
    if (!connected) {
      console.log('[Store] Operating in local file-backed storage mode.');
      return false;
    }

    try {
      // Check if MongoDB already has users and authors
      const usersCount = await UserModel.countDocuments();
      if (usersCount === 0) {
        console.log('[Store] MongoDB is empty. Seeding initial data from sample store into MongoDB...');
        await this.syncSampleDataToMongo();
      } else {
        console.log(`[Store] Found ${usersCount} users in MongoDB. Synchronizing application state from MongoDB...`);
        await this.loadFromMongo();
      }

      this.mongoInitialized = true;
      return true;
    } catch (err) {
      console.error('[Store] Error during MongoDB initialization/sync:', err);
      return false;
    }
  }

  private async loadFromMongo(): Promise<void> {
    const [users, authors, books, tickets, messages, auditEvents, counterDoc] = await Promise.all([
      UserModel.find({}).lean(),
      AuthorModel.find({}).lean(),
      BookModel.find({}).lean(),
      TicketModel.find({}).lean(),
      MessageModel.find({}).lean(),
      AuditEventModel.find({}).lean(),
      CounterModel.findById('ticketCounter').lean(),
    ]);

    this.data.users = (users as any[]).map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      passwordHash: u.passwordHash,
      role: u.role,
      authorId: u.authorId,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      isActive: u.isActive
    }));

    this.data.authors = (authors as any[]).map(a => ({
      id: a.id,
      name: a.name,
      email: a.email,
      phone: a.phone || '',
      city: a.city || '',
      state: a.state || '',
      bio: a.bio || '',
      publishingPackage: a.publishingPackage || 'Standard Free',
      createdAt: a.createdAt
    }));

    this.data.books = (books as any[]).map(b => ({
      id: b.id,
      authorId: b.authorId,
      title: b.title,
      isbn: b.isbn || null,
      genre: b.genre || 'General',
      publicationDate: b.publicationDate || null,
      status: b.status,
      mrp: b.mrp !== undefined ? b.mrp : null,
      currency: b.currency || 'INR',
      totalCopiesSold: b.totalCopiesSold !== undefined ? b.totalCopiesSold : null,
      totalRoyaltyEarned: b.totalRoyaltyEarned !== undefined ? b.totalRoyaltyEarned : null,
      royaltyPaid: b.royaltyPaid !== undefined ? b.royaltyPaid : null,
      royaltyPending: b.royaltyPending !== undefined ? b.royaltyPending : null,
      distributionChannels: b.distributionChannels || [],
      createdAt: b.createdAt,
      updatedAt: b.updatedAt
    }));

    this.data.tickets = (tickets as any[]).map(t => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      authorId: t.authorId,
      bookId: t.bookId || null,
      subject: t.subject,
      description: t.description,
      status: t.status,
      category: t.category,
      aiCategoryRecommendation: t.aiCategoryRecommendation,
      categorySource: t.categorySource,
      priority: t.priority,
      aiPriorityRecommendation: t.aiPriorityRecommendation,
      prioritySource: t.prioritySource,
      aiState: t.aiState,
      aiModel: t.aiModel,
      aiReason: t.aiReason,
      assigneeId: t.assigneeId || null,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      lastPublicResponseAt: t.lastPublicResponseAt || null
    }));

    this.data.messages = (messages as any[]).map(m => ({
      id: m.id,
      ticketId: m.ticketId,
      senderId: m.senderId,
      senderRole: m.senderRole,
      senderName: m.senderName,
      visibility: m.visibility,
      body: m.body,
      createdAt: m.createdAt
    }));

    this.data.auditEvents = (auditEvents as any[]).map(a => ({
      id: a.id,
      ticketId: a.ticketId,
      actorId: a.actorId,
      actorName: a.actorName,
      action: a.action,
      details: a.details,
      previousValue: a.previousValue,
      newValue: a.newValue,
      createdAt: a.createdAt
    }));

    if (counterDoc && typeof (counterDoc as any).seq === 'number') {
      this.data.lastTicketCounter = (counterDoc as any).seq;
    } else {
      const highestTicketNum = this.data.tickets.reduce((max, t) => {
        const num = parseInt(t.ticketNumber.replace('BL-', ''), 10);
        return isNaN(num) ? max : Math.max(max, num);
      }, 1000);
      this.data.lastTicketCounter = highestTicketNum;
      await CounterModel.findByIdAndUpdate(
        'ticketCounter',
        { seq: highestTicketNum },
        { upsert: true }
      ).catch(() => {});
    }

    console.log(`[Store] Synchronized from MongoDB: ${this.data.authors.length} authors, ${this.data.books.length} books, ${this.data.tickets.length} tickets, ${this.data.messages.length} messages.`);
    this.saveFile();
  }

  private async syncSampleDataToMongo(): Promise<void> {
    if (!isMongoConnected()) return;

    try {
      await Promise.all([
        UserModel.bulkWrite(
          this.data.users.map(u => ({
            updateOne: { filter: { id: u.id }, update: { $set: u }, upsert: true }
          }))
        ),
        AuthorModel.bulkWrite(
          this.data.authors.map(a => ({
            updateOne: { filter: { id: a.id }, update: { $set: a }, upsert: true }
          }))
        ),
        BookModel.bulkWrite(
          this.data.books.map(b => ({
            updateOne: { filter: { id: b.id }, update: { $set: b }, upsert: true }
          }))
        ),
        TicketModel.bulkWrite(
          this.data.tickets.map(t => ({
            updateOne: { filter: { id: t.id }, update: { $set: t }, upsert: true }
          }))
        ),
        MessageModel.bulkWrite(
          this.data.messages.map(m => ({
            updateOne: { filter: { id: m.id }, update: { $set: m }, upsert: true }
          }))
        ),
        AuditEventModel.bulkWrite(
          this.data.auditEvents.map(a => ({
            updateOne: { filter: { id: a.id }, update: { $set: a }, upsert: true }
          }))
        ),
        CounterModel.findByIdAndUpdate(
          'ticketCounter',
          { seq: this.data.lastTicketCounter },
          { upsert: true }
        )
      ]);
      console.log('[Store] Seeded sample data into MongoDB collections successfully.');
    } catch (err) {
      console.error('[Store] Error syncing sample data to MongoDB:', err);
    }
  }

  public save() {
    this.saveFile();
  }

  private saveFile() {
    try {
      const tempPath = `${this.dbPath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.dbPath);
    } catch (err) {
      console.error('[Store] Error saving database to file:', err);
    }
  }

  public seedFromSampleData(customJsonPath?: string): { authorsCount: number; booksCount: number; ticketsCount: number } {
    const targetPath = customJsonPath || this.sampleDataPath;
    if (!fs.existsSync(targetPath)) {
      throw new Error(`Sample data file not found at ${targetPath}`);
    }

    const raw = fs.readFileSync(targetPath, 'utf-8');
    const parsed = JSON.parse(raw);

    const defaultAdminHash = bcrypt.hashSync('admin123', 10);
    const defaultAuthorHash = bcrypt.hashSync('author123', 10);

    const adminUser: User = {
      id: 'admin-1',
      name: 'BookLeaf Ops Admin',
      email: 'admin@bookleaf.com',
      passwordHash: defaultAdminHash,
      role: 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true
    };

    const users: User[] = [adminUser];
    const authors: Author[] = [];
    const books: Book[] = [];

    for (const a of parsed.authors) {
      authors.push({
        id: a.id,
        name: a.name,
        email: a.email.toLowerCase().trim(),
        phone: a.phone || '',
        city: a.city || '',
        state: a.state || '',
        bio: a.bio || '',
        publishingPackage: a.publishingPackage || 'Standard Free',
        createdAt: a.createdAt || new Date().toISOString()
      });

      users.push({
        id: `user-${a.id}`,
        name: a.name,
        email: a.email.toLowerCase().trim(),
        passwordHash: defaultAuthorHash,
        role: 'author',
        authorId: a.id,
        createdAt: a.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true
      });
    }

    for (const b of parsed.books) {
      books.push({
        id: b.id,
        authorId: b.authorId,
        title: b.title,
        isbn: b.isbn || null,
        genre: b.genre || 'General',
        publicationDate: b.publicationDate || null,
        status: b.status,
        mrp: b.mrp !== undefined ? b.mrp : null,
        currency: b.currency || 'INR',
        totalCopiesSold: b.totalCopiesSold !== undefined ? b.totalCopiesSold : null,
        totalRoyaltyEarned: b.totalRoyaltyEarned !== undefined ? b.totalRoyaltyEarned : null,
        royaltyPaid: b.royaltyPaid !== undefined ? b.royaltyPaid : null,
        royaltyPending: b.royaltyPending !== undefined ? b.royaltyPending : null,
        distributionChannels: b.distributionChannels || [],
        createdAt: b.publicationDate ? new Date(b.publicationDate).toISOString() : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    const now = Date.now();
    const tickets: Ticket[] = [
      {
        id: 'ticket-1',
        ticketNumber: 'BL-1001',
        authorId: 'author-1',
        bookId: 'book-1',
        subject: 'Q3 2024 Royalty payout clarification',
        description: 'Hello BookLeaf team, I see a pending royalty balance of ₹8,600 for Whispers of the Monsoon. Could you please clarify when this will be credited to my registered HDFC account? Thank you.',
        status: 'in_progress',
        category: 'Royalty & Payments',
        aiCategoryRecommendation: 'Royalty & Payments',
        categorySource: 'ai',
        priority: 'high',
        aiPriorityRecommendation: 'high',
        prioritySource: 'ai',
        aiState: 'completed',
        aiModel: 'gemini-2.5-flash',
        aiReason: 'Author inquiring about substantial overdue or pending royalty exceeding ₹1,000 payout threshold.',
        assigneeId: 'admin-1',
        createdAt: new Date(now - 1000 * 60 * 60 * 36).toISOString(),
        updatedAt: new Date(now - 1000 * 60 * 60 * 4).toISOString(),
        lastPublicResponseAt: new Date(now - 1000 * 60 * 60 * 4).toISOString()
      },
      {
        id: 'ticket-2',
        ticketNumber: 'BL-1002',
        authorId: 'author-2',
        bookId: 'book-4',
        subject: 'Discrepancy in Amazon India ISBN listing',
        description: 'My paperback for The Silicon Heist displays ISBN 978-93-90123-47-5 on the physical back cover, but on Amazon India product details it shows a slightly different ISBN ending in 46-8. Readers are messaging me confused.',
        status: 'open',
        category: 'ISBN & Metadata Issues',
        aiCategoryRecommendation: 'ISBN & Metadata Issues',
        categorySource: 'ai',
        priority: 'high',
        aiPriorityRecommendation: 'high',
        prioritySource: 'ai',
        aiState: 'completed',
        aiModel: 'gemini-2.5-flash',
        aiReason: 'Duplicate or wrong ISBN mapping on external retailer is high priority under BookLeaf policy and escalated to production.',
        assigneeId: null,
        createdAt: new Date(now - 1000 * 60 * 60 * 18).toISOString(),
        updatedAt: new Date(now - 1000 * 60 * 60 * 18).toISOString(),
        lastPublicResponseAt: null
      },
      {
        id: 'ticket-3',
        ticketNumber: 'BL-1003',
        authorId: 'author-3',
        bookId: 'book-6',
        subject: 'Author copies print quality issue on pages 42-48',
        description: 'Received my 20 author copies box today in Bengaluru. In 6 of the copies, pages 42 to 48 have faded grey streaks and faint text. I have taken photos ready to share.',
        status: 'resolved',
        category: 'Printing & Quality',
        aiCategoryRecommendation: 'Printing & Quality',
        categorySource: 'ai',
        priority: 'medium',
        aiPriorityRecommendation: 'medium',
        prioritySource: 'ai',
        aiState: 'completed',
        aiModel: 'gemini-2.5-flash',
        aiReason: 'Verified printing defect report with photo proof offer eligible for 100% free reprint.',
        assigneeId: 'admin-1',
        createdAt: new Date(now - 1000 * 60 * 60 * 72).toISOString(),
        updatedAt: new Date(now - 1000 * 60 * 60 * 12).toISOString(),
        lastPublicResponseAt: new Date(now - 1000 * 60 * 60 * 12).toISOString()
      },
      {
        id: 'ticket-4',
        ticketNumber: 'BL-1004',
        authorId: 'author-4',
        bookId: 'book-8',
        subject: 'Book shows currently out of stock on Flipkart',
        description: 'Several readers from Chennai notified me that Rivers in My Bones is listed as "Currently Unavailable" on Flipkart, though it is live on Amazon.',
        status: 'open',
        category: 'Distribution & Availability',
        aiCategoryRecommendation: 'Distribution & Availability',
        categorySource: 'ai',
        priority: 'medium',
        aiPriorityRecommendation: 'medium',
        prioritySource: 'ai',
        aiState: 'completed',
        aiModel: 'gemini-2.5-flash',
        aiReason: 'Retailer catalog sync issue requires 24-48h inventory re-sync trigger.',
        assigneeId: null,
        createdAt: new Date(now - 1000 * 60 * 60 * 8).toISOString(),
        updatedAt: new Date(now - 1000 * 60 * 60 * 8).toISOString(),
        lastPublicResponseAt: null
      },
      {
        id: 'ticket-5',
        ticketNumber: 'BL-1005',
        authorId: 'author-6',
        bookId: 'book-13',
        subject: 'Timeline for cover design concept review',
        description: 'Hi team! Little Joy and the Firefly is in Manuscript Received stage. When will the creative design team share the initial cover concept drafts?',
        status: 'open',
        category: 'Book Status & Production Updates',
        aiCategoryRecommendation: 'Book Status & Production Updates',
        categorySource: 'ai',
        priority: 'low',
        aiPriorityRecommendation: 'low',
        prioritySource: 'ai',
        aiState: 'completed',
        aiModel: 'gemini-2.5-flash',
        aiReason: 'Routine production stage schedule inquiry.',
        assigneeId: null,
        createdAt: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
        updatedAt: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
        lastPublicResponseAt: null
      },
      {
        id: 'ticket-6',
        ticketNumber: 'BL-1006',
        authorId: 'author-10',
        bookId: null,
        subject: 'How to link bank account for future royalties?',
        description: 'Hello, I am a new author without a published book yet. Where can I enter my IFSC code and bank account details so everything is ready ahead of time?',
        status: 'in_progress',
        category: 'General Inquiry',
        aiCategoryRecommendation: 'General Inquiry',
        categorySource: 'ai',
        priority: 'low',
        aiPriorityRecommendation: 'low',
        prioritySource: 'ai',
        aiState: 'completed',
        aiModel: 'gemini-2.5-flash',
        aiReason: 'General account-level procedural question.',
        assigneeId: 'admin-1',
        createdAt: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
        updatedAt: new Date(now - 1000 * 60 * 60 * 10).toISOString(),
        lastPublicResponseAt: new Date(now - 1000 * 60 * 60 * 10).toISOString()
      }
    ];

    const messages: TicketMessage[] = [
      {
        id: 'msg-1',
        ticketId: 'ticket-1',
        senderId: 'admin-1',
        senderRole: 'admin',
        senderName: 'BookLeaf Ops Admin',
        visibility: 'internal',
        body: 'Internal note: Checked author bank account. HDFC IFSC confirmed. Q3 payout batch is queued with accounts department for disbursement on November 10th.',
        createdAt: new Date(now - 1000 * 60 * 60 * 20).toISOString()
      },
      {
        id: 'msg-2',
        ticketId: 'ticket-1',
        senderId: 'admin-1',
        senderRole: 'admin',
        senderName: 'BookLeaf Ops Admin',
        visibility: 'public',
        body: 'Dear Aarav, thank you for reaching out. We have verified your Q3 royalty statement for Whispers of the Monsoon (total pending ₹8,600). As per policy, all cleared quarterly royalties are disbursed to verified accounts by the 10th of the following month. Your payment will be processed to your registered HDFC account by November 10th. Please let us know if your bank details have changed.',
        createdAt: new Date(now - 1000 * 60 * 60 * 4).toISOString()
      },
      {
        id: 'msg-3',
        ticketId: 'ticket-3',
        senderId: 'admin-1',
        senderRole: 'admin',
        senderName: 'BookLeaf Ops Admin',
        visibility: 'public',
        body: 'Dear Ananya, we sincerely apologize for the faded pages on your author copies of Stardust & Chai. Under our 100% Quality Assurance Guarantee, we have initiated a full reprint of the affected 6 copies at zero cost to you. The new copies will be dispatched to your Bengaluru address with expedited delivery.',
        createdAt: new Date(now - 1000 * 60 * 60 * 12).toISOString()
      },
      {
        id: 'msg-4',
        ticketId: 'ticket-6',
        senderId: 'admin-1',
        senderRole: 'admin',
        senderName: 'BookLeaf Ops Admin',
        visibility: 'public',
        body: 'Hello Rohit! Welcome to BookLeaf. You can securely link your bank details right from your Author Dashboard under Profile > Royalty Bank Account. We support all NEFT/IMPS enabled banks across India.',
        createdAt: new Date(now - 1000 * 60 * 60 * 10).toISOString()
      }
    ];

    const auditEvents: TicketAuditEvent[] = [
      {
        id: 'audit-1',
        ticketId: 'ticket-1',
        actorId: 'user-author-1',
        actorName: 'Aarav Sharma',
        action: 'created',
        details: 'Ticket BL-1001 created by author',
        createdAt: new Date(now - 1000 * 60 * 60 * 36).toISOString()
      },
      {
        id: 'audit-2',
        ticketId: 'ticket-1',
        actorId: 'admin-1',
        actorName: 'BookLeaf Ops Admin',
        action: 'assigned',
        details: 'Ticket assigned to BookLeaf Ops Admin',
        previousValue: 'unassigned',
        newValue: 'admin-1',
        createdAt: new Date(now - 1000 * 60 * 60 * 22).toISOString()
      },
      {
        id: 'audit-3',
        ticketId: 'ticket-1',
        actorId: 'admin-1',
        actorName: 'BookLeaf Ops Admin',
        action: 'status_changed',
        details: 'Status changed from open to in_progress',
        previousValue: 'open',
        newValue: 'in_progress',
        createdAt: new Date(now - 1000 * 60 * 60 * 22).toISOString()
      },
      {
        id: 'audit-4',
        ticketId: 'ticket-1',
        actorId: 'admin-1',
        actorName: 'BookLeaf Ops Admin',
        action: 'internal_note_added',
        details: 'Internal note added: Checked author bank account...',
        createdAt: new Date(now - 1000 * 60 * 60 * 20).toISOString()
      },
      {
        id: 'audit-5',
        ticketId: 'ticket-1',
        actorId: 'admin-1',
        actorName: 'BookLeaf Ops Admin',
        action: 'response_sent',
        details: 'Public response sent to author',
        createdAt: new Date(now - 1000 * 60 * 60 * 4).toISOString()
      }
    ];

    this.data = {
      users,
      authors,
      books,
      tickets,
      messages,
      auditEvents,
      lastTicketCounter: 1006
    };

    this.saveFile();

    // Also sync to MongoDB asynchronously if connected
    if (isMongoConnected()) {
      this.syncSampleDataToMongo().catch(err => {
        console.error('[Store] Error during seed to Mongo:', err);
      });
    }

    return {
      authorsCount: authors.length,
      booksCount: books.length,
      ticketsCount: tickets.length
    };
  }

  // Getters
  public getUsers(): User[] {
    return [...this.data.users];
  }

  public getAuthors(): Author[] {
    return [...this.data.authors];
  }

  public getBooks(): Book[] {
    return [...this.data.books];
  }

  public getTickets(): Ticket[] {
    return [...this.data.tickets];
  }

  public getMessages(): TicketMessage[] {
    return [...this.data.messages];
  }

  public getAuditEvents(): TicketAuditEvent[] {
    return [...this.data.auditEvents];
  }

  // User queries
  public findUserByEmail(email: string): User | undefined {
    const normalized = email.toLowerCase().trim();
    return this.data.users.find(u => u.email.toLowerCase().trim() === normalized);
  }

  public findUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public findAuthorById(id: string): Author | undefined {
    return this.data.authors.find(a => a.id === id);
  }

  // User creation & provisioning
  public createUser(params: {
    name: string;
    email: string;
    passwordHash: string;
    phone?: string;
    city?: string;
    state?: string;
    publishingPackage?: string;
  }): { user: User; author: Author } {
    const normalizedEmail = params.email.toLowerCase().trim();
    if (this.findUserByEmail(normalizedEmail)) {
      throw new Error('An account with this email address already exists.');
    }

    const now = new Date().toISOString();
    const authorId = `author-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newAuthor: Author = {
      id: authorId,
      name: params.name.trim(),
      email: normalizedEmail,
      phone: params.phone?.trim() || '',
      city: params.city?.trim() || 'India',
      state: params.state?.trim() || '',
      bio: '',
      publishingPackage: params.publishingPackage || 'Standard Free',
      createdAt: now
    };

    const newUser: User = {
      id: `user-${authorId}`,
      name: params.name.trim(),
      email: normalizedEmail,
      passwordHash: params.passwordHash,
      role: 'author',
      authorId,
      createdAt: now,
      updatedAt: now,
      isActive: true
    };

    this.data.authors.push(newAuthor);
    this.data.users.push(newUser);
    this.saveFile();

    // Persist to MongoDB
    if (isMongoConnected()) {
      Promise.all([
        AuthorModel.create(newAuthor),
        UserModel.create(newUser)
      ]).catch(err => {
        console.error('[Store] Error persisting user to MongoDB:', err);
      });
    }

    return { user: newUser, author: newAuthor };
  }

  public createAdminUser(params: {
    name: string;
    email: string;
    passwordHash: string;
  }): User {
    const normalizedEmail = params.email.toLowerCase().trim();
    const existing = this.findUserByEmail(normalizedEmail);
    if (existing) {
      if (existing.role === 'admin') {
        throw new Error(`Admin account with email '${normalizedEmail}' already exists. Refusing to overwrite.`);
      }
      throw new Error(`An account with email '${normalizedEmail}' already exists with another role.`);
    }

    const now = new Date().toISOString();
    const newAdmin: User = {
      id: `admin-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: params.name.trim(),
      email: normalizedEmail,
      passwordHash: params.passwordHash,
      role: 'admin',
      createdAt: now,
      updatedAt: now,
      isActive: true
    };

    this.data.users.push(newAdmin);
    this.saveFile();

    // Persist to MongoDB
    if (isMongoConnected()) {
      UserModel.create(newAdmin).catch(err => {
        console.error('[Store] Error persisting admin user to MongoDB:', err);
      });
    }

    return newAdmin;
  }

  // Books queries
  public findBooksByAuthorId(authorId: string): Book[] {
    return this.data.books.filter(b => b.authorId === authorId);
  }

  public findBookById(id: string): Book | undefined {
    return this.data.books.find(b => b.id === id);
  }

  // Ticket operations
  public getAuthorTickets(authorId: string): Ticket[] {
    return this.data.tickets
      .filter(t => t.authorId === authorId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public findTicketById(id: string): Ticket | undefined {
    return this.data.tickets.find(t => t.id === id || t.ticketNumber === id);
  }

  public createTicket(params: {
    authorId: string;
    bookId: string | null;
    subject: string;
    description: string;
    category?: TicketCategory;
    priority?: TicketPriority;
    aiState?: Ticket['aiState'];
    aiCategoryRecommendation?: TicketCategory;
    aiPriorityRecommendation?: TicketPriority;
    aiModel?: string;
    aiReason?: string;
  }): Ticket {
    this.data.lastTicketCounter += 1;
    const ticketNumber = `BL-${this.data.lastTicketCounter}`;
    const now = new Date().toISOString();

    const category = params.category || params.aiCategoryRecommendation || 'General Inquiry';
    const priority = params.priority || params.aiPriorityRecommendation || 'medium';

    const newTicket: Ticket = {
      id: `ticket-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ticketNumber,
      authorId: params.authorId,
      bookId: params.bookId,
      subject: params.subject.trim(),
      description: params.description.trim(),
      status: 'open',
      category,
      aiCategoryRecommendation: params.aiCategoryRecommendation || category,
      categorySource: params.category ? 'admin' : 'ai',
      priority,
      aiPriorityRecommendation: params.aiPriorityRecommendation || priority,
      prioritySource: params.priority ? 'admin' : 'ai',
      aiState: params.aiState || 'completed',
      aiModel: params.aiModel,
      aiReason: params.aiReason,
      assigneeId: null,
      createdAt: now,
      updatedAt: now,
      lastPublicResponseAt: null
    };

    this.data.tickets.unshift(newTicket);

    const author = this.findAuthorById(params.authorId);
    const audit = this.addAuditEvent({
      ticketId: newTicket.id,
      actorId: `user-${params.authorId}`,
      actorName: author ? author.name : 'Author',
      action: 'created',
      details: `Ticket ${newTicket.ticketNumber} created by author`
    });

    this.saveFile();

    // Persist to MongoDB
    if (isMongoConnected()) {
      Promise.all([
        TicketModel.create(newTicket),
        CounterModel.findByIdAndUpdate('ticketCounter', { seq: this.data.lastTicketCounter }, { upsert: true })
      ]).catch(err => {
        console.error('[Store] Error persisting ticket to MongoDB:', err);
      });
    }

    return newTicket;
  }

  public updateTicket(id: string, updates: Partial<Ticket>, actor?: { id: string; name: string }): Ticket | null {
    const ticket = this.findTicketById(id);
    if (!ticket) return null;

    if (updates.status && updates.status !== ticket.status) {
      this.addAuditEvent({
        ticketId: ticket.id,
        actorId: actor?.id || 'system',
        actorName: actor?.name || 'System',
        action: 'status_changed',
        details: `Status changed from ${ticket.status} to ${updates.status}`,
        previousValue: ticket.status,
        newValue: updates.status
      });
      ticket.status = updates.status;
    }

    if (updates.category && updates.category !== ticket.category) {
      this.addAuditEvent({
        ticketId: ticket.id,
        actorId: actor?.id || 'system',
        actorName: actor?.name || 'System',
        action: 'category_changed',
        details: `Category changed from ${ticket.category} to ${updates.category}`,
        previousValue: ticket.category,
        newValue: updates.category
      });
      ticket.category = updates.category;
      ticket.categorySource = 'admin';
    }

    if (updates.priority && updates.priority !== ticket.priority) {
      this.addAuditEvent({
        ticketId: ticket.id,
        actorId: actor?.id || 'system',
        actorName: actor?.name || 'System',
        action: 'priority_changed',
        details: `Priority changed from ${ticket.priority} to ${updates.priority}`,
        previousValue: ticket.priority,
        newValue: updates.priority
      });
      ticket.priority = updates.priority;
      ticket.prioritySource = 'admin';
    }

    if (updates.assigneeId !== undefined && updates.assigneeId !== ticket.assigneeId) {
      const assignee = updates.assigneeId ? this.findUserById(updates.assigneeId) : null;
      this.addAuditEvent({
        ticketId: ticket.id,
        actorId: actor?.id || 'system',
        actorName: actor?.name || 'System',
        action: 'assigned',
        details: updates.assigneeId ? `Assigned to ${assignee?.name || updates.assigneeId}` : 'Unassigned',
        previousValue: ticket.assigneeId || 'unassigned',
        newValue: updates.assigneeId || 'unassigned'
      });
      ticket.assigneeId = updates.assigneeId;
    }

    if (updates.aiCategoryRecommendation) ticket.aiCategoryRecommendation = updates.aiCategoryRecommendation;
    if (updates.aiPriorityRecommendation) ticket.aiPriorityRecommendation = updates.aiPriorityRecommendation;
    if (updates.aiState) ticket.aiState = updates.aiState;
    if (updates.aiModel) ticket.aiModel = updates.aiModel;
    if (updates.aiReason) ticket.aiReason = updates.aiReason;
    if (updates.lastPublicResponseAt) ticket.lastPublicResponseAt = updates.lastPublicResponseAt;

    ticket.updatedAt = new Date().toISOString();
    this.saveFile();

    // Persist updates to MongoDB
    if (isMongoConnected()) {
      TicketModel.updateOne({ id: ticket.id }, { $set: ticket }).catch(err => {
        console.error('[Store] Error updating ticket in MongoDB:', err);
      });
    }

    return ticket;
  }

  // Messages
  public getMessagesForTicket(ticketId: string, role: UserRole): TicketMessage[] {
    return this.data.messages
      .filter(m => m.ticketId === ticketId && (role === 'admin' || m.visibility === 'public'))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  public addMessage(params: {
    ticketId: string;
    senderId: string;
    senderRole: UserRole;
    senderName: string;
    visibility: 'public' | 'internal';
    body: string;
  }): TicketMessage {
    const newMessage: TicketMessage = {
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ticketId: params.ticketId,
      senderId: params.senderId,
      senderRole: params.senderRole,
      senderName: params.senderName,
      visibility: params.visibility,
      body: params.body.trim(),
      createdAt: new Date().toISOString()
    };

    this.data.messages.push(newMessage);

    const ticket = this.findTicketById(params.ticketId);
    if (ticket) {
      ticket.updatedAt = newMessage.createdAt;
      if (params.visibility === 'public') {
        ticket.lastPublicResponseAt = newMessage.createdAt;
      }
    }

    this.addAuditEvent({
      ticketId: params.ticketId,
      actorId: params.senderId,
      actorName: params.senderName,
      action: params.visibility === 'internal' ? 'internal_note_added' : 'response_sent',
      details: params.visibility === 'internal' ? 'Internal note added' : 'Public response sent to author'
    });

    this.saveFile();

    // Persist to MongoDB
    if (isMongoConnected()) {
      Promise.all([
        MessageModel.create(newMessage),
        ticket ? TicketModel.updateOne({ id: ticket.id }, { $set: ticket }) : Promise.resolve()
      ]).catch(err => {
        console.error('[Store] Error saving message to MongoDB:', err);
      });
    }

    return newMessage;
  }

  // Audit
  public getAuditEventsForTicket(ticketId: string): TicketAuditEvent[] {
    return this.data.auditEvents
      .filter(a => a.ticketId === ticketId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  public addAuditEvent(params: {
    ticketId: string;
    actorId: string;
    actorName: string;
    action: TicketAuditEvent['action'];
    details: string;
    previousValue?: string;
    newValue?: string;
  }): TicketAuditEvent {
    const event: TicketAuditEvent = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ticketId: params.ticketId,
      actorId: params.actorId,
      actorName: params.actorName,
      action: params.action,
      details: params.details,
      previousValue: params.previousValue,
      newValue: params.newValue,
      createdAt: new Date().toISOString()
    };

    this.data.auditEvents.push(event);

    // Persist to MongoDB
    if (isMongoConnected()) {
      AuditEventModel.create(event).catch(err => {
        console.error('[Store] Error saving audit event to MongoDB:', err);
      });
    }

    return event;
  }

  // Direct safe cleanup for tests
  public async deleteTestTicket(ticketId: string): Promise<boolean> {
    const initialLen = this.data.tickets.length;
    this.data.tickets = this.data.tickets.filter(t => t.id !== ticketId && t.ticketNumber !== ticketId);
    this.data.messages = this.data.messages.filter(m => m.ticketId !== ticketId);
    this.data.auditEvents = this.data.auditEvents.filter(a => a.ticketId !== ticketId);
    this.saveFile();

    if (isMongoConnected()) {
      await Promise.all([
        TicketModel.deleteOne({ id: ticketId }),
        MessageModel.deleteMany({ ticketId }),
        AuditEventModel.deleteMany({ ticketId })
      ]);
    }

    return this.data.tickets.length < initialLen;
  }

  public async deleteTestUser(email: string): Promise<boolean> {
    const normalized = email.toLowerCase().trim();
    const user = this.findUserByEmail(normalized);
    if (!user) return false;

    this.data.users = this.data.users.filter(u => u.email.toLowerCase().trim() !== normalized);
    if (user.authorId) {
      this.data.authors = this.data.authors.filter(a => a.id !== user.authorId);
    }
    this.saveFile();

    if (isMongoConnected()) {
      await Promise.all([
        UserModel.deleteOne({ email: normalized }),
        user.authorId ? AuthorModel.deleteOne({ id: user.authorId }) : Promise.resolve()
      ]);
    }

    return true;
  }
}

export const store = new Store();
