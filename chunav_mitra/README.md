# Chunav Mitra - Your Election Friend 🇮🇳

## 📌 Vertical Chosen
**AI Assistant for the Election Process (Indian Version)**
This project acts as an interactive, highly knowledgeable, and non-partisan AI guide to help Indian citizens navigate the democratic election process seamlessly.

## 🚀 How It Works
Chunav Mitra is a full-stack web application. It features a responsive, accessible HTML/CSS/JS frontend that communicates with a Node.js Express backend. The backend is integrated with the **Google Gemini API**, leveraging powerful generative AI to understand user queries, process conversational context, and provide factual, ECI-compliant information.

## 🧠 Approach & Logic
1. **System Persona:** A strong system instruction is passed to the Gemini model to enforce a strict "Chunav Mitra" persona. It guarantees the bot remains non-partisan, refuses to predict election results, and simplifies complex jargon.
2. **Context Retention:** The application maintains the conversational history (using Gemini's `history` array) so the AI remembers prior interactions and can guide the user step-by-step through processes like Form 6 registration.
3. **Google Services Integration:** The core intelligence is powered by **Google Gemini 1.5 Flash**, offering lightning-fast, high-quality NLP capabilities. 

## 🛡️ Evaluation Criteria Addressed
- **Code Quality:** Organized structure (Frontend in `/public`, simple API router in `server.js`).
- **Security:** API keys are protected in a `.env` file on the server. The frontend never exposes the Google API key. Basic input sanitization is used.
- **Efficiency:** Single-page application logic minimizes reloading. Fast response times using the Gemini Flash model.
- **Accessibility:** UI uses semantic HTML, `aria-live`, `sr-only` classes, and high-contrast color themes (Tiranga inspired).
- **Testing:** A basic `test.js` script is included to mock API functionality.

## 📌 Assumptions Made
- The user has access to the internet.
- The user requires information specific to the Election Commission of India (ECI).
- The bot assumes the user is asking in good faith but will trigger safety guardrails if asked biased political questions.

## 🛠️ Setup Instructions
1. Run `npm install`
2. Create a `.env` file in the root directory and add your Google Gemini API key: `GEMINI_API_KEY=your_key_here`
3. Run `npm start`
4. Open `http://localhost:3000` in your browser.
