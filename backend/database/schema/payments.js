module.exports = [
  {
    name: 'payments',
    createTable: `
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        order_id TEXT NOT NULL UNIQUE,
        payment_id TEXT,
        amount_paise INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT 'INR',
        status TEXT NOT NULL DEFAULT 'created',
        purpose TEXT NOT NULL DEFAULT 'subscription_fee',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        verified_at TIMESTAMP,
        gateway TEXT,
        signature TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `,
    migrations: []
  },
  {
    name: 'gateway_transactions',
    createTable: `
      CREATE TABLE IF NOT EXISTS gateway_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        flowpay_id TEXT,
        upi_id TEXT,
        order_id TEXT NOT NULL,        
        payment_id TEXT UNIQUE,
        amount_paise INTEGER,
        status TEXT NOT NULL DEFAULT 'created',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `,
    migrations: []
  },
  {
    name: 'gateway_users',
    createTable: `
      CREATE TABLE gateway_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        flowpay_id TEXT UNIQUE,
        flowpay_secret TEXT,
        name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `,
    migrations: []
  }
];