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

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  authorId?: string;
  author?: Author | null;
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
  author?: {
    id: string;
    name: string;
    email: string;
  } | null;
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
  action: string;
  details: string;
  previousValue?: string;
  newValue?: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  authorId: string;
  bookId: string | null;
  bookTitle?: string;
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
  assigneeName?: string | null;
  createdAt: string;
  updatedAt: string;
  lastPublicResponseAt: string | null;
  author?: Author | null;
  book?: Book | null;
  authorBooks?: Book[];
  assignee?: { id: string; name: string; email: string } | null;
  messages?: TicketMessage[];
  auditEvents?: TicketAuditEvent[];
}

export interface AuthorDashboardData {
  author: Author | null;
  metrics: {
    totalBooks: number;
    publishedBooks: number;
    inProductionBooks: number;
    totalCopiesSold: number;
    totalRoyaltyEarned: number;
    royaltyPaid: number;
    royaltyPending: number;
    openTickets: number;
    totalTickets: number;
  };
  recentBooks: Book[];
  recentTickets: Ticket[];
}

export interface AdminStatsData {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  criticalTickets: number;
  highTickets: number;
  unassignedTickets: number;
  totalAuthors: number;
  totalBooks: number;
}

export interface AIDraftResponse {
  draft: string;
  missingInformation: string[];
  escalationRecommended: boolean;
  model: string;
}
