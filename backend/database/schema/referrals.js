module.exports = [
  {
    name: 'referrals',
    createTable: `
      CREATE TABLE IF NOT EXISTS referrals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        inviter_id INTEGER NOT NULL,
        invitee_id INTEGER,
        status TEXT DEFAULT 'open' CHECK(status IN ('open', 'redeemed')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (inviter_id) REFERENCES users(id),
        FOREIGN KEY (invitee_id) REFERENCES users(id)
      )
    `,
    migrations: []
  }
];
