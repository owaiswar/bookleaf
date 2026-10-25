export interface KnowledgeBaseSection {
  title: string;
  category: string;
  facts: string[];
}

export const BOOKLEAF_KNOWLEDGE_BASE: KnowledgeBaseSection[] = [
  {
    title: "Company & Operations",
    category: "General Inquiry",
    facts: [
      "BookLeaf operates in India and the US.",
      "Publishing packages include 'Standard Free' (no upfront cost) and 'Bestseller Breakthrough' (premium, paid, with marketing/distribution add-ons).",
      "Services include cover design, typesetting, ISBN assignment, printing, distribution, and royalty management.",
      "In-house printing and central warehouse facility is located in Delhi, India.",
      "Certified external print partners include Repro India and Epitome Books for overflow and specialized formats."
    ]
  },
  {
    title: "Royalties & Payments Policy",
    category: "Royalty & Payments",
    facts: [
      "Authors receive 80% of net profit per book sold; BookLeaf retains 20%.",
      "Net profit calculation: Net Profit = MRP - (Printing Cost + Platform Commission + Shipping Charges). Platform commission typically applies to Amazon & Flipkart sales.",
      "Royalties are calculated on a quarterly basis and paid within 45 days following the end of each calendar quarter.",
      "Quarter calendar: Q1 ends March 31 (paid by May 15), Q2 ends June 30 (paid by Aug 14), Q3 ends Sept 30 (paid by Nov 14), Q4 ends Dec 31 (paid by Feb 14).",
      "Minimum payout threshold is ₹1,000. Accumulated royalty balances below ₹1,000 automatically roll over to the subsequent quarter.",
      "Payouts are disbursed via direct electronic bank transfer (NEFT/IMPS) to the verified bank account linked in the Author Dashboard.",
      "Authors can inspect detailed platform-by-platform sales breakdowns (Amazon, Flipkart, BookLeaf Store) directly in their dashboard."
    ]
  },
  {
    title: "ISBN & Metadata Guidelines",
    category: "ISBN & Metadata Issues",
    facts: [
      "Each book published through BookLeaf is allocated a unique international 13-digit ISBN registered under BookLeaf's official publisher imprint.",
      "Authors wishing to retain an ISBN under their own personal or independent imprint must procure and provide it independently prior to the ISBN assignment stage.",
      "Any duplicate ISBN, wrong book-to-ISBN mapping, or mismatched listing on retailer sites is treated as HIGH priority and immediately escalated to the production engineering team.",
      "Metadata updates (e.g. author bio, book description) submitted after publication are synced with retail channels within 3–5 business days."
    ]
  },
  {
    title: "Printing & Quality Assurance",
    category: "Printing & Quality",
    facts: [
      "Standard print turnaround time is 5 to 7 business days from order confirmation.",
      "Most author copy and reader orders are printed in-house at our Delhi facility; specialized runs are routed to Repro India or Epitome Books.",
      "For verified physical printing defects (such as binding failures, page collation errors, miscuts, or significant color deviation), BookLeaf arranges a complimentary 100% free reprint.",
      "Authors are requested to provide clear photographs or video clips of the affected copy and defective pages for quality verification.",
      "Author copies are dispatched with tracking numbers provided via SMS and email."
    ]
  },
  {
    title: "Distribution & Retail Channels",
    category: "Distribution & Availability",
    facts: [
      "Global distribution channels include Amazon India, Flipkart, Amazon US, Amazon UK, and the direct BookLeaf Online Store.",
      "Newly published listings typically go live across partner marketplaces within 7 to 10 business days after publication completes.",
      "If a live book appears 'Temporarily Out of Stock' or 'Unavailable' on Amazon/Flipkart, it usually denotes a temporary marketplace catalog or stock inventory synchronization lag.",
      "The BookLeaf operations team can manually trigger a priority marketplace re-sync within 24 to 48 hours to restore availability."
    ]
  },
  {
    title: "Production Stages & Workflow Delays",
    category: "Book Status & Production Updates",
    facts: [
      "Sequential production workflow: Manuscript Received → Editing (if opted) → Cover Design → Typesetting → Proofreading → ISBN Assignment → Printing → Distribution Setup → Published & Live.",
      "Authors receive milestone notification updates via email and the portal at each stage transition.",
      "Most common production delays arise from: (1) pending author sign-off on Cover Design concepts, or (2) author revision iterations during Proofreading.",
      "Communication guidelines strictly mandate framing delays collaboratively and transparently without placing blame on the author."
    ]
  }
];

export const TONE_GUIDELINES = `
- Tone must be empathetic, calm, supportive, and professional.
- Always acknowledge the author's specific concern first before presenting facts.
- Incorporate trusted system facts (book status, royalty figures, dates) directly.
- Own BookLeaf's responsibility transparently when an issue occurred.
- For investigations or escalations, provide a concrete timeline (e.g., 'within 24–48 hours').
- Conclude with a clear, helpful next step.
- Never invent imaginary dates, payout promises, tracking numbers, or ISBNs not present in verified records.
`;
