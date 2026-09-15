require('dotenv').config();
const app = require('./app');
const http = require('http');
const { Server } = require('socket.io');
const { format } = require('date-fns');
const db = require('./database');
const { getPostQueryFields } = require('./utils/postQueries');
const { authenticateToken } = require('./middleware/auth');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// In-memory store for online users (basic, for demonstration)
const onlineUsers = new Map(); // userId -> socketId

// In-memory store for unique visitors per month (basic, for demonstration)
// key: YYYY-MM, value: Set<userId>

const monthlyUniqueVisitors = new Map();

const io = new Server(server, {
  cors: {
    origin: process.env.NEXT_PUBLIC_URL || 'http://localhost:3000', // Allow requests from your frontend
    methods: ['GET', 'POST'],
  },
  // Allow passing token in handshake for Socket.IO authentication
  auth: {
    token: null,
  }
});

// Mount routes
app.use('/api/auth', require('./routes/auth')(io, onlineUsers));
app.use('/api/posts', require('./routes/posts')(io, onlineUsers));
app.use('/api/agent', require('./routes/agent')(io, onlineUsers));
app.use('/api/payments', authenticateToken, require('./routes/payments')(io, onlineUsers));
app.use('/api/flowpay', require('./routes/flowpay'));
app.use('/api/communities', require('./routes/communities')(io, onlineUsers));
app.use('/api/users', require('./routes/users')(io, onlineUsers));
app.use('/api/notifications', require('./routes/notifications')(io, onlineUsers));
app.use('/api/forms', require('./routes/forms')(io, onlineUsers));
app.use('/api/chats', require('./routes/chats')(io, onlineUsers));
app.use('/api/markets', require('./routes/markets')(io, onlineUsers));
app.use('/api/shops', require('./routes/shops'));
app.use('/api/shop-products', require('./routes/shop-products'));
app.use('/api/shop-orders', require('./routes/shop-orders'));
app.use('/api/gigs', require('./routes/gigs')(io, onlineUsers));
app.use('/api/modules', require('./routes/modules')(app));
app.use('/api/units', require('./routes/units')(io, onlineUsers));
app.use('/api/opportunities', require('./routes/opportunities')(io, onlineUsers));
app.use('/api/tasks', require('./routes/tasks')(io, onlineUsers));
app.use('/api/contracts', require('./routes/contracts')(io, onlineUsers));
app.use('/api/reputation', require('./routes/reputation')(io, onlineUsers));
app.use('/api/ledger', require('./routes/ledger')(io, onlineUsers));
app.use('/api/businesses', require('./routes/businesses')(io, onlineUsers));
app.use('/api/referrals', require('./routes/referrals')(io, onlineUsers));
app.use('/api/datasets', require('./routes/datasets')(io, onlineUsers));
app.use('/api/compute', require('./routes/compute')(io, onlineUsers));
app.use('/api/observations', require('./routes/observations')(io, onlineUsers));
app.use('/api/decisions', require('./routes/decisions')(io, onlineUsers));
app.use('/api/signals', require('./routes/signals')(io, onlineUsers));
app.use('/api/ventures', require('./routes/ventures')(io, onlineUsers));
app.use('/api/exports', require('./routes/exports')(io, onlineUsers));

// Additional routes
app.get('/api/search', (req, res) => {
    const query = req.query.q;
    const userId = req.user?.id;

    if (!query) {
        return res.status(400).json({ error: 'Search query is required.' });
    }

    const searchQuery = `
        SELECT ${getPostQueryFields(userId)}
        FROM posts p
        JOIN users u ON p.user_id = u.id
        JOIN communities c ON p.community_id = c.id
        LEFT JOIN votes v ON p.id = v.post_id
        WHERE p.title LIKE ? OR p.content LIKE ?
        GROUP BY p.id
        ORDER BY p.created_at DESC
    `;

    db.all(searchQuery, [`%${query}%`, `%${query}%`], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.get('/api/stats', async (req, res) => {
    try {
        const totalUsers = await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) AS count FROM users', (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });

        const onlineUsersCount = onlineUsers.size;

        // For unique visitors this month
        const currentMonth = format(new Date(), 'yyyy-MM');
        const visitorsSet = monthlyUniqueVisitors.get(currentMonth) || new Set();
        const uniqueVisitorsThisMonth = visitorsSet.size;

        res.json({
            totalUsers,
            onlineUsers: onlineUsersCount,
            uniqueVisitorsThisMonth
        });
    } catch (err) {
        console.error('Error fetching stats:', err);
        res.status(500).json({ error: 'Failed to fetch statistics.' });
    }
});

// Socket handlers
require('./utils/socketHandlers')(io, onlineUsers, monthlyUniqueVisitors, format);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});

module.exports = server;