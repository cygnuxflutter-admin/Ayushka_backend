const mongoose = require('mongoose');
const CowTreatment = require('../models/CowTreatment');
const Notification = require('../models/Notification');
const treatmentService = require('./treatment.service');
const medicalService = require('./medical.service');
const feedService = require('./feed.service');
const milkService = require('./milk.service');
const notificationService = require('./notification.service');
const AppError = require('../utils/AppError');

class DashboardService {
  /**
   * Aggregate all module-wise alerts for a specific gaushala into a single response
   */
  async getAlertsSummary(gaushalaId, userId = null) {
    if (!gaushalaId || !mongoose.isValidObjectId(gaushalaId)) {
      throw new AppError('Valid Gaushala ID is required', 400);
    }

    const gId = new mongoose.Types.ObjectId(gaushalaId);

    // 1. Fetch Treatment alerts (Today's due doses & Critical cases)
    const [dueDoses, criticalCases] = await Promise.all([
      treatmentService.getTodayDueDoses(gaushalaId).catch((err) => {
        console.error('Error fetching due doses for dashboard:', err);
        return [];
      }),
      CowTreatment.find({
        gaushalaId: gId,
        status: 'UNDER_TREATMENT',
        severity: 'CRITICAL',
        isDeleted: false,
      })
        .populate('cowId', 'tag_id calf_name shed_id avatarUrl')
        .populate('shedId', 'shedName shedNumber')
        .sort({ updatedAt: -1 })
        .catch((err) => {
          console.error('Error fetching critical treatments for dashboard:', err);
          return [];
        }),
    ]);

    // 2. Fetch Milk alerts (Production variance notifications & Fridge remaining milk)
    const [milkAlerts, fridgeStock] = await Promise.all([
      Notification.find({
        gaushalaId: gId,
        type: 'MILK_PRODUCTION_ALERT',
        isDeleted: false,
      })
        .populate('cowId', 'tag_id calf_name avatarUrl')
        .sort({ createdAt: -1 })
        .limit(10)
        .catch((err) => {
          console.error('Error fetching milk notifications for dashboard:', err);
          return [];
        }),
      milkService.getFridgeStock(gaushalaId).catch((err) => {
        console.error('Error fetching fridge stock for dashboard:', err);
        return { totalFridgeVolume: 0, datesCount: 0, stockByDate: [] };
      }),
    ]);

    // 3. Fetch Medical stock alerts (Low stock & Batches expiring in 30 days)
    const [medicalLowStock, expiringBatches] = await Promise.all([
      medicalService.getLowStockItems(gaushalaId).catch((err) => {
        console.error('Error fetching low medical stock for dashboard:', err);
        return [];
      }),
      medicalService.getExpiringBatches(gaushalaId, 30).catch((err) => {
        console.error('Error fetching expiring batches for dashboard:', err);
        return [];
      }),
    ]);

    // 4. Fetch Feed stock alerts (Items below minimum threshold)
    const feedLowStock = await feedService.getLowStockItems(gaushalaId).catch((err) => {
      console.error('Error fetching low feed stock for dashboard:', err);
      return [];
    });

    // 5. Fetch Unread notifications count
    const unreadCountResult = await notificationService
      .getUnreadCount(gaushalaId, userId)
      .catch(() => ({ unreadCount: 0 }));

    // Count totals
    const counts = {
      treatmentDueDoses: dueDoses.length,
      criticalCases: criticalCases.length,
      milkAlerts: milkAlerts.length,
      fridgeStockDates: fridgeStock.datesCount || 0,
      lowMedicalStock: medicalLowStock.length,
      expiringMedicines: expiringBatches.length,
      lowFeedStock: feedLowStock.length,
      totalAlerts:
        dueDoses.length +
        criticalCases.length +
        milkAlerts.length +
        medicalLowStock.length +
        expiringBatches.length +
        feedLowStock.length,
      unreadNotifications: unreadCountResult.unreadCount || 0,
    };

    return {
      gaushalaId,
      counts,
      treatmentAlerts: {
        todayDueDoses: dueDoses,
        criticalCases,
      },
      milkAlerts: {
        recentVariances: milkAlerts,
        fridgeStock,
      },
      medicalAlerts: {
        lowStock: medicalLowStock,
        expiringBatches,
      },
      feedAlerts: {
        lowStock: feedLowStock,
      },
    };
  }
}

module.exports = new DashboardService();
