module.exports = [
  {
    name: 'tasks',
    createTable: `
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        objective TEXT NOT NULL,
        budget REAL NOT NULL DEFAULT 0,
        deadline TEXT DEFAULT '',
        inputs TEXT DEFAULT '{}',
        required_capabilities TEXT DEFAULT '[]',
        verification_rule TEXT DEFAULT '',
        reward REAL NOT NULL DEFAULT 0,
        risk_flag TEXT DEFAULT '',
        status TEXT DEFAULT 'open' CHECK(status IN ('open', 'claimed', 'completed', 'paid', 'cancelled')),
        poster_id INTEGER NOT NULL,
        worker_id INTEGER,
        opportunity_id INTEGER,
        direction TEXT DEFAULT 'need' CHECK(direction IN ('need', 'offer')),
        category TEXT DEFAULT '',
        parent_id INTEGER,
        engagement_type TEXT DEFAULT '',
        terms_ref TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (poster_id) REFERENCES users(id),
        FOREIGN KEY (worker_id) REFERENCES users(id),
        FOREIGN KEY (opportunity_id) REFERENCES opportunities(id)
      )
    `,
    migrations: [
      'ALTER TABLE tasks ADD COLUMN direction TEXT DEFAULT \'need\'',
      'ALTER TABLE tasks ADD COLUMN category TEXT DEFAULT \'\'',
      'ALTER TABLE tasks ADD COLUMN parent_id INTEGER',
      'ALTER TABLE tasks ADD COLUMN engagement_type TEXT DEFAULT \'\'',
      'ALTER TABLE tasks ADD COLUMN terms_ref TEXT DEFAULT \'\''
    ]
  }
];
