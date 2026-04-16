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
  migrations: []
};