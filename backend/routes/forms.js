// y
const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// POST: Create a new form (general form - current user)
router.post('/', authenticateToken, (req, res) => {
  const { title, description, questions, form_type, service_name, subservice_name } = req.body;
  const creator_id = req.user.id;

  // Title is required for general forms
  if (!title || !questions || questions.length === 0) {
    return res.status(400).json({ error: 'Form must have a title and at least one question.' });
  }

  // Default to general form if not specified
  const finalFormType = form_type || 'general';

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    db.run(
      'INSERT INTO forms (title, description, creator_id, form_type, service_name, subservice_name) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description, creator_id, finalFormType, service_name || null, subservice_name || null],
      function (err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: err.message });
        }
        const formId = this.lastID;

        const insertQuestion = db.prepare(
          'INSERT INTO form_questions (form_id, question_text, question_type, order_index) VALUES (?, ?, ?, ?)'
        );
        const insertOption = db.prepare(
          'INSERT INTO question_options (question_id, option_text) VALUES (?, ?)'
        );

        // Use async/await pattern for sequential question insertion
        const insertQuestionsSequentially = async () => {
          for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            
            await new Promise((resolve, reject) => {
              insertQuestion.run(formId, q.question_text, q.question_type, i, function (err) {
                if (err) {
                  db.run('ROLLBACK');
                  return reject(err);
                }
                const questionId = this.lastID;
                
                // If radio question with options, insert them
                if (q.question_type === 'radio' && q.options && q.options.length > 0) {
                  const optionPromises = q.options.map(option => {
                    return new Promise((res, rej) => {
                      insertOption.run(questionId, option.option_text, function(err) {
                        if (err) {
                          db.run('ROLLBACK');
                          return rej(err);
                        }
                        res();
                      });
                    });
                  });
                  
                  Promise.all(optionPromises).then(resolve).catch(reject);
                } else {
                  resolve();
                }
              });
            });
          }
        };

        insertQuestionsSequentially()
          .then(() => {
            insertQuestion.finalize();
            insertOption.finalize(err => {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
              }
              db.run('COMMIT', commitErr => {
                if (commitErr) {
                  return res.status(500).json({ error: commitErr.message });
                }
                res.status(201).json({ message: 'Form created successfully!', formId });
              });
            });
          })
          .catch(err => {
            insertQuestion.finalize();
            insertOption.finalize(() => {
              res.status(500).json({ error: err.message });
            });
          });
      }
    );
  });
});

// POST: Create a service form (admin only - not necessarily current user)
router.post('/service', authenticateToken, (req, res) => {
  const { title, description, questions, service_name, subservice_name, admin_user_id } = req.body;
  const current_user_id = req.user.id;

  // Check if current user is the specified admin
  if (current_user_id !== admin_user_id) {
    return res.status(403).json({ error: 'Only the designated admin can create service forms.' });
  }

  // Service forms require service_name and subservice_name, but title is optional
  if (!questions || questions.length === 0) {
    return res.status(400).json({ error: 'Form must have at least one question.' });
  }

  if (!service_name || !subservice_name) {
    return res.status(400).json({ error: 'Service forms must have service_name and subservice_name.' });
  }

  // Use subservice name as default title if not provided
  const formTitle = title || `${subservice_name} Service Form`;
  const creator_id = admin_user_id;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    db.run(
      'INSERT INTO forms (title, description, creator_id, form_type, service_name, subservice_name) VALUES (?, ?, ?, ?, ?, ?)',
      [formTitle, description, creator_id, 'service', service_name, subservice_name],
      function (err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: err.message });
        }
        const formId = this.lastID;

        const insertQuestion = db.prepare(
          'INSERT INTO form_questions (form_id, question_text, question_type, order_index) VALUES (?, ?, ?, ?)'
        );
        const insertOption = db.prepare(
          'INSERT INTO question_options (question_id, option_text) VALUES (?, ?)'
        );

        // Use async/await pattern for sequential question insertion
        const insertQuestionsSequentially = async () => {
          for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            
            await new Promise((resolve, reject) => {
              insertQuestion.run(formId, q.question_text, q.question_type, i, function (err) {
                if (err) {
                  db.run('ROLLBACK');
                  return reject(err);
                }
                const questionId = this.lastID;
                
                // If radio question with options, insert them
                if (q.question_type === 'radio' && q.options && q.options.length > 0) {
                  const optionPromises = q.options.map(option => {
                    return new Promise((res, rej) => {
                      insertOption.run(questionId, option.option_text, function(err) {
                        if (err) {
                          db.run('ROLLBACK');
                          return rej(err);
                        }
                        res();
                      });
                    });
                  });
                  
                  Promise.all(optionPromises).then(resolve).catch(reject);
                } else {
                  resolve();
                }
              });
            });
          }
        };

        insertQuestionsSequentially()
          .then(() => {
            insertQuestion.finalize();
            insertOption.finalize(err => {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
              }
              db.run('COMMIT', commitErr => {
                if (commitErr) {
                  return res.status(500).json({ error: commitErr.message });
                }
                res.status(201).json({ message: 'Service form created successfully!', formId });
              });
            });
          })
          .catch(err => {
            insertQuestion.finalize();
            insertOption.finalize(() => {
              res.status(500).json({ error: err.message });
            });
          });
      }
    );
  });
});

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
  const { title, description, questions } = req.body;
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

    // Use promises to properly sequence the database operations
    const doTransaction = async () => {
      return new Promise((resolve, reject) => {
        db.serialize(() => {
          db.run('BEGIN TRANSACTION', (err) => {
            if (err) return reject(err);
            
            // Update form metadata first
            db.run(
              'UPDATE forms SET title = ?, description = ? WHERE id = ?',
              [title || form.title, description || form.description, formId],
              (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  return reject(err);
                }
                
                // Delete existing questions and options (cascade will handle options)
                db.run('DELETE FROM form_questions WHERE form_id = ?', [formId], (err) => {
                  if (err) {
                    db.run('ROLLBACK');
                    return reject(err);
                  }
                  
                  // Now insert new questions
                  const insertQuestion = db.prepare(
                    'INSERT INTO form_questions (form_id, question_text, question_type, order_index) VALUES (?, ?, ?, ?)'
                  );
                  const insertOption = db.prepare(
                    'INSERT INTO question_options (question_id, option_text) VALUES (?, ?)'
                  );

                  // Insert questions sequentially
                  const insertQuestionsSequentially = async () => {
                    for (let i = 0; i < questions.length; i++) {
                      const q = questions[i];
                      
                      await new Promise((resolve, reject) => {
                        insertQuestion.run(formId, q.question_text, q.question_type, i, function (err) {
                          if (err) {
                            db.run('ROLLBACK');
                            return reject(err);
                          }
                          const questionId = this.lastID;
                          
                          // If radio question with options, insert them
                          if (q.question_type === 'radio' && q.options && q.options.length > 0) {
                            const optionPromises = q.options.map(option => {
                              return new Promise((res, rej) => {
                                insertOption.run(questionId, option.option_text, function(err) {
                                  if (err) {
                                    db.run('ROLLBACK');
                                    return rej(err);
                                  }
                                  res();
                                });
                              });
                            });
                            
                            Promise.all(optionPromises).then(resolve).catch(reject);
                          } else {
                            resolve();
                          }
                        });
                      });
                    }
                  };

                  insertQuestionsSequentially()
                    .then(() => {
                      insertQuestion.finalize();
                      insertOption.finalize(err => {
                        if (err) {
                          db.run('ROLLBACK');
                          return reject(err);
                        }
                        db.run('COMMIT', commitErr => {
                          if (commitErr) return reject(commitErr);
                          resolve();
                        });
                      });
                    })
                    .catch(err => {
                      insertQuestion.finalize();
                      insertOption.finalize(() => {
                        reject(err);
                      });
                    });
                });
              }
            );
          });
        });
      });
    };

    doTransaction()
      .then(() => {
        res.json({ message: 'Form updated successfully!', formId });
      })
      .catch(err => {
        console.error('Error updating form:', err);
        res.status(500).json({ error: err.message || 'Failed to update form.' });
      });
  });
});

// GET: Get a single form definition (for filling)
router.get('/:formId', (req, res) => { // No authentication needed for getting the form definition
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

// POST: Submit form answers
router.post('/:formId/submit', (req, res) => {
  const { formId } = req.params;
  const { answers } = req.body; // answers is an array of { questionId: number, answerText: string }
  const submitter_id = req.user ? req.user.id : null; // Allow anonymous submission

  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: 'Answers are required.' });

  }

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    db.run('INSERT INTO form_submissions (form_id, submitter_id) VALUES (?, ?)', [formId, submitter_id], function (err) {
      if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: err.message }); }
      const submissionId = this.lastID;
      const insertAnswer = db.prepare('INSERT INTO submission_answers (submission_id, question_id, answer_text) VALUES (?, ?, ?)');
      answers.forEach(answer => insertAnswer.run(submissionId, answer.questionId, answer.answerText));
      insertAnswer.finalize(err => {
        if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: err.message }); }
        db.run('COMMIT', commitErr => {
          if (commitErr) return res.status(500).json({ error: commitErr.message });
          res.status(201).json({ message: 'Form submitted successfully!', submissionId });
        });
      });
    });
  });
});

// GET: Get all submissions for a specific form (public - no auth required)
router.get('/:formId/submissions/public', (req, res) => {
  const { formId } = req.params;

  // First check if form exists
  db.get('SELECT id FROM forms WHERE id = ?', [formId], (err, form) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!form) return res.status(404).json({ error: 'Form not found.' });

    // Fetch submissions (without creator check)
    const query = `
      SELECT
        fs.id AS submission_id,
        fs.submitted_at,
        u.username AS submitter_username,
        fq.question_text,
        sa.answer_text
      FROM form_submissions fs
      JOIN submission_answers sa ON fs.id = sa.submission_id
      JOIN form_questions fq ON sa.question_id = fq.id
      LEFT JOIN users u ON fs.submitter_id = u.id
      WHERE fs.form_id = ?
      ORDER BY fs.submitted_at DESC, fs.id, fq.order_index ASC;
    `;

    db.all(query, [formId], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      // Group answers by submission
      const submissions = {};
      rows.forEach(row => {
        if (!submissions[row.submission_id]) {
          submissions[row.submission_id] = {
            id: row.submission_id,
            submitted_at: row.submitted_at,
            submitter_username: row.submitter_username || 'Anonymous',
            answers: []
          };
        }
        submissions[row.submission_id].answers.push({
          question_text: row.question_text,
          answer_text: row.answer_text
        });
      });
      res.json(Object.values(submissions));
    });
  });
});

// GET: Get all submissions for a specific form (creator only)
router.get('/:formId/submissions', authenticateToken, (req, res) => {
  const { formId } = req.params;
  const creator_id = req.user.id;

  // Verify user is the creator of the form
  db.get('SELECT creator_id FROM forms WHERE id = ?', [formId], (err, form) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!form) return res.status(404).json({ error: 'Form not found.' });
    if (form.creator_id !== creator_id) {
      return res.status(403).json({ error: 'You are not authorized to view submissions for this form.' });
    }

    // Fetch submissions with answers and question text
    const query = `
      SELECT
        fs.id AS submission_id,
        fs.submitted_at,
        u.username AS submitter_username,
        fq.question_text,
        sa.answer_text
      FROM form_submissions fs
      JOIN submission_answers sa ON fs.id = sa.submission_id
      JOIN form_questions fq ON sa.question_id = fq.id
      LEFT JOIN users u ON fs.submitter_id = u.id
      WHERE fs.form_id = ?
      ORDER BY fs.submitted_at DESC, fs.id, fq.order_index ASC;
    `;

    db.all(query, [formId], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      // Group answers by submission for easier processing on frontend
      const submissions = {};
      rows.forEach(row => {
        if (!submissions[row.submission_id]) {
          submissions[row.submission_id] = {
            id: row.submission_id,
            submitted_at: row.submitted_at,
            submitter_username: row.submitter_username || 'Anonymous',
            answers: []
          };
        }
        submissions[row.submission_id].answers.push({
          question_text: row.question_text,
          answer_text: row.answer_text
        });
      });
      res.json(Object.values(submissions));
    });
  });
});

module.exports = (io, onlineUsers) => {
  return router;
};