module.exports = [
  {
    name: 'observations',
    createTable: `
      CREATE TABLE IF NOT EXISTS observations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reporter_id INTEGER NOT NULL,
        business_id INTEGER,
        metric TEXT NOT NULL,
        value REAL,
        note TEXT DEFAULT '',
        region TEXT DEFAULT '',
        escalated_task_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (reporter_id) REFERENCES users(id),
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL,
        FOREIGN KEY (escalated_task_id) REFERENCES tasks(id) ON DELETE SET NULL
      )
    `,
    migrations: [
      'ALTER TABLE observations ADD COLUMN source TEXT DEFAULT \'\'',
      'ALTER TABLE observations ADD COLUMN device TEXT DEFAULT \'\'',
      'ALTER TABLE observations ADD COLUMN geography TEXT DEFAULT \'{}\'',
      'ALTER TABLE observations ADD COLUMN evidence TEXT DEFAULT \'{}\'',
      'ALTER TABLE observations ADD COLUMN confidence REAL',
      'ALTER TABLE observations ADD COLUMN confirmation_count INTEGER DEFAULT 0'
    ]
  },
  {
    name: 'observation_confirmations',
    createTable: `
      CREATE TABLE IF NOT EXISTS observation_confirmations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        observation_id INTEGER NOT NULL,
        confirmer_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(observation_id, confirmer_id),
        FOREIGN KEY (observation_id) REFERENCES observations(id) ON DELETE CASCADE,
        FOREIGN KEY (confirmer_id) REFERENCES users(id)
      )
    `,
    migrations: []
  }
];
