module.exports = {
  createTable: `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      display_name TEXT,
      bio TEXT,
      avatar_url TEXT,
      location TEXT,
      city TEXT,
      state TEXT,
      country TEXT,
      website TEXT,
      phone TEXT,
      adhar_card_no TEXT,
      pan_card_no TEXT,
      driving_licence TEXT,
      date_of_birth DATE,
      gender TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,
  migrations: [
    'ALTER TABLE users ADD COLUMN display_name TEXT',
    'ALTER TABLE users ADD COLUMN bio TEXT',
    'ALTER TABLE users ADD COLUMN avatar_url TEXT',
    'ALTER TABLE users ADD COLUMN location TEXT',
    'ALTER TABLE users ADD COLUMN city TEXT',
    'ALTER TABLE users ADD COLUMN state TEXT',
    'ALTER TABLE users ADD COLUMN country TEXT',
    'ALTER TABLE users ADD COLUMN website TEXT',
    'ALTER TABLE users ADD COLUMN phone TEXT',
    'ALTER TABLE users ADD COLUMN adhar_card_no TEXT',
    'ALTER TABLE users ADD COLUMN pan_card_no TEXT',
    'ALTER TABLE users ADD COLUMN driving_licence TEXT',
    'ALTER TABLE users ADD COLUMN date_of_birth DATE',
    'ALTER TABLE users ADD COLUMN gender TEXT'
  ]
};