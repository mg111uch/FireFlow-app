const express = require('express');
const db = require('../../database');
const { authenticateToken, optionalAuthenticateToken } = require('../../middleware/auth');
const { createNotification } = require('../../utils/notificationHelper');

module.exports = (io, onlineUsers) => {
  const router = express.Router();

  // Add a comment to a post
  router.post('/:postId/comments', authenticateToken, (req, res) => {
    const { postId } = req.params;
    const { content, parent_id } = req.body; // parent_id for nested comments
    const user_id = req.user.id;

    if (!content) {
      return res.status(400).json({ error: 'Comment content is required.' });
    }

    const query = 'INSERT INTO comments (post_id, user_id, content, parent_id) VALUES (?, ?, ?, ?)';
    const params = [postId, user_id, content, parent_id || null];

    db.run(query, params, function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      const newCommentId = this.lastID;

      // Fetch the newly created comment details
      db.get(`
        SELECT c.*, u.username
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.id = ?
      `, [newCommentId], (err, newComment) => {
        if (err || !newComment) {
          // Even if notifications fail, the user's comment is still created.
          return res.status(201).json({ id: newCommentId, message: "Comment created, but failed to process notifications." });
        }

        // Emit to post room for live comment updates for all viewers of the post
        io.to(`post-${postId}`).emit('newComment', newComment);

        const notifiedUsers = new Set([user_id]); // The commenter shouldn't be notified of their own actions.

        // 1. Handle Replies vs. New Top-Level Comments
        if (newComment.parent_id) {
          // This is a reply, notify the author of the parent comment
          db.get('SELECT user_id FROM comments WHERE id = ?', [newComment.parent_id], (err, parentComment) => {
            if (parentComment && !notifiedUsers.has(parentComment.user_id)) {
              createNotification(db, io, onlineUsers, parentComment.user_id, user_id, 'reply', postId, newCommentId, newComment.content);
              notifiedUsers.add(parentComment.user_id);
            }
          });
        } else {
          // This is a top-level comment, notify the author of the post
          db.get('SELECT user_id FROM posts WHERE id = ?', [postId], (err, post) => {
            if (post && !notifiedUsers.has(post.user_id)) {
              createNotification(db, io, onlineUsers, post.user_id, user_id, 'new_comment', postId, newCommentId, newComment.content);
              notifiedUsers.add(post.user_id);
            }
          });
        }

        // 2. Handle Mentions (e.g., @username)
        const mentions = newComment.content.match(/@(\w+)/g);
        if (mentions) {
          const mentionedUsernames = [...new Set(mentions.map(m => m.substring(1)))]; // Get unique usernames
          mentionedUsernames.forEach(username => {
            db.get('SELECT id FROM users WHERE username = ?', [username], (err, mentionedUser) => {
              if (mentionedUser && !notifiedUsers.has(mentionedUser.id)) {
                createNotification(db, io, onlineUsers, mentionedUser.id, user_id, 'mention', postId, newCommentId, newComment.content);
                notifiedUsers.add(mentionedUser.id);
              }
            });
          });
        }

        res.status(201).json(newComment);
      });
    });
  });

  // GET comments for a post
  router.get('/:postId/comments', optionalAuthenticateToken, (req, res) => {
    const { postId } = req.params;
    const userId = req.user?.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const params = [postId];
    let userVoteTypeSubquery = 'NULL AS user_vote_type';
    let isSavedSubquery = '0 AS is_saved';

    if (userId) {
      userVoteTypeSubquery = `(SELECT vote_type FROM votes WHERE user_id = ? AND comment_id = c.id) AS user_vote_type`;
      isSavedSubquery = `(SELECT COUNT(*) FROM saved_comments WHERE user_id = ? AND comment_id = c.id) > 0 AS is_saved`;
      params.push(userId, userId);
    }

    // For the ORDER BY clause
    params.push(userId);
    params.push(limit, offset);

    const query = `
      SELECT c.*, u.username,
       COALESCE((SELECT SUM(CASE WHEN v.vote_type = 1 THEN 1 ELSE 0 END) FROM votes v WHERE v.comment_id = c.id), 0) as upvotes,
       COALESCE((SELECT SUM(CASE WHEN v.vote_type = -1 THEN 1 ELSE 0 END) FROM votes v WHERE v.comment_id = c.id), 0) as downvotes,
       (SELECT COUNT(*) FROM comments rc WHERE rc.parent_id = c.id) as reply_count,
       ${userVoteTypeSubquery},
       ${isSavedSubquery}
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ? AND c.parent_id IS NULL
       ORDER BY c.is_pinned DESC, CASE WHEN c.user_id = ? THEN 0 ELSE 1 END, c.created_at DESC
       LIMIT ? OFFSET ?`;

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Error fetching comments:', err.message);
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
  });

  // GET replies for a comment (paginated)
  router.get('/:commentId/replies', optionalAuthenticateToken, (req, res) => {
    const { commentId } = req.params;
    const userId = req.user?.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const query = `
        SELECT c.*, u.username,
         COALESCE((SELECT SUM(CASE WHEN v.vote_type = 1 THEN 1 ELSE 0 END) FROM votes v WHERE v.comment_id = c.id), 0) as upvotes,
         COALESCE((SELECT SUM(CASE WHEN v.vote_type = -1 THEN 1 ELSE 0 END) FROM votes v WHERE v.comment_id = c.id), 0) as downvotes,
         (SELECT COUNT(*) FROM comments rc WHERE rc.parent_id = c.id) as reply_count,
         ${userId ? `(SELECT vote_type FROM votes WHERE user_id = ${userId} AND comment_id = c.id) AS user_vote_type,` : 'NULL AS user_vote_type,'}
         ${userId ? `(SELECT COUNT(*) FROM saved_comments WHERE user_id = ${userId} AND comment_id = c.id) > 0 AS is_saved` : '0 AS is_saved'}
         FROM comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.parent_id = ?
         ORDER BY c.created_at ASC
         LIMIT ? OFFSET ?`;

    db.all(query, [commentId, limit, offset], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
  });

  // DELETE a comment
  router.delete('/:commentId', authenticateToken, (req, res) => {
    const { commentId } = req.params;
    const userId = req.user.id;

    db.get('SELECT user_id, post_id FROM comments WHERE id = ?', [commentId], (err, comment) => {
      if (err) {
        return res.status(500).json({ error: 'Database error while fetching comment.' });
      }
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found.' });
      }
      if (comment.user_id !== userId) {
        return res.status(403).json({ error: 'You are not authorized to delete this comment.' });
      }

      // The 'ON DELETE CASCADE' in the database schema will handle deleting replies.
      db.run('DELETE FROM comments WHERE id = ?', [commentId], function (err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to delete comment.' });
        }
        // Emit WebSocket event to notify clients of the deletion
        io.to(`post-${comment.post_id}`).emit('commentDeleted', {
          commentId: parseInt(commentId),
          postId: comment.post_id
        });
        res.status(200).json({ message: 'Comment deleted successfully.' });
      });
    });
  });

  // Pin/unpin a comment
  router.post('/:commentId/pin', authenticateToken, (req, res) => {
    const { commentId } = req.params;
    const userId = req.user.id;

    // First, get the comment and its post to verify ownership
    db.get('SELECT post_id, is_pinned, parent_id FROM comments WHERE id = ?', [commentId], (err, comment) => {
      if (err) return res.status(500).json({ error: 'Database error fetching comment.' });
      if (!comment) return res.status(404).json({ error: 'Comment not found.' });
      if (comment.parent_id) {
        return res.status(400).json({ error: 'Only parent comments can be pinned.' });
      }

      db.get('SELECT user_id FROM posts WHERE id = ?', [comment.post_id], (err, post) => {
        if (err) return res.status(500).json({ error: 'Database error fetching post.' });
        if (!post) return res.status(404).json({ error: 'Post not found.' });
        if (post.user_id !== userId) {
          return res.status(403).json({ error: 'You are not authorized to pin comments on this post.' });
        }

        // Now toggle the pinned status
        const newPinnedState = !comment.is_pinned;
        db.run('UPDATE comments SET is_pinned = ? WHERE id = ?', [newPinnedState, commentId], function (err) {
          if (err) return res.status(500).json({ error: 'Failed to update pin status.' });

          // Emit a websocket event
          io.to(`post-${comment.post_id}`).emit('commentPinUpdate', {
            commentId: parseInt(commentId),
            postId: comment.post_id,
            is_pinned: newPinnedState
          });

          res.json({ message: 'Pin status updated successfully.', is_pinned: newPinnedState });
        });
      });
    });
  });

  return router;
};
