module.exports = [
  {
    name: 'datasets',
    createTable: `
      CREATE TABLE IF NOT EXISTS datasets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        unit_id TEXT NOT NULL UNIQUE,
        owner_user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        schema_json TEXT DEFAULT '{}',
        price REAL NOT NULL DEFAULT 0,
        consent_text TEXT DEFAULT '',
        purposes TEXT DEFAULT '[]',
        sources TEXT DEFAULT '[]',
        access TEXT DEFAULT 'gated' CHECK(access IN ('open', 'gated')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (unit_id) REFERENCES units(unit_id) ON DELETE CASCADE,
        FOREIGN KEY (owner_user_id) REFERENCES users(id)
      )
    `,
    migrations: []
  },
  {
    name: 'data_access',
    createTable: `
      CREATE TABLE IF NOT EXISTS data_access (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dataset_id INTEGER NOT NULL,
        requester_id INTEGER NOT NULL,
        purpose TEXT NOT NULL,
        status TEXT DEFAULT 'requested' CHECK(status IN ('requested', 'granted', 'denied', 'revoked')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        decided_at TIMESTAMP,
        FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE,
        FOREIGN KEY (requester_id) REFERENCES users(id)
      )
    `,
    migrations: []
  },
  {
    name: 'dataset_licenses',
    createTable: `
      CREATE TABLE IF NOT EXISTS dataset_licenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dataset_id INTEGER NOT NULL,
        buyer_id INTEGER NOT NULL,
        terms TEXT DEFAULT '',
        restrictions TEXT DEFAULT '',
        purpose TEXT DEFAULT '',
        access_id INTEGER,
        status TEXT DEFAULT 'granted' CHECK(status IN ('granted', 'revoked')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        revoked_at TIMESTAMP,
        FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE,
        FOREIGN KEY (buyer_id) REFERENCES users(id)
      )
    `,
    migrations: []
  }
];
