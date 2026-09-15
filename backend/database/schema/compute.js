module.exports = [
  {
    name: 'compute_nodes',
    createTable: `
      CREATE TABLE IF NOT EXISTS compute_nodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        unit_id TEXT NOT NULL UNIQUE,
        owner_user_id INTEGER NOT NULL,
        name TEXT NOT NULL DEFAULT '',
        benchmarks TEXT DEFAULT '{}',
        runtime TEXT DEFAULT 'docker',
        workloads TEXT DEFAULT '[]',
        price_paise_per_hour INTEGER NOT NULL DEFAULT 0,
        status TEXT DEFAULT 'online' CHECK(status IN ('online', 'paused', 'offline')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (unit_id) REFERENCES units(unit_id) ON DELETE CASCADE,
        FOREIGN KEY (owner_user_id) REFERENCES users(id)
      )
    `,
    migrations: []
  },
  {
    name: 'compute_jobs',
    createTable: `
      CREATE TABLE IF NOT EXISTS compute_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        node_id INTEGER NOT NULL,
        requester_id INTEGER NOT NULL,
        workload TEXT NOT NULL,
        params TEXT DEFAULT '{}',
        result_ref TEXT DEFAULT '',
        status TEXT DEFAULT 'queued' CHECK(status IN ('queued', 'running', 'done', 'failed', 'cancelled')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (node_id) REFERENCES compute_nodes(id) ON DELETE CASCADE,
        FOREIGN KEY (requester_id) REFERENCES users(id)
      )
    `,
    migrations: []
  }
];
