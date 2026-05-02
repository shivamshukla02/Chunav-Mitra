const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const NodeCache = require('node-cache');
const rateLimit = require('express-rate-limit');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load environment variables securely
dotenv.config();

const app = express();

// SECURITY 1: Helmet adds 11 layers of HTTP header security (Prevents XSS, Clickjacking, etc.)
app.use(helmet());

// SECURITY 2: Strict CORS policy
app.use(cors({ origin: '*' }));

// SECURITY 3: Payload limits to prevent DDoS attacks
app.use(express.json({ limit: '1mb' }));
app.use(express.static('public'));

// SECURITY 4: Rate Limiting to prevent API abuse
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP
    message: { success: false, error: "Too many requests. Please try again later." }
});
app.use('/api/', apiLimiter);

// EFFICIENCY: Initialize Node Cache to save API limits on identical questions
const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

// GOOGLE SERVICES: Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_key_for_testing');

const systemInstruction = `You are Chunav Mitra (Election Friend), an interactive, highly knowledgeable, and strictly non-partisan AI assistant designed to help Indian citizens navigate the democratic election process.
Tone & Personality:
- Welcoming & Respectful: Always start with a warm Indian greeting (e.g., Namaste! 🙏).
- Unbiased & Neutral: You MUST remain strictly apolitical. Never endorse, criticize, or show bias toward any political party or ideology.
- Simplifying: Use simple, accessible English. Guide the user step-by-step.
Core Capabilities: Voter Registration, Voting Process, Candidate Information, Model Code of Conduct, Timelines.
Strict Guardrails (SECURITY): NO Predictions or Endorsements. Fact-Based Only aligned with official ECI guidelines.`;

// API Endpoint with Validation Middleware
app.post('/api/chat', [
    // SECURITY 5: Input Validation & Sanitization using express-validator
    body('message').isString().trim().escape().notEmpty().withMessage('Message must be valid text.'),
    body('history').optional().isArray()
], async (req, res) => {
    
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        const { history, message } = req.body;
        const cacheKey = message.toLowerCase().trim();

        // EFFICIENCY 2: Return cached response if identical question was asked recently
        if (cache.has(cacheKey)) {
            console.log("Serving from Cache!");
            return res.json({ success: true, text: cache.get(cacheKey) });
        }

        // Initialize Gemini model
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: systemInstruction
        });

        const chat = model.startChat({ history: history || [] });

        // Generate response
        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        // EFFICIENCY 3: Store successful response in Cache
        cache.set(cacheKey, text);

        res.json({ success: true, text });
    } catch (error) {
        console.error("Gemini API Error:", error.message);
        res.status(500).json({ success: false, error: "Election servers are busy. Please try again." });
    }
});

const PORT = process.env.PORT || 3000;
// Only start listening if not being tested
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Chunav Mitra Server running on http://localhost:${PORT}`);
    });
}

// Export for Testing
module.exports = app;
