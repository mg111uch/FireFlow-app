const express = require('express');
const db = require('../../database');
const { authenticateToken } = require('../../middleware/auth');

module.exports = (io, onlineUsers) => {
  const router = express.Router();

   // POST: Submit form answers
   router.post('/:formId/submit', (req, res) => {
     const { formId } = req.params;
     const { answers, form_price } = req.body; // answers is an array of { questionId: number, answerText: string }
     const submitter_id = req.user ? req.user.id : null; // Allow anonymous submission

     if (!answers || !Array.isArray(answers) || answers.length === 0) {
       return res.status(400).json({ error: 'Answers are required.' });
     }

     // Normalize price to integer
     const normalizedPrice = Number(form_price);
     const finalFormPrice = Number.isNaN(normalizedPrice) ? 0 : Math.round(normalizedPrice);

     db.serialize(() => {
       db.run('BEGIN TRANSACTION');
       db.run('INSERT INTO form_submissions (form_id, submitter_id, form_price) VALUES (?, ?, ?)', [formId, submitter_id, finalFormPrice], function (err) {
         if (err) {
           db.run('ROLLBACK');
           return res.status(500).json({ error: err.message });
         }
         const submissionId = this.lastID;
         const insertAnswer = db.prepare('INSERT INTO submission_answers (submission_id, question_id, answer_text) VALUES (?, ?, ?)');
         answers.forEach(answer => insertAnswer.run(submissionId, answer.questionId, answer.answerText));
         insertAnswer.finalize(err => {
           if (err) {
             db.run('ROLLBACK');
             return res.status(500).json({ error: err.message });
           }
           db.run('COMMIT', commitErr => {
             if (commitErr) return res.status(500).json({ error: commitErr.message });
             res.status(201).json({ message: 'Form submitted successfully!', submissionId });
           });
         });
       });
     });
   });

    // DELETE: Delete a submission (creator only)
    router.delete('/:formId/submissions/:submissionId', authenticateToken, (req, res) => {
      const { formId, submissionId } = req.params;
      const creator_id = req.user.id;

      // Verify user is the creator of the form
      db.get('SELECT creator_id FROM forms WHERE id = ?', [formId], (err, form) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!form) return res.status(404).json({ error: 'Form not found.' });
        if (form.creator_id !== creator_id) {
          return res.status(403).json({ error: 'You are not authorized to delete submissions for this form.' });
        }

        // Verify submission belongs to this form
        db.get('SELECT id FROM form_submissions WHERE id = ? AND form_id = ?', [submissionId, formId], (err, submission) => {
          if (err) return res.status(500).json({ error: err.message });
          if (!submission) return res.status(404).json({ error: 'Submission not found.' });

          // Delete submission and its answers in a transaction
          db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            // Delete answers first (explicit, though CASCADE should handle this)
            db.run('DELETE FROM submission_answers WHERE submission_id = ?', [submissionId], (err) => {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
              }
              // Delete submission
              db.run('DELETE FROM form_submissions WHERE id = ?', [submissionId], (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: err.message });
                }
                db.run('COMMIT', (commitErr) => {
                  if (commitErr) return res.status(500).json({ error: commitErr.message });
                  res.json({ message: 'Submission deleted successfully!' });
                });
              });
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
           fq.question_type,
           sa.answer_text
         FROM form_submissions fs
         JOIN submission_answers sa ON fs.id = sa.submission_id
         LEFT JOIN form_questions fq ON sa.question_id = fq.id
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
             question_type: row.question_type,
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
           fq.question_type,
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
             question_type: row.question_type,
             answer_text: row.answer_text
           });
         });
         res.json(Object.values(submissions));
       });
    });
  });

  return router;
};