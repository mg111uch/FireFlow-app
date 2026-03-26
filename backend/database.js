// y
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.NODE_ENV === 'test'
       ? ':memory:'
      : path.join(__dirname, 'reddit_clone.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    db.serialize(() => {
// y
      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
// n        
      // Communities table
      db.run(`
        CREATE TABLE IF NOT EXISTS communities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          creator_id INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (creator_id) REFERENCES users(id)
        )
      `);
// n
      // Posts table 
      db.run(`
        CREATE TABLE IF NOT EXISTS posts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT,
          content TEXT,
          user_id INTEGER,
          community_id INTEGER,
          image_url TEXT,
          post_type TEXT DEFAULT 'general',
          repost_count INTEGER DEFAULT 0,
          original_post_id INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (community_id) REFERENCES communities(id),
          FOREIGN KEY (original_post_id) REFERENCES posts(id)
        )
      `);

// n
      // Add Followers table 
      db.run(`
        CREATE TABLE IF NOT EXISTS followers (
          follower_id INTEGER NOT NULL,
          following_id INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (follower_id, following_id),
          FOREIGN KEY (follower_id) REFERENCES users(id),
          FOREIGN KEY (following_id) REFERENCES users(id)
        )
      `);
// n
      // Comments table
      db.run(`
        CREATE TABLE IF NOT EXISTS comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          content TEXT NOT NULL,
          user_id INTEGER,
          post_id INTEGER,
          parent_id INTEGER,
          is_pinned BOOLEAN DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
          FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
        )
      `);
// n
      // Votes table (for posts and comments)
      db.run(`
        CREATE TABLE IF NOT EXISTS votes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          post_id INTEGER,
          comment_id INTEGER,
          vote_type INTEGER NOT NULL, -- 1 for upvote, -1 for downvote
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, post_id, comment_id),  -- A user can only vote once per post
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (post_id) REFERENCES posts(id),
          FOREIGN KEY (comment_id) REFERENCES comments(id)          
        )
      `);
// n
      // Notifications table
      db.run(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          recipient_id INTEGER NOT NULL,
          sender_id INTEGER NOT NULL,
          type TEXT NOT NULL, -- 'new_comment', 'reply', 'mention'
          post_id INTEGER NOT NULL,
          comment_id INTEGER, 
          content_preview TEXT, -- A snippet of the comment
          is_read BOOLEAN DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
          FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
        )
      `);
// n
      // Post Views table (if you are tracking views)
      db.run(`
        CREATE TABLE IF NOT EXISTS post_views (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          post_id INTEGER,
          user_id INTEGER, -- Optional: if you want to track unique views per user
          viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (post_id, user_id), -- Ensures a user's view is only counted once per post
          FOREIGN KEY (post_id) REFERENCES posts(id),
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);
// n
      // Community memberships
      db.run(`
        CREATE TABLE IF NOT EXISTS community_members (
          user_id INTEGER NOT NULL,
          community_id INTEGER NOT NULL,
          joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE,
          PRIMARY KEY (user_id, community_id)
        )
      `);
// n
      // Saved Posts (Bookmarks)
      db.run(`
        CREATE TABLE IF NOT EXISTS saved_posts (
          user_id INTEGER NOT NULL,
          post_id INTEGER NOT NULL,
          saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
          PRIMARY KEY (user_id, post_id)
        )
      `);
// n
      // Saved Comments
      db.run(`
        CREATE TABLE IF NOT EXISTS saved_comments (
            user_id INTEGER NOT NULL,
            comment_id INTEGER NOT NULL,
            saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
            PRIMARY KEY (user_id, comment_id)
        )
      `);
// n
      // Password Resets
      db.run(`
        CREATE TABLE IF NOT EXISTS password_resets (
          email TEXT NOT NULL,
          token TEXT NOT NULL UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
// y
      // Messages table for chat functionality
      db.run(`
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sender_id INTEGER NOT NULL,
          receiver_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          read_status INTEGER DEFAULT 0, -- 0 for unread, 1 for read
          edited INTEGER DEFAULT 0, -- 0 for not edited, 1 for edited
          reply_to_message_id INTEGER,
          FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (reply_to_message_id) REFERENCES messages(id) ON DELETE SET NULL
        )
      `);
      // Emoji reactions table for chats messages
      db.run(`
        CREATE TABLE IF NOT EXISTS message_reactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          message_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          emoji TEXT NOT NULL,
          FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
// n
       // Forms table
       db.run(`
         CREATE TABLE IF NOT EXISTS forms (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           title TEXT NOT NULL,
           description TEXT,
           form_price INTEGER DEFAULT 0,
           creator_id INTEGER NOT NULL,
           form_type TEXT DEFAULT 'general',
           service_name TEXT,
           subservice_name TEXT,
           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
           FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
         )
       `);
// n
      // Form Questions table
      db.run(`
        CREATE TABLE IF NOT EXISTS form_questions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          form_id INTEGER NOT NULL,
          question_text TEXT NOT NULL,
          question_type TEXT NOT NULL, -- 'text', 'textarea', 'radio'
          order_index INTEGER NOT NULL,
          FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
        )
      `);
// n
      // Question Options table (for radio/checkbox types)
      db.run(`
        CREATE TABLE IF NOT EXISTS question_options (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          question_id INTEGER NOT NULL,
          option_text TEXT NOT NULL,
          FOREIGN KEY (question_id) REFERENCES form_questions(id) ON DELETE CASCADE
        )
      `);
// n
       // Form Submissions table
       db.run(`
         CREATE TABLE IF NOT EXISTS form_submissions (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           form_id INTEGER NOT NULL,
           submitter_id INTEGER, -- NULL for anonymous submissions, or user_id
           form_price INTEGER DEFAULT 0,
           submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
           FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE,
           FOREIGN KEY (submitter_id) REFERENCES users(id) ON DELETE SET NULL
         )
       `);
// n
      // Submission Answers table
      db.run(`
        CREATE TABLE IF NOT EXISTS submission_answers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          submission_id INTEGER NOT NULL,
          question_id INTEGER NOT NULL,
          answer_text TEXT NOT NULL, -- Stores the answer, for radio it's the selected option_text
          FOREIGN KEY (submission_id) REFERENCES form_submissions(id) ON DELETE CASCADE,
          FOREIGN KEY (question_id) REFERENCES form_questions(id) ON DELETE CASCADE
        )
      `);
// n
      // Prediction Markets
      db.run(`
        CREATE TABLE IF NOT EXISTS prediction_markets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          question TEXT NOT NULL,
          description TEXT,
          creator_id INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
// n
      // Market Options (possible outcomes for a prediction market)
      db.run(`
        CREATE TABLE IF NOT EXISTS market_options (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          market_id INTEGER NOT NULL,
          option_text TEXT NOT NULL,
          FOREIGN KEY (market_id) REFERENCES prediction_markets(id) ON DELETE CASCADE
        )
      `);
// n
      // Market Trades (user "votes" on market options)
      db.run(`
        CREATE TABLE IF NOT EXISTS market_trades (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          market_id INTEGER NOT NULL,
          option_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          amount REAL NOT NULL, -- The 'weight' of the user's vote/prediction
          traded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (market_id) REFERENCES prediction_markets(id) ON DELETE CASCADE,
          FOREIGN KEY (option_id) REFERENCES market_options(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
// y
      // Agent API Keys table
      db.run(`
        CREATE TABLE IF NOT EXISTS agent_api_keys (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key_name TEXT NOT NULL,
          api_key TEXT NOT NULL UNIQUE,
          user_id INTEGER NOT NULL,
          permissions TEXT DEFAULT 'read', -- 'read' or 'read/write'
          is_active INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // Shops table
      db.run(`
        CREATE TABLE IF NOT EXISTS shops (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          owner_id INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (owner_id) REFERENCES users(id)
        )
      `);

      // Shop Products table
      db.run(`
        CREATE TABLE IF NOT EXISTS shop_products (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          shop_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          price INTEGER NOT NULL,
          stock INTEGER DEFAULT 10,
          category TEXT,
          image_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
        )
      `);

      // Shop Orders table
      db.run(`
        CREATE TABLE IF NOT EXISTS shop_orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          shop_id INTEGER NOT NULL,
          customer_id INTEGER,
          customer_username TEXT,
          items TEXT NOT NULL,
          total INTEGER NOT NULL,
          status TEXT DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
          FOREIGN KEY (customer_id) REFERENCES users(id)
        )
      `);

      // ─── Payments table ───────────────────────────────────────────────────
      // Records every Razorpay payment attempt and its final status.
      //
      // Columns:
      //   razorpay_order_id   — the order created via /api/payments/create-order
      //   razorpay_payment_id — populated after successful payment + verification
      //   amount_paise        — amount in paise (e.g. 49900 = ₹499)
      //   status              — 'created' | 'verified' | 'failed'
      //   purpose             — free-text label (e.g. 'subscription_fee')
      //   created_at          — when the order was created
      //   verified_at         — when signature verification succeeded
      db.run(`
        CREATE TABLE IF NOT EXISTS payments (
          id                  INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id             INTEGER NOT NULL,
          razorpay_order_id   TEXT NOT NULL UNIQUE,
          razorpay_payment_id TEXT,
          amount_paise        INTEGER NOT NULL,
          currency            TEXT NOT NULL DEFAULT 'INR',
          status              TEXT NOT NULL DEFAULT 'created',
          purpose             TEXT NOT NULL DEFAULT 'subscription_fee',
          created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          verified_at         TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) console.error('Error creating payments table:', err.message);
        // else console.log('Payments table ready.');
      });
    });
  }
});

module.exports = db;