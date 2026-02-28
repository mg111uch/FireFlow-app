// tests/auth.test.js
// y
const request = require('supertest');
const express = require('express');
const db = require('../database'); // Your configured database

const app = require('../app'); // Assuming index.js exports the app
const server = require('../server');

describe('Auth API', () => {
    // Clean the users table before each test to ensure isolation
    beforeEach((done) => {
        db.run('DELETE FROM users', () => done());
    });

    // Test case for successful user registration
    it('should register a new user successfully', async () => {
        const res = await request(app)
        .post('/api/auth/register')
        .send({
            username: 'alice',
            email: 'alice@example.com',
            password: 'password123',
        });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('message', 'User registered successfully!');

        // Verify the user was actually added to the database
        db.get('SELECT * FROM users WHERE username = ?', ['alice'], (err, user) => {
            expect(user).toBeDefined();
            expect(user.email).toBe('alice@example.com');
        });
    });

    // Test case for trying to register a user that already exists
    it('should return 409 if username or email already exists', async () => {
        // First, create a user
    await request(app)
        .post('/api/auth/register')
        .send({
            username: 'existinguser',
            email: 'existing@example.com',
            password: 'password123',
        });

        // Then, try to create the same user again
        const res = await request(app)
        .post('/api/auth/register')
        .send({
            username: 'existinguser',
            email: 'another@example.com',
            password: 'password123',
        });

        expect(res.statusCode).toEqual(409);
        expect(res.body).toHaveProperty('error', 'Username or email already exists.');
    });

    // Test case for missing required fields
    it('should return 400 if required fields are missing', async () => {
        const res = await request(app)
        .post('/api/auth/register')
        .send({
            username: 'testuser',
            // Password is intentionally omitted
        });

        expect(res.statusCode).toEqual(400);
        expect(res.body).toHaveProperty('error', 'All fields are required');
    });

    // Test case for successful user login
    it('should login an existing user successfully', async () => {
        // First, register a user
        await request(app)
            .post('/api/auth/register')
            .send({
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123',
            });

        // Then, login with the same credentials
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                username: 'testuser',
                password: 'password123',
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('token');
    });
});

afterAll(() => {
  server.close();
});