module.exports = [
  {
    name: 'gigs',
    createTable: `
      CREATE TABLE IF NOT EXISTS gigs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK(type IN ('ride', 'delivery')),
        pickup_address TEXT NOT NULL,
        pickup_lat REAL,
        pickup_lng REAL,
        dropoff_address TEXT NOT NULL,
        dropoff_lat REAL,
        dropoff_lng REAL,
        details TEXT,
        price INTEGER NOT NULL,
        status TEXT DEFAULT 'open' CHECK(status IN ('open', 'accepted', 'completed', 'cancelled')),
        user_id INTEGER NOT NULL,
        driver_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (driver_id) REFERENCES users(id)
      )
    `,
    migrations: [
      'ALTER TABLE gigs ADD COLUMN vehicle_type TEXT',
      'ALTER TABLE gigs ADD COLUMN distance REAL',
      'ALTER TABLE gigs ADD COLUMN payout_price REAL',
      'ALTER TABLE gigs ADD COLUMN is_paid INTEGER DEFAULT 0'
    ]
  }
];