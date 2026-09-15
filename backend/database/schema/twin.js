module.exports = [
  {
    name: 'twin_snapshots',
    createTable: `
      CREATE TABLE IF NOT EXISTS twin_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_id INTEGER NOT NULL,
        metrics TEXT DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
      )
    `,
    migrations: []
  }
];
