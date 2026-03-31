module.exports = [
  {
    name: 'prediction_markets',
    createTable: `
      CREATE TABLE IF NOT EXISTS prediction_markets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question TEXT NOT NULL,
        description TEXT,
        creator_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `,
    migrations: []
  },
  {
    name: 'market_options',
    createTable: `
      CREATE TABLE IF NOT EXISTS market_options (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        market_id INTEGER NOT NULL,
        option_text TEXT NOT NULL,
        FOREIGN KEY (market_id) REFERENCES prediction_markets(id) ON DELETE CASCADE
      )
    `,
    migrations: []
  },
  {
    name: 'market_trades',
    createTable: `
      CREATE TABLE IF NOT EXISTS market_trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        market_id INTEGER NOT NULL,
        option_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        traded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (market_id) REFERENCES prediction_markets(id) ON DELETE CASCADE,
        FOREIGN KEY (option_id) REFERENCES market_options(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `,
    migrations: []
  }
];