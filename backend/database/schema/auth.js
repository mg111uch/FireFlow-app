module.exports = [
  {
    name: 'agent_api_keys',
    createTable: `
      CREATE TABLE IF NOT EXISTS agent_api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key_name TEXT NOT NULL,
        api_key TEXT NOT NULL UNIQUE,
        user_id INTEGER NOT NULL,
        permissions TEXT DEFAULT 'read',
        is_active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `,
    migrations: [
      'ALTER TABLE agent_api_keys ADD COLUMN unit_id TEXT',
      'ALTER TABLE agent_api_keys ADD COLUMN spend_limit_paise INTEGER'
    ]
  },
  {
    name: 'password_resets',
    createTable: `
      CREATE TABLE IF NOT EXISTS password_resets (
        email TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `,
    migrations: []
  }
];