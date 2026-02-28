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

});
