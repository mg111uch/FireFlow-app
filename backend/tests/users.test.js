// y
const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database'); // Assuming database is in the parent directory

// Mock the database
jest.mock('../database');

const app = express();
app.use(express.json());

// You would import your actual routes here, but for demonstration, we'll redefine them.
// This is a simplified version of your user routes.
const JWT_SECRET = 'your_jwt_secret';

app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({ error: 'Username or email already exists.' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ message: 'User registered successfully!' });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error during registration.' });
    }
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(400).json({ error: 'Invalid username or password.' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid username or password.' });
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    });
});


describe('User API Endpoints', () => {

    beforeEach(() => {
        // Reset the mock before each test
        db.run.mockClear();
        db.get.mockClear();
    });

    describe('POST /api/register', () => {
        it('should register a new user successfully', async () => {
            db.run.mockImplementation((sql, params, callback) => callback(null));

            const res = await request(app)
                .post('/api/register')
                .send({
                    username: 'testuser',
                    email: 'test@example.com',
                    password: 'password123'
                });

            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('message', 'User registered successfully!');
            expect(db.run).toHaveBeenCalledWith(expect.any(String), ['testuser', 'test@example.com', expect.any(String)], expect.any(Function));
        });

        it('should return 409 if username or email already exists', async () => {
            db.run.mockImplementation((sql, params, callback) => callback({ message: 'UNIQUE constraint failed' }));

            const res = await request(app)
                .post('/api/register')
                .send({
                    username: 'testuser',
                    email: 'test@example.com',
                    password: 'password123'
                });

            expect(res.statusCode).toEqual(409);
            expect(res.body).toHaveProperty('error', 'Username or email already exists.');
        });
    });

    describe('POST /api/login', () => {
        it('should login a user and return a token', async () => {
            const hashedPassword = await bcrypt.hash('password123', 10);
            const mockUser = { id: 1, username: 'testuser', password: hashedPassword };
            db.get.mockImplementation((sql, params, callback) => callback(null, mockUser));

            const res = await request(app)
                .post('/api/login')
                .send({
                    username: 'testuser',
                    password: 'password123'
                });

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('token');
        });

        it('should return 400 for invalid credentials', async () => {
            db.get.mockImplementation((sql, params, callback) => callback(null, null));

            const res = await request(app)
                .post('/api/login')
                .send({
                    username: 'wronguser',
                    password: 'wrongpassword'
                });

            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('error', 'Invalid username or password.');
        });
    });

});
