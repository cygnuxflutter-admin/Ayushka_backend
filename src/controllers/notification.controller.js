const notificationService = require('../services/notification.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

/**
 * Controller for In-App Notifications
 */

const getNotifications = asyncHandler(async (req, res) => {
  const gaushalaId =
    req.query.gaushalaId || req.query.gaushala_id || req.user?.gaushalaId;

  if (!gaushalaId) {
    throw new AppError('gaushalaId is required', 400);
  }

  const result = await notificationService.getNotifications({
    ...req.query,
    gaushalaId,
    userId: req.user?._id,
  });

  res.status(200).json({
    success: true,
    message: 'Notifications fetched successfully',
    data: result.notifications,
    unreadCount: result.unreadCount,
    pagination: result.pagination,
    count: result.count,
  });
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const gaushalaId =
    req.query.gaushalaId || req.query.gaushala_id || req.user?.gaushalaId;

  if (!gaushalaId) {
    throw new AppError('gaushalaId is required', 400);
  }

  const result = await notificationService.getUnreadCount(
    gaushalaId,
    req.user?._id,
  );

  res.status(200).json({
    success: true,
    message: 'Unread count fetched successfully',
    data: result,
  });
});

const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await notificationService.markAsRead(id, req.user);

  res.status(200).json({
    success: true,
    message: 'Notification marked as read',
    data: result,
  });
});

const markAllAsRead = asyncHandler(async (req, res) => {
  const gaushalaId =
    req.body.gaushalaId ||
    req.body.gaushala_id ||
    req.query.gaushalaId ||
    req.query.gaushala_id ||
    req.user?.gaushalaId;

  if (!gaushalaId) {
    throw new AppError('gaushalaId is required', 400);
  }

  const result = await notificationService.markAllAsRead(gaushalaId, req.user);

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read',
    data: result,
  });
});

const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await notificationService.deleteNotification(id, req.user);

  res.status(200).json({
    success: true,
    message: 'Notification deleted successfully',
    data: result,
  });
});

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
