// y 
// New file
const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

module.exports = (io, onlineUsers) => { 
    const router = express.Router();


    // GET conversations for the logged-in user
    router.get('/', authenticateToken, (req, res) => {
        const userId = req.user.id;
        // This query gets the latest message for each distinct conversation partner
        const query = `
            SELECT
                m.id,
                m.sender_id,
                m.receiver_id,
                m.content,
                m.created_at,
                m.read_status,
                u_sender.username AS sender_username,
                u_receiver.username AS receiver_username,
                CASE
                    WHEN m.sender_id = ? THEN u_receiver.id
                    ELSE u_sender.id
                END AS other_user_id,
                CASE
                    WHEN m.sender_id = ? THEN u_receiver.username
                    ELSE u_sender.username
                END AS other_username,
                (SELECT COUNT(*) FROM messages WHERE receiver_id = ? AND sender_id = (CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END) AND read_status = 0) AS unread_count
            FROM messages m
            JOIN users u_sender ON m.sender_id = u_sender.id
            JOIN users u_receiver ON m.receiver_id = u_receiver.id
            WHERE m.id IN (
                SELECT MAX(id)
                FROM messages
                WHERE sender_id = ? OR receiver_id = ?
                GROUP BY
                    MIN(sender_id, receiver_id),
                    MAX(sender_id, receiver_id)
            )
            ORDER BY m.created_at DESC;
        `;

        db.all(query, [userId, userId, userId, userId, userId, userId], (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            const conversations = rows.map(row => ({
                ...row,
                is_online: onlineUsers && onlineUsers.has(row.other_user_id),
            }));
            res.json(conversations);
        });
    });

    // GET messages for a specific chat
    router.get('/:otherUserId/messages', authenticateToken, (req, res) => {
        const { otherUserId } = req.params;
        const currentUserId = req.user.id;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 20; // Load 20 messages at a time
        const offset = (page - 1) * limit;

        const query = `
            SELECT
                m.*,
                u_sender.username AS sender_username,
                u_receiver.username AS receiver_username,
                rm.content AS replied_to_content,
                ru.username AS replied_to_username,
                (
                    SELECT json_group_array(
                        json_object('id', mr.id, 'user_id', mr.user_id, 'emoji', mr.emoji, 'username', u.username)
                    )
                    FROM message_reactions mr
                    JOIN users u ON mr.user_id = u.id
                    WHERE mr.message_id = m.id
                ) AS reactions
            FROM messages m
            JOIN users u_sender ON m.sender_id = u_sender.id
            JOIN users u_receiver ON m.receiver_id = u_receiver.id
            LEFT JOIN messages rm ON m.reply_to_message_id = rm.id
            LEFT JOIN users ru ON rm.sender_id = ru.id
            WHERE (m.sender_id = ? AND m.receiver_id = ?)
            OR (m.sender_id = ? AND m.receiver_id = ?)
            ORDER BY m.created_at DESC
            LIMIT ? OFFSET ?;
        `;

        db.all(query, [currentUserId, otherUserId, otherUserId, currentUserId, limit, offset], (err, messages) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            // Mark messages sent by the other user to current user as read
            db.run('UPDATE messages SET read_status = 1 WHERE sender_id = ? AND receiver_id = ? AND read_status = 0', [otherUserId, currentUserId], (updateErr) => {
                if (updateErr) console.error('Failed to mark messages as read:', updateErr.message);                
                
                const processedMessages = messages.map(msg => ({
                    ...msg,
                    reactions: msg.reactions ? JSON.parse(msg.reactions) : []
                }));

                res.json(processedMessages.reverse()); // Reverse to get chronological order for display
            });
        });
    });

    // Edit a message
    router.put('/messages/:messageId', authenticateToken, (req, res) => {
        const { messageId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        const query = 'UPDATE messages SET content = ?, edited = 1 WHERE id = ? AND sender_id = ?';
        db.run(query, [content, messageId, userId], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Message not found or user not authorized to edit it.' });
            }
            res.status(200).json({ message: 'Message updated successfully' });
        });
    });

    // Delete a message
    router.delete('/messages/:messageId', authenticateToken, (req, res) => {
        const { messageId } = req.params;
        const userId = req.user.id;

        const query = 'DELETE FROM messages WHERE id = ? AND sender_id = ?';
        db.run(query, [messageId, userId], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Message not found or user not authorized to delete it.' });
            }
            res.status(204).send();
        });
    });

    // Add a reaction to a message
    router.post('/:messageId/reactions', authenticateToken, (req, res) => {
        const { messageId } = req.params;
        const { emoji } = req.body;
        const userId = req.user.id;

        const query = 'INSERT INTO message_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)';
        db.run(query, [messageId, userId, emoji], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ id: this.lastID, message_id: messageId, user_id: userId, emoji });
        });
    });

    // Remove a reaction from a message
    router.delete('/:messageId/reactions/:reactionId', authenticateToken, (req, res) => {
        const { reactionId } = req.params;
        const userId = req.user.id;

        const query = 'DELETE FROM message_reactions WHERE id = ? AND user_id = ?';
        db.run(query, [reactionId, userId], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Reaction not found or user not authorized to delete it.' });
            }
            res.status(204).send();
        });
    });

    return router;
}
