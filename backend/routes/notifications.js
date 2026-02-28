// y
const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET notifications for the logged-in user (paginated)
router.get('/', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;
    const offset = (page - 1) * limit;

    const query = `
        SELECT
            n.id,
            n.type,
            n.post_id,
            n.comment_id,
            n.content_preview,
            n.is_read,
            n.created_at,
            sender.username as sender_username,
            p.title as post_title
        FROM notifications n
        JOIN users sender ON n.sender_id = sender.id
        JOIN posts p ON n.post_id = p.id
        WHERE n.recipient_id = ?
        ORDER BY n.created_at DESC
        LIMIT ? OFFSET ?
    `;

    db.all(query, [userId, limit, offset], (err, rows) => {
        if (err) {
            console.error("Failed to fetch notifications:", err);
            return res.status(500).json({ error: "Failed to fetch notifications." });
        }
        res.json(rows);
    });
});

// GET unread notification count
router.get('/unread-count', authenticateToken, (req, res) => {
    const userId = req.user.id;
    db.get('SELECT COUNT(*) as count FROM notifications WHERE recipient_id = ? AND is_read = 0', [userId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: "Failed to fetch unread notification count." });
        }
        res.json(row);
    });
});

// Mark all notifications as read
router.post('/mark-all-read', authenticateToken, (req, res) => {
    const userId = req.user.id;
    db.run('UPDATE notifications SET is_read = 1 WHERE recipient_id = ?', [userId], function(err) {
        if (err) {
            return res.status(500).json({ error: "Failed to mark notifications as read." });
        }
        res.status(200).json({ message: 'All notifications marked as read.' });
    });
});

module.exports = (io, onlineUsers) => {
  return router;
};