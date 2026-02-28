// y
// NEW File
const jwt = require('jsonwebtoken');
const db = require('../database');
const { JWT_SECRET } = require('../middleware/auth');

module.exports = (io, onlineUsers, monthlyUniqueVisitors, format) => {
  // Socket.IO Authentication Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        console.warn('Socket authentication failed:', err.message);
        return next(new Error('Authentication error: Invalid token'));
      }
      socket.user = user; // Attach user info to socket
      console.log(`Socket ${socket.id} authenticated as ${user.username}`);
      next();
    });
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.user.username} connected with socket ID: ${socket.id}`);
    onlineUsers.set(socket.user.id, socket.id); // Add user to online list

    // Track unique visitors for current month
    const currentMonth = format(new Date(), 'yyyy-MM');
    if (!monthlyUniqueVisitors.has(currentMonth)) {
      monthlyUniqueVisitors.set(currentMonth, new Set());
    }
    monthlyUniqueVisitors.get(currentMonth).add(socket.user.id);

    // Global room for general real-time updates (e.g., new posts)
    socket.join('global');
    // Personal room for direct notifications
    socket.join(`user-${socket.user.id}`);

    // --- REALTIME: Room joining logic ---
    // A client can tell the server which post page it's on
    socket.on('joinPostRoom', (postId) => {
      socket.join(`post-${postId}`);
      console.log(`Socket ${socket.id} joined room for post ${postId}`);
    });

    // Join a specific chat room (for 1-to-1 messages)
    socket.on('joinChatRoom', ({ otherUserId }) => {
      const roomName = `chat_${Math.min(socket.user.id, otherUserId)}_${Math.max(socket.user.id, otherUserId)}`;
      socket.join(roomName);
      console.log(`User ${socket.user.username} joined chat room ${roomName}`);
    });

    socket.on('sendMessage', async ({ receiverId, content, replyToMessageId }) => {
      if (!content.trim()) return;

      const senderId = socket.user.id;
      const roomName = `chat_${Math.min(senderId, receiverId)}_${Math.max(senderId, receiverId)}`;

      try {
        const query = 'INSERT INTO messages (sender_id, receiver_id, content, reply_to_message_id) VALUES (?, ?, ?, ?)';
        db.run(query, [senderId, receiverId, content, replyToMessageId], function(err) {
          if (err) {
            console.error('Error saving message:', err.message);
            return;
          }
          const messageId = this.lastID;
          const selectQuery = `
            SELECT
                m.*,
                s.username as sender_username,
                r.username as receiver_username,
                rm.content AS replied_to_content,
                ru.username AS replied_to_username
            FROM messages m
            JOIN users s ON m.sender_id = s.id
            JOIN users r ON m.receiver_id = r.id
            LEFT JOIN messages rm ON m.reply_to_message_id = rm.id
            LEFT JOIN users ru ON rm.sender_id = ru.id
            WHERE m.id = ?
          `;
          db.get(selectQuery, [messageId], (err, message) => {
            if (err) {
              console.error('Error fetching new message:', err.message);
              return;
            }
            io.to(roomName).emit('newMessage', message);
            const receiverSocketId = onlineUsers.get(receiverId);
            if (receiverSocketId && receiverSocketId !== socket.id) {
              io.to(`user-${receiverId}`).emit('notification', { type: 'new_message', actor_username: socket.user.username, message_content: content });
            }
          });
        });
      } catch (error) {
        console.error('Error sending message:', error);
      }
    });

    socket.on('editMessage', async ({ messageId, content }) => {
        const userId = socket.user.id;
        db.run('UPDATE messages SET content = ?, edited = 1 WHERE id = ? AND sender_id = ?', [content, messageId, userId], function (err) {
            if (err) {
                console.error('Error updating message:', err.message);
                return;
            }
            if (this.changes > 0) {
                const selectQuery = `
                    SELECT m.*, s.username as sender_username, r.username as receiver_username,
                           rm.content AS replied_to_content, ru.username AS replied_to_username
                    FROM messages m
                    JOIN users s ON m.sender_id = s.id
                    JOIN users r ON m.receiver_id = r.id
                    LEFT JOIN messages rm ON m.reply_to_message_id = rm.id
                    LEFT JOIN users ru ON rm.sender_id = ru.id
                    WHERE m.id = ?`;
                db.get(selectQuery, [messageId], (err, message) => {
                    if (err || !message) {
                        console.error('Error fetching edited message:', err);
                        return;
                    }
                    const roomName = `chat_${Math.min(message.sender_id, message.receiver_id)}_${Math.max(message.sender_id, message.receiver_id)}`;
                    io.to(roomName).emit('messageEdited', message);
                });
            }
        });
    });

    socket.on('deleteMessage', async ({ messageId }) => {
        const userId = socket.user.id;
        db.get('SELECT sender_id, receiver_id FROM messages WHERE id = ? AND sender_id = ?', [messageId, userId], (err, msg) => {
            if (err || !msg) {
                console.log('Message not found or user not authorized to delete.');
                return;
            }
            const roomName = `chat_${Math.min(msg.sender_id, msg.receiver_id)}_${Math.max(msg.sender_id, msg.receiver_id)}`;
            db.run('DELETE FROM messages WHERE id = ? AND sender_id = ?', [messageId, userId], function (err) {
                if (err) {
                    console.error('Error deleting message:', err.message);
                    return;
                }
                if (this.changes > 0) {
                    io.to(roomName).emit('messageDeleted', { messageId });
                }
            });
        });
    });

    socket.on('addReaction', async ({ messageId, emoji }) => {
        const userId = socket.user.id;
        // Check if user already reacted with the same emoji
        db.get('SELECT id FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?', [messageId, userId, emoji], (err, existing) => {
            if(existing) return;
            
            db.run('INSERT INTO message_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)', [messageId, userId, emoji], function (err) {
                if (err) {
                    console.error('Error adding reaction:', err.message);
                    return;
                }
                const reactionId = this.lastID;
                db.get('SELECT sender_id, receiver_id FROM messages WHERE id = ?', [messageId], (err, msg) => {
                    if (err || !msg) return;
                    const roomName = `chat_${Math.min(msg.sender_id, msg.receiver_id)}_${Math.max(msg.sender_id, msg.receiver_id)}`;
                    db.get('SELECT username FROM users WHERE id = ?', [userId], (err, user) => {
                        const reaction = { id: reactionId, user_id: userId, emoji, username: user ? user.username : 'Unknown' };
                        io.to(roomName).emit('reactionAdded', { messageId, reaction });
                    });
                });
            });
        });
    });

    socket.on('removeReaction', async ({ messageId, reactionId }) => {
        const userId = socket.user.id;
        db.run('DELETE FROM message_reactions WHERE id = ? AND user_id = ?', [reactionId, userId], function (err) {
            if (err) {
                console.error('Error removing reaction:', err.message);
                return;
            }
            if (this.changes > 0) {
                db.get('SELECT sender_id, receiver_id FROM messages WHERE id = ?', [messageId], (err, msg) => {
                    if (err || !msg) return;
                    const roomName = `chat_${Math.min(msg.sender_id, msg.receiver_id)}_${Math.max(msg.sender_id, msg.receiver_id)}`;
                    io.to(roomName).emit('reactionRemoved', { messageId, reactionId });
                });
            }
        });
    });

    socket.on('typing', ({ receiverId }) => {
      const senderId = socket.user.id;
      const roomName = `chat_${Math.min(senderId, receiverId)}_${Math.max(senderId, receiverId)}`;
      // Broadcast to all other clients in the room
      socket.to(roomName).emit('typing');

      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(`user-${receiverId}`).emit('typing-in-list', { conversationPartnerId: senderId });
      }
    });

    socket.on('stoppedTyping', ({ receiverId }) => {
      const senderId = socket.user.id;
      const roomName = `chat_${Math.min(senderId, receiverId)}_${Math.max(senderId, receiverId)}`;
      // Broadcast to all other clients in the room
      socket.to(roomName).emit('stoppedTyping');

      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(`user-${receiverId}`).emit('stoppedTyping-in-list', { conversationPartnerId: senderId });
      }
    });

    socket.on('joinMarketRoom', (marketId) => {
      socket.join(`market-${marketId}`);
      console.log(`Socket ${socket.id} joined room for market ${marketId}`);
    });

    socket.on('disconnect', () => {
      console.log(`User ${socket.user.username} disconnected from socket ID: ${socket.id}`);
      onlineUsers.delete(socket.user.id); // Remove user from online list
    });
  });
};