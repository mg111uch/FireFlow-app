const express = require('express');
const db = require('../../database');
const { authenticateToken } = require('../../middleware/auth');

module.exports = (io) => {
  const router = express.Router();

  // Save or unsave a post
  router.post('/:postId/save', authenticateToken, (req, res) => {
    const { postId } = req.params;
    const userId = req.user.id;

    db.get('SELECT * FROM saved_posts WHERE user_id = ? AND post_id = ?', [userId, postId], (err, savedPost) => {
      if (err) return res.status(500).json({ error: 'Database error checking saved status.' });

      if (savedPost) {
        // Post is already saved, so unsave it (delete the record)
        db.run('DELETE FROM saved_posts WHERE user_id = ? AND post_id = ?', [userId, postId], (err) => {
          if (err) return res.status(500).json({ error: 'Failed to unsave post.' });
          res.json({ message: 'Post unsaved successfully.', saved: false });
        });
      } else {
        // Post is not saved, so save it (insert a record)
        db.run('INSERT INTO saved_posts (user_id, post_id) VALUES (?, ?)', [userId, postId], (err) => {
          if (err) return res.status(500).json({ error: 'Failed to save post.' });
          res.json({ message: 'Post saved successfully.', saved: true });
        });
      }
    });
  });

  // Save or unsave a comment
  router.post('/:commentId/save', authenticateToken, (req, res) => {
    const { commentId } = req.params;
    const userId = req.user.id;
    db.get('SELECT * FROM saved_comments WHERE user_id = ? AND comment_id = ?', [userId, commentId], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (row) {
        db.run('DELETE FROM saved_comments WHERE user_id = ? AND comment_id = ?', [userId, commentId], (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ message: 'Comment unsaved', saved: false });
        });
      } else {
        db.run('INSERT INTO saved_comments (user_id, comment_id) VALUES (?, ?)', [userId, commentId], (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ message: 'Comment saved', saved: true });
        });
      }
    });
  });

  return router;
};
