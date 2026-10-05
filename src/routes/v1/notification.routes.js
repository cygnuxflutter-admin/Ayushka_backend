const express = require('express');
const notificationController = require('../../controllers/notification.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

// All notification endpoints require authenticated user
router.use(auth);

// Get unread notifications count (for app bell icon badge)
router.get('/unread-count', notificationController.getUnreadCount);

// Get list of notifications
router.get('/', notificationController.getNotifications);

// Mark all notifications as read
router.post('/read-all', notificationController.markAllAsRead);

// Mark single notification as read
router.post('/:id/read', notificationController.markAsRead);

// Delete notification
router.post('/:id/delete', notificationController.deleteNotification);

module.exports = router;
