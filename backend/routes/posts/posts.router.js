const express = require('express');
const db = require('../../database');
const { getPostQueryFields } = require('../../utils/postQueries');
const { authenticateToken, optionalAuthenticateToken } = require('../../middleware/auth');
const { authenticateAgentApiKey, requireWritePermission } = require('../../middleware/agentAuth');
const upload = require('../../middleware/upload');

// Combined auth middleware - accepts either JWT or Agent API Key
const authenticateAny = (req, res, next) => {
  // Check for Agent API Key first
  const agentApiKey = req.headers['x-agent-api-key'];
  if (agentApiKey) {
    return authenticateAgentApiKey(req, res, (err) => {
      if (err) return next(err);
      // Convert agent auth to user auth format
      req.user = { id: req.agent.userId };
      next();
    });
  }
  // Otherwise use JWT
  return authenticateToken(req, res, next);
};

module.exports = (io) => {
  const router = express.Router();

  // GET all posts (feed) with pagination
  router.get('/', authenticateAny, (req, res) => {
    const userId = req.user?.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    console.log([userId, page, limit, offset]);

    db.all(
      `SELECT ${getPostQueryFields(userId)}
       FROM posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN communities c ON p.community_id = c.id
       LEFT JOIN votes v ON p.id = v.post_id
       GROUP BY p.id
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset],
      (err, rows) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json(rows);
      }
    );
  });

  // Create a new post (community or general)
  router.post('/', authenticateAny, requireWritePermission, upload.single('image'), (req, res) => {
    const { title, content, community_id, post_type } = req.body;
    const user_id = req.user.id;
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    // Determine if this is a general post (no community) or community post
    const isGeneralPost = post_type === 'general' || (!community_id && !title);

    // Validation: For community posts, title and community are required
    // For general posts, at least content or image is required
    if (!isGeneralPost && (!title || !community_id)) {
      return res.status(400).json({ error: 'Title and community are required for community posts.' });
    }

    if (isGeneralPost && !content && !image_url) {
      return res.status(400).json({ error: 'Content or image is required for general posts.' });
    }

    const finalCommunityId = isGeneralPost ? null : community_id;
    const finalTitle = isGeneralPost ? null : title;
    const finalPostType = isGeneralPost ? 'general' : 'community';

    console.log('Creating post:', { finalTitle, content, user_id, finalCommunityId, image_url, finalPostType });

    db.run(
      'INSERT INTO posts (title, content, user_id, community_id, image_url, post_type) VALUES (?, ?, ?, ?, ?, ?)',
      [finalTitle, content, user_id, finalCommunityId, image_url, finalPostType],
      function (err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: err.message });
        }
        const newPostId = this.lastID;

        // Fetch the newly created post details to send via WebSocket
        const query = isGeneralPost
          ? `SELECT p.*, u.username, 'General' as community_name, 0 as upvotes, 0 as downvotes, 0 as comment_count, 0 as views, 0 as repost_count, NULL as original_post_id, NULL as user_vote_type, 0 as is_saved
             FROM posts p 
             JOIN users u ON p.user_id = u.id 
             WHERE p.id = ?`
          : `SELECT ${getPostQueryFields()} 
             FROM posts p 
             JOIN users u ON p.user_id = u.id 
             JOIN communities c ON p.community_id = c.id 
             LEFT JOIN votes v ON p.id = v.post_id 
             WHERE p.id = ? 
             GROUP BY p.id`;

        db.get(query, [newPostId], (err, newPost) => {
          if (!err && newPost) {
            // Emit 'newPost' event to all connected clients
            io.emit('newPost', newPost);
            // For community posts, also emit to the specific community's room
            if (!isGeneralPost && finalCommunityId) {
              io.to(`community-${finalCommunityId}`).emit('communityNewPost', newPost);
            }
          }
          res.status(201).json({
            id: newPostId,
            title: finalTitle,
            content,
            user_id,
            community_id: finalCommunityId,
            image_url,
            post_type: finalPostType
          });
        });
      }
    );
  });

  // GET single post by ID
  router.get('/:id', optionalAuthenticateToken, (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    db.get(
      `SELECT ${getPostQueryFields(userId)}
       FROM posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN communities c ON p.community_id = c.id
       LEFT JOIN votes v ON p.id = v.post_id
       WHERE p.id = ?
       GROUP BY p.id`,
      [id],
      (err, row) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (!row) {
          return res.status(404).json({ error: 'Post not found.' });
        }
        res.json(row);
      }
    );
  });

  // DELETE a post
  router.delete('/:postId', authenticateToken, (req, res) => {
    const { postId } = req.params;
    const userId = req.user.id;

    db.get('SELECT user_id FROM posts WHERE id = ?', [postId], (err, post) => {
      if (err) {
        return res.status(500).json({ error: 'Database error while fetching post.' });
      }
      if (!post) {
        return res.status(404).json({ error: 'Post not found.' });
      }
      if (post.user_id !== userId) {
        return res.status(403).json({ error: 'You are not authorized to delete this post.' });
      }

      db.run('DELETE FROM posts WHERE id = ?', [postId], function (err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to delete post.' });
        }
        res.status(200).json({ message: 'Post deleted successfully.' });
      });
    });
  });

  // Repost or Quote a post
  router.post('/:postId/repost', authenticateToken, (req, res) => {
    const { postId } = req.params;
    const { quote_content, current_user_id } = req.body; // Optional quote content and current user id
    const userId = req.user.id;

    // First, get the original post to understand its structure
    db.get('SELECT p.*, u.username as original_username FROM posts p JOIN users u ON p.user_id = u.id WHERE p.id = ?', [postId], (err, originalPost) => {
      if (err) {
        return res.status(500).json({ error: 'Database error while fetching original post.' });
      }
      if (!originalPost) {
        return res.status(404).json({ error: 'Original post not found.' });
      }

      // Determine the display text based on whether it's self-repost
      // Use current_user_id from request body if provided, otherwise use userId from token
      const repostUserId = current_user_id || userId;
      const isSelfRepost = originalPost.user_id === repostUserId;
      const repostByText = isSelfRepost ? 'reposted by You' : `reposted by @${req.user.username}`;
      
      // Create the repost/quote post
      // If quote_content exists, it's a quote; otherwise it's a simple repost
      const content = quote_content 
        ? `${quote_content}\n\n${repostByText}:\n${originalPost.content}`
        : `${repostByText}:\n${originalPost.content}`;

      db.run(
        'INSERT INTO posts (title, content, user_id, community_id, image_url, post_type, original_post_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [originalPost.title, content, userId, originalPost.community_id, originalPost.image_url, originalPost.post_type, postId],
        function (err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to create repost.' });
          }
          const newPostId = this.lastID;

          // Increment the repost_count on the original post
          db.run(
            'UPDATE posts SET repost_count = repost_count + 1 WHERE id = ?',
            [postId],
            (err) => {
              if (err) {
                console.error('Error incrementing repost_count:', err);
              }
            }
          );

          // Emit updated post via WebSocket
          db.get(
            `SELECT p.*, u.username, c.name as community_name, 
                    COALESCE(SUM(CASE WHEN v.vote_type = 1 THEN 1 ELSE 0 END), 0) AS upvotes,
                    COALESCE(SUM(CASE WHEN v.vote_type = -1 THEN 1 ELSE 0 END), 0) AS downvotes,
                    (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count,
                    (SELECT COUNT(*) FROM post_views WHERE post_id = p.id) AS views,
                    (SELECT vote_type FROM votes WHERE user_id = ? AND post_id = p.id) AS user_vote_type,
                    (SELECT COUNT(*) FROM saved_posts WHERE user_id = ? AND post_id = p.id) > 0 AS is_saved
             FROM posts p 
             JOIN users u ON p.user_id = u.id 
             LEFT JOIN communities c ON p.community_id = c.id
             LEFT JOIN votes v ON p.id = v.post_id
             WHERE p.id = ?
             GROUP BY p.id`,
            [userId, userId, newPostId],
            (err, newPost) => {
              if (!err && newPost) {
                io.emit('newPost', newPost);
              }
            }
          );

          res.status(201).json({
            id: newPostId,
            message: quote_content ? 'Quote created successfully' : 'Repost created successfully'
          });
        }
      );
    });
  });

  return router;
};
