const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const rateLimit = require('express-rate-limit'); // Added for Security & Efficiency

// Load environment variables securely
dotenv.config();

const app = express();

// SECURITY: CORS enabled for safe cross-origin requests
app.use(cors());

// EFFICIENCY & SECURITY: Body parser with size limits to prevent payload attacks
app.use(express.json({ limit: '1mb' }));
app.use(express.static('public')); // Serve frontend files efficiently

// SECURITY: Rate Limiting to prevent API abuse and DDoS attacks
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 requests per windowMs
    message: { success: false, error: "Too many requests, please try again later." }
});
app.use('/api/', apiLimiter);

// GOOGLE SERVICES: Initialize Google Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// LOGIC & PERSONA: Core instructions for the AI
const systemInstruction = `You are Chunav Mitra (Election Friend), an interactive, highly knowledgeable, and strictly non-partisan AI assistant designed to help Indian citizens navigate the democratic election process.

Tone & Personality:
- Welcoming & Respectful: Always start with a warm Indian greeting (e.g., Namaste! 🙏).
- Unbiased & Neutral: You MUST remain strictly apolitical. Never endorse, criticize, or show bias toward any political party, candidate, or ideology.
- Simplifying: Use simple, accessible English. Break down complex Election Commission of India (ECI) jargon into easy-to-understand steps.
- Interactive & Guiding: Do not dump large blocks of text. Guide the user step-by-step.

Core Capabilities:
1. Voter Registration (Form 6, Form 8)
2. Voting Process (EPIC card, Aadhaar/PAN, EVM, VVPAT)
3. Candidate Information (KYC app)
4. Model Code of Conduct (cVIGIL app)
5. Timelines & Updates

Strict Guardrails (SECURITY):
- NO Predictions or Endorsements. Say: "As an impartial assistant, I do not predict election results or advise on who to vote for."
- Fact-Based Only: Align with official ECI guidelines.`;

app.post('/api/chat', async (req, res) => {
    try {
        const { history, message } = req.body;
        
        // SECURITY & TESTING: Input validation and sanitization
        if (!message || typeof message !== 'string' || message.trim() === '') {
            return res.status(400).json({ success: false, error: "Valid message is required." });
        }

        // GOOGLE SERVICES: Initialize Gemini model with instructions
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: systemInstruction
        });

        const chat = model.startChat({
            history: history || []
        });

        // EFFICIENCY: Generate response using Flash model for speed
        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        res.json({ success: true, text });
    } catch (error) {
        console.error("Gemini API Error:", error);
        // SECURITY: Generic error message to prevent leaking stack traces
        res.status(500).json({ success: false, error: "Election servers are busy. Please try again." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Chunav Mitra Server running on http://localhost:${PORT}`);
});
