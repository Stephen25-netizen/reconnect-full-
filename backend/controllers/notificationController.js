const { pool } = require('../config/db');

// Get notifications belonging to the logged-in user.
exports.getNotifications = async (req, res) => {
  try {
    const userId = Number(req.user.id);

    const result = await pool.query(
      `SELECT
          id,
          type,
          title,
          message,
          related_item_id,
          related_conversation_id,
          is_read,
          created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC, id DESC
       LIMIT 100`,
      [userId]
    );

    res.json({
      notifications: result.rows,
    });
  } catch (error) {
    console.error('Get notifications error:', error);

    res.status(500).json({
      error: 'Unable to load notifications.',
    });
  }
};

// Get the number of unread notifications.
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = Number(req.user.id);

    const result = await pool.query(
      `SELECT COUNT(*)::int AS unread_count
       FROM notifications
       WHERE user_id = $1
         AND is_read = FALSE`,
      [userId]
    );

    res.json({
      unreadCount: result.rows[0].unread_count,
    });
  } catch (error) {
    console.error('Unread notification count error:', error);

    res.status(500).json({
      error: 'Unable to retrieve unread notification count.',
    });
  }
};

// Mark one notification as read.
exports.markAsRead = async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const notificationId = Number(req.params.id);

    if (
      !Number.isInteger(notificationId) ||
      notificationId <= 0
    ) {
      return res.status(400).json({
        error: 'Invalid notification ID.',
      });
    }

    const result = await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE id = $1
         AND user_id = $2
       RETURNING id, is_read`,
      [notificationId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Notification not found.',
      });
    }

    res.json({
      message: 'Notification marked as read.',
      notification: result.rows[0],
    });
  } catch (error) {
    console.error('Mark notification read error:', error);

    res.status(500).json({
      error: 'Unable to update notification.',
    });
  }
};

// Mark all notifications as read.
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = Number(req.user.id);

    await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE user_id = $1
         AND is_read = FALSE`,
      [userId]
    );

    res.json({
      message: 'All notifications marked as read.',
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);

    res.status(500).json({
      error: 'Unable to update notifications.',
    });
  }
};