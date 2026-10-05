# ChatPilot B2B — Multi-Tenant AI WhatsApp Ordering & Customer Support Platform

A complete, production-ready B2B platform that enables food and retail businesses to connect their WhatsApp business numbers via a web QR code and deploy intelligent AI bots. The bots answer customer questions using custom Knowledge Bases (PDFs, images, policies) and take delivery orders using live menus with automated delivery pricing.

---

## 🌟 Key Platform Features

### 1. Super Admin Portal (Platform Owner)
- **Subscribed Companies Overview:** Monitor total registered companies, active vs suspended businesses, total orders, and platform GMV.
- **Instant Suspend & Activate:** Platform owner can toggle operational access for any company at any time. Suspended companies are immediately locked out and their bots stop responding.
- **Modular AI Layer Configuration:**
  - Independent AI configuration per company or fallback to platform defaults.
  - Choose between **Google Gemini** (1.5 Flash, 2.0 Flash), **OpenAI** (GPT-4o, GPT-4o-mini), or **OpenRouter / Custom OpenAI-compatible endpoints** (e.g. Llama 3.3 70B, DeepSeek, local vLLM/Ollama).
  - Configure custom API keys, model identifiers, custom base URLs, and system prompt instructions per company.

### 2. Company Owner Admin Portal
- **WhatsApp Web QR Pairing (`@whiskeysockets/baileys`):**
  - Company owners scan a dynamic QR code directly inside their dashboard (Settings $\rightarrow$ Linked Devices on their WhatsApp phone).
  - Dynamic QR streaming over WebSockets with live connection status.
  - Zero Meta Cloud API approval or fees required.
  - Built-in interactive **Bot Sandbox Emulator** to test prompts and orders before scanning QR!
- **Menu & Delivery Pricing Engine:**
  - Manage categories, menu dishes, prices, descriptions, and pictures.
  - Live **In-Stock / Out-of-Stock** toggle switch (the bot immediately stops offering out-of-stock items).
  - Automated **Delivery Fee** and **Minimum Order Amount** settings.
- **Knowledge Base (PDF & Image Ingestion):**
  - Upload PDF menus, pamphlets, or image banners (`.pdf`, `.png`, `.jpg`, `.txt`).
  - Text is automatically extracted and ingested into the company's AI context.
  - Direct store policy & FAQ editor (opening hours, allergen warnings, refund policy).
- **Live Kitchen & Delivery Board:**
  - Real-time Kanban board with synchronized order columns:
    1. 🟡 **Pending Review**
    2. 🍳 **In Kitchen**
    3. 🛵 **In Delivery**
    4. ✅ **Delivered**
  - Instant status progression buttons.
  - Automatic WhatsApp status update notification sent to the customer's phone upon status changes!
  - "Simulate Incoming Order" button for live kitchen demonstrations.
- **Customer Conversations:**
  - Full transcript viewer of all customer WhatsApp chats and bot replies.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js v18+ (tested on Node v22)
- npm v10+

### 1. Start the Backend Server
```bash
cd server
npm install
npx prisma db push
npm run prisma:seed   # Seeds Super Admin and demo companies
npm run dev           # Starts on http://localhost:5000
```

### 2. Start the Frontend Web App
```bash
cd client
npm install
npm run dev           # Starts on http://localhost:5173
```

---

## 🔑 Demo Login Accounts

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@platform.com` | `admin123` | Platform owner portal (manage companies, suspend/activate, configure AI keys & models) |
| **Company Owner 1** | `owner@bellaroma.com` | `owner123` | Bella Roma Italian Bistro (pre-loaded menu, delivery fee $3.50, sample orders) |
| **Company Owner 2** | `owner@tokyoramen.com` | `owner123` | Tokyo Ramen Bar |

*(You can also use the 1-Click Demo Login buttons directly on the login screen or register a new business at `/register`)*

---

## 🤖 Modular AI Configuration

The platform architecture features an abstraction layer `IAIProvider` in `server/src/ai/`:
- **`GeminiProvider`**: Fast multimodal responses using Google Gemini.
- **`OpenAIProvider`**: Standard GPT-4o / GPT-4o-mini structured output.
- **`OpenRouterProvider`**: Custom OpenAI-compatible endpoints allowing access to DeepSeek, Llama 3, or self-hosted models.

In the Super Admin portal, click **"AI Config"** next to any company to assign a dedicated API key and select their model. If no custom key is provided, the platform seamlessly uses system environment defaults or dry-run mock ordering!

---

## 📁 Project Architecture

```
platform/
├── server/
│   ├── src/
│   │   ├── index.ts                     # Express + Socket.IO bootstrap
│   │   ├── config.ts                    # Environment & path configs
│   │   ├── prisma.ts                    # Prisma SQLite / Postgres client
│   │   ├── middleware/auth.ts           # Multi-tenant auth & suspension guards
│   │   ├── ai/
│   │   │   ├── types.ts                 # Universal AI contracts
│   │   │   ├── aiRouter.ts              # Provider factory (Gemini, OpenAI, OpenRouter)
│   │   │   ├── promptBuilder.ts         # Injects Menu & Knowledge Base into AI
│   │   │   ├── botEngine.ts             # Intent, tool-calling & order creation
│   │   │   └── providers/               # Gemini, OpenAI, OpenRouter implementations
│   │   └── modules/
│   │       ├── auth/                    # Login, Register, Profile
│   │       ├── superadmin/              # Company stats, status toggle, AI configs
│   │       ├── company/                 # Tenant profile & delivery rules
│   │       ├── menu/                    # Categories, items, stock toggle
│   │       ├── knowledge/               # PDF & Image text extraction
│   │       ├── orders/                  # Live Kitchen & Delivery tracker
│   │       ├── whatsapp/                # Baileys QR sync & message dispatch
│   │       └── conversations/           # Customer chat logs
│   └── prisma/
│       ├── schema.prisma                # Multi-tenant schema
│       └── seed.ts                      # Demo data seeder
│
└── client/
    ├── src/
    │   ├── context/
    │   │   ├── AuthContext.tsx          # User state & JWT persistence
    │   │   └── SocketContext.tsx        # Real-time WebSocket connection
    │   ├── components/                  # Navbar, Sidebar, StatusBadge
    │   └── pages/
    │       ├── auth/                    # Login & Register
    │       ├── superadmin/              # Super Admin Dashboard
    │       └── company/                 # WhatsApp QR, Menu, KB, Orders, Chats
```
