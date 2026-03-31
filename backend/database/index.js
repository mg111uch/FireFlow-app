const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const users = require('./schema/users');
const social = require('./schema/social');
const messaging = require('./schema/messaging');
const forms = require('./schema/forms');
const markets = require('./schema/markets');
const marketplace = require('./schema/marketplace');
const payments = require('./schema/payments');
const gigs = require('./schema/gigs');
const auth = require('./schema/auth');

const SCHEMA_MODULES = [
  users,
  social,
  messaging,
  forms,
  markets,
  marketplace,
  payments,
  gigs,
  auth
];

function flattenSchema(modules) {
  const tables = [];
  modules.forEach((module) => {
    const items = Array.isArray(module) ? module : [module];
    items.forEach((item) => {
      tables.push(item);
    });
  });
  return tables;
}

const dbPath = process.env.NODE_ENV === 'test'
  ? ':memory:'
  : path.join(__dirname, 'reddit_clone.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    db.serialize(() => {
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
        if (!row) {
          initTables();
        } else {
          console.log('Database already initialized.');
          runMigrations();
        }
      });
    });
  }
});

function initTables() {
  const tables = flattenSchema(SCHEMA_MODULES);
  
  let completed = 0;
  const total = tables.length;
  
  tables.forEach((table) => {
    db.run(table.createTable, (err) => {
      if (err) {
        console.error(`Error creating table ${table.name}:`, err.message);
      }
      
      table.migrations.forEach((migration) => {
        db.run(migration, (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            console.error('Error running migration:', err.message);
          }
        });
      });
      
      completed++;
      if (completed === total) {
        console.log('All tables initialized.');
      }
    });
  });
  
  if (total === 0) {
    console.log('No tables to initialize.');
  }
}

function runMigrations() {
  const tables = flattenSchema(SCHEMA_MODULES);
  
  tables.forEach((table) => {
    table.migrations.forEach((migration) => {
      db.run(migration, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('Error running migration:', err.message);
        }
      });
    });
  });
  console.log('Migrations check completed.');
}

module.exports = db;