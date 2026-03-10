// Service Form Edit Flow Tests
const request = require('supertest');
const express = require('express');
const db = require('../database');

jest.mock('../database');
jest.mock('../middleware/auth', () => ({
    authenticateToken: jest.fn((req, res, next) => {
        req.user = { id: 1, username: 'manigupt' };
        next();
    })
}));

const app = express();
app.use(express.json());

// Mocking the db.prepare function
const mockPrepare = {
    run: jest.fn(),
    finalize: jest.fn(),
};
db.prepare = jest.fn(() => mockPrepare);

// Import routes
const formsRouter = require('../routes/forms');
app.use('/api/forms', formsRouter());

describe('Service Form Edit Flow - Backend Tests', () => {

    beforeEach(() => {
        db.run.mockClear();
        db.get.mockClear();
        db.all.mockClear();
        db.prepare.mockClear();
        mockPrepare.run.mockClear();
        mockPrepare.finalize.mockClear();
    });

    // ============================================
    // Step 1: Check if service form exists
    // GET /api/forms/service/:serviceName/:subserviceName
    // Called by "Check Existing Service Form" button in ServiceSelector
    // ============================================

    describe('GET /api/forms/service/:serviceName/:subserviceName', () => {
        it('should return existing service form when found', async () => {
            const mockServiceForm = {
                id: 100,
                title: 'Plumbing Installation Form',
                description: 'Service form for plumbing',
                form_type: 'service',
                service_name: 'plumbing',
                subservice_name: 'installation',
                creator_id: 1
            };
            db.get.mockImplementation((sql, params, callback) => callback(null, mockServiceForm));

            const res = await request(app)
                .get('/api/forms/service/plumbing/installation');

            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual(mockServiceForm);
            expect(db.get).toHaveBeenCalledWith(
                expect.stringContaining('SELECT * FROM forms WHERE form_type = ?'),
                ['service', 'plumbing', 'installation'],
                expect.any(Function)
            );
        });

        it('should return 404 when service form does not exist', async () => {
            db.get.mockImplementation((sql, params, callback) => callback(null, null));

            const res = await request(app)
                .get('/api/forms/service/nonexistent/service');

            expect(res.statusCode).toEqual(404);
            expect(res.body).toHaveProperty('error', 'Service form not found.');
        });

        it('should return 500 on database error', async () => {
            db.get.mockImplementation((sql, params, callback) => callback(new Error('DB Error'), null));

            const res = await request(app)
                .get('/api/forms/service/plumbing/installation');

            expect(res.statusCode).toEqual(500);
            expect(res.body).toHaveProperty('error');
        });
    });

    // ============================================
    // Step 2: Get form details with questions
    // GET /api/forms/:formId
    // Called after checking for existing form to get questions
    // ============================================

    describe('GET /api/forms/:formId (for edit)', () => {
        it('should return form with questions and options', async () => {
            const mockForm = {
                id: 100,
                title: 'Plumbing Installation Form',
                description: 'Service form',
                form_type: 'service',
                creator_username: 'manigupt'
            };
            const mockQuestions = [
                { id: 1, question_text: 'What is your name?', question_type: 'text', order_index: 0, options: [] },
                { id: 2, question_text: 'Select service type', question_type: 'radio', order_index: 1, options: [] }
            ];
            const mockOptions = [
                { id: 1, option_text: 'Installation' },
                { id: 2, option_text: 'Repair' }
            ];

            let getCallCount = 0;
            db.get.mockImplementation((sql, params, callback) => {
                getCallCount++;
                if (getCallCount === 1) {
                    callback(null, mockForm);
                } else {
                    callback(null, null);
                }
            });

            db.all.mockImplementation((sql, params, callback) => {
                if (sql.includes('form_questions')) {
                    callback(null, mockQuestions);
                } else if (sql.includes('question_options')) {
                    callback(null, mockOptions);
                } else {
                    callback(null, []);
                }
            });

            const res = await request(app).get('/api/forms/100');

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('id', 100);
            expect(res.body).toHaveProperty('questions');
            expect(Array.isArray(res.body.questions)).toBe(true);
        });

        it('should return 404 when form is not found', async () => {
            db.get.mockImplementation((sql, params, callback) => callback(null, null));

            const res = await request(app).get('/api/forms/999');

            expect(res.statusCode).toEqual(404);
            expect(res.body).toHaveProperty('error', 'Form not found.');
        });
    });

    // ============================================
    // Step 3: Update a service form
    // PUT /api/forms/:formId
    // Called when saving edits to service form
    // ============================================

    describe('PUT /api/forms/:formId (Edit Service Form)', () => {
        it('should return 404 when form to update does not exist', async () => {
            db.get.mockImplementation((sql, params, callback) => callback(null, null));

            const res = await request(app)
                .put('/api/forms/999')
                .send({
                    title: 'Updated Title',
                    questions: [{ question_text: 'Q1?', question_type: 'text' }]
                });

            expect(res.statusCode).toEqual(404);
            expect(res.body).toHaveProperty('error', 'Form not found.');
        });

        it('should return 403 when user is not the creator', async () => {
            const mockForm = { id: 100, creator_id: 2 }; // Different creator
            db.get.mockImplementation((sql, params, callback) => callback(null, mockForm));

            const res = await request(app)
                .put('/api/forms/100')
                .send({
                    title: 'Updated Title',
                    questions: [{ question_text: 'Q1?', question_type: 'text' }]
                });

            expect(res.statusCode).toEqual(403);
            expect(res.body).toHaveProperty('error', 'You are not authorized to update this form.');
        });

        it('should return 400 when questions array is empty', async () => {
            const mockForm = { id: 100, creator_id: 1 };
            db.get.mockImplementation((sql, params, callback) => callback(null, mockForm));

            const res = await request(app)
                .put('/api/forms/100')
                .send({
                    title: 'Updated Title',
                    questions: []
                });

            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('error', 'Form must have at least one question.');
        });
    });

    // ============================================
    // Step 4: Delete a service form
    // DELETE /api/forms/:formId
    // Called when clicking "Delete Service" button
    // ============================================

    describe('DELETE /api/forms/:formId (Delete Service Form)', () => {
        it('should delete form successfully when user is creator', async () => {
            const mockForm = { id: 100, creator_id: 1 };
            db.get.mockImplementation((sql, params, callback) => callback(null, mockForm));
            db.run.mockImplementation((sql, params, callback) => {
                if (callback) callback(null);
            });

            const res = await request(app)
                .delete('/api/forms/100');

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('message', 'Form deleted successfully!');
            expect(db.run).toHaveBeenCalledWith(
                expect.stringContaining('DELETE FROM forms'),
                expect.arrayContaining([expect.any(String)]),
                expect.any(Function)
            );
        });

        it('should return 404 when form to delete does not exist', async () => {
            db.get.mockImplementation((sql, params, callback) => callback(null, null));

            const res = await request(app)
                .delete('/api/forms/999');

            expect(res.statusCode).toEqual(404);
            expect(res.body).toHaveProperty('error', 'Form not found.');
        });

        it('should return 403 when user is not the creator', async () => {
            const mockForm = { id: 100, creator_id: 2 }; // Different creator
            db.get.mockImplementation((sql, params, callback) => callback(null, mockForm));

            const res = await request(app)
                .delete('/api/forms/100');

            expect(res.statusCode).toEqual(403);
            expect(res.body).toHaveProperty('error', 'You are not authorized to delete this form.');
        });
    });
});
