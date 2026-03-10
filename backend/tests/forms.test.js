// y
const request = require('supertest');
const express = require('express');
const db = require('../database');

jest.mock('../database');

const authenticateToken = (req, res, next) => {
    req.user = { id: 1, username: 'manigupt' };
    next();
};

const app = express();
app.use(express.json());

// Mocking the db.prepare function
const mockPrepare = {
    run: jest.fn(),
    finalize: jest.fn(),
};
db.prepare = jest.fn(() => mockPrepare);

// Simplified Form Routes for Testing
app.post('/api/forms', authenticateToken, (req, res) => {
    const { title, questions } = req.body;
    if (!title || !questions || questions.length === 0) {
        return res.status(400).json({ error: 'Form must have a title and at least one question.' });
    }
    res.status(201).json({ message: 'Form created successfully!', formId: 99 });
});

app.get('/api/forms/:formId', (req, res) => {
    const { formId } = req.params;
    const mockForm = { id: formId, title: 'Test Form', questions: [] };
    db.get.mockImplementation((sql, params, callback) => callback(null, mockForm));
    db.all.mockImplementation((sql, params, callback) => callback(null, [])); // No questions for simplicity

    db.get('SELECT * FROM forms WHERE id = ?', [formId], (err, form) => {
        if (err || !form) return res.status(404).json({ error: 'Form not found.' });
        res.json(form);
    });
});

// Test Forms Submit with Payment
app.post('/api/forms/:formId/submit', (req, res) => {
    const { formId } = req.params;
    const { answers, paymentDetails } = req.body;
    
    if (!answers || !Array.isArray(answers) || answers.length === 0) {
        return res.status(400).json({ error: 'Answers are required.' });
    }
    
    // If paymentDetails exists, verify payment was successful
    if (paymentDetails && paymentDetails.status !== 'success') {
        return res.status(400).json({ error: 'Payment not completed.' });
    }
    
    // Mock submission
    res.status(201).json({ message: 'Form submitted successfully!', submissionId: 123 });
});

describe('Form API Endpoints', () => {

    beforeEach(() => {
        db.run.mockClear();
        db.get.mockClear();
        db.all.mockClear();
        db.prepare.mockClear();
        mockPrepare.run.mockClear();
        mockPrepare.finalize.mockClear();
    });

    describe('POST /api/forms', () => {
        it('should create a new form successfully', async () => {
            const res = await request(app)
                .post('/api/forms')
                .send({
                    title: 'My Test Form',
                    description: 'This is a test.',
                    questions: [{ text: 'Question 1?', type: 'text' }]
                });

            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('formId');
        });

        it('should return 400 if title is missing', async () => {
            const res = await request(app)
                .post('/api/forms')
                .send({ questions: [{ text: 'Q1', type: 'text' }] });

            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('error');
        });
    });

    describe('GET /api/forms/:formId', () => {
        it('should retrieve a specific form', async () => {
            const formId = 123;
            const mockForm = { id: formId, title: 'Sample Form' };
            db.get.mockImplementation((sql, params, callback) => callback(null, mockForm));

            const res = await request(app).get(`/api/forms/${formId}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual(mockForm);
            expect(db.get).toHaveBeenCalled();
        });

        it('should return 404 if form is not found', async () => {
            db.get.mockImplementation((sql, params, callback) => callback(null, null));

            const res = await request(app).get('/api/forms/999');

            expect(res.statusCode).toEqual(404);
        });
    });

    // ============================================
    // Form Submission with Payment Tests
    // ============================================
    
    describe('POST /api/forms/:formId/submit', () => {
        it('should submit form successfully without payment (free form)', async () => {
            const res = await request(app)
                .post('/api/forms/1/submit')
                .send({
                    answers: [
                        { questionId: 1, answerText: 'Test Answer 1' },
                        { questionId: 2, answerText: 'Test Answer 2' }
                    ]
                });

            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('message', 'Form submitted successfully!');
            expect(res.body).toHaveProperty('submissionId');
        });

        it('should submit form successfully with payment details', async () => {
            const res = await request(app)
                .post('/api/forms/1/submit')
                .send({
                    answers: [
                        { questionId: 1, answerText: 'Test Answer 1' }
                    ],
                    paymentDetails: {
                        transactionId: 'gpay_123456789',
                        status: 'success',
                        method: 'Google Pay'
                    }
                });

            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('message', 'Form submitted successfully!');
            expect(res.body).toHaveProperty('submissionId');
        });

        it('should return 400 if answers are missing', async () => {
            const res = await request(app)
                .post('/api/forms/1/submit')
                .send({});

            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('error', 'Answers are required.');
        });

        it('should return 400 if answers array is empty', async () => {
            const res = await request(app)
                .post('/api/forms/1/submit')
                .send({ answers: [] });

            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('error', 'Answers are required.');
        });

        it('should return 400 if payment failed', async () => {
            const res = await request(app)
                .post('/api/forms/1/submit')
                .send({
                    answers: [
                        { questionId: 1, answerText: 'Test Answer' }
                    ],
                    paymentDetails: {
                        transactionId: 'failed_txn_123',
                        status: 'failed'
                    }
                });

            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('error', 'Payment not completed.');
        });

        it('should submit with mock UPI payment', async () => {
            const res = await request(app)
                .post('/api/forms/1/submit')
                .send({
                    answers: [
                        { questionId: 1, answerText: 'Test Answer' }
                    ],
                    paymentDetails: {
                        transactionId: 'mock_upi_987654321',
                        status: 'success',
                        method: 'Mock UPI'
                    }
                });

            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('message', 'Form submitted successfully!');
        });
    });

});
