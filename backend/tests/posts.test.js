// y
const request = require('supertest');
const http = require('http');
// const { Server } = require('socket.io-client');
const app = require('../index'); // Assuming index.js exports the app
const server = require('../index');
const db = require('../database');

// let server;
let token;
let testUser;
let testCommunity;

// Utility function to promisify db.run
const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

// Utility function to promisify db.get
const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

describe('Posts API', () => {

    beforeAll(async () => {
        // Use a real server instance to allow socket.io connections if needed
        // server = http.createServer(app);
        
        // Setup a test user and community
        // await db.run('DELETE FROM users');
        // await db.run('DELETE FROM communities');
        // await db.run('DELETE FROM posts');

        // Register a test user
        await request(app)
            .post('/api/register')
            .send({
                username: 'posttester',
                email: 'posttester@example.com',
                password: 'password123'
            });
        
        testUser = await db.get('SELECT * FROM users WHERE username = ?', ['posttester']);
        console.log(testUser)

        // Log in to get a token
        const res = await request(app)
            .post('/api/login')
            .send({
                username: 'posttester',
                password: 'password123'
            });
        token = res.body.token;

        // Create a test community
        const communityRes = await request(app)
            .post('/api/communities')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'TestCommunityForPosts',
                description: 'A place for post tests'
            });
        testCommunity = communityRes.body;
    });

    afterAll(() => {
        server.close();
    });

    describe('POST /api/posts', () => {
        it('should create a new post with valid data and token', async () => {
            const res = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    title: 'My First Test Post',
                    content: 'This is the content of the test post.',
                    community_id: testCommunity.id
                });

            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body.title).toBe('My First Test Post');
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            const res = await request(app)
                .post('/api/posts')
                .send({
                    title: 'Unauthorized Post',
                    content: 'This should not work.',
                    community_id: testCommunity.id
                });

            expect(res.statusCode).toEqual(401);
        });

        it('should return 400 Bad Request if title is missing', async () => {
            const res = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    content: 'This post has no title.',
                    community_id: testCommunity.id
                });

            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('error', 'Title and community are required.');
        });
    });

    describe('GET /api/posts', () => {
        it('should return a list of all posts', async () => {
            // First, ensure there's at least one post
            await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${token}`)
                .send({ title: 'Another Post', content: 'Content here', community_id: testCommunity.id });

            const res = await request(app).get('/api/posts');
            
            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
            expect(res.body[0]).toHaveProperty('title');
            expect(res.body[0]).toHaveProperty('community_name');
        });
    });

    describe('GET /api/posts/:id', () => {
        let postId;

        beforeAll(async () => {
            // Create a post to fetch
            const postRes = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${token}`)
                .send({ title: 'A Post to Fetch', content: 'Details here', community_id: testCommunity.id });
            postId = postRes.body.id;
        });

        it('should return a single post with the correct ID', async () => {
            const res = await request(app).get(`/api/posts/${postId}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('id', postId);
            expect(res.body.title).toBe('A Post to Fetch');
            expect(res.body).toHaveProperty('upvotes');
            expect(res.body).toHaveProperty('downvotes');
        });

        it('should return 404 Not Found for a non-existent post ID', async () => {
            const res = await request(app).get('/api/posts/999999');
            expect(res.statusCode).toEqual(404);
        });
    });
    
    describe('POST /api/posts/:postId/vote', () => {
        let postId;

        beforeEach(async () => {
            // Create a fresh post for each vote test
            const postRes = await request(app)
                .post('/api/posts')
                .set('Authorization', `Bearer ${token}`)
                .send({ title: 'Post to Vote On', content: 'Vote content', community_id: testCommunity.id });
            postId = postRes.body.id;
        });

        it('should allow a user to upvote a post', async () => {
            const res = await request(app)
                .post(`/api/posts/${postId}/vote`)
                .set('Authorization', `Bearer ${token}`)
                .send({ vote_type: 1 });

            expect(res.statusCode).toEqual(201);
            expect(res.body.message).toBe('Vote recorded.');

            const post = await dbGet('SELECT SUM(vote_type) as score FROM votes WHERE post_id = ?', [postId]);
            expect(post.score).toBe(1);
        });

        it('should allow a user to change their vote from upvote to downvote', async () => {
            // First, upvote
            await request(app)
                .post(`/api/posts/${postId}/vote`)
                .set('Authorization', `Bearer ${token}`)
                .send({ vote_type: 1 });
            
            // Then, downvote
            const res = await request(app)
                .post(`/api/posts/${postId}/vote`)
                .set('Authorization', `Bearer ${token}`)
                .send({ vote_type: -1 });

            expect(res.statusCode).toEqual(200);
            expect(res.body.message).toBe('Vote updated.');

            const post = await dbGet('SELECT SUM(vote_type) as score FROM votes WHERE post_id = ?', [postId]);
            expect(post.score).toBe(-1);
        });

        it('should allow a user to remove their vote', async () => {
            // First, upvote
            await request(app)
                .post(`/api/posts/${postId}/vote`)
                .set('Authorization', `Bearer ${token}`)
                .send({ vote_type: 1 });

            // Then, remove the vote by sending the same vote type again
            const res = await request(app)
                .post(`/api/posts/${postId}/vote`)
                .set('Authorization', `Bearer ${token}`)
                .send({ vote_type: 1 });
            
            expect(res.statusCode).toEqual(200);
            expect(res.body.message).toBe('Vote removed.');

            const vote = await dbGet('SELECT * FROM votes WHERE post_id = ? AND user_id = ?', [postId, testUser.id]);
            expect(vote).toBeUndefined();
        });
    });
});


