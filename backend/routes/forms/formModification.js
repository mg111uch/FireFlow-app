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

      // Normalize price to integer (round any fractional values)
      const normalizedPrice = Number(form_price);
      const finalFormPrice = Number.isNaN(normalizedPrice) ? 0 : Math.round(normalizedPrice);

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

         // Update form_price for all existing submissions to match the new price
         await new Promise((resolve, reject) => {
           db.run(
             'UPDATE form_submissions SET form_price = ? WHERE form_id = ?',
             [finalFormPrice, formId],
             (err) => {
               if (err) return reject(err);
               resolve();
             }
           );
         });

         // Fetch existing questions to preserve IDs for unchanged questions
         const existingQuestions = await new Promise((resolve, reject) => {
           db.all('SELECT id, question_text, question_type, order_index FROM form_questions WHERE form_id = ?', [formId], (err, rows) => {
             if (err) return reject(err);
             resolve(rows);
           });
         });

         // Build map of existing questions by id
         const existingById = {};
         existingQuestions.forEach(q => {
           existingById[q.id] = q;
         });

         // Track which existing question IDs are kept
         const keptQuestionIds = new Set();
         const insertQuestion = db.prepare(
           'INSERT INTO form_questions (form_id, question_text, question_type, order_index) VALUES (?, ?, ?, ?)'
         );
         const insertOption = db.prepare(
           'INSERT INTO question_options (question_id, option_text) VALUES (?, ?)'
         );
         const updateQuestion = db.prepare(
           'UPDATE form_questions SET question_text = ?, question_type = ?, order_index = ? WHERE id = ? AND form_id = ?'
         );
         const deleteQuestion = db.prepare(
           'DELETE FROM form_questions WHERE id = ? AND form_id = ?'
         );

         // Process each submitted question
         for (let i = 0; i < questions.length; i++) {
           const q = questions[i];

           if (q.id && existingById[q.id]) {
             // Existing question: update in place, preserving ID
             await new Promise((resolve, reject) => {
               updateQuestion.run(q.question_text, q.question_type, i, q.id, formId, function (err) {
                 if (err) return reject(err);
                 keptQuestionIds.add(q.id);
                 resolve();
               });
             });
             // Update options if it's a radio question
             if (q.question_type === 'radio' && q.options && q.options.length > 0) {
               // Delete old options for this question and insert new ones
               await new Promise((resolve, reject) => {
                 db.run('DELETE FROM question_options WHERE question_id = ?', [q.id], (err) => {
                   if (err) return reject(err);
                   resolve();
                 });
               });
               for (const opt of q.options) {
                 await new Promise((resolveOpt, rejectOpt) => {
                   insertOption.run(q.id, opt.option_text, function(err) {
                     if (err) return rejectOpt(err);
                     resolveOpt();
                   });
                 });
               }
             }
           } else {
             // New question: insert with new auto-increment ID
             await new Promise((resolveInner, rejectInner) => {
               insertQuestion.run(formId, q.question_text, q.question_type, i, function (err) {
                 if (err) return rejectInner(err);
                 const questionId = this.lastID;

                 // Insert options for radio questions
                 if (q.question_type === 'radio' && q.options && q.options.length > 0) {
                   const optionPromises = q.options.map(option => {
                     return new Promise((res, rej) => {
                       insertOption.run(questionId, option.option_text, function(err) {
                         if (err) return rej(err);
                         res();
                       });
                     });
                   });
                   Promise.all(optionPromises).then(resolveInner).catch(rejectInner);
                 } else {
                   resolveInner();
                 }
               });
             });
           }
         }

         // Delete questions that were removed from the form
         for (const existingQ of existingQuestions) {
           if (!keptQuestionIds.has(existingQ.id)) {
             await new Promise((resolve, reject) => {
               deleteQuestion.run(existingQ.id, formId, (err) => {
                 if (err) return reject(err);
                 resolve();
               });
             });
           }
         }

         insertQuestion.finalize();
         insertOption.finalize();
         updateQuestion.finalize();
         deleteQuestion.finalize();

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