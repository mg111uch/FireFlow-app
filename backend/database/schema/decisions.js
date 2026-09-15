module.exports = [
  {
    name: 'decisions',
    createTable: `
      CREATE TABLE IF NOT EXISTS decisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_type TEXT NOT NULL CHECK(subject_type IN ('opportunity', 'task')),
        subject_id INTEGER NOT NULL,
        verdict TEXT NOT NULL CHECK(verdict IN ('scaled', 'abandoned', 'pivoted')),
        reason TEXT NOT NULL,
        decided_by INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (decided_by) REFERENCES users(id)
      )
    `,
    migrations: []
  }
];
