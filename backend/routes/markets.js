// y
const express = require('express');
const db = require('../database');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/auth');

const router = express.Router();

// Helper to calculate market probabilities
const getMarketStats = (marketId, callback) => {
    db.all(`
        SELECT mo.id as option_id, mo.option_text, COALESCE(SUM(mt.amount), 0) as total_amount
        FROM market_options mo
        LEFT JOIN market_trades mt ON mo.id = mt.option_id
        WHERE mo.market_id = ?
        GROUP BY mo.id
        ORDER BY mo.id ASC
    `, [marketId], (err, options) => {
        if (err) return callback(err);

        const totalMarketAmount = options.reduce((sum, option) => sum + option.total_amount, 0);
        
        const results = options.map(option => ({
            id: option.option_id,
            option_text: option.option_text,
            amount: option.total_amount,
            probability: totalMarketAmount > 0 ? (option.total_amount / totalMarketAmount) * 100 : 0
        }));
        callback(null, results);
    });
};

// POST: Create a new prediction market
router.post('/', authenticateToken, (req, res) => {
    const { question, description, options } = req.body;
    const creator_id = req.user.id;

    if (!question || !options || options.length < 2) {
        return res.status(400).json({ error: 'Market needs a question and at least two options.' });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.run('INSERT INTO prediction_markets (question, description, creator_id) VALUES (?, ?, ?)',
            [question, description, creator_id],
            function (err) {
                if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: err.message }); }
                const marketId = this.lastID;
                const insertOption = db.prepare('INSERT INTO market_options (market_id, option_text) VALUES (?, ?)');
                options.forEach(opt => insertOption.run(marketId, opt.option_text));
                insertOption.finalize(err => {
                    if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: err.message }); }
                    db.run('COMMIT');
                    res.status(201).json({ message: 'Market created successfully!', marketId });
                });
            }
        );
    });
});

// GET: List all prediction markets with current probabilities
router.get('/', (req, res) => {
    db.all('SELECT * FROM prediction_markets ORDER BY created_at DESC', async (err, markets) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const marketsWithStats = await Promise.all(markets.map(market => {
            return new Promise((resolve) => {
                getMarketStats(market.id, (err, stats) => {
                    if (err) {
                        console.error('Error getting market stats:', err.message);
                        return resolve({ ...market, options: [] });
                    }
                    resolve({ ...market, options: stats });
                });
            });
        }));
        res.json(marketsWithStats);
    });
});

// GET: Get a single prediction market details with probabilities
router.get('/:marketId', optionalAuthenticateToken, (req, res) => {
    const { marketId } = req.params;
    const userId = req.user?.id;

    db.get('SELECT pm.*, u.username as creator_username FROM prediction_markets pm JOIN users u ON pm.creator_id = u.id WHERE pm.id = ?', [marketId], (err, market) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!market) return res.status(404).json({ error: 'Market not found.' });

        getMarketStats(marketId, (err, options) => {
            if (err) return res.status(500).json({ error: err.message });
            
            market.options = options;
            
            // Get user's current trades for this market (if logged in)
            if (userId) {
                db.all('SELECT option_id, amount FROM market_trades WHERE market_id = ? AND user_id = ?', [marketId, userId], (err, userTrades) => {
                    if (err) {
                        console.error('Error fetching user trades:', err.message);
                        market.user_trades = []; // Still return market without user trades
                    } else {
                        market.user_trades = userTrades;
                    }
                    res.json(market);
                });
            } else {
                market.user_trades = [];
                res.json(market);
            }
        });
    });
});

// POST: User places a trade/vote on a market option
router.post('/:marketId/trade', authenticateToken, (req, res) => {
    const { marketId } = req.params;
    const { option_id, amount } = req.body;
    const user_id = req.user.id;

    if (!option_id || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: 'Option ID and a positive amount are required.' });
    }

    // Ensure option belongs to the market
    db.get('SELECT * FROM market_options WHERE id = ? AND market_id = ?', [option_id, marketId], (err, option) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!option) return res.status(400).json({ error: 'Invalid option for this market.' });

        db.run('INSERT INTO market_trades (market_id, option_id, user_id, amount) VALUES (?, ?, ?, ?)',
            [marketId, option_id, user_id, amount],
            function (err) {
                if (err) return res.status(500).json({ error: err.message });
                
                // Re-calculate and emit updated market stats
                getMarketStats(marketId, (err, stats) => {
                    if (!err && stats) {
                        // io.to(`market-${marketId}`).emit('marketUpdate', { marketId: parseInt(marketId), options: stats });
                    } else {
                        console.error("Error fetching market stats after trade:", err);
                    }
                });

                res.status(201).json({ message: 'Trade recorded.' });
            }
        );
    });
});

module.exports = (io, onlineUsers) => {
  return router;
};