# Chunav Mitra - Your Election Friend 🇮🇳

> A free, non-partisan AI assistant helping Indian citizens navigate the democratic election process with confidence.

## 📌 Vertical
**AI Assistant for the Indian Election Process**

## 🚀 Live Demo
🌐 [chunav-mitra.onrender.com](https://chunav-mitra.onrender.com)

## 🧠 How It Works

Chunav Mitra is a full-stack PWA. The responsive HTML/CSS/JS frontend communicates with a Node.js/Express backend, which integrates the **Google Gemini 1.5 Flash** API for intelligent, context-aware responses.

### Architecture
```
Browser (PWA)
    │
    ▼ POST /api/chat (sanitized + rate-limited)
Express Server (Node.js)
    │
    ├─ Cache Check (node-cache) ──► Return cached response (fast path)
    │
    ├─ Gemini 1.5 Flash API call with:
    │      • System Instruction (Chunav Mitra persona)
    │      • Conversation History (context retention)
    │      • Function Declarations (tools)
    │
    ├─ Function Call Handler (Logical Decision Making)
    │      • get_voter_registration_status()
    │      • get_polling_booth_info()
    │      • get_constituency_info()
    │
    └─ Response ──► Cache ──► Client
```

## 🛡️ Hackathon Criteria Coverage

### 1. Smart Dynamic Assistant
- Google Gemini 1.5 Flash powers all NLP
- Strong system persona enforces neutrality and ECI-accuracy
- Conversational history (last 10 exchanges) for context retention
- Hindi/Devanagari detection for bilingual responses

### 2. Logical Decision Making
- **Live Function Calling**: Gemini invokes `get_voter_registration_status`, `get_polling_booth_info`, `get_constituency_info` based on user intent
- Function results are sent back to Gemini for natural language synthesis
- History bounded to 20 turns to prevent token overflow

### 3. Google Services Used
- **Google Gemini 1.5 Flash** — NLP, intent detection, response generation
- **Gemini Function Calling** — structured tool use for routing decisions
- **Gemini System Instructions** — persona enforcement and safety guardrails

### 4. Practical & Real-World Usability
- Mobile-first responsive design (works on 320px+ screens)
- **PWA** with Service Worker — installable on Android/iOS, works offline
- **Hindi language support** — detects Devanagari input, switches UI language
- Quick-reply chips for one-tap common queries
- Links to official resources: voters.eci.gov.in, nvsp.in, 1950 helpline
- Tiranga-inspired high-contrast color scheme (WCAG AA compliant)

### 5. Clean & Maintainable Code
- Structured file layout (`server.js`, `public/`)
- Enterprise logging with `winston` (JSON structured, timestamped)
- Environment-driven config (`.env` / `.env.example`)
- `'use strict'` in frontend JS
- No inline scripts/styles (CSP-compliant)

### 6. Security, Efficiency, Accessibility, Testing

**Security:**
- `helmet` with custom CSP (no wildcard `script-src`)
- CORS restricted to `ALLOWED_ORIGIN` env variable (not `*` in production)
- `express-validator` — input trimming, type checking, max-length (1000 chars)
- `express-rate-limit` — 100 requests / 15 min per IP
- XSS-safe HTML rendering (entities escaped before innerHTML)
- API keys never exposed to frontend

**Efficiency:**
- `node-cache` — frequent questions answered in <5ms (no Gemini API call)
- Gemini 1.5 Flash chosen for speed/quality balance
- Chat history capped at 20 entries to control token usage
- Static assets served by Express with browser caching

**Accessibility:**
- `aria-live="polite"` on chat log
- `sr-only` labels for screen readers
- Semantic HTML5 (`main`, `header`, `form`, `role="log"`)
- Keyboard navigation fully supported
- `prefers-reduced-motion` compatible animations
- `lang="en-IN"` declared on `<html>`

**Testing (Jest + Supertest):**
- Empty message rejection (400)
- Message length enforcement (>1000 chars)
- XSS payload handling
- Invalid language parameter
- Security headers verification (helmet)
- Cache consistency (same query returns cached response)
- History array validation
- Health endpoint correctness
- Root HTML serving

## 🛠️ Setup

```bash
# 1. Clone & install
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env: add your GEMINI_API_KEY and ALLOWED_ORIGIN

# 3. Run
npm start
# Open http://localhost:3000

# 4. Test
npm test
```

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| AI | Google Gemini 1.5 Flash |
| Backend | Node.js, Express |
| Frontend | Vanilla JS (ES6+), HTML5, CSS3 |
| PWA | Service Worker, Web App Manifest |
| Security | Helmet, express-validator, express-rate-limit |
| Logging | Winston |
| Caching | node-cache |
| Testing | Jest, Supertest |
| Deployment | Docker → Render Cloud |

## 📌 Assumptions
- Users have internet access (PWA provides offline fallback message)
- Information scope is ECI / Indian Election Commission guidelines
- Bot assumes good faith; safety guardrails handle political bias attempts
