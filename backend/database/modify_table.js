const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database("./reddit_clone.db");

// QUERY
// const query = `SELECT * FROM payments WHERE order_id = ?`
// db.get(query, ['fp_order_b5729a781f6e0e9a59067828'], (err, row) => {
//   if (err) throw err;
//   console.log(row);
// });

// 2. Define the delete query
// const sql = `DELETE FROM submission_answers WHERE submission_id = ?`;
// const valueToDelete = 4;
// db.run(sql, [valueToDelete], function(err) {
//     if (err) {
//         return console.error(err.message);
//     }
//     console.log(`Row(s) deleted: ${this.changes}`);
// });

// Update column values
const newValue = 62;
const targetId = 60;
db.run(
  `UPDATE submission_answers SET question_id = ? WHERE id = ?`,
  [newValue, targetId],
  function (err) {
    if (err) {
      return console.error(err.message);
    }
    // 'this' refers to the statement object, containing changes count
    console.log(`Row(s) updated: ${this.changes}`);
  }
);

// Update column name
// const sql = `ALTER TABLE payments RENAME COLUMN razorpay_payment_id TO payment_id`;

// db.run(sql, (err) => {
//   if (err) {
//     return console.error(err.message);
//   }
//   console.log('Column renamed successfully');
// });

// Add column name
// const sql = `ALTER TABLE payments ADD COLUMN signature TEXT`;

// db.run(sql, (err) => {
//   if (err) {
//     return console.error(err.message);
//   }
//   console.log('Column added successfully');
// });

// Create new the table 
// const createTableQuery = `
//   CREATE TABLE IF NOT EXISTS payments (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         user_id INTEGER NOT NULL,
//         order_id TEXT NOT NULL UNIQUE,
//         payment_id TEXT,
//         amount_paise INTEGER NOT NULL,
//         currency TEXT NOT NULL DEFAULT 'INR',
//         status TEXT NOT NULL DEFAULT 'created',
//         purpose TEXT NOT NULL DEFAULT 'subscription_fee',
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         verified_at TIMESTAMP,
//         gateway TEXT,
//         signature TEXT,
//         FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
//       )
// `;
// db.run(createTableQuery, (err) => {
//   if (err) {
//     return console.error("Error creating table: ", err.message);
//   }
//   console.log('Table created successfully');
// });

// Rows to delete from ID 10 to ID 20
// const startId = 33;
// const endId = 56;

// // Using BETWEEN for an inclusive range [10, 20]
// db.run(
//   `DELETE FROM submission_answers WHERE id BETWEEN ? AND ?`,
//   [startId, endId],
//   function (err) {
//     if (err) {
//       return console.error(err.message);
//     }
//     console.log(`Rows deleted: ${this.changes}`);
//   }
// );

// Delete the table 
// db.run('DROP TABLE payments', (err) => {
//     if (err) {
//         return console.error(err.message);
//     }
//     console.log('Table deleted successfully');
// });

db.close();
