const express = require('express');
const db = require('../database');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET products by shop ID
router.get('/shop/:shopId', optionalAuthenticateToken, (req, res) => {
  const { shopId } = req.params;
  db.all(
    'SELECT * FROM shop_products WHERE shop_id = ? ORDER BY created_at DESC',
    [shopId],
    (err, products) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(products);
    }
  );
});

// GET product by ID
router.get('/:id', optionalAuthenticateToken, (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM shop_products WHERE id = ?', [id], (err, product) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  });
});

// CREATE product
router.post('/', authenticateToken, (req, res) => {
  const { shop_id, name, description, price, stock, category, image_url } = req.body;
  const userId = req.user.id;

  if (!shop_id || !name || price === undefined) {
    return res.status(400).json({ error: 'shop_id, name, and price are required' });
  }

  // Verify user owns the shop
  db.get('SELECT * FROM shops WHERE id = ? AND owner_id = ?', [shop_id, userId], (err, shop) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!shop) {
      return res.status(403).json({ error: 'Not authorized to add products to this shop' });
    }

    db.run(
      'INSERT INTO shop_products (shop_id, name, description, price, stock, category, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [shop_id, name, description || '', price, stock || 10, category || '', image_url || ''],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        db.get('SELECT * FROM shop_products WHERE id = ?', [this.lastID], (err, product) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.status(201).json(product);
        });
      }
    );
  });
});

// UPDATE product
router.put('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { name, description, price, stock, category, image_url } = req.body;
  const userId = req.user.id;

  db.get('SELECT * FROM shop_products WHERE id = ?', [id], (err, product) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check shop ownership
    db.get('SELECT * FROM shops WHERE id = ? AND owner_id = ?', [product.shop_id, userId], (err, shop) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!shop) {
        return res.status(403).json({ error: 'Not authorized to update this product' });
      }

      db.run(
        'UPDATE shop_products SET name = ?, description = ?, price = ?, stock = ?, category = ?, image_url = ? WHERE id = ?',
        [
          name || product.name,
          description || product.description,
          price !== undefined ? price : product.price,
          stock !== undefined ? stock : product.stock,
          category || product.category,
          image_url || product.image_url,
          id
        ],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          db.get('SELECT * FROM shop_products WHERE id = ?', [id], (err, updatedProduct) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            res.json(updatedProduct);
          });
        }
      );
    });
  });
});

// DELETE product
router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  db.get('SELECT * FROM shop_products WHERE id = ?', [id], (err, product) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check shop ownership
    db.get('SELECT * FROM shops WHERE id = ? AND owner_id = ?', [product.shop_id, userId], (err, shop) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!shop) {
        return res.status(403).json({ error: 'Not authorized to delete this product' });
      }

      db.run('DELETE FROM shop_products WHERE id = ?', [id], function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Product deleted successfully' });
      });
    });
  });
});

module.exports = router;