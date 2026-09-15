module.exports = [
  {
    name: 'business_agents',
    createTable: `
      CREATE TABLE IF NOT EXISTS business_agents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_id INTEGER NOT NULL UNIQUE,
        duties TEXT DEFAULT '[]',
        thresholds TEXT DEFAULT '{}',
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
      )
    `,
    migrations: []
  },
  {
    name: 'agent_runs',
    createTable: `
      CREATE TABLE IF NOT EXISTS agent_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_id INTEGER NOT NULL,
        duty TEXT NOT NULL,
        input TEXT DEFAULT '{}',
        output TEXT DEFAULT '{}',
        status TEXT DEFAULT 'ok',
        initiated_by TEXT DEFAULT 'owner',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
      )
    `,
    migrations: []
  }
];
