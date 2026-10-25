# BookLeaf Author Support & Communication Portal
## Architecture & Engineering Approach Document

### 1. Executive Summary & Product Prioritization
The primary goal was to construct a robust, production-minded author support portal with strict role isolation between **Authors** and **Operations Staff (Admins)**. The core philosophy prioritized:
1. **Security & Boundary Isolation:** Ensuring an author can strictly access only their own books and tickets, and that admin internal notes are never leaked across network boundaries (API responses, SSE broadcasts, or client bundles).
2. **Deterministic & Grounded AI Triage:** AI recommendations for the 6 required categories and 4 priorities are strictly validated against enums, reinforced with safety heuristics for critical/high issues (e.g. ISBN mismatches and delayed royalties), and drafts are grounded in authoritative BookLeaf policies.
3. **Operational Control:** AI drafts are never sent automatically. Admins retain full agency to review, edit, and manually dispatch responses, or override category/priority without losing AI traceability.
4. **Data Fidelity & Edge Case Discipline:** Faithful preservation of 10 authors and 18 books, accurately differentiating real numeric zeros (`₹0`) from unassigned production fields (`—` / `Not published`), handling authors with zero books, and enforcing the ₹1,000 royalty rollover rule.

---

### 2. Monorepo Architecture & Single-Command Execution
To meet the requirement of keeping the frontend in `/client` and backend in `/server` runnable with a single command from root:
- **Express + Vite Middleware Integration:** In development, Express runs on port 3000, mounts all `/api/v1` routes and Server-Sent Events endpoints, and directly mounts the Vite dev server middleware configured with `root: client`. A single command (`npm run dev`) starts both seamlessly.
- **Persistent Data Store (`server/db/store.ts`):** An atomic, file-backed JSON store provides persistent storage at `/data/bookleaf_store.json`, automatically initialized from `/data/bookleaf_sample_data.json` if unseeded, with an idempotent re-seed endpoint.
- **Real-Time Event Architecture (`server/services/sse.ts`):** Native Server-Sent Events (SSE) provide live updates for ticket status changes and public replies. Role-based event gating ensures internal note events are never delivered to author streams. Client tabs maintain an automatic polling fallback (8-second cycle) for network resilience.

---

### 3. AI Safety, Grounding, and Reliability
- **Model Choice & Grounding:** Gemini 2.5 Flash via `@google/genai` is utilized with low temperature (0.1–0.2) and structured JSON schema output for classification and response drafting.
- **Knowledge Base Injection:** Only relevant knowledge base excerpts (Royalties, ISBN, Print Quality, Distribution, Production stages) are injected based on the detected category, minimizing token costs.
- **Intelligent Fallback Engine:** If the LLM provider experiences timeouts, network errors, or if an API key is absent, the system seamlessly activates a deterministic heuristic classifier and grounded template engine. Ticket creation and support response workflows never fail due to AI outages.
- **Strict Human Oversight:** Generated drafts are displayed in an interactive editor. Admins can adjust the tone, insert specific verified details, and explicitly click "Send Response to Author" with double-click submission prevention.

---

### 4. Roadmap for Large-Scale Production
1. **Database:** Migrate from atomic file storage to MongoDB Atlas or Cloud SQL PostgreSQL with connection pooling.
2. **Distributed Events:** Replace in-memory SSE broker with Redis Pub/Sub for multi-instance horizontal scaling.
3. **Queueing:** Introduce BullMQ / RabbitMQ for asynchronous background AI classification and outbound notification delivery.
4. **Audit Compliance:** Implement append-only immutable audit logging with cryptographic hash chaining.
