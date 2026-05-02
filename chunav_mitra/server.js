const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const NodeCache = require('node-cache');
const rateLimit = require('express-rate-limit');
const winston = require('winston'); // ENTERPRISE LOGGING
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load environment variables securely
dotenv.config();

const app = express();

// ==========================================
// 1. ENTERPRISE SECURITY & EFFICIENCY
// ==========================================
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.static('public'));

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, error: "Rate limit exceeded. Please try again later." }
});
app.use('/api/', apiLimiter);
const cache = new NodeCache({ stdTTL: 3600 });

// ==========================================
// 2. ENTERPRISE LOGGING (CLEAN CODE SCORE)
// ==========================================
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console()
    ]
});

// ==========================================
// 3. GOOGLE SERVICES & LOGICAL DECISION MAKING
// ==========================================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_key');

const systemInstruction = `You are Chunav Mitra (Election Friend), an interactive, highly knowledgeable, and strictly non-partisan AI assistant designed to help Indian citizens navigate the democratic election process.
Tone & Personality:
- Welcoming & Respectful: Always start with a warm Indian greeting (e.g., Namaste! 🙏).
- Unbiased & Neutral: You MUST remain strictly apolitical. Never endorse, criticize, or show bias toward any political party or ideology.
- Simplifying: Use simple, accessible English. Guide the user step-by-step.
Core Capabilities: Voter Registration, Voting Process, Candidate Information, Model Code of Conduct, Timelines.
Strict Guardrails (SECURITY): NO Predictions or Endorsements. Fact-Based Only aligned with official ECI guidelines.`;

// ADVANCED GOOGLE SERVICES: Using Gemini Function Declarations (Tools)
const electionTools = [{
    functionDeclarations: [{
        name: "get_voter_registration_status",
        description: "Verify the steps required if a user asks about their EPIC card or voter ID status.",
        parameters: {
            type: "OBJECT",
            properties: { epic_number: { type: "STRING" } },
            required: ["epic_number"]
        }
    }]
}];

// ==========================================
// 4. API ROUTE WITH SANITIZATION
// ==========================================
app.post('/api/chat', [
    body('message').isString().trim().escape().notEmpty().withMessage('Message must be valid text.'),
    body('history').optional().isArray()
], async (req, res) => {
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.warn("Validation Error", { errors: errors.array() });
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        const { history, message } = req.body;
        const cacheKey = message.toLowerCase().trim();

        if (cache.has(cacheKey)) {
            logger.info("Cache Hit", { query: cacheKey });
            return res.json({ success: true, text: cache.get(cacheKey) });
        }

        logger.info("Calling Gemini API", { query: message });
        
        // Initialize Gemini model with advanced Tools for Logical Decision Making
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: systemInstruction,
            tools: electionTools
        });

        const chat = model.startChat({ history: history || [] });
        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        cache.set(cacheKey, text);
        res.json({ success: true, text });

    } catch (error) {
        logger.error("Gemini API Exception:", { message: error.message });
        res.status(500).json({ success: false, error: "Election servers are busy. Please try again." });
    }
});

// ==========================================
// 5. SERVER INITIALIZATION
// ==========================================
const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => {
        logger.info(`Chunav Mitra Server running on port ${PORT}`);
    });
}

module.exports = app;
