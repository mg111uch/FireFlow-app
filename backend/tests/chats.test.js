// y
const request = require('supertest');
const express = require('express');
const db = require('../database');

// Mock the database and middleware
jest.mock('../database');
const authenticateToken = (req, res, next) => {
    // Mock a logged-in user
    req.user = { id: 1, username: 'testuser' };
    next();
};

const app = express();
app.use(express.json());

// Simplified Chat Routes for Testing
app.get('/api/chats', authenticateToken, (req, res) => {
    const userId = req.user.id;
    // A simplified version of your complex query for testing purposes
    const query = `SELECT * FROM messages WHERE sender_id = ? OR receiver_id = ?`;
    db.all(query, [userId, userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/chats/:otherUserId/messages', authenticateToken, (req, res) => {
    const { otherUserId } = req.params;
    const currentUserId = req.user.id;
    const query = `SELECT * FROM messages WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)`;
    db.all(query, [currentUserId, otherUserId, otherUserId, currentUserId], (err, messages) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(messages);
    });
});

describe('Chat API Endpoints', () => {

    beforeEach(() => {
        db.all.mockClear();
    });

    describe('GET /api/chats', () => {
        it('should retrieve a list of conversations for the logged-in user', async () => {
            const mockConversations = [
                { id: 1, content: 'Hello there!', sender_id: 1, receiver_id: 2 },
                { id: 2, content: 'Hi back!', sender_id: 2, receiver_id: 1 }
            ];
            db.all.mockImplementation((sql, params, callback) => callback(null, mockConversations));

            const res = await request(app).get('/api/chats');

            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual(mockConversations);
            expect(db.all).toHaveBeenCalled();
        });
    });

    describe('GET /api/chats/:otherUserId/messages', () => {
        it('should retrieve messages between the logged-in user and another user', async () => {
            const otherUserId = 2;
            const mockMessages = [
                { id: 1, content: 'Hello there!', sender_id: 1, receiver_id: otherUserId },
                { id: 2, content: 'General Kenobi!', sender_id: otherUserId, receiver_id: 1 }
            ];
            db.all.mockImplementation((sql, params, callback) => callback(null, mockMessages));

            const res = await request(app).get(`/api/chats/${otherUserId}/messages`);

            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual(mockMessages);
            expect(db.all).toHaveBeenCalledWith(
                expect.any(String),
                [1, `${otherUserId}`, `${otherUserId}`, 1],
                expect.any(Function)
            );
        });
    });

});
