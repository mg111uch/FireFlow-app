module.exports = [
  {
    name: 'businesses',
    createTable: `
      CREATE TABLE IF NOT EXISTS businesses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        unit_id TEXT NOT NULL UNIQUE,
        owner_user_id INTEGER NOT NULL,
        display_name TEXT NOT NULL DEFAULT '',
        region TEXT DEFAULT '',
        capabilities TEXT DEFAULT '[]',
        capacity TEXT DEFAULT '{}',
        order_book TEXT DEFAULT '[]',
        compliance_docs TEXT DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (unit_id) REFERENCES units(unit_id) ON DELETE CASCADE,
        FOREIGN KEY (owner_user_id) REFERENCES users(id)
      )
    `,
    migrations: [
      'ALTER TABLE businesses ADD COLUMN region TEXT DEFAULT \'\''
    ]
  }
];
