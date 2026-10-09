const mongoose = require('mongoose');
const MedicalItem = require('../models/MedicalItem');
const MedicalBatch = require('../models/MedicalBatch');
const MedicalStockTransaction = require('../models/MedicalStockTransaction');
const Gaushala = require('../models/Gaushala');
const Cow = require('../models/cow.model');
const Shed = require('../models/Shed');
const AppError = require('../utils/AppError');

/**
 * Service to manage Veterinary / Medical Stock with Batch & Expiry Tracking (FEFO)
 */
class MedicalService {
  /**
   * Create a new medical item master
   */
  async createMedicalItem(data, user) {
    const { gaushalaId, itemName, initialBatches, initialStock, batchNumber, expiryDate } = data;

    // Verify Gaushala exists
    const gaushala = await Gaushala.findById(gaushalaId);
    if (!gaushala) {
      throw new AppError('Gaushala not found', 404);
    }

    // Check for duplicate item name in the same gaushala
    const existing = await MedicalItem.findOne({
      gaushalaId,
      itemName: new RegExp(`^${itemName.trim()}$`, 'i'),
      isDeleted: false,
    });
    if (existing) {
      throw new AppError(
        `Medical item '${itemName}' already exists in this Gaushala`,
        409,
      );
    }

    const medicalItem = await MedicalItem.create({
      ...data,
      totalStock: 0,
      createdBy: user?._id || data.createdBy || null,
    });

    // Handle initial stock if provided as batches array or single batch fields
    const batchesToAdd = [];
    if (Array.isArray(initialBatches) && initialBatches.length > 0) {
      batchesToAdd.push(...initialBatches);
    } else if (initialStock && Number(initialStock) > 0) {
      batchesToAdd.push({
        batchNumber: batchNumber || `BAT-${Date.now()}`,
        expiryDate: expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // default 1 year if not provided
        quantity: Number(initialStock),
        unitPrice: data.unitPrice || 0,
        mrp: data.mrp || 0,
      });
    }

    if (batchesToAdd.length > 0) {
      await this.recordInward(
        {
          gaushalaId,
          itemId: medicalItem._id,
          reason: 'PURCHASE',
          notes: 'Opening stock entry',
          batches: batchesToAdd,
        },
        user,
      );
    }

    return MedicalItem.findById(medicalItem._id).populate('gaushalaId', 'gaushalaName');
  }

  /**
   * Update medical item master
   */
  async updateMedicalItem(id, updateData) {
    const item = await MedicalItem.findOne({ _id: id, isDeleted: false });
    if (!item) {
      throw new AppError('Medical item not found', 404);
    }

    if (updateData.itemName && updateData.itemName.trim() !== item.itemName) {
      const duplicate = await MedicalItem.findOne({
        gaushalaId: item.gaushalaId,
        itemName: new RegExp(`^${updateData.itemName.trim()}$`, 'i'),
        _id: { $ne: id },
        isDeleted: false,
      });
      if (duplicate) {
        throw new AppError(
          `Medical item '${updateData.itemName}' already exists in this Gaushala`,
          409,
        );
      }
    }

    // Prevent direct totalStock overwrite via item master update (must use transactions)
    delete updateData.totalStock;

    Object.assign(item, updateData);
    await item.save();

    return MedicalItem.findById(item._id).populate('gaushalaId', 'gaushalaName');
  }

  /**
   * Soft delete a medical item
   */
  async deleteMedicalItem(id, user) {
    const item = await MedicalItem.findOne({ _id: id, isDeleted: false });
    if (!item) {
      throw new AppError('Medical item not found', 404);
    }

    item.isDeleted = true;
    item.deletedBy = user?._id || null;
    await item.save();

    // Also soft delete associated batches
    await MedicalBatch.updateMany({ itemId: id }, { isDeleted: true });

    return { message: 'Medical item deleted successfully', itemId: id };
  }

  /**
   * List medical items with filters and pagination
   */
  async getMedicalItems(query = {}) {
    const {
      gaushalaId,
      search,
      category,
      unit,
      isActive,
      lowStockOnly,
      page = 1,
      limit = 20,
    } = query;

    const filter = { isDeleted: false };

    if (gaushalaId) {
      filter.gaushalaId = gaushalaId;
    }

    if (typeof isActive !== 'undefined') {
      filter.isActive = String(isActive) === 'true';
    }

    if (category) {
      filter.category = category.toUpperCase();
    }

    if (unit) {
      filter.unit = unit.toUpperCase();
    }

    if (search && search.trim()) {
      const term = search.trim();
      filter.$or = [
        { itemName: new RegExp(term, 'i') },
        { itemCode: new RegExp(term, 'i') },
        { manufacturer: new RegExp(term, 'i') },
      ];
    }

    if (String(lowStockOnly) === 'true') {
      filter.$expr = { $lte: ['$totalStock', '$minStockAlert'] };
    }

    const skip = (Number(page) - 1) * Number(limit);
    let mongoQuery = MedicalItem.find(filter)
      .populate('gaushalaId', 'gaushalaName')
      .sort({ itemName: 1 });

    if (Number(limit) > 0) {
      mongoQuery = mongoQuery.skip(skip).limit(Number(limit));
    }

    const [items, total] = await Promise.all([
      mongoQuery.exec(),
      MedicalItem.countDocuments(filter),
    ]);

    return {
      items,
      pagination:
        Number(limit) > 0
          ? {
              total,
              page: Number(page),
              limit: Number(limit),
              totalPages: Math.ceil(total / Number(limit)),
            }
          : null,
      count: items.length,
    };
  }

  /**
   * Get single medical item with active batches
   */
  async getMedicalItemById(id) {
    const item = await MedicalItem.findOne({ _id: id, isDeleted: false }).populate(
      'gaushalaId',
      'gaushalaName',
    );

    if (!item) {
      throw new AppError('Medical item not found', 404);
    }

    const batches = await MedicalBatch.find({
      itemId: id,
      isDeleted: false,
      availableQuantity: { $gt: 0 },
    }).sort({ expiryDate: 1 });

    return {
      item,
      activeBatches: batches,
      activeBatchesCount: batches.length,
    };
  }

  /**
   * Get low stock items where totalStock <= minStockAlert
   */
  async getLowStockItems(gaushalaId) {
    const filter = {
      isDeleted: false,
      isActive: true,
      $expr: { $lte: ['$totalStock', '$minStockAlert'] },
    };

    if (gaushalaId) {
      filter.gaushalaId = gaushalaId;
    }

    return MedicalItem.find(filter)
      .populate('gaushalaId', 'gaushalaName')
      .sort({ totalStock: 1 });
  }

  /**
   * Get active batches nearing expiry within specified days (default: 30 days)
   */
  async getExpiringBatches(gaushalaId, days = 30) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + Number(days));

    const filter = {
      isDeleted: false,
      status: 'ACTIVE',
      availableQuantity: { $gt: 0 },
      expiryDate: { $lte: thresholdDate },
    };

    if (gaushalaId) {
      filter.gaushalaId = gaushalaId;
    }

    return MedicalBatch.find(filter)
      .populate('itemId', 'itemName itemCode category unit minStockAlert totalStock')
      .populate('gaushalaId', 'gaushalaName')
      .sort({ expiryDate: 1 });
  }

  /**
   * Record Stock Inward (Batch-wise entry)
   * Supports both multiple batches in an array or a single batch payload
   */
  async recordInward(data, user) {
    const {
      gaushalaId,
      itemId,
      reason = 'PURCHASE',
      supplierOrDonorName = '',
      billOrReceiptNo = '',
      notes = '',
      transactionDate = new Date(),
    } = data;

    const item = await MedicalItem.findOne({ _id: itemId, gaushalaId, isDeleted: false });
    if (!item) {
      throw new AppError('Medical item not found in this Gaushala', 404);
    }

    // Normalize batches input
    let batchList = [];
    if (Array.isArray(data.batches) && data.batches.length > 0) {
      batchList = data.batches;
    } else if (data.quantity && Number(data.quantity) > 0) {
      batchList = [
        {
          batchNumber: data.batchNumber || `BAT-${Date.now()}`,
          expiryDate: data.expiryDate,
          mfgDate: data.mfgDate || null,
          quantity: Number(data.quantity),
          unitPrice: Number(data.unitPrice || data.ratePerUnit || 0),
          mrp: Number(data.mrp || 0),
        },
      ];
    } else {
      throw new AppError('At least one batch with valid quantity is required', 400);
    }

    // Validate each batch
    let totalInwardQuantity = 0;
    for (const b of batchList) {
      const qty = Number(b.quantity);
      if (!qty || qty <= 0) {
        throw new AppError('Each batch must have a quantity greater than zero', 400);
      }
      if (!b.expiryDate) {
        throw new AppError('Expiry date is required for each batch', 400);
      }
      const expDate = new Date(b.expiryDate);
      if (isNaN(expDate.getTime())) {
        throw new AppError(`Invalid expiry date format: ${b.expiryDate}`, 400);
      }
      totalInwardQuantity += qty;
    }

    const stockBefore = item.totalStock;
    const stockAfter = Number((stockBefore + totalInwardQuantity).toFixed(3));

    // Save batch records and collect transaction allocations
    const createdBatches = [];
    const transactionBatches = [];

    for (const b of batchList) {
      const qty = Number(b.quantity);
      const batchDoc = await MedicalBatch.create({
        gaushalaId,
        itemId,
        batchNumber: String(b.batchNumber || `BAT-${Date.now()}`).trim().toUpperCase(),
        expiryDate: new Date(b.expiryDate),
        mfgDate: b.mfgDate ? new Date(b.mfgDate) : null,
        initialQuantity: qty,
        availableQuantity: qty,
        unitPrice: Number(b.unitPrice || b.ratePerUnit || 0),
        mrp: Number(b.mrp || 0),
        status: 'ACTIVE',
        supplierName: supplierOrDonorName || b.supplierName || '',
        billOrInvoiceNo: billOrReceiptNo || b.billOrInvoiceNo || '',
        notes: notes || b.notes || '',
        recordedBy: user?._id || data.recordedBy || null,
      });

      createdBatches.push(batchDoc);
      transactionBatches.push({
        batchId: batchDoc._id,
        batchNumber: batchDoc.batchNumber,
        expiryDate: batchDoc.expiryDate,
        quantity: qty,
      });
    }

    // Update item master total stock
    item.totalStock = stockAfter;
    await item.save();

    // Create transaction record
    const transaction = await MedicalStockTransaction.create({
      gaushalaId,
      itemId,
      type: 'INWARD',
      reason,
      quantity: totalInwardQuantity,
      unit: item.unit,
      batches: transactionBatches,
      supplierOrDonorName,
      billOrReceiptNo,
      notes,
      stockBefore,
      stockAfter,
      transactionDate,
      recordedBy: user?._id || data.recordedBy,
    });

    return {
      transaction: await MedicalStockTransaction.findById(transaction._id)
        .populate('itemId', 'itemName itemCode category unit')
        .populate('gaushalaId', 'gaushalaName')
        .populate('recordedBy', 'name email'),
      createdBatches,
      item: {
        _id: item._id,
        itemName: item.itemName,
        totalStock: item.totalStock,
        unit: item.unit,
        minStockAlert: item.minStockAlert,
      },
    };
  }

  /**
   * Record Stock Outward using FEFO (First Expired, First Out)
   * Automatically deducts from batches having nearest expiry dates first
   */
  async recordOutward(data, user) {
    const {
      gaushalaId,
      itemId,
      quantity,
      reason = 'TREATMENT',
      cowId = null,
      shedId = null,
      doctorName = '',
      prescribedFor = '',
      notes = '',
      transactionDate = new Date(),
    } = data;

    const requestedQty = Number(quantity);
    if (!requestedQty || requestedQty <= 0) {
      throw new AppError('Outward quantity must be greater than zero', 400);
    }

    const item = await MedicalItem.findOne({ _id: itemId, gaushalaId, isDeleted: false });
    if (!item) {
      throw new AppError('Medical item not found in this Gaushala', 404);
    }

    if (item.totalStock < requestedQty) {
      throw new AppError(
        `Insufficient stock for '${item.itemName}'. Available: ${item.totalStock} ${item.unit}, Requested: ${requestedQty} ${item.unit}`,
        400,
      );
    }

    // Validate optional Cow reference
    if (cowId) {
      const cowExists = await Cow.findOne({ _id: cowId, isDeletes: false });
      if (!cowExists) {
        throw new AppError('Cow not found', 404);
      }
    }

    // Validate optional Shed reference
    if (shedId) {
      const shedExists = await Shed.findOne({ _id: shedId, isDelete: false });
      if (!shedExists) {
        throw new AppError('Shed not found', 404);
      }
    }

    // Fetch active non-exhausted batches sorted by expiryDate ascending (FEFO)
    const activeBatches = await MedicalBatch.find({
      gaushalaId,
      itemId,
      availableQuantity: { $gt: 0 },
      status: 'ACTIVE',
      isDeleted: false,
    }).sort({ expiryDate: 1, createdAt: 1 });

    const totalBatchAvailable = activeBatches.reduce(
      (sum, b) => sum + (b.availableQuantity || 0),
      0,
    );
    if (totalBatchAvailable < requestedQty) {
      throw new AppError(
        `Active batch stock mismatch. Only ${totalBatchAvailable} ${item.unit} available across active batches.`,
        400,
      );
    }

    let remainingToDeduct = requestedQty;
    const deductedBatches = [];

    // FEFO deduction loop: deduct from the batch with earliest expiry date first
    for (const batch of activeBatches) {
      if (remainingToDeduct <= 0) break;

      const deductFromThisBatch = Math.min(batch.availableQuantity, remainingToDeduct);
      const newAvailable = Number((batch.availableQuantity - deductFromThisBatch).toFixed(3));

      batch.availableQuantity = newAvailable;
      if (newAvailable === 0) {
        batch.status = 'EXHAUSTED';
      }
      await batch.save();

      deductedBatches.push({
        batchId: batch._id,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        quantity: deductFromThisBatch,
      });

      remainingToDeduct = Number((remainingToDeduct - deductFromThisBatch).toFixed(3));
    }

    const stockBefore = item.totalStock;
    const stockAfter = Number((stockBefore - requestedQty).toFixed(3));

    // Update item total stock
    item.totalStock = stockAfter;
    await item.save();

    // Create outward transaction ledger record
    const transaction = await MedicalStockTransaction.create({
      gaushalaId,
      itemId,
      type: 'OUTWARD',
      reason,
      quantity: requestedQty,
      unit: item.unit,
      batches: deductedBatches,
      cowId: cowId || null,
      shedId: shedId || null,
      doctorName: doctorName || '',
      prescribedFor: prescribedFor || '',
      notes: notes || '',
      stockBefore,
      stockAfter,
      transactionDate,
      recordedBy: user?._id || data.recordedBy,
    });

    const isLowStock = stockAfter <= item.minStockAlert;

    return {
      transaction: await MedicalStockTransaction.findById(transaction._id)
        .populate('itemId', 'itemName itemCode category unit')
        .populate('gaushalaId', 'gaushalaName')
        .populate('cowId', 'tagNumber name')
        .populate('shedId', 'shedNumber name')
        .populate('recordedBy', 'name email'),
      deductedBatches,
      item: {
        _id: item._id,
        itemName: item.itemName,
        totalStock: item.totalStock,
        unit: item.unit,
        minStockAlert: item.minStockAlert,
        isLowStock,
      },
      lowStockAlert: isLowStock
        ? `Stock for '${item.itemName}' is at or below alert limit (${item.totalStock} <= ${item.minStockAlert} ${item.unit})`
        : null,
    };
  }

  /**
   * Record Stock Adjustment / Expired Disposal
   */
  async recordAdjustment(data, user) {
    const {
      gaushalaId,
      itemId,
      batchId,
      type = 'EXPIRED_DISPOSAL',
      reason = 'EXPIRED_DISPOSAL',
      quantity,
      notes = '',
      transactionDate = new Date(),
    } = data;

    const adjustQty = Number(quantity);
    if (!adjustQty || adjustQty <= 0) {
      throw new AppError('Adjustment quantity must be greater than zero', 400);
    }

    const item = await MedicalItem.findOne({ _id: itemId, gaushalaId, isDeleted: false });
    if (!item) {
      throw new AppError('Medical item not found', 404);
    }

    let batch = null;
    if (batchId) {
      batch = await MedicalBatch.findOne({
        _id: batchId,
        itemId,
        gaushalaId,
        isDeleted: false,
      });
      if (!batch) {
        throw new AppError('Medical batch not found', 404);
      }
      if (batch.availableQuantity < adjustQty) {
        throw new AppError(
          `Batch only has ${batch.availableQuantity} ${item.unit} available`,
          400,
        );
      }
    }

    const stockBefore = item.totalStock;
    let stockAfter = stockBefore;

    const deductedBatches = [];

    if (batch) {
      batch.availableQuantity = Number((batch.availableQuantity - adjustQty).toFixed(3));
      if (batch.availableQuantity === 0) {
        batch.status = type === 'EXPIRED_DISPOSAL' ? 'EXPIRED' : 'EXHAUSTED';
      }
      await batch.save();

      deductedBatches.push({
        batchId: batch._id,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        quantity: adjustQty,
      });

      stockAfter = Math.max(0, Number((stockBefore - adjustQty).toFixed(3)));
      item.totalStock = stockAfter;
      await item.save();
    } else {
      // If no specific batch was provided, use FEFO deduction for the adjustment
      return this.recordOutward(
        {
          gaushalaId,
          itemId,
          quantity: adjustQty,
          reason,
          notes,
          transactionDate,
        },
        user,
      );
    }

    const transaction = await MedicalStockTransaction.create({
      gaushalaId,
      itemId,
      type: type || 'EXPIRED_DISPOSAL',
      reason,
      quantity: adjustQty,
      unit: item.unit,
      batches: deductedBatches,
      notes,
      stockBefore,
      stockAfter,
      transactionDate,
      recordedBy: user?._id || data.recordedBy,
    });

    return {
      transaction,
      item: {
        _id: item._id,
        itemName: item.itemName,
        totalStock: item.totalStock,
      },
    };
  }

  /**
   * List batches with filtering (by item, gaushala, status, etc.)
   */
  async getBatches(query = {}) {
    const {
      gaushalaId,
      itemId,
      status,
      search,
      page = 1,
      limit = 20,
    } = query;

    const filter = { isDeleted: false };

    if (gaushalaId) {
      filter.gaushalaId = gaushalaId;
    }

    if (itemId) {
      filter.itemId = itemId;
    }

    if (status) {
      filter.status = status.toUpperCase();
    }

    if (search && search.trim()) {
      filter.batchNumber = new RegExp(search.trim(), 'i');
    }

    const skip = (Number(page) - 1) * Number(limit);
    let mongoQuery = MedicalBatch.find(filter)
      .populate('itemId', 'itemName itemCode category unit')
      .populate('gaushalaId', 'gaushalaName')
      .sort({ expiryDate: 1 });

    if (Number(limit) > 0) {
      mongoQuery = mongoQuery.skip(skip).limit(Number(limit));
    }

    const [batches, total] = await Promise.all([
      mongoQuery.exec(),
      MedicalBatch.countDocuments(filter),
    ]);

    return {
      batches,
      pagination:
        Number(limit) > 0
          ? {
              total,
              page: Number(page),
              limit: Number(limit),
              totalPages: Math.ceil(total / Number(limit)),
            }
          : null,
      count: batches.length,
    };
  }

  /**
   * List transactions history / ledger
   */
  async getTransactions(query = {}) {
    const {
      gaushalaId,
      itemId,
      type,
      reason,
      cowId,
      shedId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = query;

    const filter = { isDeleted: false };

    if (gaushalaId) {
      filter.gaushalaId = gaushalaId;
    }

    if (itemId) {
      filter.itemId = itemId;
    }

    if (type) {
      filter.type = type.toUpperCase();
    }

    if (reason) {
      filter.reason = reason.toUpperCase();
    }

    if (cowId) {
      filter.cowId = cowId;
    }

    if (shedId) {
      filter.shedId = shedId;
    }

    if (startDate || endDate) {
      filter.transactionDate = {};
      if (startDate) {
        filter.transactionDate.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.transactionDate.$lte = end;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    let mongoQuery = MedicalStockTransaction.find(filter)
      .populate('itemId', 'itemName itemCode category unit')
      .populate('gaushalaId', 'gaushalaName')
      .populate('cowId', 'tagNumber name')
      .populate('shedId', 'shedNumber name')
      .populate('recordedBy', 'name email')
      .sort({ transactionDate: -1, createdAt: -1 });

    if (Number(limit) > 0) {
      mongoQuery = mongoQuery.skip(skip).limit(Number(limit));
    }

    const [transactions, total] = await Promise.all([
      mongoQuery.exec(),
      MedicalStockTransaction.countDocuments(filter),
    ]);

    return {
      transactions,
      pagination:
        Number(limit) > 0
          ? {
              total,
              page: Number(page),
              limit: Number(limit),
              totalPages: Math.ceil(total / Number(limit)),
            }
          : null,
      count: transactions.length,
    };
  }

  /**
   * Get single transaction by ID
   */
  async getTransactionById(id) {
    const transaction = await MedicalStockTransaction.findOne({
      _id: id,
      isDeleted: false,
    })
      .populate('itemId', 'itemName itemCode category unit')
      .populate('gaushalaId', 'gaushalaName')
      .populate('cowId', 'tagNumber name')
      .populate('shedId', 'shedNumber name')
      .populate('recordedBy', 'name email');

    if (!transaction) {
      throw new AppError('Medical transaction not found', 404);
    }

    return transaction;
  }

  /**
   * Dashboard summary for medical stock
   */
  async getMedicalSummary(gaushalaId) {
    const itemFilter = { isDeleted: false, isActive: true };
    const batchFilter = { isDeleted: false, status: 'ACTIVE', availableQuantity: { $gt: 0 } };

    if (gaushalaId) {
      itemFilter.gaushalaId = gaushalaId;
      batchFilter.gaushalaId = gaushalaId;
    }

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const now = new Date();

    const [
      totalItems,
      lowStockItems,
      expiringSoonBatches,
      expiredBatches,
    ] = await Promise.all([
      MedicalItem.countDocuments(itemFilter),
      MedicalItem.countDocuments({
        ...itemFilter,
        $expr: { $lte: ['$totalStock', '$minStockAlert'] },
      }),
      MedicalBatch.countDocuments({
        ...batchFilter,
        expiryDate: { $lte: thirtyDaysFromNow, $gte: now },
      }),
      MedicalBatch.countDocuments({
        ...batchFilter,
        expiryDate: { $lt: now },
      }),
    ]);

    return {
      totalItems,
      lowStockItemsCount: lowStockItems,
      expiringSoonBatchesCount: expiringSoonBatches,
      expiredBatchesCount: expiredBatches,
    };
  }
}

module.exports = new MedicalService();
