module.exports = [
  {
    name: 'opportunities',
    createTable: `
      CREATE TABLE IF NOT EXISTS opportunities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        problem TEXT NOT NULL,
        customer TEXT NOT NULL,
        price REAL NOT NULL DEFAULT 0,
        cost REAL NOT NULL DEFAULT 0,
        margin REAL NOT NULL DEFAULT 0,
        startup_cost REAL NOT NULL DEFAULT 0,
        time_to_revenue TEXT DEFAULT '',
        moonshot_relevance REAL DEFAULT 0,
        scalability REAL DEFAULT 0,
        adjacency REAL DEFAULT 0,
        score REAL,
        verdict TEXT,
        breakdown TEXT,
        status TEXT DEFAULT 'open' CHECK(status IN ('open', 'scored', 'staged', 'abandoned')),
        pipeline TEXT DEFAULT '',
        executing_task_id INTEGER,
        user_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `,
    migrations: [
      'ALTER TABLE opportunities ADD COLUMN pipeline TEXT DEFAULT \'\'',
      'ALTER TABLE opportunities ADD COLUMN executing_task_id INTEGER'
    ]
  }
];
