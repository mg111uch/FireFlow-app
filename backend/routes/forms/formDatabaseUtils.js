// Utility functions for form database operations
const db = require('../../database');

/**
 * Wrapper for database transactions with consistent error handling
 * @param {Function} operationFn - Function that performs database operations
 * @returns {Promise} - Promise that resolves when transaction completes
 */
const executeTransaction = (operationFn) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) return reject(err);
        
        operationFn()
          .then(() => {
            db.run('COMMIT', (commitErr) => {
              if (commitErr) return reject(commitErr);
              resolve();
            });
          })
          .catch(async (error) => {
            try {
              db.run('ROLLBACK');
            } catch (rollbackErr) {
              // Ignore rollback errors
            }
            reject(error);
          });
      });
    });
  });
};

/**
 * Insert questions and their options for a form
 * @param {number} formId - ID of the form
 * @param {Array} questions - Array of question objects
 * @returns {Promise} - Promise that resolves when all questions/options inserted
 */
const insertQuestionsAndOptions = (formId, questions) => {
  return new Promise((resolve, reject) => {
    const insertQuestion = db.prepare(
      'INSERT INTO form_questions (form_id, question_text, question_type, order_index) VALUES (?, ?, ?, ?)'
    );
    const insertOption = db.prepare(
      'INSERT INTO question_options (question_id, option_text) VALUES (?, ?)'
    );

    const insertQuestionsSequentially = async () => {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        
        await new Promise((resolveInner, rejectInner) => {
          insertQuestion.run(formId, q.question_text, q.question_type, i, function (err) {
            if (err) {
              insertQuestion.finalize();
              insertOption.finalize();
              return rejectInner(err);
            }
            const questionId = this.lastID;
            
            // If radio question with options, insert them
            if (q.question_type === 'radio' && q.options && q.options.length > 0) {
              const optionPromises = q.options.map(option => {
                return new Promise((res, rej) => {
                  insertOption.run(questionId, option.option_text, function(err) {
                    if (err) {
                      insertQuestion.finalize();
                      insertOption.finalize();
                      return rej(err);
                    }
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
      
      insertQuestion.finalize();
      insertOption.finalize();
      resolve();
    };

    insertQuestionsSequentially().catch(reject);
  });
};

/**
 * Validate form creation data
 * @param {Object} reqBody - Request body
 * @param {string} formType - Type of form ('general' or 'service')
 * @returns {Object|null} - Error object if validation fails, null if valid
 */
const validateFormData = (reqBody, formType) => {
  const { title, description, questions, form_price, service_name, subservice_name, admin_user_id } = reqBody;
  
  // Questions are always required
  if (!questions || questions.length === 0) {
    return { error: 'Form must have at least one question.' };
  }

  if (formType === 'general') {
    // Title is required for general forms
    if (!title) {
      return { error: 'Form must have a title.' };
    }
  } else if (formType === 'service') {
    // Service forms require service_name and subservice_name
    if (!service_name || !subservice_name) {
      return { error: 'Service forms must have service_name and subservice_name.' };
    }
    
    // For service forms, admin verification is handled elsewhere
  }

  return null;
};

module.exports = {
  executeTransaction,
  insertQuestionsAndOptions,
  validateFormData
};