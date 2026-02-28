// y
const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// POST: Create a new form
router.post('/', authenticateToken, (req, res) => {
  const { title, description, questions } = req.body;
  const creator_id = req.user.id;

  if (!title || !questions || questions.length === 0) {
    return res.status(400).json({ error: 'Form must have a title and at least one question.' });
  }

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    db.run(
      'INSERT INTO forms (title, description, creator_id) VALUES (?, ?, ?)',
      [title, description, creator_id],
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

        questions.forEach((q, index) => {
          insertQuestion.run(formId, q.text, q.type, index, function (err) {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: err.message });
            }
            const questionId = this.lastID;

            if (q.type === 'radio' && q.options && q.options.length > 0) {
              q.options.forEach(optionText => {
                insertOption.run(questionId, optionText);
              });
            }
          });
        });

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
      }
    );
  });
});

// GET: Get forms created by the logged-in user
router.get('/my', authenticateToken, (req, res) => {
  const creator_id = req.user.id;
  db.all('SELECT * FROM forms WHERE creator_id = ? ORDER BY created_at DESC', [creator_id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
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