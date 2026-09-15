module.exports = [
  {
    name: 'ledger',
    createTable: `
      CREATE TABLE IF NOT EXISTS ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entry_type TEXT NOT NULL CHECK(entry_type IN ('income', 'expense', 'staged', 'approved')),
        amount_paise INTEGER NOT NULL CHECK(amount_paise >= 0),
        currency TEXT NOT NULL DEFAULT 'INR',
        from_user INTEGER,
        to_user INTEGER,
        ref_type TEXT DEFAULT '',
        ref_id INTEGER,
        memo TEXT DEFAULT '',
        created_by INTEGER,
        created_via TEXT DEFAULT 'user',
        approved_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (from_user) REFERENCES users(id),
        FOREIGN KEY (to_user) REFERENCES users(id)
      )
    `,
    migrations: [
      'ALTER TABLE ledger ADD COLUMN debit_account TEXT DEFAULT \'\'',
      'ALTER TABLE ledger ADD COLUMN credit_account TEXT DEFAULT \'\'',
      'ALTER TABLE ledger ADD COLUMN provider_tx_id TEXT',
      'ALTER TABLE ledger ADD COLUMN contract_id INTEGER',
      'ALTER TABLE ledger ADD COLUMN actor TEXT DEFAULT \'\'',
      'ALTER TABLE ledger ADD COLUMN status TEXT DEFAULT \'settled\'',
      'ALTER TABLE ledger ADD COLUMN idempotency_key TEXT',
      'ALTER TABLE ledger ADD COLUMN evidence TEXT DEFAULT \'{}\''
    ]
  },
  {
    name: 'fee_config',
    createTable: `
      CREATE TABLE IF NOT EXISTS fee_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `,
    migrations: []
  }
];
