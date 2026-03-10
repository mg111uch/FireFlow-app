/**
 * Helper function to create and emit notifications
 * @param {Object} db - Database instance
 * @param {Object} io - Socket.io instance
 * @param {Map} onlineUsers - Map of userId to socketId
 * @param {number} recipientId - ID of the user receiving the notification
 * @param {number} senderId - ID of the user triggering the notification
 * @param {string} type - Type of notification ('reply', 'new_comment', 'mention')
 * @param {number} postId - ID of the post
 * @param {number} commentId - ID of the comment
 * @param {string} content - Comment content
 */
const createNotification = (db, io, onlineUsers, recipientId, senderId, type, postId, commentId, content) => {
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

module.exports = { createNotification };
