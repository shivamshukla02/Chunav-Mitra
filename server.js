const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const NodeCache = require('node-cache');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();

const app = express();

// ==========================================
// 1. SECURITY
// ==========================================
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https://cdn-icons-png.flaticon.com"],
            connectSrc: ["'self'"]
        }
    }
}));

// Restrict CORS to own origin in prod, open in dev
const allowedOrigins = process.env.ALLOWED_ORIGIN
    ? [process.env.ALLOWED_ORIGIN]
    : ['http://localhost:3000'];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
    }
}));

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
// 2. LOGGING
// ==========================================
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [new winston.transports.Console()]
});

// ==========================================
// 3. GOOGLE SERVICES
// ==========================================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_key');

const systemInstruction = `You are Chunav Mitra (Election Friend), a knowledgeable and strictly non-partisan AI assistant helping Indian citizens navigate the democratic election process.

Tone & Personality:
- Welcoming & Respectful: Start with warm greetings. Use Namaste 🙏 occasionally.
- Unbiased & Neutral: Never endorse, criticize, or show bias toward any political party, leader, or ideology.
- Simple Language: Use accessible English. When the user writes in Hindi/Hinglish, respond in Hinglish too.
- Step-by-Step: Break complex processes into numbered steps.

Core Knowledge Areas:
1. Voter Registration (Form 6, NVSP portal, required documents)
2. Voter ID / EPIC card (application, correction, download e-EPIC)
3. Voting Process (EVM usage, VVPAT, voting day procedure)
4. Candidate & Constituency info (how to find, ECI resources)
5. Model Code of Conduct (what is allowed/not allowed during elections)
6. NRI Voting, Overseas voter registration
7. Grievance redressal (1950 helpline, cVIGIL app)

Strict Guardrails:
- NEVER predict election results or endorse any party/candidate
- NEVER share unverified information — always refer to official ECI sources
- If asked political opinion questions, politely decline and redirect to factual info
- Always mention official resources: voters.eci.gov.in, nvsp.in, 1950 helpline

When the user provides their EPIC number or asks about voter ID status, use the get_voter_registration_status function.
When the user asks about polling booth location, use the get_polling_booth_info function.
When the user asks about a constituency or candidate, use the get_constituency_info function.`;

// ==========================================
// 4. FUNCTION DECLARATIONS (Gemini Tools)
// ==========================================
const electionTools = [{
    functionDeclarations: [
        {
            name: "get_voter_registration_status",
            description: "Check voter registration status and provide guidance when user mentions their EPIC number or asks about voter ID card status, correction, or download.",
            parameters: {
                type: "OBJECT",
                properties: {
                    epic_number: {
                        type: "STRING",
                        description: "The EPIC (Electors Photo Identity Card) number provided by the user"
                    },
                    query_type: {
                        type: "STRING",
                        description: "Type of query: 'status', 'correction', 'download', or 'new_registration'"
                    }
                },
                required: ["query_type"]
            }
        },
        {
            name: "get_polling_booth_info",
            description: "Provide polling booth location guidance when user asks where to vote, their polling station, or booth details.",
            parameters: {
                type: "OBJECT",
                properties: {
                    state: {
                        type: "STRING",
                        description: "Indian state name"
                    },
                    district: {
                        type: "STRING",
                        description: "District name"
                    }
                },
                required: []
            }
        },
        {
            name: "get_constituency_info",
            description: "Provide information about constituencies, how to find candidate lists, and how to use ECI tools.",
            parameters: {
                type: "OBJECT",
                properties: {
                    constituency_name: {
                        type: "STRING",
                        description: "Name of the constituency"
                    },
                    info_type: {
                        type: "STRING",
                        description: "Type: 'candidates', 'boundaries', 'results_history'"
                    }
                },
                required: ["info_type"]
            }
        }
    ]
}];

// ==========================================
// 5. FUNCTION CALL HANDLERS (Logical Decision Making)
// ==========================================
function handleFunctionCall(functionName, args) {
    logger.info("Function call triggered", { functionName, args });

    if (functionName === "get_voter_registration_status") {
        const { epic_number, query_type } = args;
        const responses = {
            status: `**Voter Registration Status Check**\n\nTo check your voter registration status for EPIC ${epic_number || 'your card'}:\n\n1. 🌐 Visit **voters.eci.gov.in**\n2. Click on **"Search in Electoral Roll"**\n3. Enter your EPIC number or personal details\n4. Your registration status will be displayed instantly\n\n📞 Alternatively, call **1950** (National Voter Helpline) — free, available in all Indian languages.\n\n✅ You can also download your **e-EPIC** (digital voter ID) from the same portal.`,
            correction: `**Voter ID Correction Process**\n\nTo correct details on your EPIC card:\n\n1. Visit **voters.eci.gov.in** or **nvsp.in**\n2. Click **"Fill Form 8"** (Correction of entries)\n3. Upload supporting documents (Aadhaar, birth certificate)\n4. Submit online — no office visit needed!\n\n⏱️ Processing time: 30–45 days\n📍 You can track status on the same portal.`,
            download: `**Download e-EPIC (Digital Voter ID)**\n\n1. Visit **voters.eci.gov.in**\n2. Click **"e-EPIC Download"**\n3. Enter EPIC number${epic_number ? ` (yours: ${epic_number})` : ''} or mobile number\n4. Verify via OTP\n5. Download PDF — valid ID proof for voting! ✅\n\n📱 Also available on **Voter Helpline App** (Android & iOS).`,
            new_registration: `**New Voter Registration (Form 6)**\n\n**Eligibility:** Indian citizen, 18+ years, resident of constituency\n\n**Steps:**\n1. Visit **voters.eci.gov.in**\n2. Click **"New Registration"** → Fill **Form 6**\n3. Upload: Proof of Age + Proof of Address\n4. Submit — get Application Reference Number\n\n**Documents needed:**\n📄 Age proof: Aadhaar / Birth Certificate / Class 10 Marksheet\n🏠 Address proof: Aadhaar / Utility Bill / Bank Passbook\n\n⏱️ Processing: 30–60 days. Track at nvsp.in`
        };
        return responses[query_type] || responses['status'];
    }

    if (functionName === "get_polling_booth_info") {
        const { state, district } = args;
        return `**Find Your Polling Booth** 🗳️\n\n${state ? `For ${state}${district ? ', ' + district : ''}:\n\n` : ''}**Official Methods:**\n\n1. 🌐 **Online:** voters.eci.gov.in → "Know Your Polling Station"\n2. 📱 **App:** Download **"Voter Helpline"** app → Polling Station Locator\n3. 📞 **Call:** Dial **1950** — tell them your name/EPIC number\n4. 📄 **SMS:** Send ECIPP<EPIC Number> to 1950\n\n**On Voting Day:**\n- Carry your EPIC card or any approved photo ID\n- Polls open **7 AM – 6 PM** (timings may vary by state)\n- Booth marked on your EPIC card slip sent by BLO\n\n🔍 Tip: Save your booth address before election day!`;
    }

    if (functionName === "get_constituency_info") {
        const { constituency_name, info_type } = args;
        const responses = {
            candidates: `**Candidate Information**\n\n${constituency_name ? `For ${constituency_name}:\n\n` : ''}Official candidate lists are published by ECI:\n\n1. Visit **eci.gov.in** → Current Elections → Candidate List\n2. Or check **affidavits** (criminal records, assets) at **myneta.info**\n3. **Voter Helpline App** shows candidate list for your constituency\n\n⚖️ As Chunav Mitra, I remain neutral — I provide information, not endorsements.`,
            boundaries: `**Constituency Boundaries**\n\n${constituency_name ? `For ${constituency_name}:\n\n` : ''}To find constituency boundaries:\n\n1. Visit **eci.gov.in** → Delimitation\n2. Use **Voter Portal** → Know Your Constituency\n3. Enter your address to find which constituency you belong to\n\n📞 Call 1950 for assistance.`,
            results_history: `**Election Results History**\n\nPast election results are available at:\n1. **results.eci.gov.in** — official ECI results archive\n2. **eci.gov.in** → Statistical Reports\n\nResults available from 1951 onwards for all Lok Sabha & Vidhan Sabha elections.`
        };
        return responses[info_type] || responses['candidates'];
    }

    return null;
}

// ==========================================
// 6. GOOGLE TRANSLATE SERVICE
// ==========================================
async function detectAndTranslate(text) {
    // Detect if text contains Devanagari (Hindi) script
    const hindiPattern = /[\u0900-\u097F]/;
    const isHindi = hindiPattern.test(text);
    return { isHindi, originalText: text };
}

// ==========================================
// 7. API ROUTES
// ==========================================
app.post('/api/chat', [
    body('message').isString().trim().notEmpty().withMessage('Message must be valid text.').isLength({ max: 1000 }).withMessage('Message too long.'),
    body('history').optional().isArray().withMessage('History must be an array.'),
    body('language').optional().isIn(['en', 'hi', 'auto']).withMessage('Invalid language.')
], async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.warn("Validation Error", { errors: errors.array() });
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        // Sanitize manually after trim (escape removed to preserve Devanagari)
        const rawMessage = req.body.message.trim().slice(0, 1000);
        const { history, language } = req.body;

        // Detect language
        const { isHindi } = await detectAndTranslate(rawMessage);
        const langHint = isHindi ? ' [User is writing in Hindi/Devanagari — respond in simple Hinglish]' : '';

        const cacheKey = `${rawMessage.toLowerCase()}__${language || 'auto'}`;
        if (cache.has(cacheKey)) {
            logger.info("Cache Hit", { query: rawMessage });
            return res.json({ success: true, text: cache.get(cacheKey), cached: true });
        }

        logger.info("Calling Gemini API", { query: rawMessage, isHindi });

        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: systemInstruction,
            tools: electionTools
        });

        const chat = model.startChat({ history: history || [] });
        const result = await chat.sendMessage(rawMessage + langHint);
        const response = await result.response;

        // Handle function calls (Logical Decision Making)
        let finalText = '';
        const candidate = response.candidates?.[0];

        if (candidate?.content?.parts) {
            for (const part of candidate.content.parts) {
                if (part.functionCall) {
                    // Execute function and send result back to model
                    const fnResult = handleFunctionCall(part.functionCall.name, part.functionCall.args);
                    if (fnResult) {
                        // Send function result back to Gemini for natural response
                        const followUp = await chat.sendMessage([{
                            functionResponse: {
                                name: part.functionCall.name,
                                response: { content: fnResult }
                            }
                        }]);
                        finalText = followUp.response.text();
                    }
                } else if (part.text) {
                    finalText += part.text;
                }
            }
        }

        if (!finalText) {
            finalText = response.text();
        }

        cache.set(cacheKey, finalText);
        res.json({ success: true, text: finalText, language: isHindi ? 'hi' : 'en' });

    } catch (error) {
        logger.error("Gemini API Exception:", { message: error.message, stack: error.stack });
        res.status(500).json({ success: false, error: "Election servers are busy. Please try again in a moment." });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Chunav Mitra', timestamp: new Date().toISOString() });
});

// ==========================================
// 8. SERVER INIT
// ==========================================
const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => {
        logger.info(`Chunav Mitra Server running on port ${PORT}`);
    });
}

module.exports = app;
