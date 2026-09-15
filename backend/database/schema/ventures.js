module.exports = [
  {
    name: 'ventures',
    createTable: `
      CREATE TABLE IF NOT EXISTS ventures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_user_id INTEGER NOT NULL,
        business_id INTEGER,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        stage TEXT DEFAULT 'lab' CHECK(stage IN ('lab', 'pilot', 'product', 'graduated', 'killed')),
        stage_data TEXT DEFAULT '{}',
        kill_reason TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_user_id) REFERENCES users(id),
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL
      )
    `,
    migrations: []
  }
];
