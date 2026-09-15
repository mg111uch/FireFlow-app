module.exports = [
  {
    name: 'market_signals',
    createTable: `
      CREATE TABLE IF NOT EXISTS market_signals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        signal_type TEXT NOT NULL CHECK(signal_type IN ('trend', 'demand', 'policy', 'tech_cost')),
        title TEXT NOT NULL,
        detail TEXT DEFAULT '',
        region TEXT DEFAULT '',
        reported_by INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (reported_by) REFERENCES users(id)
      )
    `,
    migrations: []
  }
];
