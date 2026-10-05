const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const CowTreatment = require('../models/CowTreatment');
const Cow = require('../models/cow.model');
const AppError = require('../utils/AppError');

class NotificationService {
  /**
   * Helper to get start and end of a given date (or today in UTC/local)
   */
  getEndOfDay(date = new Date()) {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  /**
   * Automatically check active treatments with due doses and generate in-app notifications
   */
  async checkAndGenerateDoseAlerts(gaushalaId) {
    if (!gaushalaId || !mongoose.isValidObjectId(gaushalaId)) {
      return 0;
    }

    const endOfToday = this.getEndOfDay();

    // Find all active treatments where nextDoseDate is due on or before today
    const dueTreatments = await CowTreatment.find({
      gaushalaId,
      status: 'UNDER_TREATMENT',
      isDeleted: false,
      nextDoseDate: { $ne: null, $lte: endOfToday },
      nextDoseNumber: { $ne: null },
    }).populate('cowId', 'tag_id calf_name shed_id');

    let generatedCount = 0;

    for (const trt of dueTreatments) {
      const cow = trt.cowId || {};
      const tag = cow.tag_id || 'N/A';
      const doseNum = trt.nextDoseNumber;
      const totalDoses = trt.totalDoses;

      // Check if a notification for this specific treatment dose has already been generated
      const existingNotification = await Notification.findOne({
        gaushalaId,
        treatmentId: trt._id,
        doseNumber: doseNum,
        isDeleted: false,
      });

      if (!existingNotification) {
        const isFinalDose = doseNum === totalDoses;
        const title = isFinalDose
          ? `Final Dose Alert: Cow #${tag}`
          : `Dose Alert: Cow #${tag}`;

        const message = isFinalDose
          ? `Today is the final dose (${doseNum} of ${totalDoses}) for Cow #${tag} (${trt.diseaseName}).`
          : `Today is Dose ${doseNum} of ${totalDoses} for Cow #${tag} (${trt.diseaseName}).`;

        await Notification.create({
          gaushalaId,
          treatmentId: trt._id,
          cowId: trt.cowId?._id || trt.cowId,
          doseNumber: doseNum,
          totalDoses: totalDoses,
          title,
          message,
          type: 'TREATMENT_DOSE',
          scheduledDate: trt.nextDoseDate,
          isRead: false,
        });

        generatedCount += 1;
      }
    }

    return generatedCount;
  }

  /**
   * Get notifications list with pagination and filtering
   */
  async getNotifications(params = {}) {
    const {
      gaushalaId,
      userId = null,
      isRead,
      type,
      page = 1,
      limit = 20,
    } = params;

    if (!gaushalaId || !mongoose.isValidObjectId(gaushalaId)) {
      throw new AppError('Valid Gaushala ID is required', 400);
    }

    // Refresh pending alerts for the gaushala
    await this.checkAndGenerateDoseAlerts(gaushalaId);

    const filter = {
      gaushalaId,
      isDeleted: false,
    };

    if (userId && mongoose.isValidObjectId(userId)) {
      filter.$or = [{ recipientUserId: userId }, { recipientUserId: null }];
    }

    if (isRead !== undefined && isRead !== null && isRead !== '') {
      filter.isRead = isRead === 'true' || isRead === true;
    }

    if (type && typeof type === 'string' && type.trim()) {
      filter.type = type.trim().toUpperCase();
    }

    const skip = (Number(page) - 1) * Number(limit);
    let query = Notification.find(filter)
      .populate('cowId', 'tag_id calf_name avatarUrl')
      .populate('treatmentId', 'treatmentNumber diseaseName severity status totalDoses completedDoses')
      .sort({ createdAt: -1 });

    if (Number(limit) > 0) {
      query = query.skip(skip).limit(Number(limit));
    }

    const [notifications, total, unreadCount] = await Promise.all([
      query.exec(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ ...filter, isRead: false }),
    ]);

    return {
      notifications,
      unreadCount,
      pagination:
        Number(limit) > 0
          ? {
              total,
              page: Number(page),
              limit: Number(limit),
              totalPages: Math.ceil(total / Number(limit)),
            }
          : null,
      count: notifications.length,
    };
  }

  /**
   * Get count of unread notifications for a gaushala/user
   */
  async getUnreadCount(gaushalaId, userId = null) {
    if (!gaushalaId || !mongoose.isValidObjectId(gaushalaId)) {
      throw new AppError('Valid Gaushala ID is required', 400);
    }

    // Refresh pending alerts
    await this.checkAndGenerateDoseAlerts(gaushalaId);

    const filter = {
      gaushalaId,
      isRead: false,
      isDeleted: false,
    };

    if (userId && mongoose.isValidObjectId(userId)) {
      filter.$or = [{ recipientUserId: userId }, { recipientUserId: null }];
    }

    const unreadCount = await Notification.countDocuments(filter);
    return { unreadCount };
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(notificationId, user) {
    if (!notificationId || !mongoose.isValidObjectId(notificationId)) {
      throw new AppError('Valid Notification ID is required', 400);
    }

    const notification = await Notification.findOne({
      _id: notificationId,
      isDeleted: false,
    });

    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    return notification;
  }

  /**
   * Mark all unread notifications of a gaushala as read
   */
  async markAllAsRead(gaushalaId, user = null) {
    if (!gaushalaId || !mongoose.isValidObjectId(gaushalaId)) {
      throw new AppError('Valid Gaushala ID is required', 400);
    }

    const filter = {
      gaushalaId,
      isRead: false,
      isDeleted: false,
    };

    if (user?._id) {
      filter.$or = [{ recipientUserId: user._id }, { recipientUserId: null }];
    }

    const result = await Notification.updateMany(filter, {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      success: true,
      modifiedCount: result.modifiedCount,
      message: 'All notifications marked as read',
    };
  }

  /**
   * Soft delete a notification
   */
  async deleteNotification(notificationId, user) {
    if (!notificationId || !mongoose.isValidObjectId(notificationId)) {
      throw new AppError('Valid Notification ID is required', 400);
    }

    const notification = await Notification.findOne({
      _id: notificationId,
      isDeleted: false,
    });

    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    notification.isDeleted = true;
    notification.deletedBy = user?._id || null;
    await notification.save();

    return notification;
  }
}

module.exports = new NotificationService();
