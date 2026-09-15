module.exports = [
  {
    name: 'export_orders',
    createTable: `
      CREATE TABLE IF NOT EXISTS export_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_id INTEGER NOT NULL,
        owner_user_id INTEGER NOT NULL,
        buyer_country TEXT NOT NULL,
        items TEXT DEFAULT '[]',
        currency TEXT NOT NULL DEFAULT 'USD',
        incoterm TEXT DEFAULT 'FOB' CHECK(incoterm IN ('EXW', 'FOB', 'CIF')),
        forex_rate REAL DEFAULT 0,
        status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'quoted', 'confirmed', 'shipped', 'delivered', 'cancelled')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
        FOREIGN KEY (owner_user_id) REFERENCES users(id)
      )
    `,
    migrations: []
  }
];
