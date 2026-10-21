const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

// Protect all notification endpoints.
router.use(auth);

// Get the logged-in user's notifications.
router.get('/', notificationController.getNotifications);

// Get the unread notification count.
router.get(
  '/unread-count',
  notificationController.getUnreadCount
);

// Mark all notifications as read.
router.patch(
  '/read-all',
  notificationController.markAllAsRead
);

// Mark one notification as read.
router.patch(
  '/:id/read',
  notificationController.markAsRead
);

module.exports = router;
