module.exports = [
  {
    name: 'ratings',
    createTable: `
      CREATE TABLE IF NOT EXISTS ratings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_id INTEGER NOT NULL,
        rater_id INTEGER NOT NULL,
        task_id INTEGER,
        contract_id INTEGER,
        score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 5),
        comment TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (subject_id) REFERENCES users(id),
        FOREIGN KEY (rater_id) REFERENCES users(id),
        FOREIGN KEY (task_id) REFERENCES tasks(id),
        FOREIGN KEY (contract_id) REFERENCES contracts(id)
      )
    `,
    migrations: []
  },
  {
    name: 'attestations',
    createTable: `
      CREATE TABLE IF NOT EXISTS attestations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_id INTEGER NOT NULL,
        attester_id INTEGER NOT NULL,
        capability TEXT NOT NULL,
        kind TEXT DEFAULT 'trial' CHECK(kind IN ('test', 'trial')),
        proof_ref TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (subject_id) REFERENCES users(id),
        FOREIGN KEY (attester_id) REFERENCES users(id)
      )
    `,
    migrations: []
  },
  {
    name: 'capability_scores',
    createTable: `
      CREATE TABLE IF NOT EXISTS capability_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reporter_id INTEGER NOT NULL,
        capability TEXT NOT NULL,
        correct INTEGER NOT NULL DEFAULT 0,
        total INTEGER NOT NULL DEFAULT 0,
        UNIQUE(reporter_id, capability),
        FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `,
    migrations: []
  }
];
