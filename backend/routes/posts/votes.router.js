const express = require('express');
const db = require('../../database');
const { authenticateToken, optionalAuthenticateToken } = require('../../middleware/auth');

module.exports = (io) => {
  const router = express.Router();

  // POST /api/posts/:postId/vote - Vote on a post
  router.post('/:postId/vote', authenticateToken, (req, res) => {
    const { postId } = req.params;
    const { vote_type } = req.body;
    const user_id = req.user.id;

    if (![1, -1, 0].includes(vote_type)) { // 0 to remove vote
      return res.status(400).json({ error: 'Invalid vote type.' });
    }

    db.get('SELECT * FROM votes WHERE user_id = ? AND post_id = ?', [user_id, postId], (err, existingVote) => {
      if (err) return res.status(500).json({ error: err.message });

      const handleVoteUpdate = () => {
        const sql = `
          SELECT
            p.id as postId,
            COALESCE(SUM(CASE WHEN v.vote_type = 1 THEN 1 ELSE 0 END), 0) AS upvotes,
            COALESCE(SUM(CASE WHEN v.vote_type = -1 THEN 1 ELSE 0 END), 0) AS downvotes
          ${user_id ? `,(SELECT vote_type FROM votes WHERE user_id = ${user_id} AND post_id = p.id) AS user_vote_type` : ''}
          FROM posts p
          LEFT JOIN votes v ON p.id = v.post_id
          WHERE p.id = ?
          GROUP BY p.id`;
        db.get(sql, [postId], (err, result) => {
          if (result) {
            // --- REALTIME FIX: Emit globally so homepage gets the update ---
            io.emit('voteUpdate', {
              postId: parseInt(postId),
              upvotes: result.upvotes,
              downvotes: result.downvotes,
              user_vote_type: result.user_vote_type
            });
          }
        });
      };

      if (existingVote) {
        if (existingVote.vote_type === vote_type) { // Clicking same button again (e.g., upvoting when already upvoted)
          db.run('DELETE FROM votes WHERE id = ?', [existingVote.id], (err) => {
            if (err) return res.status(500).json({ error: 'Failed to remove vote' });
            handleVoteUpdate();
            res.json({ message: 'Vote removed.' });
          });
        } else { // Changing vote
          db.run('UPDATE votes SET vote_type = ? WHERE id = ?', [vote_type, existingVote.id], (err) => {
            if (err) return res.status(500).json({ error: 'Failed to update vote' });
            handleVoteUpdate();
            res.json({ message: 'Vote updated.' });
          });
        }
      } else { // New vote
        db.run('INSERT INTO votes (user_id, post_id, vote_type) VALUES (?, ?, ?)', [user_id, postId, vote_type], (err) => {
          if (err) return res.status(500).json({ error: 'Failed to cast vote' });
          handleVoteUpdate();
          res.status(201).json({ message: 'Vote recorded.' });
        });
      }
    });
  });

  // POST /api/posts/:commentId/vote - Vote on a comment
  router.post('/:commentId/vote', authenticateToken, (req, res) => {
    const { commentId } = req.params;
    const { vote_type } = req.body; // Expects 1, -1, or 0 to clear vote
    const userId = req.user.id;

    if (![1, -1, 0].includes(vote_type)) {
      return res.status(400).json({ error: 'Invalid vote type' });
    }

    db.get('SELECT * FROM votes WHERE user_id = ? AND comment_id = ?', [userId, commentId], (err, existingVote) => {
      if (err) return res.status(500).json({ error: 'Database error checking for existing vote.' });

      const handleVoteUpdate = () => {
        const sql = `
          SELECT
            c.id as commentId,
            c.post_id,
            COALESCE(SUM(CASE WHEN v.vote_type = 1 THEN 1 ELSE 0 END), 0) AS upvotes,
            COALESCE(SUM(CASE WHEN v.vote_type = -1 THEN 1 ELSE 0 END), 0) AS downvotes,
            (SELECT vote_type FROM votes WHERE user_id = ? AND comment_id = c.id) AS user_vote_type
          FROM comments c
          LEFT JOIN votes v ON c.id = v.comment_id
          WHERE c.id = ?
          GROUP BY c.id`;

        db.get(sql, [userId, commentId], (err, result) => {
          if (result) {
            io.to(`post-${result.post_id}`).emit('commentVoteUpdate', {
              commentId: result.commentId,
              upvotes: result.upvotes,
              downvotes: result.downvotes,
              user_vote_type: result.user_vote_type,
            });
          }
        });
      };

      if (existingVote) {
        if (vote_type === 0 || existingVote.vote_type === vote_type) {
          // User wants to remove their vote
          db.run('DELETE FROM votes WHERE id = ?', [existingVote.id], (err) => {
            if (err) return res.status(500).json({ error: 'Failed to remove vote.' });
            handleVoteUpdate();
            res.json({ message: 'Vote removed.' });
          });
        } else {
          // User wants to change their vote
          db.run('UPDATE votes SET vote_type = ? WHERE id = ?', [vote_type, existingVote.id], (err) => {
            if (err) return res.status(500).json({ error: 'Failed to update vote.' });
            handleVoteUpdate();
            res.json({ message: 'Vote updated.' });
          });
        }
      } else if (vote_type !== 0) {
        // User wants to cast a new vote
        db.run('INSERT INTO votes (user_id, comment_id, vote_type) VALUES (?, ?, ?)', [userId, commentId, vote_type], (err) => {
          if (err) return res.status(500).json({ error: 'Failed to cast vote.' });
          handleVoteUpdate();
          res.status(201).json({ message: 'Vote recorded.' });
        });
      } else {
        // User trying to remove a vote that doesn't exist
        res.json({ message: 'No vote to remove.' });
      }
    });
  });

  return router;
};
