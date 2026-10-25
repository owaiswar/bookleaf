# BookLeaf Author Support & Communication Portal

A full-stack, AI-powered customer support and ticketing management portal built for **BookLeaf Publishing**. It streamlines author queries across 6 standardized categories with AI classification, priority scoring, and knowledge base-grounded draft responses, while keeping operations staff firmly in control of customer communications.

---

## 🌟 Key Features


### 👤 Author Portal
- **Dashboard:** At-a-glance metrics for total books, live titles, in-production titles, and quarterly royalty status (paid vs pending).
- **My Books:** Authoritative view of author's titles with MRP, copies sold, royalty earnings, production stages, and distribution channels.
- **Edge-Case Handling:**
  - Books in production cleanly display `Not published` / `—` rather than `NaN` or `Invalid Date`.
  - Distinguishes real `₹0` values from unassigned/null values.
  - Indian currency (`₹`) and number formatting (`en-IN`).
  - Authors with 0 registered books (e.g., Meera Joshi) can seamlessly submit General/Account queries.
- **Submit Support Query:** Choose between owned titles or `General / Account Level` inquiry.
- **My Tickets:** Follow ticket lifecycle (`Open`, `In Progress`, `Resolved`, `Closed`), inspect public staff replies, and receive real-time updates via SSE.
- **Strict Data Isolation:** Authors can only access their own books and tickets. Internal operations notes are never exposed or transmitted to authors.

### 🛡️ Admin Operations Portal
- **Triage Queue:** Filter across all author tickets by status, category, priority, assignee, date range, or text search query. Oldest unresolved and Critical/High severity tickets are prominently highlighted.
- **Assignment:** Operations staff can assign tickets to themselves or unassign with idempotent controls.
- **AI Triage & Classification:**
  - Standardized into the 6 BookLeaf categories: `Royalty & Payments`, `ISBN & Metadata Issues`, `Printing & Quality`, `Distribution & Availability`, `Book Status & Production Updates`, and `General Inquiry`.
  - Urgency priority scoring: `Critical`, `High`, `Medium`, `Low`.
  - Human Override: Admins can manually override category and priority without erasing original AI recommendations.
- **AI Response Drafting:**
  - Grounded in authoritative BookLeaf policies (80% net profit formula, quarterly payout within 45 days, ₹1,000 threshold, 5–7 days print turnaround, 24–48h marketplace re-sync).
  - Draft editor allows operations staff to inspect, edit, and manually send public responses with double-click prevention.
  - Zero auto-sending: AI provides suggestions; human staff makes the final decision.
- **Internal Notes:** Private, staff-only notes styled with gold/amber banners, strictly isolated from author endpoints.
- **Audit Trail:** Chronological record of status changes, category/priority overrides, assignments, and dispatched responses.
- **Data & Seeding:** Direct UI controls to inspect and re-seed the canonical 10-author, 18-book dataset.

---

## 📂 Project Architecture & Monorepo Structure

The project separates frontend (`/client`) and backend (`/server`) while remaining runnable with a single command from the root directory:

```text
/
├── client/                      # Frontend Application (React 19 + Vite + Tailwind CSS)
│   ├── index.html               # Frontend HTML entry point
│   └── src/
│       ├── api/                 # API client wrapper with credentials
│       ├── components/          # Reusable badges, Navbar, Sidebar, Modals
│       ├── context/             # AuthContext with 1-click demo switcher
│       ├── pages/
│       │   ├── Login.tsx        # Authentication & quick demo user selector
│       │   ├── author/          # Author Dashboard, Books, Tickets, Submission
│       │   └── admin/           # Admin Dashboard, Queue, Detail, Data Management
│       ├── types/               # TypeScript interfaces
│       ├── App.tsx              # Role-guarded routing
│       └── main.tsx             # React DOM root
├── server/                      # Backend API (Express + TypeScript + SSE)
│   ├── config.ts                # Environment configuration
│   ├── db/
│   │   └── store.ts             # Atomic persistent file-backed JSON store & seeder
│   ├── middleware/
│   │   └── auth.ts              # JWT verification & role authorization
│   ├── routes/
│   │   ├── auth.ts              # Login, logout, me, demo-users
│   │   ├── books.ts             # Books list, detail, author dashboard metrics
│   │   ├── tickets.ts           # Author ticket operations & SSE events
│   │   ├── admin.ts             # Admin triage queue, overrides, notes, drafting
│   │   └── health.ts            # Liveness, readiness, API docs
│   ├── services/
│   │   ├── ai.ts                # Gemini API integration + grounded fallback engine
│   │   ├── knowledgeBase.ts     # Authoritative BookLeaf policies & timelines
│   │   └── sse.ts               # Server-Sent Events broker with role isolation
│   └── server.ts                # Express server mounting APIs and Vite middleware
├── data/
│   ├── bookleaf_sample_data.json # Canonical 10 Authors, 18 Books dataset
│   └── bookleaf_store.json      # Persistent runtime database
├── server.ts                    # Root delegate entry point
├── package.json                 # Single-command scripts
└── tsconfig.json                # Strict TypeScript configuration
```

---

## 🚀 Running the Application with a Single Command

From the root directory:

```bash
# 1. Install dependencies
npm install

# 2. Run both Backend API and Frontend Dev Server
npm run dev
```

The Express server will start on port `3000`, mount all `/api/v1` routes and Server-Sent Events streams, and serve the Vite frontend via middleware mode.

---

## 🔐 Real Authentication & Role-Based Access Control

The application implements a secure, database-backed authentication system:

### 1. User / Author Registration (`/register`)
- Public registration endpoint (`POST /api/v1/auth/register`).
- Validates full name, email format, password complexity (min 8 chars, letter + number), and password confirmation.
- Normalizes email addresses consistently (lowercase + trim) and enforces database-level uniqueness.
- Passwords hashed with `bcrypt` (work factor 10).
- Automatically initializes an associated author record so new authors can immediately manage books and tickets.
- Role is strictly server-assigned as `author` (clients cannot elevate privileges to `admin`).

### 2. User & Author Login (`/login`)
- Authenticates users against stored database credentials.
- Issues a signed JWT stored inside a secure, `HttpOnly`, `SameSite: 'lax'` cookie (`Secure` in production).
- Returns generic `401 INVALID_CREDENTIALS` on bad credentials to prevent email enumeration.
- In-memory rate limiting locks repeated failed login/register attempts for 15 minutes.

### 3. Dedicated Administrator Portal (`/admin/login`)
- Separate from public author registration.
- Accessible only to accounts with server-assigned `role: 'admin'`.
- Normal authors attempting to log in via `/admin/login` receive `403 ADMIN_ACCESS_REQUIRED`.
- All admin frontend routes and `/api/v1/admin/*` APIs require verified admin privileges.

### 4. Administrator Provisioning CLI Command
Administrators cannot register publicly. Provision administrators securely via the CLI tool:

```bash
# Using CLI arguments:
npm run create-admin -- --email admin@bookleaf.com --password YourStrongPassword123 --name "Operations Admin"

# Or configure ADMIN_EMAIL and ADMIN_PASSWORD in your .env and run:
npm run create-admin
```

- Validates email and password policy.
- Hashes password with `bcrypt` (work factor 12).
- Refuses to overwrite or silently reset an existing administrator.
- Safe to run repeatedly (idempotent).
- Passwords are never logged.

### 5. Running Automated Tests
Run the automated test suite covering registration, login, JWT validation, admin provisioning, and role isolation:

```bash
npm test
```

---

## 🤖 AI Grounding & Knowledge Base Integration

The AI engine uses **Gemini 2.5 Flash** with low temperature (`0.1`–`0.2`) and strict JSON schemas, grounded in BookLeaf facts:
1. **Royalties:** Author receives 80% net profit (MRP minus print cost, marketplace commission, shipping). Calculated quarterly, paid within 45 days of quarter-end. Minimum ₹1,000 payout threshold; lesser amounts roll over.
2. **ISBN:** Registered under BookLeaf imprint. Duplicate/mismatched ISBNs on retailer channels are classified as `High` priority and escalated to production engineering.
3. **Printing:** Standard 5–7 business days turnaround. 100% free reprint arranged for verified misprints or binding defects (photos required).
4. **Distribution:** Amazon India, Flipkart, Amazon US, Amazon UK, BookLeaf Store. Unavailable status triggers an inventory re-sync within 24–48 hours.
5. **Fallback Safety:** If the Gemini API key is absent or external network calls fail, the system falls back to a deterministic rule-based classifier and grounded response builder. Support tickets are never blocked by upstream AI failures.

---

## 📡 Real-Time Updates (Server-Sent Events)

- Endpoint: `GET /api/v1/tickets/:ticketId/events` and `GET /api/v1/admin/events`.
- Events emitted: `ticket.response.created`, `ticket.status.changed`, `ticket.category.changed`, and `ticket.internal_note.created`.
- **Privacy Gating:** Events tagged as `isInternalOnly = true` are delivered exclusively to authenticated staff connections. Authors never receive internal notes over SSE.
- **Polling Fallback:** Frontend maintains an automatic polling interval to handle sleeping tabs or network switches.

---

## 📋 REST API Endpoints Summary

- `POST /api/v1/auth/login` — Email/password login with JWT in httpOnly cookie
- `POST /api/v1/auth/logout` — Clear session cookie
- `GET /api/v1/auth/me` — Current authenticated user profile
- `GET /api/v1/books` — Author books list (scoped to authenticated author)
- `GET /api/v1/books/:bookId` — Book detail with ownership verification
- `GET /api/v1/authors/me/dashboard` — Author summary metrics
- `POST /api/v1/tickets` — Create author support ticket
- `GET /api/v1/tickets` — List author's tickets
- `GET /api/v1/tickets/:ticketId` — Author ticket detail (public messages only)
- `GET /api/v1/admin/tickets` — Admin queue with filters, sorting, search, pagination
- `GET /api/v1/admin/tickets/:ticketId` — Admin ticket detail with internal notes & audit trail
- `PATCH /api/v1/admin/tickets/:ticketId/status` — Update status
- `PATCH /api/v1/admin/tickets/:ticketId/category` — Override category
- `PATCH /api/v1/admin/tickets/:ticketId/priority` — Override priority
- `PATCH /api/v1/admin/tickets/:ticketId/assignment` — Assign/unassign staff
- `POST /api/v1/admin/tickets/:ticketId/notes` — Add internal note (admin-only)
- `POST /api/v1/admin/tickets/:ticketId/responses` — Send public response to author
- `POST /api/v1/admin/tickets/:ticketId/ai/classify` — Re-run AI classification
- `POST /api/v1/admin/tickets/:ticketId/ai/draft` — Generate grounded AI draft
- `GET /health` & `GET /ready` — Liveness & readiness probes
