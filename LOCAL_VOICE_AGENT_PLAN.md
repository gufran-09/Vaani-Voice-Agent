# VAANI — Five-Hour Local Voice Agent Prototype Implementation Plan

**Target System:** VAANI Local-First Voice AI Hospitality Operations Platform  
**Target Architecture:** Next.js 13 App Router (`/app/api/...`) + RDS PostgreSQL (`lib/server-db.ts`) + Ollama (Qwen) + Whisper Small (STT) + Local / Web Speech TTS  
**Time Budget:** Strict 5-Hour Hackathon Delivery (300 Minutes)  
**Team Structure:** 3 Parallel Engineers (Member 2 is Solely Responsible for Ollama Local Models)  
**Guiding Principle:** Working, demonstrable vertical slice over adding new feature surface area. Never claim unverified prerequisites. Zero silent cloud dependencies in local mode.

---

## 1. Executive Summary & Strategy

The objective is to deliver a functional, resilient, local-first voice agent prototype for VAANI within a 5-hour window. The prototype enables a restaurant guest or cafe customer to speak into their browser microphone, have their speech converted to text via local Whisper Small, processed by a local Qwen LLM via Ollama using scoped hospitality Markdown context and validated PostgreSQL menu tools, confirmed explicitly by the guest, and committed transactionally to the database with synchronized speech output.

### 5-Hour Strict Time Allocation

| Phase | Milestone | Duration | Cumulative | Critical Deliverable |
|---|---|---|---|---|
| **Phase 1** | Audit & Stabilize | 45 min | 00:45 | DB connectivity check, Ollama reachability, baseline test validation |
| **Phase 2** | Local LLM Provider | 45 min | 01:30 | `OllamaProvider` (Qwen), Bedrock decoupling, structured tool schema |
| **Phase 3** | Markdown Knowledge | 45 min | 02:15 | 7 curated Markdown knowledge documents + selective context loader |
| **Phase 4** | Speech-to-Text | 45 min | 03:00 | Local Whisper Small service, audio capture & validation, UI transcript |
| **Phase 5** | Safe Backend Tools | 45 min | 03:45 | Parameterized menu/order tools, confirmation guard, DB transactions |
| **Phase 6** | Text-to-Speech | 30 min | 04:15 | Common TTS interface, working local synthesis with browser speech fallback |
| **Phase 7** | End-to-End Demo Flow | 30 min | 04:45 | Complete 12-step guest interaction rehearsed and verified twice |
| **Phase 8** | Rehearsal & Demo Script | 15 min | 05:00 | Presentation checklist, startup runbook, fallback documentation |

---

## 2. Team Ownership & 3-Member Division Matrix

To maximize velocity without merge conflicts, the 5-hour workload is divided across **three distinct, non-overlapping roles**. **Member 2 is solely dedicated to Ollama local models and prompt/agent orchestration**.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                     VAANI TEAM                                         │
├──────────────────────────┬───────────────────────────────┬─────────────────────────────┤
│   MEMBER 1 (VOICE & UI)  │   MEMBER 2 (LOCAL LLM LEAD)   │    MEMBER 3 (BACKEND & DB)  │
│  Voice I/O & Frontend    │   SOLELY RESPONSIBLE FOR      │    Safe Tools, Persistence  │
│      Console Lead        │     OLLAMA LOCAL MODELS       │     & Database Transactions │
├──────────────────────────┼───────────────────────────────┼─────────────────────────────┤
│ • Whisper Small STT      │ • Ollama daemon & Qwen models │ • RDS PostgreSQL audits     │
│   service & /api route   │   (qwen2.5:7b, 3b, 1.5b)      │ • Parameterized tools       │
│ • Browser MediaRecorder  │ • Ollama API client adapter   │   (search_menu, check_stock)│
│   audio capture & pulse  │   (`lib/agent/ollama.ts`)     │ • Order calculation & ETA   │
│ • Real-time transcript   │ • Bedrock complete decoupling │ • Atomic DB transactions    │
│   display in UI          │ • Qwen tool-calling schema    │   (`orders`, `order_items`) │
│ • TTS synthesis client   │ • 7 Markdown knowledge files  │ • Strict guest confirmation │
│   & Web Speech fallback  │ • Dynamic context loader      │   guard & idempotency       │
│ • Order card & status    │ • Bilingual Indian cafe tone  │ • DB test scripts           │
│   display on dashboard   │   & 35-word brevity rule      │   (`test-db-tools.ts`)      │
└──────────────────────────┴───────────────────────────────┴─────────────────────────────┘
```

### Detailed Ownership Breakdown

#### Member 1 — Voice I/O & Frontend Console Lead
- **Primary Domain:** Audio pipeline (STT/TTS) and browser interaction console.
- **Key Deliverables:**
  1. `scripts/whisper_service.py`: Lightweight local Whisper Small runner on CPU (`faster-whisper` or PyTorch).
  2. `app/api/agent/transcribe/route.ts`: Audio ingestion endpoint validating MIME type and file size.
  3. `app/app/ai-receptionist/page.tsx`: Upgrade visual mock to active `MediaRecorder` audio capture, real-time pulse animation, and transcription display.
  4. `lib/agent/tts.ts` & `app/api/agent/synthesize/route.ts`: Audio output pipeline with automatic fallback to browser `window.speechSynthesis`.
  5. UI Status Badges: Transparently badge `[STT: Local Whisper]` and `[TTS: Local Piper / Web Speech Fallback]`.
  6. Order presentation: Render live order ticket (`order_number`, items, total, ETA) upon confirmation.

#### Member 2 — Local LLM Lead (SOLELY RESPONSIBLE FOR OLLAMA LOCAL MODELS)
- **Primary Domain:** Local Ollama runtime, Qwen models, Bedrock decoupling, prompt engineering, and Markdown knowledge base.
- **Key Deliverables:**
  1. Ollama Runtime Management: Deploy and verify local daemon on `http://localhost:11434`; benchmark `qwen2.5:7b`, `qwen2.5:3b`, and `qwen2.5:1.5b` for sub-1.5s first-token response.
  2. `lib/agent/ollama.ts`: Core Ollama `/api/chat` client supporting Qwen 2.5 function/tool calling JSON schemas, 8-second bounded timeouts, and error handling.
  3. `lib/agent/llm-provider.ts`: Unified LLM interface decoupling Bedrock completely from local mode.
  4. Bedrock Decoupling Audit: Ensure zero silent requests to AWS Bedrock in local development mode.
  5. 7 Markdown Knowledge Documents in `knowledge/`:
     - `system_prompt.md`, `restaurant_profile.md`, `guest_interaction_rules.md`, `menu_guidelines.md`, `ordering_policy.md`, `faq.md`, `escalation_policy.md`.
  6. `lib/agent/knowledge.ts`: Dynamic context loader assembling scoped Markdown context without prompt bloat (< 1,200 tokens).
  7. Persona & Brevity Enforcement: Guard Indian cafe persona (English, Hindi, Telugu quantity terms) and strictly enforce ≤ 35 words per voice turn.

#### Member 3 — Backend Operations, Safe Tools & PostgreSQL Lead
- **Primary Domain:** Authoritative database layer, safe tool handlers, and transactional order persistence.
- **Key Deliverables:**
  1. PostgreSQL RDS Stability: Verify pool connection (`lib/server-db.ts`), audit catalog tables, and test query performance via `scripts/test-db-tools.ts`.
  2. `lib/agent/tools.ts`: Implement 5 safe, parameterized backend tools:
     - `search_menu({ query, property_id })`: ILIKE and alias matching.
     - `check_availability({ item_ids })`: Stock verification and substitute recommendations.
     - `calculate_totals({ items, property_id })`: Authoritative DB price calculation and prep time ETA.
     - `create_order({ items, customer, property_id })`: Atomic `BEGIN ... COMMIT` inserting into `orders` and `order_items`.
     - `get_order_status({ order_number, property_id })`: Real-time order lookup.
  3. Draft Order & Confirmation Guard: Enforce strict in-memory draft state; reject committing orders without explicit guest confirmation (`"yes"`, `"confirm"`, `"haan"`).
  4. Idempotency & Tenant Scoping: Guard all queries with `property_id` and prevent duplicate orders on double-confirmation.
  5. Multi-Turn Dialogue Loop (`lib/agent/orchestrator.ts`): Wire Member 2's Ollama provider with Member 3's tool execution engine.

---

## 3. Parallel Workstream Timeline (0:00 to 5:00)

```
Time     Member 1 (Voice & UI)        Member 2 (Ollama Local LLM)      Member 3 (Backend & DB)
──────   ──────────────────────────   ──────────────────────────────   ──────────────────────────────
00:00    Phase 1: Setup Whisper env   Phase 1: Pull & benchmark Qwen   Phase 1: Verify RDS DB connection
         (faster-whisper / PyTorch)   models on Ollama daemon          & run scripts/test-db-tools.ts
──────   ──────────────────────────   ──────────────────────────────   ──────────────────────────────
00:45    Phase 4a: Build audio        Phase 2: Build Ollama adapter    Phase 5a: Implement parameterized
         recorder & pulse animation   (lib/agent/ollama.ts) with       tools: search_menu & check_stock
         in ai-receptionist page      tool-calling JSON schema         in lib/agent/tools.ts
──────   ──────────────────────────   ──────────────────────────────   ──────────────────────────────
01:30    Phase 4b: Complete Whisper   Phase 3a: Author 7 Markdown      Phase 5b: Implement prep-time
         service & transcribe route   knowledge documents in           ETA & authoritative DB total
         (/api/agent/transcribe)      knowledge/ directory             calculation in lib/agent/tools.ts
──────   ──────────────────────────   ──────────────────────────────   ──────────────────────────────
02:15    Phase 4c: Connect browser    Phase 3b: Build dynamic context  Phase 5c: Implement atomic DB
         mic to Whisper STT & display loader (lib/agent/knowledge.ts)  order transaction & guest
         live transcript in UI        & test with Qwen prompt          confirmation safety guard
──────   ──────────────────────────   ──────────────────────────────   ──────────────────────────────
03:00    Phase 6: Implement TTS       Phase 2b: Decouple Bedrock,      Phase 5d: Wire multi-turn tool
         synthesis client & browser   audit zero cloud calls, wire     execution loop with Ollama in
         SpeechSynthesis fallback     orchestrator to Ollama adapter   lib/agent/orchestrator.ts
──────   ──────────────────────────   ──────────────────────────────   ──────────────────────────────
03:45    Phase 7a: Integrate audio    Phase 7a: Tune Qwen prompt       Phase 7a: End-to-end integration
         playback with assistant      brevity (<=35 words) &           testing with scripts/test-agent.ts
         response in voice console    bilingual quantity mappings      & database audit
──────   ──────────────────────────   ──────────────────────────────   ──────────────────────────────
04:15    Phase 7b / Phase 8: Full team rehearsal — run complete 12-step scenario twice end-to-end
         Verify: Mic -> Whisper -> Qwen -> DB Order -> Kitchen Display -> Speech Output
──────   ──────────────────────────   ──────────────────────────────   ──────────────────────────────
04:45    Phase 8: Prepare presentation runbook, verify fallback badges, freeze codebase
05:00    PROTOTYPE COMPLETE & READY FOR LIVE DEMONSTRATION
```

---

## 4. Architecture & Constraint Matrix

```
                      +------------------------------------------+
                      |         Browser Voice Console            |
                      |         (Owned by Member 1)              |
                      |  - MediaRecorder (WAV/WebM)              |
                      |  - Real-time Transcription Display       |
                      |  - Draft Card & Confirmation Trigger     |
                      |  - TTS Playback / Web Speech Fallback    |
                      +-------------------+----------------------+
                                          |
            1. POST Audio                 | 6. Audio Response
            (multipart/form-data)         | (WAV/MP3 or synthesized text)
                                          v
+-----------------------------------------------------------------------------------+
|                        VAANI Next.js App Router Backend                           |
|                                                                                   |
|  +--------------------+   +-----------------------+   +------------------------+  |
|  |  STT Route         |   |  LLM Provider Adapter |   |  TTS Route / Adapter   |  |
|  |  /api/agent/stt    |   |  (Ollama / Qwen 2.5)  |   |  /api/agent/tts        |  |
|  |  (Whisper Small)   |   |  (Owned by Member 2)  |   |  (Owned by Member 1)   |  |
|  |  (Owned by M1)     |   |  lib/agent/ollama.ts  |   |  (Local / Web Speech)  |  |
|  +--------------------+   +-----------------------+   +------------------------+  |
|                                       |                                           |
|  +------------------------------------+----------------------------------------+  |
|  |                  Context Assembly & Safe Tool Engine                        |  |
|  |  - Scoped Markdown Knowledge Loader (lib/agent/knowledge.ts - M2)           |  |
|  |  - Parameterized Menu & Order Tool Handlers (lib/agent/tools.ts - M3)       |  |
|  |  - In-Memory Draft Order -> Strict Guest Confirmation Guard (M3)            |  |
|  +------------------------------------+----------------------------------------+  |
|                                       |                                           |
|  +------------------------------------+----------------------------------------+  |
|  |                   Repository & Transaction Layer                            |  |
|  |                   (Owned by Member 3)                                       |  |
|  |  - Amazon RDS PostgreSQL Connection Pool (lib/server-db.ts)                 |  |
|  |  - Tables: properties, menu_items, orders, order_items, calls               |  |
|  |  - Explicit DB Transactions (BEGIN / COMMIT / ROLLBACK)                     |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

### Non-Negotiable Operational Boundaries
1. **No External Cloud AI in Local Mode:** Zero network calls to AWS Bedrock, AWS Polly, or OpenAI during local operation. Member 2 ensures Bedrock is completely decoupled from the primary demonstration path.
2. **PostgreSQL as Authoritative Source of Truth:** Markdown files provide persona, tone, rules, and static policies; menu prices, stock availability, and committed orders are strictly queried from PostgreSQL by Member 3. Stale Markdown never overrides database truth.
3. **No Arbitrary SQL from LLM:** The LLM emits structured tool proposals only; Member 3 validates schemas, tenant isolation (`property_id`), and executes parameterized queries.
4. **Draft-Then-Confirm Protocol:** No order is committed without an explicit confirmation cycle (`add_to_order` -> guest confirmation -> `confirm_order`).
5. **Preserve Existing Database Schema:** No destructive migrations; maintain exact compatibility with existing RDS PostgreSQL tables (`menu_items`, `orders`, `order_items`, `properties`).
6. **Transparent Fallbacks:** If speech synthesis or transcription falls back to browser APIs, Member 1 must ensure the mode is clearly and accurately labeled in the UI.

---

## 5. Integration Handoff & Contract Specifications

To prevent friction between the 3 engineers, all inter-module boundaries follow strict TypeScript contracts:

### Contract 1: Audio STT (Member 1 -> Member 2/3)
- **Endpoint:** `POST /api/agent/transcribe`
- **Request:** `multipart/form-data` containing `file` (`audio/webm` or `audio/wav`).
- **Response:**
  ```json
  {
    "transcript": "I want one filter coffee and two samosas",
    "durationMs": 340,
    "language": "en"
  }
  ```

### Contract 2: Chat Orchestration (Frontend M1 -> Backend M2/M3)
- **Endpoint:** `POST /api/agent/chat`
- **Request:**
  ```json
  {
    "transcript": "I want one filter coffee and two samosas",
    "sessionId": "session-1718000000",
    "propertyId": "62e1b115-9382-40f8-853a-0a773735d034",
    "callerPhone": "+919876543210"
  }
  ```
- **Response:**
  ```json
  {
    "reply": "One Filter Coffee and two Samosas comes to ₹100, ready in 10 minutes. Shall I confirm your order?",
    "orderCreated": null
  }
  ```
- **Confirmed Response:**
  ```json
  {
    "reply": "Your order ORD-102 is confirmed! Ready in 10 minutes. Thank you!",
    "orderCreated": {
      "orderId": "uuid-here",
      "orderNumber": "ORD-102",
      "totalAmount": 100,
      "etaMinutes": 10,
      "items": [
        { "name": "Filter Coffee", "quantity": 1 },
        { "name": "Samosa", "quantity": 2 }
      ]
    }
  }
  ```

### Contract 3: Ollama Tool Calling (Member 2 <-> Member 3)
Member 2 translates Member 3's tool specifications into Ollama tool schemas:
```json
{
  "type": "function",
  "function": {
    "name": "search_menu",
    "description": "Search menu items by name or alias for the given property.",
    "parameters": {
      "type": "object",
      "properties": {
        "query": { "type": "string" },
        "property_id": { "type": "string" }
      },
      "required": ["query", "property_id"]
    }
  }
}
```

---

## 6. Phase-by-Phase Implementation Specifications

### Phase 1: Audit and Stabilize (Minutes 0–45)

#### Team Work Breakdown
- **Member 1 (Voice/UI):**
  - Verify Python runtime and install `faster-whisper` or PyTorch.
  - Download/cache the Whisper `small` model weights locally.
  - Verify browser microphone access in Next.js frontend.
- **Member 2 (Ollama Local LLM):**
  - Verify Ollama daemon running on `http://localhost:11434`.
  - Check existing installed Qwen models (`ollama list`). Pull `qwen2.5:7b` or `qwen2.5:3b`.
  - Execute test generation prompt via curl to measure token latency (< 1.5s).
- **Member 3 (Backend/DB):**
  - Audit `.env.local` for `DATABASE_URL` and `VAANI_PROPERTY_ID`.
  - Run database verification script:
    ```powershell
    npx ts-node --project tsconfig.seed.json scripts/test-db-tools.ts
    ```
  - Verify menu records exist in `menu_items` for Cafe Vaani.

#### Verification Gate
- [ ] Next.js app compiles without errors (`npm run dev`).
- [ ] Database returns menu records and supports test order transaction.
- [ ] Ollama responds to prompt in < 2 seconds.
- [ ] Whisper model cached locally.

---

### Phase 2: Local LLM Provider (Minutes 45–90)

#### Team Work Breakdown
- **Member 2 (SOLE LEAD - Ollama Local Models):**
  - Build `lib/agent/llm-provider.ts` defining standard `LLMProvider` contract.
  - Build `lib/agent/ollama.ts` connecting to `http://localhost:11434/api/chat`.
  - Configure tool-calling structure compatible with Qwen 2.5 JSON schemas.
  - Set up bounded timeouts (8,000ms AbortController) and clean error handling.
  - Completely decouple `lib/agent/bedrock.ts` so Bedrock is not called during local execution.
  - Ensure local mode never silently calls Bedrock.
- **Member 1 (Voice/UI):**
  - Build audio recorder component in `app/app/ai-receptionist/page.tsx` using `navigator.mediaDevices.getUserMedia`.
  - Add visual recording pulse animation and audio chunk collector.
- **Member 3 (Backend/DB):**
  - Refactor `search_menu` and `check_availability` in `lib/agent/tools.ts` to adhere to standard tool input/output interfaces.

#### Verification Gate
- [ ] Member 2 demonstrates a successful Qwen 2.5 tool-calling round-trip via Ollama CLI/script.
- [ ] Zero calls to Bedrock in local execution.

---

### Phase 3: Markdown-Based Knowledge Architecture (Minutes 90–135)

#### Team Work Breakdown
- **Member 2 (SOLE LEAD - Ollama & Knowledge):**
  - Author the 7 standardized hospitality documents in `knowledge/`:
    1. `system_prompt.md`: Core VAANI persona (warm, concise Indian cafe cashier, max 35 words).
    2. `restaurant_profile.md`: Cafe Vaani profile, Bangalore location, opening hours.
    3. `guest_interaction_rules.md`: Greeting style, allergy rules, multilingual quantity words (`rendu=2`, `ek=1`, `do=2`).
    4. `menu_guidelines.md`: Category descriptions, standard preparation procedures.
    5. `ordering_policy.md`: Explicit confirmation rule, modification limits, cancellation policy.
    6. `faq.md`: Wi-Fi credentials, parking details, payment modes (UPI/cash).
    7. `escalation_policy.md`: Supervisor transfer triggers.
  - Build `lib/agent/knowledge.ts`: Dynamic context loader that injects only relevant Markdown sections to avoid token bloat.
  - Test Qwen adherence to brevity (≤ 35 words per voice turn).
- **Member 1 (Voice/UI):**
  - Build `scripts/whisper_service.py` exposing `POST http://localhost:5001/transcribe`.
- **Member 3 (Backend/DB):**
  - Build `calculate_totals` in `lib/agent/tools.ts`: Compute canonical totals from database prices; integrate `lib/agent/prep-time.ts` for ETA.

#### Verification Gate
- [ ] All 7 Markdown files present in `knowledge/`.
- [ ] Dynamic context loader keeps total system prompt under 1,200 tokens.
- [ ] Qwen strictly preserves database prices and never derives prices from Markdown.

---

### Phase 4: Speech-to-Text Pipeline (Minutes 135–180)

#### Team Work Breakdown
- **Member 1 (SOLE LEAD - Voice I/O):**
  - Start local Whisper service (`python scripts/whisper_service.py`).
  - Implement Next.js route `app/api/agent/transcribe/route.ts`:
    - Accept `multipart/form-data`.
    - Validate file size (< 10MB) and audio format (`audio/webm`, `audio/wav`).
    - Forward to Whisper service and return transcript.
  - Connect browser microphone to transcribe route.
  - Render transcript in real-time in the AI Receptionist UI panel before submission.
- **Member 2 (Ollama Local LLM):**
  - Fine-tune Qwen prompt for speech transcription quirks (e.g. "masala chai", "bun maska", "two coffees").
  - Test Ollama response latency when chained after STT output.
- **Member 3 (Backend/DB):**
  - Implement in-memory draft session store in `lib/agent/tools.ts` (`sessions.get(sessionId)`).
  - Implement item accumulation (`add_to_order`) and item cancellation (`cancel_order`).

#### Verification Gate
- [ ] Spoken browser audio transcribes locally via Whisper Small in < 2 seconds.
- [ ] Transcript appears visibly in the console UI.

---

### Phase 5: Safe Backend Tool Execution (Minutes 180–225)

#### Team Work Breakdown
- **Member 3 (SOLE LEAD - Backend & DB):**
  - Implement atomic `create_order` / `confirm_order` in `lib/agent/tools.ts`:
    - Wrap write in PostgreSQL transaction (`BEGIN ... COMMIT`).
    - Generate unique order number (e.g. `ORD-102`).
    - Insert into `orders` table and `order_items` table.
  - Implement strict Guest Confirmation Guard:
    - Never commit an order on initial item mention.
    - Require explicit caller confirmation (`"yes"`, `"confirm"`, `"haan"`).
  - Implement `get_order_status` tool to check live order state.
- **Member 2 (Ollama Local LLM):**
  - Connect `lib/agent/orchestrator.ts` with `lib/agent/ollama.ts` and Member 3's `TOOL_SPECS`.
  - Validate multi-turn tool-calling loop: User -> Qwen -> Tool Use -> Tool Result -> Qwen Final Answer.
- **Member 1 (Voice/UI):**
  - Wire the chat response from `/api/agent/chat` to display the draft order summary card and confirmed order ticket in the UI.

#### Verification Gate
- [ ] `search_menu` executes parameterized queries safely.
- [ ] `confirm_order` writes to PostgreSQL only after explicit guest confirmation.
- [ ] Querying database verifies order row in `orders` and items in `order_items`.

---

### Phase 6: Text-to-Speech (Minutes 225–255)

#### Team Work Breakdown
- **Member 1 (SOLE LEAD - Voice I/O):**
  - Create TTS interface (`lib/agent/tts.ts`).
  - Implement browser speech synthesis fallback (`window.speechSynthesis.speak`).
  - If local synthesis (Piper/IndicF5) is available, stream audio via `/api/agent/synthesize`; otherwise activate browser synthesis.
  - Display transparent UI status badge:
    - `🔊 Audio: Local Piper TTS` OR
    - `🔊 Audio: Browser Speech Synthesis Fallback`
  - Ensure spoken audio matches the assistant's displayed message word-for-word.
- **Member 2 (Ollama Local LLM):**
  - Verify that Qwen outputs clean, pronounceable text without markdown symbols (`**`, `#`, tables) that would break TTS synthesis.
- **Member 3 (Backend/DB):**
  - Run regression test on database and prepare live operations kitchen dashboard (`/app/live-operations`) for demo order synchronization.

#### Verification Gate
- [ ] Assistant response audibly plays back in the browser.
- [ ] TTS mode is clearly and accurately labeled in the UI.
- [ ] Spoken text exactly matches displayed text.

---

### Phase 7: Complete Demo Flow (Minutes 255–285)

#### Team Work Breakdown
- **All 3 Members Collaborating:**
  - Execute the full 12-step live demonstration scenario twice consecutively.
  - Member 1 speaks into the microphone and monitors audio capture/playback.
  - Member 2 monitors Ollama logs to ensure local Qwen executes tools without cloud calls.
  - Member 3 monitors PostgreSQL database and the kitchen dashboard to verify instant order creation.

#### The 12-Step Live Demonstration Scenario

| Step | Action | Actor / Component | Verification Criteria |
|---|---|---|---|
| **1** | Click microphone button | Guest (Member 1) | UI displays recording state and audio indicator |
| **2** | Speak: *"I'd like one masala chai and two samosas, please."* | Guest (Member 1) | Browser captures clean audio buffer |
| **3** | Transcribe utterance | Whisper Small (M1) | UI displays: `"I'd like one masala chai and two samosas, please."` |
| **4** | Send transcript + context | Next.js API | Qwen (M2) receives transcript + scoped Markdown prompt |
| **5** | Query PostgreSQL menu | `search_menu` (M3) | Queries `menu_items` for Masala Chai (₹40) and Samosa (₹30) |
| **6** | Calculate availability & totals | `calculate_totals` (M3) | Verifies stock; calculates subtotal (1×40 + 2×30 = ₹100), ETA: 10 mins |
| **7** | Ask guest confirmation | Qwen + TTS (M1/M2) | Agent speaks: *"One Masala Chai and two Samosas comes to ₹100, ready in 10 minutes. Shall I confirm your order?"* |
| **8** | Speak: *"Yes, please confirm it."* | Guest (Member 1) | Microphone captures confirmation |
| **9** | Transcribe confirmation | Whisper Small (M1) | UI displays: `"Yes, please confirm it."` |
| **10** | Commit transaction | `confirm_order` (M3) | Inserts into `orders` and `order_items` in PostgreSQL |
| **11** | Display Order ID | Frontend UI (M1) | Order card displays `ORD-102` with status `received` |
| **12** | Final audio confirmation | Qwen + TTS (M1/M2) | Agent speaks: *"Your order ORD-102 is confirmed! Ready in 10 minutes. Thank you!"* |

#### Failure Mode Verifications
- **Out of stock test:** Order an unavailable item; verify agent apologizes and offers substitute without crashing.
- **Database persistence test:** Refresh the dashboard; verify the order persists in the database.
- **Network resilience:** Verify zero calls to AWS Bedrock in network monitor.

---

### Phase 8: Test and Prepare Presentation (Minutes 285–300)

#### Team Work Breakdown
- **Member 1 (Voice/UI):**
  - Verify browser microphone permissions, speaker volume, and UI styling.
  - Confirm fallback labels are transparent and accurate.
- **Member 2 (Ollama Local LLM):**
  - Document Ollama model details, startup commands, and RAM/VRAM requirements.
  - Prepare model fallback config (`qwen2.5:3b` in case of host thermal throttling).
- **Member 3 (Backend/DB):**
  - Clean up test orders from earlier trials to start demo with clean kitchen queue.
  - Document database verification queries and operational health checklist.

---

## 7. Startup Runbook & Live Commands

### Terminal 1: Ollama Local LLM Runtime (Member 2)
```powershell
ollama serve
# In a separate prompt:
ollama run qwen2.5:7b
# Verify reachability:
curl http://localhost:11434/api/tags
```

### Terminal 2: Local Whisper STT Service (Member 1)
```powershell
python scripts/whisper_service.py
# Verify reachability:
curl http://localhost:5001/docs
```

### Terminal 3: VAANI Next.js Application (Member 3)
```powershell
npm run dev
# App will run at http://localhost:3000
```

---

## 8. Contingency & Fallback Matrix

| Component | Primary Strategy | Hackathon Fallback (< 10 min trigger) | Presentation Label | Responsible |
|---|---|---|---|---|
| **LLM** | Ollama Qwen 2.5 7B | Ollama Qwen 2.5 3B/1.5B (faster CPU inference) | `[Provider: Ollama Qwen (Local)]` | **Member 2** |
| **STT** | Local Whisper Small | Whisper Base/Tiny on CPU or Browser Web Speech API | `[STT: Local Whisper / Browser Fallback]` | **Member 1** |
| **TTS** | Local Piper / IndicF5 | Browser `window.speechSynthesis` | `[TTS: Browser Speech Synthesis Fallback]` | **Member 1** |
| **Database** | Amazon RDS PostgreSQL | Direct local PostgreSQL connection | `[Database: PostgreSQL]` | **Member 3** |

---

## 9. Definition of Done for Prototype

- [ ] **Next.js app compiles cleanly** and runs on `http://localhost:3000`.
- [ ] **Member 2's Ollama engine** executes multi-turn tool calling locally using Qwen without external cloud calls.
- [ ] **All 7 Markdown knowledge documents** loaded and dynamically scoped by Member 2.
- [ ] **Whisper Small STT** (Member 1) transcribes spoken audio and visibly renders text in the UI.
- [ ] **Menu queries** (Member 3) run parameterized against PostgreSQL `menu_items`.
- [ ] **Orders** (Member 3) commit transactionally to `orders` and `order_items` only upon explicit guest confirmation.
- [ ] **TTS speech output** (Member 1) audibly plays responses matching UI text.
- [ ] **The 12-step demo scenario** verified twice end-to-end across all 3 members.
- [ ] **Zero secrets or API keys exposed** to browser bundles or client console.
