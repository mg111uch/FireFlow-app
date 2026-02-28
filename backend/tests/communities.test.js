// y
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../database');

// Mock the database and middleware
jest.mock('../database');
const authenticateToken = (req, res, next) => {
    req.user = { id: 1, username: 'testuser' };
    next();
};

const app = express();
app.use(express.json());

const JWT_SECRET = 'your_jwt_secret';

// Simplified routes for testing
app.post('/api/communities', authenticateToken, (req, res) => {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    db.run('INSERT INTO communities (name, description, creator_id) VALUES (?, ?, ?)', [name, description || '', req.user.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        const newCommunityId = this.lastID;
        db.run('INSERT INTO community_members (user_id, community_id) VALUES (?, ?)', [req.user.id, newCommunityId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id: newCommunityId, name, description, creator_id: req.user.id });
        });
    });
});

app.get('/api/communities', (req, res) => {
    db.all('SELECT * FROM communities', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

describe('Community API Endpoints', () => {

    beforeEach(() => {
        db.run.mockClear();
        db.all.mockClear();
        db.get.mockClear();
    });

    describe('POST /api/communities', () => {
        it('should create a new community when authenticated', async () => {
            // Mock the two db.run calls
            db.run.mockImplementationOnce((sql, params, callback) => {
                // For the INSERT INTO communities call
                callback.call({ lastID: 123 }, null);
            }).mockImplementationOnce((sql, params, callback) => {
                // For the INSERT INTO community_members call
                callback(null);
            });

            const res = await request(app)
                .post('/api/communities')
                .send({
                    name: 'Test Community',
                    description: 'A community for testing'
                });

            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body.name).toBe('Test Community');
            expect(db.run).toHaveBeenCalledTimes(2);
        });

        it('should return 400 if name is missing', async () => {
            const res = await request(app)
                .post('/api/communities')
                .send({
                    description: 'A community for testing'
                });
            
            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('error', 'Name is required');
        });
    });

    describe('GET /api/communities', () => {
        it('should return a list of communities', async () => {
            const mockCommunities = [{ id: 1, name: 'Community 1' }, { id: 2, name: 'Community 2' }];
            db.all.mockImplementation((sql, params, callback) => callback(null, mockCommunities));

            const res = await request(app).get('/api/communities');

            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual(mockCommunities);
            expect(db.all).toHaveBeenCalledWith('SELECT * FROM communities', [], expect.any(Function));
        });
    });

});
