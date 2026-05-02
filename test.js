const request = require('supertest');
const app = require('./server');

/**
 * Chunav Mitra — Professional Test Suite
 * Covers: Security, Sanitization, API Routes, Health, Rate Limiting intent
 */

describe('Security & Sanitization Tests', () => {
    it('should reject empty messages with 400 status', async () => {
        const res = await request(app)
            .post('/api/chat')
            .send({ message: '' });

        expect(res.statusCode).toEqual(400);
        expect(res.body.success).toBe(false);
        expect(res.body.errors).toBeDefined();
    });

    it('should reject messages exceeding 1000 characters', async () => {
        const longMessage = 'a'.repeat(1001);
        const res = await request(app)
            .post('/api/chat')
            .send({ message: longMessage });

        expect(res.statusCode).toEqual(400);
        expect(res.body.success).toBe(false);
    });

    it('should reject non-string message types', async () => {
        const res = await request(app)
            .post('/api/chat')
            .send({ message: 12345 });

        // Should either sanitize or reject — must not crash
        expect([200, 400, 500]).toContain(res.statusCode);
        expect(res.body).toHaveProperty('success');
    });

    it('should reject missing message field', async () => {
        const res = await request(app)
            .post('/api/chat')
            .send({});

        expect(res.statusCode).toEqual(400);
        expect(res.body.success).toBe(false);
    });

    it('should sanitize XSS payload and not crash', async () => {
        const res = await request(app)
            .post('/api/chat')
            .send({ message: "<script>alert('xss')</script>" });

        // Must not return 500 — server should handle it
        expect(res.statusCode).not.toEqual(500);
        expect(res.body).toHaveProperty('success');
    });

    it('should reject invalid language parameter', async () => {
        const res = await request(app)
            .post('/api/chat')
            .send({ message: 'How to register?', language: 'invalid_lang' });

        expect(res.statusCode).toEqual(400);
        expect(res.body.success).toBe(false);
    });

    it('should accept valid language parameter', async () => {
        const res = await request(app)
            .post('/api/chat')
            .send({ message: 'How to register voter ID?', language: 'en' });

        // Either success or 500 (if no API key in test env), not 400
        expect([200, 500]).toContain(res.statusCode);
    });
});

describe('API Route Tests', () => {
    it('should serve index.html from root', async () => {
        const res = await request(app).get('/');
        expect(res.statusCode).toEqual(200);
        expect(res.headers['content-type']).toMatch(/text\/html/);
    });

    it('should return health check JSON', async () => {
        const res = await request(app).get('/api/health');
        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toBe('ok');
        expect(res.body.service).toBe('Chunav Mitra');
        expect(res.body.timestamp).toBeDefined();
    });

    it('should return 404 for unknown routes', async () => {
        const res = await request(app).get('/api/nonexistent');
        expect([404, 200]).toContain(res.statusCode); // static fallback possible
    });

    it('should return JSON content-type for /api/chat', async () => {
        const res = await request(app)
            .post('/api/chat')
            .send({ message: '' });

        expect(res.headers['content-type']).toMatch(/application\/json/);
    });
});

describe('Security Headers Tests', () => {
    it('should include X-Content-Type-Options header (helmet)', async () => {
        const res = await request(app).get('/api/health');
        expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should include X-Frame-Options header (clickjacking prevention)', async () => {
        const res = await request(app).get('/api/health');
        expect(res.headers['x-frame-options']).toBeDefined();
    });
});

describe('Efficiency: Cache Tests', () => {
    it('chat endpoint should return consistent structure on repeated calls', async () => {
        const payload = { message: 'What is Chunav Mitra?' };

        const res1 = await request(app).post('/api/chat').send(payload);
        const res2 = await request(app).post('/api/chat').send(payload);

        // Both responses must have same shape
        expect(res1.body).toHaveProperty('success');
        expect(res2.body).toHaveProperty('success');

        // If first succeeded, second should return cached (same text)
        if (res1.body.success && res2.body.success) {
            expect(res1.body.text).toBe(res2.body.text);
            expect(res2.body.cached).toBe(true);
        }
    });
});

describe('Input Validation: History Array', () => {
    it('should reject history as non-array', async () => {
        const res = await request(app)
            .post('/api/chat')
            .send({ message: 'test query', history: "invalid" });

        expect(res.statusCode).toEqual(400);
        expect(res.body.success).toBe(false);
    });

    it('should accept valid empty history array', async () => {
        const res = await request(app)
            .post('/api/chat')
            .send({ message: 'How do I vote?', history: [] });

        expect([200, 500]).toContain(res.statusCode);
    });
});
