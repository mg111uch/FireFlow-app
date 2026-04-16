const express = require('express');
const db = require('../../database');
const { authenticateToken, optionalAuthenticateToken } = require('../../middleware/auth');

module.exports = (io, onlineUsers) => {
  const router = express.Router();

  // GET: Get form by service and subservice name
  router.get('/service/:serviceName/:subserviceName', (req, res) => {
    const { serviceName, subserviceName } = req.params;
    
    db.get(
      'SELECT * FROM forms WHERE form_type = ? AND LOWER(service_name) = LOWER(?) AND LOWER(subservice_name) = LOWER(?) ORDER BY created_at DESC LIMIT 1',
      ['service', serviceName, subserviceName],
      (err, form) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!form) return res.status(404).json({ error: 'Service form not found.' });
        res.json(form);
      }
    );
  });

  // GET: Get all service forms (admin only)
  router.get('/service/all', authenticateToken, (req, res) => {
    const currentUserId = req.user.id;
    
    // Only allow admin user ID 1 to view all service forms
    if (currentUserId !== 1) {
      return res.status(403).json({ error: 'Only admins can view all service forms.' });
    }
    
    db.all('SELECT * FROM forms WHERE form_type = ? ORDER BY created_at DESC', ['service'], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  });

  // GET: Get forms created by the logged-in user (general forms only)
  router.get('/my', authenticateToken, (req, res) => {
    const creator_id = req.user.id;
    db.all('SELECT * FROM forms WHERE creator_id = ? AND form_type = ? ORDER BY created_at DESC', [creator_id, 'general'], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
  });

  // GET: Get all forms (public - no auth required)
  router.get('/all', (req, res) => {
    db.all('SELECT * FROM forms ORDER BY created_at DESC', [], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
  });

  // GET: Get a single form definition (for filling)
  router.get('/:formId', optionalAuthenticateToken, (req, res) => {
    const { formId } = req.params;
    db.get('SELECT f.*, u.username as creator_username FROM forms f JOIN users u ON f.creator_id = u.id WHERE f.id = ?', [formId], (err, form) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!form) return res.status(404).json({ error: 'Form not found.' });

      db.all('SELECT * FROM form_questions WHERE form_id = ? ORDER BY order_index ASC', [formId], (err, questions) => {
        if (err) return res.status(500).json({ error: err.message });

        // For each question, fetch its options if it's a radio type
        let questionsWithDetails = questions.map(q => ({ ...q, options: [] }));
        const promises = questionsWithDetails.map(q => {
          if (q.question_type === 'radio') {
            return new Promise((resolve, reject) => {
              db.all('SELECT * FROM question_options WHERE question_id = ?', [q.id], (err, options) => {
                if (err) return reject(err);
                q.options = options;
                resolve(q);
              });
            });
          }
          return Promise.resolve(q);
        });

        Promise.all(promises)
          .then(resolvedQuestions => {
            form.questions = resolvedQuestions;
            res.json(form);
          })
          .catch(error => res.status(500).json({ error: error.message }));
      });
    });
  });

  return router;
};