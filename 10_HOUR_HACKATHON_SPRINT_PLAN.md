# VAANI — 10-Hour Hackathon Sprint Plan (3 Members)
**Target: End-to-End Working Product for Live Demo**  
*Time Remaining: 10 Hours | Team: 3 Builders | Deadline: October 2026*

---

## 0. The Golden Rule of the 10-Hour Sprint
> **Do not build features that judges cannot see or hear in the 5-minute demo.**  
> Cut all telephony paperwork/SIP delays: Use the **Web Call (Browser Microphone Call)** as the bulletproof primary call interface. It is a 100% real audio voice call into the live backend that never fails on stage.

---

## 1. What Already Works (Our Head Start)
✅ **Frontend UI**: Complete Next.js dashboard (`/app/app/live-operations`, `/app/app/menus`, `/app/app/analytics`, etc.)  
✅ **Database**: Amazon RDS PostgreSQL running with full 19-table schema applied  
✅ **Authentication**: JWT authentication working with auto-approved sign-ups  
✅ **AWS Credentials**: `admin-vaani-1` profile active and verified on AWS CLI  

---

## 2. Team Division: 3 Parallel Tracks (Zero Merge Conflicts)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        10-HOUR PARALLEL TRACKS                         │
├─────────────────────┬──────────────────────────┬───────────────────────┤
│   MEMBER 1 (VOICE)  │    MEMBER 2 (AGENT)      │   MEMBER 3 (KITCHEN)  │
│  The Voice Pipeline │  The AI Brain & Tools    │  KDS, SMS & Analytics │
├─────────────────────┼──────────────────────────┼───────────────────────┤
│ • Click-to-Call UI  │ • Cafe Menu Seed Script  │ • Real-time KDS Sync  │
│ • Web Mic Recording │ • LLM Tool Calling       │ • Sound Chime on Order│
│ • Speech-to-Text    │ • Prep-Time Calculation  │ • Twilio/SNS SMS alert│
│ • Polly TTS Voice   │ • Stock-Out Replanning   │ • Demo Presentation   │
└─────────────────────┴──────────────────────────┴───────────────────────┘
```

---

## 3. Hour-by-Hour Sprint Schedule (10 Hours Total)

### ⏱️ Hours 0:00 – 2:00 | Foundations & Data Seed
* **Member 1 (Voice)**:
  - Build `components/voice-call-modal.tsx`: A floating phone icon that opens an active "Call Cafe Vaani" modal with audio visualizer, mic toggle, and live caption display.
  - Test browser Web Speech API / mic audio capture.
* **Member 2 (Agent)**:
  - Write and run `db/seed-cafe.sql`: Seed 15 real cafe items with prices, stations (`drinks`, `fryer`, `griddle`, `bakery`), and spoken aliases:
    - *Filter Coffee (₹40, 'kaapi', 'coffee')*
    - *Samosa (₹30, 'samosa', 'singara')*
    - *Bun Maska (₹50, 'bun maska', 'maska bun')*
    - *Veg Puff (₹40, 'puff', 'patties')*
  - Build tool schemas in `lib/agent/tools.ts`: `search_menu`, `add_to_order`, `get_eta`, `confirm_order`.
* **Member 3 (Kitchen & SMS)**:
  - Get a free Twilio trial number (or AWS SNS) and create `lib/notifications/sms.ts` to send a test SMS to your phone: *"Namaste from Cafe Vaani!"*
  - Enable 2-second auto-polling in `/app/app/live-operations` so new database rows appear without refreshing.

🎯 **Milestone at Hour 2**: Cafe menu in RDS, SMS sends to real phone, Web Call modal pops up.

---

### ⏱️ Hours 2:00 – 5:00 | The Core Voice-to-Kitchen Loop
* **Member 1 (Voice)**:
  - Connect mic speech to text. Send transcript to Member 2's `/api/agent/chat` route.
  - Implement text-to-speech reply (Amazon Polly neural voice *Kajal/Aditi* or browser speech synthesis) so the agent answers back with voice.
* **Member 2 (Agent)**:
  - Build `/api/agent/chat/route.ts` with Bedrock Claude 3.5 Sonnet (or Gemini Flash):
    - System prompt: Cafe cashier who understands English, Hindi, and Telugu.
    - Resolves item names and spoken quantities (*"rendu" -> 2, "do" -> 2*).
    - When caller confirms, atomically writes to `orders` and `order_items` in PostgreSQL.
* **Member 3 (Kitchen)**:
  - Update `live-operations/page.tsx`:
    - Add audio sound chime (`new-order.mp3`) when a new order arrives.
    - Add status transition buttons: `Received` ➔ `Preparing` ➔ `Ready`.
  - When status hits `confirmed`, trigger Member 3's SMS to caller:
    > *"Your order #ORD-101 (1 Filter Coffee, 2 Samosa) is confirmed at Cafe Vaani. Total: ₹100. Pickup in 12 mins."*

🎯 **Milestone at Hour 5**: **CORE DEMO WORKS!** Speak into mic: *"One filter coffee and two samosas"*, hear agent speak back total & ETA, ticket appears live on screen with a chime, SMS arrives on phone!

---

### ⏱️ Hours 5:00 – 7:30 | The Agentic Layer (Stock-Out & Replanning)
* **Member 1 (Voice)**:
  - Add quick speech fillers (*"Ek second ji..."*, *"Sure, let me check that..."*) to mask processing latency.
  - Test mixed phrases: *"Do filter coffee, spicy ga kakunda"*.
* **Member 2 (Agent)**:
  - Implement Queue-Aware Prep Time formula:
    `ETA = (Orders currently in prep at station * 3 min) + Base Item Time`.
  - Implement Stock-Out Proactive Rule:
    - If `availability == 'out_of_stock'`, agent refuses item and suggests pre-configured substitute (*"Samosa is finished for today, would you like hot Veg Puffs instead?"*).
* **Member 3 (Kitchen)**:
  - Add 1-click "Out of Stock" toggle switch on menu items inside `/app/app/live-operations` and `/app/app/menus`.
  - When toggled, show visual "Stock-Out Event" alert on kitchen screen.
  - Send SMS when staff marks order `Ready`: *"Your order is hot and ready for pickup at the counter!"*

🎯 **Milestone at Hour 7.5**: **AGENTIC DEMO WORKS!** Staff toggles Samosa out of stock live. Next caller tries to order Samosa, agent proactively catches it and suggests Veg Puff.

---

### ⏱️ Hours 7:30 – 9:00 | Hardening, Analytics & Polish
* **Member 1**: Ensure audio playback never overlaps (stop speaking if user interrupts). Profile latency to ensure responses start in under 2 seconds.
* **Member 2**: Handle edge cases: customer says *"No, cancel that"* or asks for a non-existent item.
* **Member 3**:
  - Connect `/app/app/analytics` to real database queries:
    - Total Orders Captured
    - Total Voice Revenue (₹)
    - Stock-Out Incidents Handled
  - Create the 5-slide pitch deck (Problem, Indian Dialect Gap, Live Architecture, No-Mocks Proof, Business Impact).

🎯 **Milestone at Hour 9**: Complete product polished with zero console errors.

---

### ⏱️ Hours 9:00 – 10:00 | Demo Rehearsals (Zero Code Changes)
* **All 3 Members**: Run the exact 5-minute presentation script **3 times back-to-back**:
  1. **Run 1**: Fix audio volume and screen projection setup.
  2. **Run 2**: Timekeeper test (strictly 4.5 minutes + 30s buffer).
  3. **Run 3**: Flawless dry run with backup screen recording ready.

---

## 4. The 5-Minute Live Demo Walkthrough (What Will Win)

| Timestamp | What Happens on Screen | What the Judges Experience | Responsible |
| :---: | :--- | :--- | :---: |
| **0:00 – 1:00** | Problem Slide | The "silent revenue leak": Indian cafes miss 30% of peak-hour calls; standard IVRs fail on code-mixed speech. | Member 3 |
| **1:00 – 2:30** | Live Web Call on Projector | Judge clicks **"Call Cafe"** on laptop/phone. Speaks: *"Ek filter coffee aur do samosa"* in Hindi/English mix. Agent reads back total (₹100), quotes live prep time (12m). | Member 1 & 2 |
| **2:30 – 3:15** | Live Kitchen Display | Ticket `#ORD-101` pops up on the kitchen screen with a bell chime. Judge's phone buzzes with real confirmation SMS. | Member 3 |
| **3:15 – 4:15** | **Agentic Behavior** | Counter staff clicks **"Out of Stock"** on Samosas. A second call asks for Samosa. Agent immediately replies: *"Sorry, Samosas just finished. Can I get you fresh Veg Puffs?"* | Member 1 & 2 |
| **4:15 – 5:00** | Owner Dashboard & Impact | Switch to `/app/app/analytics`: Show live revenue captured, missed-call recovery, and stock-out logs. Q&A. | Member 3 |

---

## 5. Immediate Action Plan (Right Now: Minute 0 to 60)
1. **Member 1**: Create `components/voice-call-modal.tsx` with Web Speech / mic audio.
2. **Member 2**: Create `db/seed-cafe.sql` and run it on RDS to populate the menu.
3. **Member 3**: Connect Twilio or AWS SNS for SMS dispatch.
