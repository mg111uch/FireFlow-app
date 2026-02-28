// y
const express = require('express');
const db = require('../database');
const { getPostQueryFields } = require('../utils/postQueries');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB file size limit
  },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb('Error: Images Only!');
  }
});

module.exports = (io, onlineUsers) => {
  const router = express.Router();

  // GET all posts (feed) with pagination
  router.get('/', authenticateToken, (req, res) => {
    const userId = req.user?.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    console.log([userId,page,limit,offset])

    db.all(
      `SELECT ${getPostQueryFields(userId)}
       FROM posts p
       JOIN users u ON p.user_id = u.id
       JOIN communities c ON p.community_id = c.id
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

  // Create a new post
  router.post('/', authenticateToken, upload.single('image'), (req, res) => {
    const { title, content, community_id } = req.body;
    const user_id = req.user.id;
    const image_url = req.file ? `/uploads/${req.file.filename}` : null;

    if (!title || !community_id) {
      return res.status(400).json({ error: 'Title and community are required.' });
    }

    db.run(
      'INSERT INTO posts (title, content, user_id, community_id, image_url) VALUES (?, ?, ?, ?, ?)',
      [title, content, user_id, community_id, image_url],
      function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        const newPostId = this.lastID;

        // Fetch the newly created post details to send via WebSocket
        db.get(
          `SELECT ${getPostQueryFields()}
           FROM posts p
           JOIN users u ON p.user_id = u.id
           JOIN communities c ON p.community_id = c.id
           LEFT JOIN votes v ON p.id = v.post_id
           WHERE p.id = ?
           GROUP BY p.id`,
          [newPostId], (err, newPost) => {
            if (!err && newPost) {
              // Emit 'newPost' event to all connected clients
              io.emit('newPost', newPost);
              // Also emit to the specific community's room
              io.to(`community-${newPost.community_id}`).emit('communityNewPost', newPost);
            }
            res.status(201).json({ id: newPostId, title, content, user_id, community_id, image_url });
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
       JOIN communities c ON p.community_id = c.id
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

  // Track a post view
  router.post('/:postId/view', authenticateToken, (req, res) => {
      const { postId } = req.params;
      const user_id = req.user.id;
      // INSERT OR IGNORE will fail silently if the unique constraint is violated,
      // which is exactly what we want to prevent duplicate view counts per user.
      db.run('INSERT OR IGNORE INTO post_views (post_id, user_id) VALUES (?, ?)', [postId, user_id], function(err) {
          if (err) {
              return res.status(500).json({ error: 'Failed to record view.' });
          }
          res.status(200).json({ message: 'View recorded.' });
          // After recording view, fetch updated view count and emit
          // db.get('SELECT COUNT(*) AS views FROM post_views WHERE post_id = ?', [postId], (err, row) => {
          //   if (!err && row) io.emit('viewUpdate', { postId: parseInt(postId), views: row.views });
          // });
      });
  });

  // Vote on a post
  router.post('/:postId/vote', authenticateToken, (req, res) => {
      const { postId } = req.params;
      const { vote_type } = req.body;
      const user_id = req.user.id;

      if (![1, -1, 0].includes(vote_type)) { // 0 to remove vote
          return res.status(400).json({ error: 'Invalid vote type.' });
      }

      db.get('SELECT * FROM votes WHERE user_id = ? AND post_id = ?', [user_id, postId], (err, existingVote) => {
          if (err) return res.status(500).json({ error: err.message });

          const handleVoteUpdate = () => {
               const sql = `
                 SELECT
                   p.id as postId,
                   COALESCE(SUM(CASE WHEN v.vote_type = 1 THEN 1 ELSE 0 END), 0) AS upvotes,
                   COALESCE(SUM(CASE WHEN v.vote_type = -1 THEN 1 ELSE 0 END), 0) AS downvotes
                 ${user_id ? `,(SELECT vote_type FROM votes WHERE user_id = ${user_id} AND post_id = p.id) AS user_vote_type` : ''}
                 FROM posts p
                 LEFT JOIN votes v ON p.id = v.post_id
                 WHERE p.id = ?
                 GROUP BY p.id`;
             db.get(sql, [postId], (err, result) => {
                 if (result) {
                     // --- REALTIME FIX: Emit globally so homepage gets the update ---
                     io.emit('voteUpdate', {
                       postId: parseInt(postId),
                       upvotes: result.upvotes,
                       downvotes: result.downvotes,
                       user_vote_type: result.user_vote_type
                     });
                 }
             });
         };

         if (existingVote) {
             if (existingVote.vote_type === vote_type) { // Clicking same button again (e.g., upvoting when already upvoted)
                 db.run('DELETE FROM votes WHERE id = ?', [existingVote.id], (err) => {
                     if (err) return res.status(500).json({ error: 'Failed to remove vote' });
                     handleVoteUpdate();
                     res.json({ message: 'Vote removed.' });
                 });
             } else { // Changing vote
                 db.run('UPDATE votes SET vote_type = ? WHERE id = ?', [vote_type, existingVote.id], (err) => {
                     if (err) return res.status(500).json({ error: 'Failed to update vote' });
                     handleVoteUpdate();
                     res.json({ message: 'Vote updated.' });
                 });
             }
         } else { // New vote
             db.run('INSERT INTO votes (user_id, post_id, vote_type) VALUES (?, ?, ?)', [user_id, postId, vote_type], (err) => {
                 if (err) return res.status(500).json({ error: 'Failed to cast vote' });
                 handleVoteUpdate();
                 res.status(201).json({ message: 'Vote recorded.' });
             });
         }
     });
 });

 // Save or unsave a post
 router.post('/:postId/save', authenticateToken, (req, res) => {
     const { postId } = req.params;
     const userId = req.user.id;

     db.get('SELECT * FROM saved_posts WHERE user_id = ? AND post_id = ?', [userId, postId], (err, savedPost) => {
         if (err) return res.status(500).json({ error: 'Database error checking saved status.' });

         if (savedPost) {
             // Post is already saved, so unsave it (delete the record)
             db.run('DELETE FROM saved_posts WHERE user_id = ? AND post_id = ?', [userId, postId], (err) => {
                 if (err) return res.status(500).json({ error: 'Failed to unsave post.' });
                 res.json({ message: 'Post unsaved successfully.', saved: false });
             });
         } else {
             // Post is not saved, so save it (insert a record)
             db.run('INSERT INTO saved_posts (user_id, post_id) VALUES (?, ?)', [userId, postId], (err) => {
                 if (err) return res.status(500).json({ error: 'Failed to save post.' });
                 res.json({ message: 'Post saved successfully.', saved: true });
             });
         }
     });
 });

 // Save or unsave a comment
 router.post('/:commentId/save', authenticateToken, (req, res) => {
     const { commentId } = req.params;
     const userId = req.user.id;
     db.get('SELECT * FROM saved_comments WHERE user_id = ? AND comment_id = ?', [userId, commentId], (err, row) => {
         if (err) return res.status(500).json({ error: err.message });
         if (row) {
             db.run('DELETE FROM saved_comments WHERE user_id = ? AND comment_id = ?', [userId, commentId], (err) => {
                 if (err) return res.status(500).json({ error: err.message });
                 res.json({ message: 'Comment unsaved', saved: false });
             });
         } else {
             db.run('INSERT INTO saved_comments (user_id, comment_id) VALUES (?, ?)', [userId, commentId], (err) => {
                 if (err) return res.status(500).json({ error: err.message });
                 res.json({ message: 'Comment saved', saved: true });
             });
         }
     });
 });
 // Add a comment to a post
 router.post('/:postId/comments', authenticateToken, (req, res) => {
   const { postId } = req.params;
   const { content, parent_id } = req.body; // parent_id for nested comments
   const user_id = req.user.id;

   if (!content) {
     return res.status(400).json({ error: 'Comment content is required.' });
   }

   const query = 'INSERT INTO comments (post_id, user_id, content, parent_id) VALUES (?, ?, ?, ?)';
   const params = [postId, user_id, content, parent_id || null];

   db.run(query, params, function (err) {
     if (err) {
       return res.status(500).json({ error: err.message });
     }
     const newCommentId = this.lastID;

     // Helper function to create and emit notification
     const createNotification = (recipientId, senderId, type, postId, commentId, content) => {
         if (recipientId === senderId) return;

         const contentPreview = content.substring(0, 100);
         const query = 'INSERT INTO notifications (recipient_id, sender_id, type, post_id, comment_id, content_preview) VALUES (?, ?, ?, ?, ?, ?)';

         db.run(query, [recipientId, senderId, type, postId, commentId, contentPreview], function(err) {
             if (err) {
                 console.error('Failed to create notification:', err);
                 return;
             }
             const newNotificationId = this.lastID;
             db.get(`
                 SELECT n.*, u_sender.username as sender_username, p.title as post_title
                 FROM notifications n
                 JOIN users u_sender ON n.sender_id = u_sender.id
                 JOIN posts p ON n.post_id = p.id
                 WHERE n.id = ?
             `, [newNotificationId], (err, notification) => {
                 if (err) {
                     console.error('Failed to fetch notification for emitting:', err);
                     return;
                 }
                 if (notification) {
                     const recipientSocketId = onlineUsers.get(recipientId);
                     if (recipientSocketId) {
                         io.to(recipientSocketId).emit('new_notification', notification);
                     }
                 }
             });
         });
     };

     // Fetch the newly created comment details
     db.get(`
       SELECT c.*, u.username
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ?
     `, [newCommentId], (err, newComment) => {
       if (err || !newComment) {
         // Even if notifications fail, the user's comment is still created.
         return res.status(201).json({ id: newCommentId, message: "Comment created, but failed to process notifications." });
       }

       // Emit to post room for live comment updates for all viewers of the post
       io.to(`post-${postId}`).emit('newComment', newComment);

       const notifiedUsers = new Set([user_id]); // The commenter shouldn't be notified of their own actions.

       // 1. Handle Replies vs. New Top-Level Comments
       if (newComment.parent_id) {
         // This is a reply, notify the author of the parent comment
         db.get('SELECT user_id FROM comments WHERE id = ?', [newComment.parent_id], (err, parentComment) => {
           if (parentComment && !notifiedUsers.has(parentComment.user_id)) {
             createNotification(parentComment.user_id, user_id, 'reply', postId, newCommentId, newComment.content);
             notifiedUsers.add(parentComment.user_id);
           }
         });
       } else {
         // This is a top-level comment, notify the author of the post
         db.get('SELECT user_id FROM posts WHERE id = ?', [postId], (err, post) => {
           if (post && !notifiedUsers.has(post.user_id)) {
             createNotification(post.user_id, user_id, 'new_comment', postId, newCommentId, newComment.content);
             notifiedUsers.add(post.user_id);
           }
         });
       }

       // 2. Handle Mentions (e.g., @username)
       const mentions = newComment.content.match(/@(\w+)/g);
       if (mentions) {
         const mentionedUsernames = [...new Set(mentions.map(m => m.substring(1)))]; // Get unique usernames
         mentionedUsernames.forEach(username => {
           db.get('SELECT id FROM users WHERE username = ?', [username], (err, mentionedUser) => {
             if (mentionedUser && !notifiedUsers.has(mentionedUser.id)) {
               createNotification(mentionedUser.id, user_id, 'mention', postId, newCommentId, newComment.content);
               notifiedUsers.add(mentionedUser.id);
             }
           });
         });
       }

       res.status(201).json(newComment);
     });
   });
 });
 // GET comments for a post
 router.get('/:postId/comments', optionalAuthenticateToken, (req, res) => {
   const { postId } = req.params;
   const userId = req.user?.id;
   const page = parseInt(req.query.page, 10) || 1;
   const limit = parseInt(req.query.limit, 10) || 10;
   const offset = (page - 1) * limit;

   const params = [postId];
   let userVoteTypeSubquery = 'NULL AS user_vote_type';
   let isSavedSubquery = '0 AS is_saved';

   if (userId) {
     userVoteTypeSubquery = `(SELECT vote_type FROM votes WHERE user_id = ? AND comment_id = c.id) AS user_vote_type`;
     isSavedSubquery = `(SELECT COUNT(*) FROM saved_comments WHERE user_id = ? AND comment_id = c.id) > 0 AS is_saved`;
     params.push(userId, userId);
   }

   // For the ORDER BY clause
   params.push(userId);
   params.push(limit, offset);

   const query = `
     SELECT c.*, u.username,
      COALESCE((SELECT SUM(CASE WHEN v.vote_type = 1 THEN 1 ELSE 0 END) FROM votes v WHERE v.comment_id = c.id), 0) as upvotes,
      COALESCE((SELECT SUM(CASE WHEN v.vote_type = -1 THEN 1 ELSE 0 END) FROM votes v WHERE v.comment_id = c.id), 0) as downvotes,
      (SELECT COUNT(*) FROM comments rc WHERE rc.parent_id = c.id) as reply_count,
      ${userVoteTypeSubquery},
      ${isSavedSubquery}
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ? AND c.parent_id IS NULL
      ORDER BY c.is_pinned DESC, CASE WHEN c.user_id = ? THEN 0 ELSE 1 END, c.created_at DESC
      LIMIT ? OFFSET ?`;

   db.all(query, params, (err, rows) => {
     if (err) {
       console.error('Error fetching comments:', err.message);
       return res.status(500).json({ error: err.message });
     }
     res.json(rows);
   });
 });
 // GET replies for a comment (paginated)
 router.get('/:commentId/replies', optionalAuthenticateToken, (req, res) => {
     const { commentId } = req.params;
     const userId = req.user?.id;
     const page = parseInt(req.query.page, 10) || 1;
     const limit = parseInt(req.query.limit, 10) || 10;
     const offset = (page - 1) * limit;

     const query = `
         SELECT c.*, u.username,
          COALESCE((SELECT SUM(CASE WHEN v.vote_type = 1 THEN 1 ELSE 0 END) FROM votes v WHERE v.comment_id = c.id), 0) as upvotes,
          COALESCE((SELECT SUM(CASE WHEN v.vote_type = -1 THEN 1 ELSE 0 END) FROM votes v WHERE v.comment_id = c.id), 0) as downvotes,
          (SELECT COUNT(*) FROM comments rc WHERE rc.parent_id = c.id) as reply_count,
          ${userId ? `(SELECT vote_type FROM votes WHERE user_id = ${userId} AND comment_id = c.id) AS user_vote_type,` : 'NULL AS user_vote_type,'}
          ${userId ? `(SELECT COUNT(*) FROM saved_comments WHERE user_id = ${userId} AND comment_id = c.id) > 0 AS is_saved` : '0 AS is_saved'}
          FROM comments c
          JOIN users u ON c.user_id = u.id
          WHERE c.parent_id = ?
          ORDER BY c.created_at ASC
          LIMIT ? OFFSET ?`;

     db.all(query, [commentId, limit, offset], (err, rows) => {
         if (err) {
             return res.status(500).json({ error: err.message });
         }
         res.json(rows);
     });
 });
 // POST /api/comments/:commentId/vote - Vote on a comment
 router.post('/:commentId/vote', authenticateToken, (req, res) => {
   const { commentId } = req.params;
   const { vote_type } = req.body; // Expects 1, -1, or 0 to clear vote
   const userId = req.user.id;

   if (![1, -1, 0].includes(vote_type)) {
     return res.status(400).json({ error: 'Invalid vote type' });
   }

   db.get('SELECT * FROM votes WHERE user_id = ? AND comment_id = ?', [userId, commentId], (err, existingVote) => {
     if (err) return res.status(500).json({ error: 'Database error checking for existing vote.' });

     const handleVoteUpdate = () => {
       const sql = `
         SELECT
           c.id as commentId,
           c.post_id,
           COALESCE(SUM(CASE WHEN v.vote_type = 1 THEN 1 ELSE 0 END), 0) AS upvotes,
           COALESCE(SUM(CASE WHEN v.vote_type = -1 THEN 1 ELSE 0 END), 0) AS downvotes,
           (SELECT vote_type FROM votes WHERE user_id = ? AND comment_id = c.id) AS user_vote_type
         FROM comments c
         LEFT JOIN votes v ON c.id = v.comment_id
         WHERE c.id = ?
         GROUP BY c.id`;

       db.get(sql, [userId, commentId], (err, result) => {
         if (result) {
           io.to(`post-${result.post_id}`).emit('commentVoteUpdate', {
             commentId: result.commentId,
             upvotes: result.upvotes,
             downvotes: result.downvotes,
             user_vote_type: result.user_vote_type,
           });
         }
       });
     };

     if (existingVote) {
       if (vote_type === 0 || existingVote.vote_type === vote_type) {
         // User wants to remove their vote
         db.run('DELETE FROM votes WHERE id = ?', [existingVote.id], (err) => {
           if (err) return res.status(500).json({ error: 'Failed to remove vote.' });
           handleVoteUpdate();
           res.json({ message: 'Vote removed.' });
         });
       } else {
         // User wants to change their vote
         db.run('UPDATE votes SET vote_type = ? WHERE id = ?', [vote_type, existingVote.id], (err) => {
           if (err) return res.status(500).json({ error: 'Failed to update vote.' });
           handleVoteUpdate();
           res.json({ message: 'Vote updated.' });
         });
       }
     } else if (vote_type !== 0) {
       // User wants to cast a new vote
       db.run('INSERT INTO votes (user_id, comment_id, vote_type) VALUES (?, ?, ?)', [userId, commentId, vote_type], (err) => {
         if (err) return res.status(500).json({ error: 'Failed to cast vote.' });
         handleVoteUpdate();
         res.status(201).json({ message: 'Vote recorded.' });
       });
     } else {
       // User trying to remove a vote that doesn't exist
       res.json({ message: 'No vote to remove.' });
     }
   });
 });
 // DELETE a comment
 router.delete('/:commentId', authenticateToken, (req, res) => {
     const { commentId } = req.params;
     const userId = req.user.id;

     db.get('SELECT user_id, post_id FROM comments WHERE id = ?', [commentId], (err, comment) => {
         if (err) {
             return res.status(500).json({ error: 'Database error while fetching comment.' });
         }
         if (!comment) {
             return res.status(404).json({ error: 'Comment not found.' });
         }
         if (comment.user_id !== userId) {
             return res.status(403).json({ error: 'You are not authorized to delete this comment.' });
         }

         // The 'ON DELETE CASCADE' in the database schema will handle deleting replies.
         db.run('DELETE FROM comments WHERE id = ?', [commentId], function(err) {
             if (err) {
                 return res.status(500).json({ error: 'Failed to delete comment.' });
             }
             // Emit WebSocket event to notify clients of the deletion
             io.to(`post-${comment.post_id}`).emit('commentDeleted', {
                 commentId: parseInt(commentId),
                 postId: comment.post_id
             });
             res.status(200).json({ message: 'Comment deleted successfully.' });
         });
     });
 });
 // Pin/unpin a comment
 router.post('/:commentId/pin', authenticateToken, (req, res) => {
     const { commentId } = req.params;
     const userId = req.user.id;

     // First, get the comment and its post to verify ownership
     db.get('SELECT post_id, is_pinned, parent_id FROM comments WHERE id = ?', [commentId], (err, comment) => {
         if (err) return res.status(500).json({ error: 'Database error fetching comment.' });
         if (!comment) return res.status(404).json({ error: 'Comment not found.' });
         if (comment.parent_id) {
             return res.status(400).json({ error: 'Only parent comments can be pinned.' });
         }

         db.get('SELECT user_id FROM posts WHERE id = ?', [comment.post_id], (err, post) => {
             if (err) return res.status(500).json({ error: 'Database error fetching post.' });
             if (!post) return res.status(404).json({ error: 'Post not found.' });
             if (post.user_id !== userId) {
                 return res.status(403).json({ error: 'You are not authorized to pin comments on this post.' });
             }

             // Now toggle the pinned status
             const newPinnedState = !comment.is_pinned;
             db.run('UPDATE comments SET is_pinned = ? WHERE id = ?', [newPinnedState, commentId], function(err) {
                 if (err) return res.status(500).json({ error: 'Failed to update pin status.' });

                 // Emit a websocket event
                 io.to(`post-${comment.post_id}`).emit('commentPinUpdate', {
                     commentId: parseInt(commentId),
                     postId: comment.post_id,
                     is_pinned: newPinnedState
                 });

                 res.json({ message: 'Pin status updated successfully.', is_pinned: newPinnedState });
             });
         });
     });
 });

  return router;
};