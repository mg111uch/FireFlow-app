const express = require('express');
const db = require('../../database');
const { authenticateToken } = require('../../middleware/auth');
const { executeTransaction, insertQuestionsAndOptions, validateFormData } = require('./formDatabaseUtils');
const upload = require('../../middleware/upload');

module.exports = (io, onlineUsers) => {
  const router = express.Router();

  // POST: Upload image for form question
  router.post('/upload-image', authenticateToken, upload.single('image'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided.' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  });

  // POST: Create a new form (general form - current user)
  router.post('/', authenticateToken, (req, res) => {
    const { title, description, questions, form_type, service_name, subservice_name, form_price } = req.body;
    const creator_id = req.user.id;

    // Validate form data
    const validationError = validateFormData(req.body, 'general');
    if (validationError) {
      return res.status(400).json(validationError);
    }

     // Default to general form if not specified
     const finalFormType = form_type || 'general';
     const p = Number(form_price);
     const finalFormPrice = Number.isNaN(p) ? 0 : Math.round(p);

    executeTransaction(async () => {
      // Insert form metadata
      const formResult = await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO forms (title, description, form_price, creator_id, form_type, service_name, subservice_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [title, description, finalFormPrice, creator_id, finalFormType, service_name || null, subservice_name || null],
          function (err) {
            if (err) {
              reject(err);
            } else {
              resolve(this);
            }
          }
        );
      });

      const formId = formResult.lastID;
      
      // Insert questions and options
      await insertQuestionsAndOptions(formId, questions);
      
      return { formId };
    })
    .then(({ formId }) => {
      res.status(201).json({ message: 'Form created successfully!', formId });
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
    });
  });

  // POST: Create a service form (admin only - not necessarily current user)
  router.post('/service', authenticateToken, (req, res) => {
    const { title, description, questions, service_name, subservice_name, admin_user_id, form_price } = req.body;
    const current_user_id = req.user.id;

    // Check if current user is the specified admin
    if (current_user_id !== admin_user_id) {
      return res.status(403).json({ error: 'Only the designated admin can create service forms.' });
    }

    // Validate form data
    const validationError = validateFormData(req.body, 'service');
    if (validationError) {
      return res.status(400).json(validationError);
    }

     // Use subservice name as default title if not provided
     const formTitle = title || `${subservice_name} Service Form`;
     const creator_id = admin_user_id;
     const p = Number(form_price);
     const finalFormPrice = Number.isNaN(p) ? 0 : Math.round(p);

    executeTransaction(async () => {
      // Insert form metadata
      const formResult = await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO forms (title, description, form_price, creator_id, form_type, service_name, subservice_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [formTitle, description, finalFormPrice, creator_id, 'service', service_name, subservice_name],
          function (err) {
            if (err) {
              reject(err);
            } else {
              resolve(this);
            }
          }
        );
      });

      const formId = formResult.lastID;
      
      // Insert questions and options
      await insertQuestionsAndOptions(formId, questions);
      
      return { formId };
    })
    .then(({ formId }) => {
      res.status(201).json({ message: 'Service form created successfully!', formId });
    })
    .catch(err => {
      res.status(500).json({ error: err.message });
    });
  });

  return router;
};