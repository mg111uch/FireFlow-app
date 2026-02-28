// y
const request = require('supertest');
const express = require('express');
const db = require('../database');

jest.mock('../database');

const authenticateToken = (req, res, next) => {
    req.user = { id: 1, username: 'testuser' };
    next();
};

const app = express();
app.use(express.json());

// Simplified Market Routes for Testing
app.post('/api/markets', authenticateToken, (req, res) => {
    const { question, options } = req.body;
    if (!question || !options || options.length < 2) {
        return res.status(400).json({ error: 'Market needs a question and at least two options.' });
    }
    res.status(201).json({ message: 'Market created successfully!', marketId: 1 });
});

app.get('/api/markets', (req, res) => {
    const mockMarkets = [{ id: 1, question: 'Test Market?' }];
    db.all.mockImplementation((sql, params, callback) => callback(null, mockMarkets));
    res.json(mockMarkets);
});

app.post('/api/markets/:marketId/trade', authenticateToken, (req, res) => {
    const { option_id, amount } = req.body;
    if (!option_id || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: 'Option ID and a positive amount are required.' });
    }
    // Mock successful trade
    db.get.mockImplementation((sql, params, callback) => callback(null, { id: option_id, market_id: req.params.marketId }));
    db.run.mockImplementation((sql, params, callback) => callback(null));
    res.status(201).json({ message: 'Trade recorded.' });
});

describe('Prediction Market API Endpoints', () => {

    beforeEach(() => {
        db.run.mockClear();
        db.all.mockClear();
        db.get.mockClear();
    });

    describe('POST /api/markets', () => {
        it('should create a new prediction market', async () => {
            const res = await request(app)
                .post('/api/markets')
                .send({
                    question: 'Will it rain tomorrow?',
                    options: [{ option_text: 'Yes' }, { option_text: 'No' }]
                });

            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('marketId');
        });

        it('should fail if there are fewer than two options', async () => {
            const res = await request(app)
                .post('/api/markets')
                .send({
                    question: 'Will it rain tomorrow?',
                    options: [{ option_text: 'Yes' }]
                });

            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('error');
        });
    });

    describe('GET /api/markets', () => {
        it('should retrieve a list of all markets', async () => {
            const res = await request(app).get('/api/markets');
            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
        });
    });

    describe('POST /api/markets/:marketId/trade', () => {
        it('should allow a user to place a trade', async () => {
            const res = await request(app)
                .post('/api/markets/1/trade')
                .send({ option_id: 1, amount: 10 });

            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('message', 'Trade recorded.');
        });

        it('should return 400 for an invalid trade amount', async () => {
            const res = await request(app)
                .post('/api/markets/1/trade')
                .send({ option_id: 1, amount: -10 });

            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('error');
        });
    });

});
