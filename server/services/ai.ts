import { GoogleGenAI } from '@google/genai';
import { BOOKLEAF_KNOWLEDGE_BASE, TONE_GUIDELINES } from './knowledgeBase.js';
import { TicketCategory, TicketPriority, Book, Author } from '../db/store.js';
import { config } from '../config.js';

export interface AIClassificationResult {
  category: TicketCategory;
  priority: TicketPriority;
  reason: string;
  needsHumanReview: boolean;
  model: string;
}

export interface AIDraftResult {
  draft: string;
  missingInformation: string[];
  escalationRecommended: boolean;
  model: string;
}

const VALID_CATEGORIES: TicketCategory[] = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry'
];

const VALID_PRIORITIES: TicketPriority[] = ['critical', 'high', 'medium', 'low'];

export class AIService {
  private ai: GoogleGenAI | null = null;
  private modelName = 'gemini-2.5-flash';

  constructor() {
    if (config.geminiApiKey) {
      try {
        this.ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
      } catch (err) {
        console.warn('[AIService] Failed to initialize GoogleGenAI with key, using fallback heuristics:', err);
      }
    } else {
      console.info('[AIService] No GEMINI_API_KEY detected, using intelligent grounded fallback engine.');
    }
  }

  /**
   * Deterministic heuristics for classification & priority
   */
  public classifyWithHeuristics(subject: string, description: string): AIClassificationResult {
    const text = `${subject} ${description}`.toLowerCase();

    let category: TicketCategory = 'General Inquiry';
    let priority: TicketPriority = 'low';
    let reason = 'General author query or procedural question.';

    // Check ISBN & Metadata
    if (text.includes('isbn') || text.includes('barcode') || text.includes('imprint') || text.includes('metadata') || text.includes('wrong book')) {
      category = 'ISBN & Metadata Issues';
      if (text.includes('mismatch') || text.includes('duplicate') || text.includes('different') || text.includes('wrong') || text.includes('amazon')) {
        priority = 'high';
        reason = 'ISBN mismatch or duplicate listing detected. Under BookLeaf policy, wrong ISBN mappings are High priority and escalated to production.';
      } else {
        priority = 'medium';
        reason = 'ISBN or catalog metadata question.';
      }
    }
    // Check Royalty & Payments
    else if (text.includes('royalt') || text.includes('payout') || text.includes('payment') || text.includes('bank') || text.includes('threshold') || text.includes('neft') || text.includes('inr') || text.includes('₹')) {
      category = 'Royalty & Payments';
      if (text.includes('not received') || text.includes('delayed') || text.includes('missing') || text.includes('months') || text.includes('overdue')) {
        priority = 'high';
        reason = 'Report of delayed or unreceived royalty earnings.';
      } else {
        priority = 'medium';
        reason = 'Royalty status or payout schedule inquiry.';
      }
    }
    // Check Printing & Quality
    else if (text.includes('print') || text.includes('misprint') || text.includes('binding') || text.includes('streak') || text.includes('defect') || text.includes('paper') || text.includes('pages') || text.includes('cover blur')) {
      category = 'Printing & Quality';
      if (text.includes('defect') || text.includes('ruined') || text.includes('faded') || text.includes('blank') || text.includes('broken')) {
        priority = 'medium';
        reason = 'Physical print quality issue reported. Eligible for 100% free reprint with photographic proof.';
      } else {
        priority = 'low';
        reason = 'Standard print turnaround time or author copy inquiry.';
      }
    }
    // Check Distribution & Availability
    else if (text.includes('amazon') || text.includes('flipkart') || text.includes('out of stock') || text.includes('unavailable') || text.includes('listing') || text.includes('buy link')) {
      category = 'Distribution & Availability';
      priority = 'medium';
      reason = 'Retail platform availability issue. May require an inventory catalog re-sync within 24-48 hours.';
    }
    // Check Book Status & Production
    else if (text.includes('manuscript') || text.includes('proofreading') || text.includes('typesetting') || text.includes('cover design') || text.includes('stage') || text.includes('when will it publish')) {
      category = 'Book Status & Production Updates';
      priority = 'low';
      reason = 'Production stage workflow inquiry.';
    }

    // Safety / Emergency check for Critical
    if (text.includes('legal') || text.includes('lawyer') || text.includes('sue') || text.includes('police') || text.includes('fraud') || text.includes('hacked') || text.includes('breach')) {
      priority = 'critical';
      reason = 'Potential legal or security risk requiring immediate management attention.';
    }

    return {
      category,
      priority,
      reason,
      needsHumanReview: true,
      model: 'heuristic-rules-v1'
    };
  }

  /**
   * Classify ticket category and recommend priority using Gemini or fallback
   */
  public async classifyTicket(subject: string, description: string): Promise<AIClassificationResult> {
    const fallback = this.classifyWithHeuristics(subject, description);

    if (!this.ai) {
      return fallback;
    }

    const prompt = `
You are an expert AI triage assistant for BookLeaf Publishing author support operations.
Analyze this author query and classify it strictly according to BookLeaf policy.

Categories (choose EXACTLY one):
1. "Royalty & Payments" (e.g. payout dates, quarterly cycles, 80% net profit formula, ₹1000 threshold, bank details)
2. "ISBN & Metadata Issues" (e.g. ISBN mismatch, duplicate barcode, book description update, imprint questions)
3. "Printing & Quality" (e.g. misprints, binding issues, color streaks, author copy quality, reprint requests)
4. "Distribution & Availability" (e.g. Amazon/Flipkart out-of-stock, marketplace sync, listings not live)
5. "Book Status & Production Updates" (e.g. stages from Manuscript Received to Cover Design, Typesetting, Proofreading, Published)
6. "General Inquiry" (e.g. package questions, general account management, writing queries)

Priorities (choose EXACTLY one):
- "critical": emergency, legal threat, severe system vulnerability
- "high": duplicate/wrong ISBN or mapping on Amazon/Flipkart (mandatory high under BookLeaf policy); royalty missing beyond 45-day post-quarter window; severe verified batch defects
- "medium": material production delay, Amazon/Flipkart stock-sync issue, royalty query needing check
- "low": general how-to questions, bio updates, standard turnaround queries

TICKET SUBJECT: "${subject}"
TICKET DESCRIPTION: "${description}"

Respond in STRICT JSON format with no markdown wrappers:
{
  "category": "string",
  "priority": "critical" | "high" | "medium" | "low",
  "reason": "short explanation of rationale",
  "needsHumanReview": true
}
`;

    try {
      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      });

      const text = response.text?.trim() || '';
      const parsed = JSON.parse(text);

      const category = VALID_CATEGORIES.includes(parsed.category) ? parsed.category : fallback.category;
      const priority = VALID_PRIORITIES.includes(parsed.priority?.toLowerCase())
        ? (parsed.priority.toLowerCase() as TicketPriority)
        : fallback.priority;

      return {
        category,
        priority,
        reason: parsed.reason || fallback.reason,
        needsHumanReview: true,
        model: this.modelName
      };
    } catch (err) {
      console.warn('[AIService] Gemini classification error, fallback to heuristics:', err);
      return fallback;
    }
  }

  /**
   * Draft a response strictly grounded in BookLeaf Knowledge Base and author's data
   */
  public async draftResponse(params: {
    author: Author;
    book: Book | null;
    subject: string;
    description: string;
    category: TicketCategory;
    priority: TicketPriority;
    ticketNumber: string;
    existingMessages?: Array<{ senderRole: string; body: string; createdAt: string }>;
  }): Promise<AIDraftResult> {
    const { author, book, subject, description, category, ticketNumber, existingMessages = [] } = params;

    // Filter relevant knowledge base sections
    const relevantKb = BOOKLEAF_KNOWLEDGE_BASE.filter(
      sec => sec.category === category || sec.category === 'General Inquiry'
    );
    const kbText = relevantKb.map(s => `${s.title}:\n- ${s.facts.join('\n- ')}`).join('\n\n');

    const bookContext = book
      ? `Book Title: "${book.title}"
ISBN: ${book.isbn || 'Not yet assigned (in production)'}
Status: ${book.status}
Genre: ${book.genre}
Publication Date: ${book.publicationDate || 'Not published yet'}
MRP: ${book.mrp !== null ? `₹${book.mrp}` : 'Not set'}
Total Copies Sold: ${book.totalCopiesSold !== null ? book.totalCopiesSold : 'N/A'}
Royalty Earned: ${book.totalRoyaltyEarned !== null ? `₹${book.totalRoyaltyEarned}` : 'N/A'}
Royalty Paid: ${book.royaltyPaid !== null ? `₹${book.royaltyPaid}` : 'N/A'}
Royalty Pending: ${book.royaltyPending !== null ? `₹${book.royaltyPending}` : 'N/A'}
Distribution Channels: ${book.distributionChannels.length > 0 ? book.distributionChannels.join(', ') : 'None yet'}`
      : 'No specific book attached (General / Account-level query).';

    const prompt = `
You are the AI drafting assistant for BookLeaf Publishing operations team.
Your task is to draft an empathetic, professional customer support reply to the author.

CRITICAL INSTRUCTIONS:
- You are drafting a message that an ADMIN will review, edit, and manually send. DO NOT pretend the action has already been performed.
- Strictly adhere to BookLeaf Publishing policies outlined below.
- Do NOT fabricate or promise dates, royalty numbers, tracking codes, or ISBNs not present in the trusted data.
- If required data is missing, note it in missingInformation and state that the team will verify it.
- Escalation timelines: investigations or catalog re-syncs take "within 24–48 hours".
- Print turnaround is 5–7 business days.
- Royalty threshold is ₹1,000, paid quarterly within 45 days after quarter-end (80% net profit).
- For misprints, BookLeaf arranges a 100% free reprint; ask author for clear photos if not already provided.

BOOKLEAF KNOWLEDGE BASE:
${kbText}

TONE GUIDELINES:
${TONE_GUIDELINES}

AUTHOR DETAILS:
Name: ${author.name}
Email: ${author.email}
City/State: ${author.city}, ${author.state}
Publishing Package: ${author.publishingPackage}

BOOK DETAILS:
${bookContext}

TICKET DETAILS:
Ticket Reference: ${ticketNumber}
Category: ${category}
Subject: ${subject}
Author's Message:
"""${description}"""

PREVIOUS REPLIES (if any):
${existingMessages.map(m => `[${m.senderRole}]: ${m.body}`).join('\n\n')}

Respond in STRICT JSON format:
{
  "draft": "Dear ${author.name},\\n\\n...",
  "missingInformation": ["item 1", "item 2"],
  "escalationRecommended": boolean
}
`;

    if (this.ai) {
      try {
        const response = await this.ai.models.generateContent({
          model: this.modelName,
          contents: prompt,
          config: {
            temperature: 0.2,
            responseMimeType: 'application/json'
          }
        });

        const text = response.text?.trim() || '';
        const parsed = JSON.parse(text);
        if (parsed.draft) {
          return {
            draft: parsed.draft,
            missingInformation: Array.isArray(parsed.missingInformation) ? parsed.missingInformation : [],
            escalationRecommended: Boolean(parsed.escalationRecommended),
            model: this.modelName
          };
        }
      } catch (err) {
        console.warn('[AIService] Gemini draft generation failed, using grounded template:', err);
      }
    }

    // Grounded fallback template
    return this.buildGroundedFallbackDraft(author, book, category, subject, description);
  }

  private buildGroundedFallbackDraft(
    author: Author,
    book: Book | null,
    category: TicketCategory,
    subject: string,
    description: string
  ): AIDraftResult {
    const firstName = author.name.split(' ')[0];

    if (category === 'Royalty & Payments') {
      const pending = book?.royaltyPending ?? 0;
      const exceedsThreshold = pending >= 1000;
      return {
        draft: `Dear ${firstName},

Thank you for reaching out regarding your royalties for ${book ? `"${book.title}"` : 'your account'}.

Under BookLeaf Publishing policy, author royalties represent 80% of net profit (MRP minus printing cost, marketplace commission, and shipping charges). Payouts are computed quarterly and disbursed within 45 days of each quarter-end to your linked bank account.

${
  book && pending > 0
    ? `According to our records, your current pending royalty balance is ₹${pending.toLocaleString('en-IN')}${
        exceedsThreshold
          ? ', which satisfies our minimum payout threshold of ₹1,000.'
          : ', which is below our ₹1,000 threshold and will automatically roll over to the next quarterly disbursement cycle.'
      }`
    : 'Our accounts team is reviewing your platform sales log to ensure all retail channel sales have been reconciled.'
}

Our finance desk is reviewing your payout schedule and will share a confirmation within 48 hours. Please ensure your bank account details and IFSC code are up to date in your dashboard.

Warm regards,
BookLeaf Author Support Team`,
        missingInformation: book ? [] : ['Exact quarter period', 'Bank account verification'],
        escalationRecommended: false,
        model: 'grounded-template-engine'
      };
    }

    if (category === 'ISBN & Metadata Issues') {
      return {
        draft: `Dear ${firstName},

Thank you for bringing this ISBN and catalog detail to our attention regarding ${book ? `"${book.title}"` : 'your publication'}.

We treat any ISBN discrepancy or retailer mapping mismatch as a top priority. Every BookLeaf title is assigned an official ISBN registered under the BookLeaf imprint.

Our production engineering desk has been notified to inspect the retail listing on partner marketplaces. We will trigger an expedited catalog verification and expect this to be resolved within 24 to 48 hours.

We will update you as soon as the listing correctly mirrors your book's official details.

Warm regards,
BookLeaf Production & Operations Team`,
        missingInformation: ['Marketplace link or screenshot showing mismatched ISBN'],
        escalationRecommended: true,
        model: 'grounded-template-engine'
      };
    }

    if (category === 'Printing & Quality') {
      return {
        draft: `Dear ${firstName},

We sincerely apologize for the quality issue you experienced with your copies of ${book ? `"${book.title}"` : 'your book'}. Quality is a cornerstone of our commitment to authors.

For verified physical printing flaws, binding defects, or page collation issues, BookLeaf provides a 100% free reprint. 

To help our quality assurance desk at our Delhi facility expedite your reprint approval, please reply with or attach clear photographs of the defective pages or binding. Once verified, replacement copies will be dispatched within our standard 5–7 business days print turnaround.

Thank you for your patience while we make this right.

Warm regards,
BookLeaf Quality Assurance Desk`,
        missingInformation: ['Photographs of defective copies / pages'],
        escalationRecommended: false,
        model: 'grounded-template-engine'
      };
    }

    if (category === 'Distribution & Availability') {
      return {
        draft: `Dear ${firstName},

Thank you for informing us about the listing availability for ${book ? `"${book.title}"` : 'your book'}.

When a live title shows as temporarily unavailable or out of stock on partner platforms like Amazon or Flipkart, it typically indicates a catalog stock synchronization delay between our central Delhi warehouse and the retailer's automated inventory feeds.

Our distribution operations team has queued an immediate catalog re-sync for your title, which will refresh inventory status across all partner channels within 24 to 48 hours.

Thank you for your vigilance and partnership!

Warm regards,
BookLeaf Distribution Team`,
        missingInformation: [],
        escalationRecommended: false,
        model: 'grounded-template-engine'
      };
    }

    if (category === 'Book Status & Production Updates') {
      return {
        draft: `Dear ${firstName},

Thank you for checking in on the progress of ${book ? `"${book.title}"` : 'your manuscript'}.

Our production workflow progresses systematically: Manuscript Received → Editing (if opted) → Cover Design → Typesetting → Proofreading → ISBN Assignment → Printing → Distribution Setup → Published & Live.

${
  book
    ? `Your book is currently in the "${book.status}" stage.`
    : 'Our editorial desk is processing your files.'
} Our creative team is actively working on your milestone. You will receive an automated notification as soon as the next draft or stage proof is ready for your review.

Please let us know if you have specific preferences or notes you would like included.

Warm regards,
BookLeaf Editorial & Production Team`,
        missingInformation: [],
        escalationRecommended: false,
        model: 'grounded-template-engine'
      };
    }

    // Default General Inquiry
    return {
      draft: `Dear ${firstName},

Thank you for contacting BookLeaf Author Support.

We have received your query regarding "${subject}". Our operations team is reviewing your account details and will provide a comprehensive update within 24 to 48 hours.

If you have any further questions or relevant context in the meantime, please feel free to add them to this ticket thread.

Warm regards,
BookLeaf Author Support Team`,
      missingInformation: [],
      escalationRecommended: false,
      model: 'grounded-template-engine'
    };
  }
}

export const aiService = new AIService();
