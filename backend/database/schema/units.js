module.exports = [
  {
    name: 'units',
    createTable: `
      CREATE TABLE IF NOT EXISTS units (
        unit_id TEXT PRIMARY KEY,
        unit_type TEXT NOT NULL CHECK(unit_type IN ('Person', 'Business', 'Organization', 'AI Agent', 'Service', 'Product', 'Vehicle', 'Machine', 'Facility', 'Compute Node', 'Dataset')),
        subtype TEXT,
        owner_user_id INTEGER,
        identity_json TEXT DEFAULT '{}',
        state_json TEXT DEFAULT '{}',
        traits_json TEXT DEFAULT '{}',
        resources_json TEXT DEFAULT '{}',
        behaviors_json TEXT DEFAULT '[]',
        relations_json TEXT DEFAULT '[]',
        verification_status TEXT DEFAULT 'unverified',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `,
    migrations: []
  }
];
