// Agent API Key Authentication Middleware
const jwt = require('jsonwebtoken');
const db = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

/**
 * Generate a secure random API key
 * @returns {string} A random 32-character hex string
 */
const generateApiKey = () => {
  return require('crypto').randomBytes(16).toString('hex');
};

/**
 * Middleware to authenticate using Agent API Key
 * Expects header: X-Agent-Api-Key: <api_key>
 */
const authenticateAgentApiKey = (req, res, next) => {
  const apiKey = req.headers['x-agent-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ error: 'Agent API key required. Include X-Agent-Api-Key header.' });
  }

  // Look up the API key in the database
  db.get(
    `SELECT a.*, u.username 
     FROM agent_api_keys a 
     JOIN users u ON a.user_id = u.id 
     WHERE a.api_key = ? AND a.is_active = 1`,
    [apiKey],
    (err, keyRecord) => {
      if (err) {
        console.error('Database error during API key validation:', err);
        return res.status(500).json({ error: 'Internal server error.' });
      }

      if (!keyRecord) {
        return res.status(403).json({ error: 'Invalid or inactive API key.' });
      }

      // Check if key has expired
      if (keyRecord.expires_at) {
        const expiresAt = new Date(keyRecord.expires_at);
        if (expiresAt < new Date()) {
          return res.status(403).json({ error: 'API key has expired.' });
        }
      }

      // Attach user info and permissions to request
      req.agent = {
        id: keyRecord.id,
        userId: keyRecord.user_id,
        username: keyRecord.username,
        permissions: keyRecord.permissions,
        keyName: keyRecord.key_name,
        unitId: keyRecord.unit_id || null,
        spendLimitPaise: keyRecord.spend_limit_paise ?? null
      };

      next();
    }
  );
};

/**
 * Middleware to check if agent has write permissions
 * Use after authenticateAgentApiKey
 */
const requireWritePermission = (req, res, next) => {
  if (!req.agent || req.agent.permissions !== 'read/write') {
    return res.status(403).json({ error: 'Write permission required for this operation.' });
  }
  next();
};

module.exports = { 
  authenticateAgentApiKey, 
  requireWritePermission, 
  generateApiKey 
};
