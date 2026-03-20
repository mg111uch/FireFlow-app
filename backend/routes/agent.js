// Agent API Key Management Routes
const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { generateApiKey, authenticateAgentApiKey, requireWritePermission } = require('../middleware/agentAuth');

module.exports = (io) => {
  const router = express.Router();

  /**
   * POST /api/agent/keys - Generate a new API key for the authenticated user
   * Body: { keyName?: string, permissions?: 'read' | 'read/write', expiresInDays?: number }
   */
  router.post('/keys', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { keyName, permissions = 'read', expiresInDays } = req.body;

    // Validate permissions
    if (!['read', 'read/write'].includes(permissions)) {
      return res.status(400).json({ error: 'Permissions must be "read" or "read/write".' });
    }

    const apiKey = generateApiKey();
    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    db.run(
      'INSERT INTO agent_api_keys (key_name, api_key, user_id, permissions, expires_at) VALUES (?, ?, ?, ?, ?)',
      [keyName || `Key-${Date.now()}`, apiKey, userId, permissions, expiresAt],
      function (err) {
        if (err) {
          console.error('Error creating API key:', err);
          return res.status(500).json({ error: 'Failed to create API key.' });
        }

        res.status(201).json({
          id: this.lastID,
          keyName: keyName || `Key-${Date.now()}`,
          apiKey: apiKey, // Only returned once at creation time
          permissions,
          expiresAt,
          message: 'Store this API key securely. It will not be shown again.'
        });
      }
    );
  });

  /**
   * GET /api/agent/keys - List all API keys for the authenticated user
   */
  router.get('/keys', authenticateToken, (req, res) => {
    const userId = req.user.id;

    db.all(
      `SELECT id, key_name, permissions, is_active, created_at, expires_at 
       FROM agent_api_keys 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [userId],
      (err, keys) => {
        if (err) {
          console.error('Error fetching API keys:', err);
          return res.status(500).json({ error: 'Failed to fetch API keys.' });
        }

        res.json(keys);
      }
    );
  });

  /**
   * DELETE /api/agent/keys/:keyId - Revoke (deactivate) an API key
   */
  router.delete('/keys/:keyId', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { keyId } = req.params;

    // Verify the key belongs to the user
    db.get(
      'SELECT id FROM agent_api_keys WHERE id = ? AND user_id = ?',
      [keyId, userId],
      (err, key) => {
        if (err) {
          return res.status(500).json({ error: 'Database error.' });
        }

        if (!key) {
          return res.status(404).json({ error: 'API key not found.' });
        }

        db.run(
          'UPDATE agent_api_keys SET is_active = 0 WHERE id = ?',
          [keyId],
          (err) => {
            if (err) {
              return res.status(500).json({ error: 'Failed to revoke API key.' });
            }

            res.json({ message: 'API key revoked successfully.' });
          }
        );
      }
    );
  });

  /**
   * GET /api/agent/test - Test endpoint to verify API key works
   * Accessible via agent API key for quick validation
   */
  router.get('/test', authenticateAgentApiKey, (req, res) => {
    res.json({
      success: true,
      message: 'Agent API key is valid.',
      agent: {
        username: req.agent.username,
        permissions: req.agent.permissions,
        keyName: req.agent.keyName
      }
    });
  });

  return router;
};
