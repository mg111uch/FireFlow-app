// y
const express = require('express');
const db = require('../database');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/auth');
const { getPostQueryFields } = require('../utils/postQueries');

const router = express.Router();

// GET user profile by ID
router.get('/:id', optionalAuthenticateToken, (req, res) => {
  const { id } = req.params;
  const loggedInUserId = req.user?.id; // The ID of the user making the request

  db.get(
    'SELECT id, username, email, country, state, bio, display_name, created_at FROM users WHERE id = ?',
    [id],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }
      // Fetch follower and following counts
      db.get(
        `SELECT
           (SELECT COUNT(*) FROM followers WHERE following_id = ?) AS followerCount,
           (SELECT COUNT(*) FROM followers WHERE follower_id = ?) AS followingCount,
           EXISTS(SELECT 1 FROM followers WHERE follower_id = ? AND following_id = ?) AS isFollowing
         `,
        [id, id, loggedInUserId, id],
        (err, counts) => {
          if (err) {
            console.error('Error fetching follower/following counts:', err.message);
            return res.status(500).json({ error: err.message });
          }
          res.json({ ...user, ...counts });
        }
      );
    }
  );
});

// GET all posts made by a specific user
router.get('/:userId/posts', optionalAuthenticateToken, (req, res) => {
  const { userId } = req.params;

  const query = `
    SELECT ${getPostQueryFields(req.user?.id)}
    FROM posts p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN communities c ON p.community_id = c.id
    LEFT JOIN votes v ON p.id = v.post_id
    WHERE p.user_id = ?
    GROUP BY p.id
    ORDER BY p.created_at DESC;
  `;

  db.all(query, [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// GET all communities joined by a specific user
router.get('/:userId/communities', (req, res) => {
  const { userId } = req.params;

  const query = `
    SELECT c.id, c.name, c.description, c.creator_id
    FROM communities c
    JOIN community_members cm ON c.id = cm.community_id
    WHERE cm.user_id = ?
    ORDER BY c.name ASC;
  `;

  db.all(query, [userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Follow a user
router.post('/:id/follow', authenticateToken, (req, res) => {
  const followingId = req.params.id;
  const followerId = req.user.id; // The logged-in user

  if (parseInt(followingId) === followerId) {
    return res.status(400).json({ error: 'You cannot follow yourself.' });
  }

  db.run(
    `INSERT OR IGNORE INTO followers (follower_id, following_id) VALUES (?, ?)`,
    [followerId, followingId],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes > 0) {
        res.status(200).json({ message: 'User followed successfully.' });
      } else {
        res.status(200).json({ message: 'Already following this user.' });
      }
    }
  );
});

// Unfollow a user
router.post('/:id/unfollow', authenticateToken, (req, res) => {
  const followingId = req.params.id;
  const followerId = req.user.id; // The logged-in user

  db.run(
    `DELETE FROM followers WHERE follower_id = ? AND following_id = ?`,
    [followerId, followingId],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes > 0) {
        res.status(200).json({ message: 'User unfollowed successfully.' });
      } else {
        res.status(200).json({ message: 'Not following this user.' });
      }
    }
  );
});

// GET all saved posts for the logged-in user
router.get('/saved-posts', authenticateToken, (req, res) => {
    const userId = req.user.id;

    const query = `
        SELECT ${getPostQueryFields(userId)}
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN communities c ON p.community_id = c.id
        LEFT JOIN votes v ON p.id = v.post_id
        JOIN saved_posts sp ON p.id = sp.post_id
        WHERE sp.user_id = ?
        GROUP BY p.id
        ORDER BY sp.saved_at DESC
    `;

    db.all(query, [userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// GET all saved comments for the logged-in user
router.get('/saved-comments', authenticateToken, (req, res) => {
    const userId = req.user.id;
    db.all(`
        SELECT sc.comment_id, c.content, c.created_at, u.username, p.id as post_id, p.title as post_title
        FROM saved_comments sc
        JOIN comments c ON sc.comment_id = c.id
        JOIN users u ON c.user_id = u.id
        JOIN posts p ON c.post_id = p.id
        WHERE sc.user_id = ?
        ORDER BY sc.saved_at DESC
    `, [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// GET followers list for a user
router.get('/:id/followers', (req, res) => {
  const { id } = req.params;
  db.all(`
    SELECT u.id, u.username FROM users u
    JOIN followers f ON f.follower_id = u.id
    WHERE f.following_id = ?
    ORDER BY u.username ASC
  `, [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET following list for a user
router.get('/:id/following', (req, res) => {
  const { id } = req.params;
  db.all(`
    SELECT u.id, u.username FROM users u
    JOIN followers f ON f.following_id = u.id
    WHERE f.follower_id = ?
    ORDER BY u.username ASC
  `, [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET current user's profile details
router.get('/me/profile', authenticateToken, (req, res) => {
  const userId = req.user.id;

  db.get(
    `SELECT id, username, email, display_name, bio, avatar_url, location, city, state, country, website, phone, adhar_card_no, pan_card_no, driving_licence, date_of_birth, gender, created_at 
     FROM users WHERE id = ?`,
    [userId],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }
      res.json(user);
    }
  );
});

// UPDATE current user's profile details
router.put('/me/profile', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { display_name, bio, avatar_url, location, city, state, country, website, phone, adhar_card_no, pan_card_no, driving_licence, date_of_birth, gender } = req.body;

  const query = `
    UPDATE users SET 
      display_name = COALESCE(?, display_name),
      bio = COALESCE(?, bio),
      avatar_url = COALESCE(?, avatar_url),
      location = COALESCE(?, location),
      city = COALESCE(?, city),
      state = COALESCE(?, state),
      country = COALESCE(?, country),
      website = COALESCE(?, website),
      phone = COALESCE(?, phone),
      adhar_card_no = COALESCE(?, adhar_card_no),
      pan_card_no = COALESCE(?, pan_card_no),
      driving_licence = COALESCE(?, driving_licence),
      date_of_birth = COALESCE(?, date_of_birth),
      gender = COALESCE(?, gender)
    WHERE id = ?
  `;

  db.run(
    query,
    [display_name, bio, avatar_url, location, city, state, country, website, phone, adhar_card_no, pan_card_no, driving_licence, date_of_birth, gender, userId],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Profile updated successfully.' });
    }
  );
});

module.exports = (io, onlineUsers) => {
  return router;
};