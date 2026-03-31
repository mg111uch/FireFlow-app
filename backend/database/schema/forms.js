module.exports = [
  {
    name: 'forms',
    createTable: `
      CREATE TABLE IF NOT EXISTS forms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        form_price INTEGER DEFAULT 0,
        creator_id INTEGER NOT NULL,
        form_type TEXT DEFAULT 'general',
        service_name TEXT,
        subservice_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `,
    migrations: []
  },
  {
    name: 'form_questions',
    createTable: `
      CREATE TABLE IF NOT EXISTS form_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        form_id INTEGER NOT NULL,
        question_text TEXT NOT NULL,
        question_type TEXT NOT NULL,
        order_index INTEGER NOT NULL,
        FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
      )
    `,
    migrations: []
  },
  {
    name: 'question_options',
    createTable: `
      CREATE TABLE IF NOT EXISTS question_options (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_id INTEGER NOT NULL,
        option_text TEXT NOT NULL,
        FOREIGN KEY (question_id) REFERENCES form_questions(id) ON DELETE CASCADE
      )
    `,
    migrations: []
  },
  {
    name: 'form_submissions',
    createTable: `
      CREATE TABLE IF NOT EXISTS form_submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        form_id INTEGER NOT NULL,
        submitter_id INTEGER,
        form_price INTEGER DEFAULT 0,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE,
        FOREIGN KEY (submitter_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `,
    migrations: []
  },
  {
    name: 'submission_answers',
    createTable: `
      CREATE TABLE IF NOT EXISTS submission_answers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        submission_id INTEGER NOT NULL,
        question_id INTEGER NOT NULL,
        answer_text TEXT NOT NULL,
        FOREIGN KEY (submission_id) REFERENCES form_submissions(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES form_questions(id) ON DELETE CASCADE
      )
    `,
    migrations: []
  }
];