// y
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../database');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Register user
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: 'Username or email already exists.' });
          }
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ message: 'User registered successfully!' });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// Login user
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  });
});

// Password Reset Request
router.post('/forgot-password', (req, res) => {
    const { email } = req.body;
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err || !user) {
            // Still send a success message to prevent user enumeration
            return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
        }
        const token = crypto.randomBytes(32).toString('hex');
        db.run('INSERT INTO password_resets (email, token) VALUES (?, ?)', [email, token], (err) => {
            if (err) return res.status(500).json({ error: 'Could not create password reset token.' });
            
            // In a real app, you would email this link.
            // For this demo, we will log it to the console.
            const resetLink = `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
            console.log(`Password reset link for ${email}: ${resetLink}`);

            res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
        });
    });
});

// Reset Password
router.post('/reset-password', async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) {
        return res.status(400).json({ error: 'Token and new password are required.' });
    }

    db.get('SELECT * FROM password_resets WHERE token = ?', [token], async (err, reset) => {
        if (err || !reset) return res.status(400).json({ error: 'Invalid or expired token.' });

        const fiveMinutes = 5 * 60 * 1000;
        if (new Date() - new Date(reset.created_at) > fiveMinutes) {
            db.run('DELETE FROM password_resets WHERE token = ?', [token]);
            return res.status(400).json({ error: 'Invalid or expired token.' });
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            db.run('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, reset.email], (err) => {
                if (err) return res.status(500).json({ error: 'Failed to update password.' });
                db.run('DELETE FROM password_resets WHERE token = ?', [token]); // Invalidate token
                res.json({ message: 'Password has been reset successfully.' });
            });
        } catch (error) {
            res.status(500).json({ error: 'Server error during password reset.' });
        }
    });
});

module.exports = (io, onlineUsers) => {
  return router;
};