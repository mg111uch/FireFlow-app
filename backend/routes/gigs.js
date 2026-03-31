const express = require('express');
const db = require('../database');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/auth');

module.exports = (io, onlineUsers) => {
  const router = express.Router();

  router.get('/', optionalAuthenticateToken, (req, res) => {
  const { status, type, vehicle_type, lat, lng, radius } = req.query;
  
  let query = `
    SELECT g.*, u.username as user_username,
           driver.username as driver_username
    FROM gigs g
    JOIN users u ON g.user_id = u.id
    LEFT JOIN users driver ON g.driver_id = driver.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += ' AND g.status = ?';
    params.push(status);
  } else {
    query += ' AND g.status = ?';
    params.push('open');
  }

  if (type && type !== 'all') {
    query += ' AND g.type = ?';
    params.push(type);
  }

  if (vehicle_type && vehicle_type !== 'all') {
    query += ' AND g.vehicle_type = ?';
    params.push(vehicle_type);
  }

  if (lat && lng && radius) {
    const latDelta = radius / 111;
    const lngDelta = radius / (111 * Math.cos(lat * Math.PI / 180));
    query += ' AND g.pickup_lat BETWEEN ? AND ? AND g.pickup_lng BETWEEN ? AND ?';
    params.push(lat - latDelta, lat + latDelta, lng - lngDelta, lng + lngDelta);
  }

  query += ' ORDER BY g.created_at DESC';

  db.all(query, params, (err, gigs) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    gigs = gigs.map(gig => ({
      ...gig,
      details: gig.details ? JSON.parse(gig.details) : null
    }));
    res.json(gigs);
  });
});

router.get('/my', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  const query = `
    SELECT g.*, u.username as user_username,
           driver.username as driver_username
    FROM gigs g
    JOIN users u ON g.user_id = u.id
    LEFT JOIN users driver ON g.driver_id = driver.id
    WHERE g.user_id = ? OR g.driver_id = ?
    ORDER BY g.created_at DESC
  `;

  db.all(query, [userId, userId], (err, gigs) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    gigs = gigs.map(gig => ({
      ...gig,
      details: gig.details ? JSON.parse(gig.details) : null
    }));
    res.json(gigs);
  });
});

router.get('/:id', optionalAuthenticateToken, (req, res) => {
  const { id } = req.params;
  
  db.get(`
    SELECT g.*, u.username as user_username,
           driver.username as driver_username
    FROM gigs g
    JOIN users u ON g.user_id = u.id
    LEFT JOIN users driver ON g.driver_id = driver.id
    WHERE g.id = ?
  `, [id], (err, gig) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!gig) {
      return res.status(404).json({ error: 'Gig not found' });
    }
    if (gig.details) {
      gig.details = JSON.parse(gig.details);
    }
    res.json(gig);
  });
});

router.post('/', authenticateToken, (req, res) => {
  const { type, vehicle_type, pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng, distance, details, price } = req.body;
  const userId = req.user.id;
  const payoutPrice = price * 0.8;

  if (!type || !pickup_address || !dropoff_address || !price) {
    return res.status(400).json({ error: 'Type, pickup address, dropoff address, and price are required' });
  }

  if (!['ride', 'delivery'].includes(type)) {
    return res.status(400).json({ error: 'Type must be ride or delivery' });
  }

  const detailsJson = details ? JSON.stringify(details) : null;

  db.run(`
    INSERT INTO gigs (type, vehicle_type, pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng, distance, details, price, payout_price, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [type, vehicle_type || null, pickup_address, pickup_lat || null, pickup_lng || null, dropoff_address, dropoff_lat || null, dropoff_lng || null, distance || null, detailsJson, price, payoutPrice, userId], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    db.get(`
      SELECT g.*, u.username as user_username
      FROM gigs g
      JOIN users u ON g.user_id = u.id
      WHERE g.id = ?
    `, [this.lastID], (err, gig) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (gig.details) {
        gig.details = JSON.parse(gig.details);
      }
      res.status(201).json(gig);
    });
  });
});

router.post('/:id/accept', authenticateToken, (req, res) => {
  const { id } = req.params;
  const driverId = req.user.id;

  db.get('SELECT * FROM gigs WHERE id = ?', [id], (err, gig) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!gig) {
      return res.status(404).json({ error: 'Gig not found' });
    }
    if (gig.status !== 'open') {
      return res.status(400).json({ error: 'Gig is not open' });
    }
    if (gig.user_id === driverId) {
      return res.status(400).json({ error: 'Cannot accept your own gig' });
    }

    db.run('UPDATE gigs SET status = ?, driver_id = ? WHERE id = ?', ['accepted', driverId, id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      db.get(`
        SELECT g.*, u.username as user_username,
               driver.username as driver_username
        FROM gigs g
        JOIN users u ON g.user_id = u.id
        LEFT JOIN users driver ON g.driver_id = driver.id
        WHERE g.id = ?
      `, [id], (err, updatedGig) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (updatedGig.details) {
          updatedGig.details = JSON.parse(updatedGig.details);
        }
        
        // Emit WebSocket event to notify poster and driver
        if (io) {
          io.emit('gigUpdated', updatedGig);
        }
        
        res.json(updatedGig);
      });
    });
  });
});

router.post('/:id/pay', authenticateToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  db.get('SELECT * FROM gigs WHERE id = ?', [id], (err, gig) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!gig) {
      return res.status(404).json({ error: 'Gig not found' });
    }
    if (gig.status !== 'accepted' && gig.status !== 'completed') {
      return res.status(400).json({ error: 'Gig must be accepted before payment' });
    }
    if (gig.user_id !== userId) {
      return res.status(403).json({ error: 'Only the poster can make payment' });
    }
    if (gig.is_paid) {
      return res.status(400).json({ error: 'Payment already made' });
    }

    db.run('UPDATE gigs SET is_paid = 1 WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      db.get(`
        SELECT g.*, u.username as user_username,
               driver.username as driver_username
        FROM gigs g
        JOIN users u ON g.user_id = u.id
        LEFT JOIN users driver ON g.driver_id = driver.id
        WHERE g.id = ?
      `, [id], (err, updatedGig) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (updatedGig.details) {
          updatedGig.details = JSON.parse(updatedGig.details);
        }
        
        if (io) {
          io.emit('gigUpdated', updatedGig);
        }
        
        res.json(updatedGig);
      });
    });
  });
});

router.post('/:id/complete', authenticateToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  db.get('SELECT * FROM gigs WHERE id = ?', [id], (err, gig) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!gig) {
      return res.status(404).json({ error: 'Gig not found' });
    }
    if (gig.status !== 'accepted') {
      return res.status(400).json({ error: 'Gig is not accepted yet' });
    }
    if (gig.user_id !== userId && gig.driver_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to complete this gig' });
    }

    db.run('UPDATE gigs SET status = ? WHERE id = ?', ['completed', id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      db.get(`
        SELECT g.*, u.username as user_username,
               driver.username as driver_username
        FROM gigs g
        JOIN users u ON g.user_id = u.id
        LEFT JOIN users driver ON g.driver_id = driver.id
        WHERE g.id = ?
      `, [id], (err, updatedGig) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (updatedGig.details) {
          updatedGig.details = JSON.parse(updatedGig.details);
        }
        
        if (io) {
          io.emit('gigUpdated', updatedGig);
        }
        
        res.json(updatedGig);
      });
    });
  });
});

router.post('/:id/cancel', authenticateToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  db.get('SELECT * FROM gigs WHERE id = ?', [id], (err, gig) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!gig) {
      return res.status(404).json({ error: 'Gig not found' });
    }
    if (gig.status === 'completed' || gig.status === 'cancelled') {
      return res.status(400).json({ error: 'Gig is already completed or cancelled' });
    }
    if (gig.user_id !== userId && gig.driver_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to cancel this gig' });
    }

    db.run('UPDATE gigs SET status = ? WHERE id = ?', ['cancelled', id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      db.get(`
        SELECT g.*, u.username as user_username,
               driver.username as driver_username
        FROM gigs g
        JOIN users u ON g.user_id = u.id
        LEFT JOIN users driver ON g.driver_id = driver.id
        WHERE g.id = ?
      `, [id], (err, updatedGig) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (updatedGig.details) {
          updatedGig.details = JSON.parse(updatedGig.details);
        }
        
        if (io) {
          io.emit('gigUpdated', updatedGig);
        }
        
        res.json(updatedGig);
      });
    });
  });
});

router.post('/:id/reset', authenticateToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  if (userId !== 1) {
    return res.status(403).json({ error: 'Only admin can reset gigs' });
  }

  db.get('SELECT * FROM gigs WHERE id = ?', [id], (err, gig) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!gig) {
      return res.status(404).json({ error: 'Gig not found' });
    }

    db.run('UPDATE gigs SET status = ?, driver_id = NULL, is_paid = 0 WHERE id = ?', ['open', id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      db.get(`
        SELECT g.*, u.username as user_username,
               driver.username as driver_username
        FROM gigs g
        JOIN users u ON g.user_id = u.id
        LEFT JOIN users driver ON g.driver_id = driver.id
        WHERE g.id = ?
      `, [id], (err, updatedGig) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (updatedGig.details) {
          updatedGig.details = JSON.parse(updatedGig.details);
        }
        
        if (io) {
          io.emit('gigUpdated', updatedGig);
        }
        
        res.json(updatedGig);
      });
    });
  });
});

router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  if (userId !== 1) {
    return res.status(403).json({ error: 'Only admin can delete gigs' });
  }

  db.get('SELECT * FROM gigs WHERE id = ?', [id], (err, gig) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!gig) {
      return res.status(404).json({ error: 'Gig not found' });
    }

    db.run('DELETE FROM gigs WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(204).send();
    });
  });
});

  return router;
};
