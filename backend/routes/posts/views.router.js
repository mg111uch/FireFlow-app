const express = require('express');
const db = require('../../database');
const { authenticateToken } = require('../../middleware/auth');

module.exports = (io) => {
  const router = express.Router();

  // Track a post view
  router.post('/:postId/view', authenticateToken, (req, res) => {
    const { postId } = req.params;
    const user_id = req.user.id;
    // INSERT OR IGNORE will fail silently if the unique constraint is violated,
    // which is exactly what we want to prevent duplicate view counts per user.
    db.run('INSERT OR IGNORE INTO post_views (post_id, user_id) VALUES (?, ?)', [postId, user_id], function (err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to record view.' });
      }
      res.status(200).json({ message: 'View recorded.' });
      // After recording view, fetch updated view count and emit
      // db.get('SELECT COUNT(*) AS views FROM post_views WHERE post_id = ?', [postId], (err, row) => {
      //   if (!err && row) io.emit('viewUpdate', { postId: parseInt(postId), views: row.views });
      // });
    });
  });

  return router;
};
