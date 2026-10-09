# VAANI — 5-Minute Hackathon Demo Script
**Project: Vaani — The Multilingual Voice Agent That Answers Every Call a Café Misses**\
**Role: Member 3 (Product, Frontend & Kitchen Integration)**

---

## 🎬 Act 1: The Café Rush Hour Dilemma (0:00 – 1:00)
- **Problem Hook**: *"Good morning judges. It’s 9:00 AM at Café Vaani in Hyderabad. Two baristas are frothing South Indian filter coffee, the tawa is hot with masala dosas, and the phone won't stop ringing. In a typical café, 30% of these calls are missed — that's lost revenue and frustrated regulars."*
- **The Landing Page**: Show the brand new **Vaani 3D Experience**.
  - Show the floating authentic South Indian filter kaapi, golden samosas, and bun maska.
  - Show the scroll-driven storytelling: as you scroll, the food objects follow real 3D trajectories, introducing the voice agent, the queue-aware ETA engine, and the kitchen loop.

---

## 📞 Act 2: The Live Code-Mixed Voice Call (1:00 – 2:30)
- **Click "Test Voice Call"** on the hero or navbar.
- **Scenario 1: Telugu + English**:
  - Caller: *"Namaskaram andi! Rendu Bun Maska and two degree filter kaapi parcel cheyyandi."*
  - Watch Vaani respond with zero latency in colloquial Telugu-English:
  - Agent: *"Namaskaram andi! Rendu Bun Maska mariyu rendu degree filter kaapi confirm chesamu. Total ₹200. Kitchen prep time 8 minutes andi. SMS ticket mee number ki vachesindi!"*
- **Scenario 2: Hindi + English**:
  - Caller: *"Bhaiya, do plate garam samosa aur ek filter coffee pack kar do! Jaldi dena."*
  - Agent answers and calculates prep ETA across fryer and drinks stations (10 minutes).
- **Point out to Judges**: The LLM does NOT calculate prices or ETAs itself — all facts are verified through strict backend tool calls.

---

## 🍳 Act 3: Live Kitchen Display System (KDS) (2:30 – 3:45)
- Open `/app/live-operations`.
- Show how the ticket (#ORD-104) landed on the kitchen screen **in real-time without refreshing**.
- **Station Filtering**: Switch between `All Stations`, `☕ Drinks`, `🥟 Fryer`, and `🥞 Griddle`.
- **One-Click Staff Progress**:
  - Click **Start Preparing** (ticket moves to column 2, subtle audio chime).
  - Click **Mark Ready for Pickup** (ticket moves to column 3).
  - Click **Hand Over & Complete** (celebration particle burst, ticket marked finished).
- **Real Customer Notification**: Show the SMS log at the bottom confirming delivery to the caller's mobile.

---

## ⚡ Act 4: Agentic Self-Correction & Stock-Out Replanning (3:45 – 4:30)
- **Live Stock-Out Trigger**:
  - On the Kitchen Display or `/app/menus`, toggle `Veg Puff` or `Bun Maska` to **Unavailable**.
- **Live Demonstration**:
  - Trigger a customer call attempting to order the unavailable item.
  - Watch Vaani dynamically reject the out-of-stock item and propose owner-configured substitutes:
    > *"Kshama kijiye, aaj sham ka Veg Puff abhi out of stock ho gaya hai. Kya aap hamara taza Golden Samosa ya Bun Maska lena pasand karenge?"*

---

## 📊 Act 5: Owner Analytics & Business Value (4:30 – 5:00)
- Open `/app/analytics`:
  - Show the **Zero Missed Calls** metric.
  - Show **Voice Revenue Captured (₹)**.
  - Show Popular Items (Filter Kaapi: 42 orders, Golden Samosa: 38 orders).
- **Closing Statement**:
  - *"Vaani turns unanswered ringing phones into hot kitchen tickets and delighted repeat customers. Thank you!"*
