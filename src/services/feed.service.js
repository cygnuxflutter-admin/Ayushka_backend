const mongoose = require('mongoose');
const FeedItem = require('../models/FeedItem');
const FeedStockTransaction = require('../models/FeedStockTransaction');
const Gaushala = require('../models/Gaushala');
const Shed = require('../models/Shed');
const AppError = require('../utils/AppError');

/**
 * Service to manage Cattle Feed / Fodder (Cow Chara) Stock
 */
class FeedService {
  /**
   * Create a new feed item master
   */
  async createFeedItem(data, user) {
    const { gaushalaId, itemName, initialStock, unit } = data;

    // Verify gaushala exists
    const gaushala = await Gaushala.findById(gaushalaId);
    if (!gaushala) {
      throw new AppError('Gaushala not found', 404);
    }

    // Check for duplicate item name in the same gaushala
    const existing = await FeedItem.findOne({
      gaushalaId,
      itemName: new RegExp(`^${itemName.trim()}$`, 'i'),
      isDeleted: false,
    });
    if (existing) {
      throw new AppError(`Feed item '${itemName}' already exists in this Gaushala`, 409);
    }

    const feedItem = await FeedItem.create({
      ...data,
      createdBy: user?._id || data.createdBy || null,
      currentStock: initialStock || 0,
    });

    // If opening/initial stock was provided, create an initial transaction entry
    if (initialStock && initialStock > 0) {
      await FeedStockTransaction.create({
        gaushalaId,
        itemId: feedItem._id,
        type: 'INWARD',
        reason: 'PURCHASE',
        quantity: initialStock,
        unit: unit || feedItem.unit,
        ratePerUnit: data.unitPrice || 0,
        totalAmount: (data.unitPrice || 0) * initialStock,
        stockBefore: 0,
        stockAfter: initialStock,
        notes: 'Initial opening stock',
        recordedBy: user?._id || feedItem.createdBy,
      });
    }

    return FeedItem.findById(feedItem._id).populate('gaushalaId', 'gaushalaName');
  }

  /**
   * Update an existing feed item
   */
  async updateFeedItem(id, updateData) {
    const item = await FeedItem.findOne({ _id: id, isDeleted: false });
    if (!item) {
      throw new AppError('Feed item not found', 404);
    }

    if (updateData.itemName && updateData.itemName.trim() !== item.itemName) {
      const duplicate = await FeedItem.findOne({
        gaushalaId: item.gaushalaId,
        itemName: new RegExp(`^${updateData.itemName.trim()}$`, 'i'),
        _id: { $ne: id },
        isDeleted: false,
      });
      if (duplicate) {
        throw new AppError(`Feed item '${updateData.itemName}' already exists in this Gaushala`, 409);
      }
    }

    Object.assign(item, updateData);
    await item.save();

    return FeedItem.findById(item._id).populate('gaushalaId', 'gaushalaName');
  }

  /**
   * Soft delete a feed item
   */
  async deleteFeedItem(id, user) {
    const item = await FeedItem.findOne({ _id: id, isDeleted: false });
    if (!item) {
      throw new AppError('Feed item not found', 404);
    }

    item.isDeleted = true;
    item.deletedBy = user?._id || null;
    await item.save();

    return { message: 'Feed item deleted successfully', id: item._id };
  }

  /**
   * Fetch single feed item by ID
   */
  async getFeedItemById(id) {
    const item = await FeedItem.findOne({ _id: id, isDeleted: false })
      .populate('gaushalaId', 'gaushalaName')
      .populate('createdBy', 'name email');

    if (!item) {
      throw new AppError('Feed item not found', 404);
    }
    return item;
  }

  /**
   * Fetch list of feed items with filters and pagination
   */
  async getFeedItems(query = {}) {
    const filter = { isDeleted: false };

    if (query.gaushalaId || query.gaushala_id) {
      filter.gaushalaId = (query.gaushalaId || query.gaushala_id).toString().trim();
    }

    if (query.category) {
      filter.category = String(query.category).trim().toUpperCase();
    }

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive === 'true' || query.isActive === true;
    }

    if (query.lowStock === 'true' || query.lowStock === true) {
      filter.$expr = { $lte: ['$currentStock', '$minStockAlert'] };
    }

    if (query.search && typeof query.search === 'string' && query.search.trim()) {
      const s = query.search.trim();
      filter.$or = [
        { itemName: { $regex: s, $options: 'i' } },
        { itemCode: { $regex: s, $options: 'i' } },
      ];
    }

    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = query.limit ? Math.max(1, parseInt(query.limit, 10)) : 0;
    const skip = (page - 1) * limit;

    let mongoQuery = FeedItem.find(filter)
      .populate('gaushalaId', 'gaushalaName')
      .sort({ itemName: 1 });

    if (limit > 0) {
      mongoQuery = mongoQuery.skip(skip).limit(limit);
    }

    const [items, total] = await Promise.all([
      mongoQuery.exec(),
      FeedItem.countDocuments(filter),
    ]);

    return {
      items,
      pagination: limit > 0 ? {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      } : null,
      count: items.length,
    };
  }

  /**
   * Get items whose stock is at or below alert threshold
   */
  async getLowStockItems(gaushalaId) {
    const filter = {
      isDeleted: false,
      isActive: true,
      $expr: { $lte: ['$currentStock', '$minStockAlert'] },
    };

    if (gaushalaId) {
      filter.gaushalaId = gaushalaId;
    }

    return FeedItem.find(filter)
      .populate('gaushalaId', 'gaushalaName')
      .sort({ currentStock: 1 });
  }

  /**
   * Record Stock Inward (Purchase or Donation)
   */
  async recordInward(data, user) {
    const {
      gaushalaId,
      itemId,
      quantity,
      reason,
      ratePerUnit,
      totalAmount,
      supplierOrDonorName,
      billOrReceiptNo,
      vehicleNumber,
      notes,
      transactionDate,
    } = data;

    const item = await FeedItem.findOne({ _id: itemId, gaushalaId, isDeleted: false });
    if (!item) {
      throw new AppError('Feed item not found in this Gaushala', 404);
    }

    const stockBefore = item.currentStock;
    const stockAfter = Number((stockBefore + quantity).toFixed(3));

    // Update item stock
    item.currentStock = stockAfter;
    await item.save();

    // Create inward transaction ledger record
    const transaction = await FeedStockTransaction.create({
      gaushalaId,
      itemId,
      type: 'INWARD',
      reason: reason || 'PURCHASE',
      quantity,
      unit: item.unit,
      ratePerUnit: ratePerUnit || 0,
      totalAmount: totalAmount || (ratePerUnit || 0) * quantity,
      supplierOrDonorName: supplierOrDonorName || '',
      billOrReceiptNo: billOrReceiptNo || '',
      vehicleNumber: vehicleNumber || '',
      notes: notes || '',
      transactionDate: transactionDate || new Date(),
      stockBefore,
      stockAfter,
      recordedBy: user?._id || data.recordedBy,
    });

    return {
      transaction: await FeedStockTransaction.findById(transaction._id)
        .populate('itemId', 'itemName itemCode category unit')
        .populate('gaushalaId', 'gaushalaName')
        .populate('recordedBy', 'name email'),
      item: {
        _id: item._id,
        itemName: item.itemName,
        currentStock: item.currentStock,
        unit: item.unit,
      },
    };
  }

  /**
   * Record Stock Outward (Daily Feeding / Consumption)
   */
  async recordOutward(data, user) {
    const { gaushalaId, itemId, quantity, reason, shedId, notes, transactionDate } = data;

    const item = await FeedItem.findOne({ _id: itemId, gaushalaId, isDeleted: false });
    if (!item) {
      throw new AppError('Feed item not found in this Gaushala', 404);
    }

    if (item.currentStock < quantity) {
      throw new AppError(
        `Insufficient stock for '${item.itemName}'. Available: ${item.currentStock} ${item.unit}, Requested: ${quantity} ${item.unit}`,
        400,
      );
    }

    // Verify shed if provided
    if (shedId) {
      const shed = await Shed.findOne({ _id: shedId, gaushalaId });
      if (!shed) {
        throw new AppError('Specified Shed not found in this Gaushala', 404);
      }
    }

    const stockBefore = item.currentStock;
    const stockAfter = Number((stockBefore - quantity).toFixed(3));

    item.currentStock = stockAfter;
    await item.save();

    // Create outward transaction ledger record
    const transaction = await FeedStockTransaction.create({
      gaushalaId,
      itemId,
      type: 'OUTWARD',
      reason: reason || 'DAILY_FEEDING',
      quantity,
      unit: item.unit,
      shedId: shedId || null,
      notes: notes || '',
      transactionDate: transactionDate || new Date(),
      stockBefore,
      stockAfter,
      recordedBy: user?._id || data.recordedBy,
    });

    const isLowStock = item.currentStock <= item.minStockAlert;

    return {
      transaction: await FeedStockTransaction.findById(transaction._id)
        .populate('itemId', 'itemName itemCode category unit')
        .populate('shedId', 'shedName shedNumber')
        .populate('gaushalaId', 'gaushalaName')
        .populate('recordedBy', 'name email'),
      item: {
        _id: item._id,
        itemName: item.itemName,
        currentStock: item.currentStock,
        unit: item.unit,
        isLowStock,
      },
      warning: isLowStock
        ? `Alert: Stock of '${item.itemName}' is now at or below threshold (${item.currentStock} ${item.unit} remaining)`
        : null,
    };
  }

  /**
   * Record Stock Wastage or Manual Adjustment
   */
  async recordAdjustment(data, user) {
    const { gaushalaId, itemId, type, reason, quantity, notes, transactionDate } = data;

    const item = await FeedItem.findOne({ _id: itemId, gaushalaId, isDeleted: false });
    if (!item) {
      throw new AppError('Feed item not found in this Gaushala', 404);
    }

    const txType = type || 'WASTAGE';
    const isDeduction = txType === 'WASTAGE' || data.adjustmentMode === 'SUBTRACT' || !data.adjustmentMode;

    if (isDeduction && item.currentStock < quantity) {
      throw new AppError(
        `Insufficient stock for '${item.itemName}' adjustment. Available: ${item.currentStock} ${item.unit}, Deduction: ${quantity} ${item.unit}`,
        400,
      );
    }

    const stockBefore = item.currentStock;
    const stockAfter = isDeduction
      ? Number((stockBefore - quantity).toFixed(3))
      : Number((stockBefore + quantity).toFixed(3));

    item.currentStock = stockAfter;
    await item.save();

    const transaction = await FeedStockTransaction.create({
      gaushalaId,
      itemId,
      type: txType,
      reason: reason || (txType === 'WASTAGE' ? 'DAMAGED_EXPIRED' : 'STOCK_AUDIT'),
      quantity,
      unit: item.unit,
      notes: notes || '',
      transactionDate: transactionDate || new Date(),
      stockBefore,
      stockAfter,
      recordedBy: user?._id || data.recordedBy,
    });

    return {
      transaction: await FeedStockTransaction.findById(transaction._id)
        .populate('itemId', 'itemName itemCode category unit')
        .populate('gaushalaId', 'gaushalaName')
        .populate('recordedBy', 'name email'),
      item: {
        _id: item._id,
        itemName: item.itemName,
        currentStock: item.currentStock,
        unit: item.unit,
      },
    };
  }

  /**
   * Get Transactions History / Ledger with filters
   */
  async getTransactions(query = {}) {
    const filter = { isDeleted: false };

    if (query.gaushalaId || query.gaushala_id) {
      filter.gaushalaId = (query.gaushalaId || query.gaushala_id).toString().trim();
    }

    if (query.itemId || query.item_id) {
      filter.itemId = (query.itemId || query.item_id).toString().trim();
    }

    if (query.type) {
      filter.type = String(query.type).trim().toUpperCase();
    }

    if (query.reason) {
      filter.reason = String(query.reason).trim().toUpperCase();
    }

    if (query.shedId || query.shed_id) {
      filter.shedId = (query.shedId || query.shed_id).toString().trim();
    }

    // Date range filter
    if (query.startDate || query.endDate) {
      filter.transactionDate = {};
      if (query.startDate) {
        filter.transactionDate.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        filter.transactionDate.$lte = end;
      }
    }

    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.max(1, parseInt(query.limit, 10) || 20);
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      FeedStockTransaction.find(filter)
        .populate('itemId', 'itemName itemCode category unit')
        .populate('shedId', 'shedName shedNumber')
        .populate('gaushalaId', 'gaushalaName')
        .populate('recordedBy', 'name email')
        .sort({ transactionDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      FeedStockTransaction.countDocuments(filter),
    ]);

    return {
      transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single transaction by ID
   */
  async getTransactionById(id) {
    const tx = await FeedStockTransaction.findOne({ _id: id, isDeleted: false })
      .populate('itemId', 'itemName itemCode category unit')
      .populate('shedId', 'shedName shedNumber')
      .populate('gaushalaId', 'gaushalaName')
      .populate('recordedBy', 'name email');

    if (!tx) {
      throw new AppError('Stock transaction not found', 404);
    }
    return tx;
  }

  /**
   * Stock Summary & Analytics Dashboard for a Gaushala
   */
  async getStockSummary(gaushalaId) {
    if (!gaushalaId) {
      throw new AppError('gaushalaId is required for summary', 400);
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      totalItems,
      lowStockItemsCount,
      allCurrentStock,
      todayTransactions,
      monthTransactions,
    ] = await Promise.all([
      FeedItem.countDocuments({ gaushalaId, isDeleted: false }),
      FeedItem.countDocuments({
        gaushalaId,
        isDeleted: false,
        isActive: true,
        $expr: { $lte: ['$currentStock', '$minStockAlert'] },
      }),
      FeedItem.find({ gaushalaId, isDeleted: false })
        .select('itemName category unit currentStock minStockAlert')
        .sort({ currentStock: 1 }),
      FeedStockTransaction.aggregate([
        {
          $match: {
            gaushalaId: new mongoose.Types.ObjectId(gaushalaId),
            isDeleted: false,
            transactionDate: { $gte: todayStart },
          },
        },
        {
          $group: {
            _id: '$type',
            totalQuantity: { $sum: '$quantity' },
            totalAmount: { $sum: '$totalAmount' },
            count: { $sum: 1 },
          },
        },
      ]),
      FeedStockTransaction.aggregate([
        {
          $match: {
            gaushalaId: new mongoose.Types.ObjectId(gaushalaId),
            isDeleted: false,
            transactionDate: { $gte: monthStart },
          },
        },
        {
          $group: {
            _id: '$type',
            totalQuantity: { $sum: '$quantity' },
            totalAmount: { $sum: '$totalAmount' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    return {
      totalItems,
      lowStockItemsCount,
      itemsStock: allCurrentStock,
      todaySummary: todayTransactions,
      monthSummary: monthTransactions,
    };
  }
}

module.exports = new FeedService();
