module.exports = [
  {
    name: 'contracts',
    createTable: `
      CREATE TABLE IF NOT EXISTS contracts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        poster_id INTEGER NOT NULL,
        worker_id INTEGER,
        amount REAL NOT NULL DEFAULT 0,
        kill_fee REAL NOT NULL DEFAULT 0,
        status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'locked', 'released', 'cancelled', 'disputed')),
        milestones TEXT DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id),
        FOREIGN KEY (poster_id) REFERENCES users(id),
        FOREIGN KEY (worker_id) REFERENCES users(id)
      )
    `,
    migrations: []
  }
];
