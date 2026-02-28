// y
const request = require('supertest');
const express = require('express');
const db = require('../database');

// Mock the database and middleware
jest.mock('../database');
const authenticateToken = (req, res, next) => {
    req.user = { id: 1, username: 'testuser' };
    next();
};

const app = express();
app.use(express.json());

// Simplified routes for testing
app.post('/api/posts/:postId/comments', authenticateToken, (req, res) => {
    const { postId } = req.params;
    const { content, parent_id } = req.body;
    const user_id = req.user.id;

    if (!content) {
        return res.status(400).json({ error: 'Comment content is required.' });
    }

    const query = 'INSERT INTO comments (post_id, user_id, content, parent_id) VALUES (?, ?, ?, ?)';
    const params = [postId, user_id, content, parent_id || null];

    db.run(query, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        const newCommentId = this.lastID;
        // In a real test, you might want to fetch the comment to return it
        res.status(201).json({ id: newCommentId, content, user_id });
    });
});

app.get('/api/posts/:postId/comments', (req, res) => {
    const { postId } = req.params;
    db.all('SELECT * FROM comments WHERE post_id = ?', [postId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});


describe('Comment API Endpoints', () => {

    beforeEach(() => {
        db.run.mockClear();
        db.all.mockClear();
    });

    describe('POST /api/posts/:postId/comments', () => {
        it('should add a new comment to a post', async () => {
            db.run.mockImplementation((sql, params, callback) => callback.call({ lastID: 1 }, null));

            const res = await request(app)
                .post('/api/posts/1/comments')
                .send({ content: 'This is a test comment' });

            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body.content).toBe('This is a test comment');
            expect(db.run).toHaveBeenCalled();
        });

        it('should return 400 if content is missing', async () => {
            const res = await request(app)
                .post('/api/posts/1/comments')
                .send({ content: '' });

            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('error', 'Comment content is required.');
        });
    });

    describe('GET /api/posts/:postId/comments', () => {
        it('should retrieve all comments for a given post', async () => {
            const mockComments = [
                { id: 1, content: 'First comment', post_id: 1 },
                { id: 2, content: 'Second comment', post_id: 1 }
            ];
            db.all.mockImplementation((sql, params, callback) => callback(null, mockComments));

            const res = await request(app).get('/api/posts/1/comments');

            expect(res.statusCode).toEqual(200);
            expect(res.body).toEqual(mockComments);
            expect(db.all).toHaveBeenCalledWith('SELECT * FROM comments WHERE post_id = ?', ['1'], expect.any(Function));
        });
    });

});
