const express = require('express');
const db = require('../database');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/auth');

const router = express.Router();

// GET orders by shop ID
router.get('/shop/:shopId', optionalAuthenticateToken, (req, res) => {
  const { shopId } = req.params;
  db.all(
    'SELECT * FROM shop_orders WHERE shop_id = ? ORDER BY created_at DESC',
    [shopId],
    (err, orders) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      // Parse items JSON
      const parsedOrders = orders.map(order => ({
        ...order,
        items: JSON.parse(order.items || '[]')
      }));
      res.json(parsedOrders);
    }
  );
});

// GET order by ID
router.get('/:id', optionalAuthenticateToken, (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM shop_orders WHERE id = ?', [id], (err, order) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    order.items = JSON.parse(order.items || '[]');
    res.json(order);
  });
});

// CREATE order (customer places order)
router.post('/', optionalAuthenticateToken, (req, res) => {
  const { shop_id, items, total } = req.body;
  const customer_id = req.user?.id || null;
  const customer_username = req.user?.username || 'guest';

  if (!shop_id || !items || !total) {
    return res.status(400).json({ error: 'shop_id, items, and total are required' });
  }

  const itemsJson = JSON.stringify(items);

  db.run(
    'INSERT INTO shop_orders (shop_id, customer_id, customer_username, items, total, status) VALUES (?, ?, ?, ?, ?, ?)',
    [shop_id, customer_id, customer_username, itemsJson, total, 'pending'],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      db.get('SELECT * FROM shop_orders WHERE id = ?', [this.lastID], (err, order) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        order.items = JSON.parse(order.items);
        res.status(201).json(order);
      });
    }
  );
});

// UPDATE order status (shop owner only)
router.put('/:id/status', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.id;

  const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  db.get('SELECT * FROM shop_orders WHERE id = ?', [id], (err, order) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check shop ownership
    db.get('SELECT * FROM shops WHERE id = ? AND owner_id = ?', [order.shop_id, userId], (err, shop) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!shop) {
        return res.status(403).json({ error: 'Not authorized to update this order' });
      }

      db.run('UPDATE shop_orders SET status = ? WHERE id = ?', [status, id], function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        db.get('SELECT * FROM shop_orders WHERE id = ?', [id], (err, updatedOrder) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          updatedOrder.items = JSON.parse(updatedOrder.items);
          res.json(updatedOrder);
        });
      });
    });
  });
});

module.exports = router;