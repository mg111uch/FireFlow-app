const express = require('express');
const db = require('../../database');
const { authenticateToken } = require('../../middleware/auth');
const { executeTransaction, insertQuestionsAndOptions } = require('./formDatabaseUtils');

module.exports = (io, onlineUsers) => {
  const router = express.Router();

  // DELETE: Delete a form (creator only)
  router.delete('/:formId', authenticateToken, (req, res) => {
    const { formId } = req.params;
    const creator_id = req.user.id;

    // Verify user is the creator of the form
    db.get('SELECT creator_id FROM forms WHERE id = ?', [formId], (err, form) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!form) return res.status(404).json({ error: 'Form not found.' });
      if (form.creator_id !== creator_id) {
        return res.status(403).json({ error: 'You are not authorized to delete this form.' });
      }

      // Delete the form (cascades to questions, options, and submissions due to FK constraints)
      db.run('DELETE FROM forms WHERE id = ?', [formId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Form deleted successfully!' });
      });
    });
  });

  // PUT: Update a form (creator only)
  router.put('/:formId', authenticateToken, (req, res) => {
    const { formId } = req.params;
    const { title, description, questions, form_price } = req.body;
    const creator_id = req.user.id;

    // Verify user is the creator of the form
    db.get('SELECT creator_id FROM forms WHERE id = ?', [formId], (err, form) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!form) return res.status(404).json({ error: 'Form not found.' });
      if (form.creator_id !== creator_id) {
        return res.status(403).json({ error: 'You are not authorized to update this form.' });
      }

      // Validate questions
      if (!questions || questions.length === 0) {
        return res.status(400).json({ error: 'Form must have at least one question.' });
      }

      const finalFormPrice = form_price || 0;

      executeTransaction(async () => {
        // Update form metadata first
        await new Promise((resolve, reject) => {
          db.run(
            'UPDATE forms SET title = ?, description = ?, form_price = ? WHERE id = ?',
            [title || form.title, description || form.description, finalFormPrice, formId],
            (err) => {
              if (err) return reject(err);
              resolve();
            }
          );
        });

        // Delete existing questions and options (cascade will handle options)
        await new Promise((resolve, reject) => {
          db.run('DELETE FROM form_questions WHERE form_id = ?', [formId], (err) => {
            if (err) return reject(err);
            resolve();
          });
        });

        // Insert new questions
        await insertQuestionsAndOptions(formId, questions);
        
        return { success: true };
      })
      .then(() => {
        res.json({ message: 'Form updated successfully!', formId });
      })
      .catch(err => {
        console.error('Error updating form:', err);
        res.status(500).json({ error: err.message || 'Failed to update form.' });
      });
    });
  });

  return router;
};