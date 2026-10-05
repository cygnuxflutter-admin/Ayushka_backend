const express = require('express');
const feedController = require('../../controllers/feed.controller');
const {
  validateCreateFeedItem,
  validateUpdateFeedItem,
  validateStockInward,
  validateStockOutward,
  validateStockAdjustment,
} = require('../../validators/feed.validator');
const checkPermission = require('../../middlewares/checkPermission');

const router = express.Router();

// ==========================================
// FEED ITEMS (MASTER) ENDPOINTS
// ==========================================

// 1. Low stock items alert endpoint (must come before /items/:id)
router.get(
  '/items/low-stock',
  checkPermission('FEED_STOCK', 'FEED_ITEMS', 'view'),
  feedController.getLowStockItems,
);

// 2. List all feed items
router.get(
  '/items',
  checkPermission('FEED_STOCK', 'FEED_ITEMS', 'view'),
  feedController.getFeedItems,
);

// 3. Get single feed item
router.get(
  '/items/:id',
  checkPermission('FEED_STOCK', 'FEED_ITEMS', 'view'),
  feedController.getFeedItemById,
);

// 4. Create new feed item
router.post(
  '/items',
  checkPermission('FEED_STOCK', 'FEED_ITEMS', 'add'),
  validateCreateFeedItem,
  feedController.createFeedItem,
);

// 5. Update feed item
router.post(
  '/items/:id/update',
  checkPermission('FEED_STOCK', 'FEED_ITEMS', 'edit'),
  validateUpdateFeedItem,
  feedController.updateFeedItem,
);

// 6. Delete feed item
router.post(
  '/items/:id/delete',
  checkPermission('FEED_STOCK', 'FEED_ITEMS', 'delete'),
  feedController.deleteFeedItem,
);

// ==========================================
// STOCK TRANSACTIONS & SUMMARY ENDPOINTS
// ==========================================

// 1. Dashboard summary
router.get(
  '/summary',
  checkPermission('FEED_STOCK', 'STOCK_TRANSACTION', 'view'),
  feedController.getStockSummary,
);

// 2. Stock Inward (Purchase / Donation)
router.post(
  '/transactions/inward',
  checkPermission('FEED_STOCK', 'STOCK_TRANSACTION', 'add'),
  validateStockInward,
  feedController.recordInward,
);

// 3. Stock Outward (Daily Feeding / Consumption)
router.post(
  '/transactions/outward',
  checkPermission('FEED_STOCK', 'STOCK_TRANSACTION', 'add'),
  validateStockOutward,
  feedController.recordOutward,
);

// 4. Stock Adjustment / Wastage
router.post(
  '/transactions/adjustment',
  checkPermission('FEED_STOCK', 'STOCK_TRANSACTION', 'add'),
  validateStockAdjustment,
  feedController.recordAdjustment,
);

// 5. List transactions history / ledger
router.get(
  '/transactions',
  checkPermission('FEED_STOCK', 'STOCK_TRANSACTION', 'view'),
  feedController.getTransactions,
);

// 6. Single transaction details
router.get(
  '/transactions/:id',
  checkPermission('FEED_STOCK', 'STOCK_TRANSACTION', 'view'),
  feedController.getTransactionById,
);

module.exports = router;
