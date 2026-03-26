const express = require('express');
const db = require('../database');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET all shops
router.get('/', optionalAuthenticateToken, (req, res) => {
  db.all(
    `SELECT s.*, u.username as owner_username 
     FROM shops s 
     JOIN users u ON s.owner_id = u.id 
     ORDER BY s.created_at DESC`,
    [],
    (err, shops) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(shops);
    }
  );
});

// GET shop by owner user ID
router.get('/owner/:userId', optionalAuthenticateToken, (req, res) => {
  const { userId } = req.params;
  db.get(
    `SELECT s.*, u.username as owner_username 
     FROM shops s 
     JOIN users u ON s.owner_id = u.id 
     WHERE s.owner_id = ?`,
    [userId],
    (err, shop) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!shop) {
        return res.status(404).json({ error: 'Shop not found' });
      }
      res.json(shop);
    }
  );
});

// GET shop by ID
router.get('/:id', optionalAuthenticateToken, (req, res) => {
  const { id } = req.params;
  db.get(
    `SELECT s.*, u.username as owner_username 
     FROM shops s 
     JOIN users u ON s.owner_id = u.id 
     WHERE s.id = ?`,
    [id],
    (err, shop) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!shop) {
        return res.status(404).json({ error: 'Shop not found' });
      }
      res.json(shop);
    }
  );
});

// CREATE shop
router.post('/', authenticateToken, (req, res) => {
  const { name, description } = req.body;
  const owner_id = req.user.id;

  if (!name) {
    return res.status(400).json({ error: 'Shop name is required' });
  }

  db.run(
    'INSERT INTO shops (name, description, owner_id) VALUES (?, ?, ?)',
    [name, description || '', owner_id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      db.get(
        `SELECT s.*, u.username as owner_username 
         FROM shops s 
         JOIN users u ON s.owner_id = u.id 
         WHERE s.id = ?`,
        [this.lastID],
        (err, shop) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.status(201).json(shop);
        }
      );
    }
  );
});

// UPDATE shop
router.put('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const userId = req.user.id;

  db.get('SELECT * FROM shops WHERE id = ?', [id], (err, shop) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    if (shop.owner_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this shop' });
    }

    db.run(
      'UPDATE shops SET name = ?, description = ? WHERE id = ?',
      [name || shop.name, description || shop.description, id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        db.get(
          `SELECT s.*, u.username as owner_username 
           FROM shops s 
           JOIN users u ON s.owner_id = u.id 
           WHERE s.id = ?`,
          [id],
          (err, updatedShop) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            res.json(updatedShop);
          }
        );
      }
    );
  });
});

// DELETE shop
router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  db.get('SELECT * FROM shops WHERE id = ?', [id], (err, shop) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!shop) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    if (shop.owner_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this shop' });
    }

    db.run('DELETE FROM shops WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Shop deleted successfully' });
    });
  });
});

module.exports = router;