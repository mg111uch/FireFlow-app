// y
const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { getPostQueryFields } = require('../utils/postQueries');

const router = express.Router();

// GET all communities
router.get('/', (req, res) => {
    // --- ENHANCEMENT: Fetch creator username ---
    const sql = `
        SELECT c.*, u.username as creator_username
        FROM communities c
        JOIN users u ON c.creator_id = u.id
        ORDER BY c.name ASC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Create community (protected)
router.post('/', authenticateToken, (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  db.run(
    'INSERT INTO communities (name, description, creator_id) VALUES (?, ?, ?)',
    [name, description || '', req.user.id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      const newCommunityId = this.lastID;
      db.run(
        'INSERT INTO community_members (user_id, community_id) VALUES (?, ?)',
        [req.user.id, newCommunityId],
        (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          const newCommunity = { id: newCommunityId, name, description, creator_id: req.user.id };
          // io.emit('newCommunity', newCommunity); // Will be added in app.js
          res.json(newCommunity);
        }
      );
    }
  );
});

// Update a community
router.put('/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    const userId = req.user.id;

    if (!name || !description) {
        return res.status(400).json({ error: 'Name and description are required.' });
    }
    // First, verify the user is the creator
    db.get('SELECT creator_id FROM communities WHERE id = ?', [id], (err, community) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!community) return res.status(404).json({ error: 'Community not found.' });
        if (community.creator_id !== userId) {
            return res.status(403).json({ error: 'You are not authorized to edit this community.' });
        }
        // If authorized, update the community
        db.run('UPDATE communities SET name = ?, description = ? WHERE id = ?', [name, description, id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Community updated successfully.' });
        });
    });
});

// Delete a community
router.delete('/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    db.get('SELECT creator_id FROM communities WHERE id = ?', [id], (err, community) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!community) return res.status(404).json({ error: 'Community not found.' });
        if (community.creator_id !== userId) {
            return res.status(403).json({ error: 'You are not authorized to delete this community.' });
        }

        // Use a transaction to delete all related data
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            db.run('DELETE FROM votes WHERE post_id IN (SELECT id FROM posts WHERE community_id = ?)', [id]);
            db.run('DELETE FROM comments WHERE post_id IN (SELECT id FROM posts WHERE community_id = ?)', [id]);
            db.run('DELETE FROM posts WHERE community_id = ?', [id]);
            db.run('DELETE FROM community_members WHERE community_id = ?', [id]);
            db.run('DELETE FROM communities WHERE id = ?', [id], function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Failed to delete community.' });
                }
                db.run('COMMIT');
                res.json({ message: 'Community deleted successfully.' });
            });
        });
    });
});

// GET single community by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  // Fetch member count
  const sql = `
    SELECT c.*, 
    (SELECT COUNT(*) FROM community_members WHERE community_id = c.id) as member_count
    FROM communities c
    WHERE c.id = ?`;
  db.get(sql, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Community not found.' });
    }
    res.json(row);
  });
});

// Get posts for a specific community
router.get('/:communityId/posts', authenticateToken, (req, res) => {
  const { communityId } = req.params;
  const userId = req.user?.id;
  db.all(
    `SELECT ${getPostQueryFields(userId)}
     FROM posts p
     JOIN users u ON p.user_id = u.id
     JOIN communities c ON p.community_id = c.id
     LEFT JOIN votes v ON p.id = v.post_id
     WHERE p.community_id = ?
     GROUP BY p.id
     ORDER BY p.created_at DESC`,
    [communityId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    }
  );
});

// Join/leave a community
router.post('/:communityId/join', authenticateToken, (req, res) => {
  const { communityId } = req.params;
  const user_id = req.user.id;

  db.run(
    'INSERT OR IGNORE INTO community_members (user_id, community_id) VALUES (?, ?)',
    [user_id, communityId],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes > 0) {
        res.json({ message: 'Joined community.', joined: true });
      } else {
        res.json({ message: 'Already a member of this community.', joined: false });
      }
    }
  );
});

// Unjoin a community
router.post('/:communityId/unjoin', authenticateToken, (req, res) => {
  const { communityId } = req.params;
  const user_id = req.user.id;

  // Optional: Prevent creator from leaving their own community
  db.get('SELECT creator_id FROM communities WHERE id = ?', [communityId], (err, community) => {
    if (err) {
        return res.status(500).json({ error: err.message });
    }
    if (community && community.creator_id === user_id) {
        return res.status(403).json({ error: 'Community creators cannot unjoin their own community.' });
    }

    db.run(
      'DELETE FROM community_members WHERE user_id = ? AND community_id = ?',
      [user_id, communityId],
      function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (this.changes > 0) {
          res.json({ message: 'Unjoined community.', unjoined: true });
        } else {
          res.status(404).json({ message: 'Not a member of this community.', unjoined: false });
        }
      }
    );
  });
});

module.exports = (io, onlineUsers) => {
  return router;
};