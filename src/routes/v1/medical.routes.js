const express = require('express');
const medicalController = require('../../controllers/medical.controller');
const {
  validateCreateMedicalItem,
  validateUpdateMedicalItem,
  validateStockInward,
  validateStockOutward,
  validateStockAdjustment,
} = require('../../validators/medical.validator');
const checkPermission = require('../../middlewares/checkPermission');

const router = express.Router();

// ==========================================
// MEDICAL ITEMS (MASTER) ENDPOINTS
// ==========================================

// 1. Low stock items alert endpoint (must come before /items/:id)
router.get(
  '/items/low-stock',
  checkPermission('MEDICAL_STOCK', 'MEDICAL_ITEMS', 'view'),
  medicalController.getLowStockItems,
);

// 2. Expiring batches alert endpoint (must come before /items/:id)
router.get(
  '/batches/expiring',
  checkPermission('MEDICAL_STOCK', 'MEDICAL_ITEMS', 'view'),
  medicalController.getExpiringBatches,
);

// 3. Batches list endpoint
router.get(
  '/batches',
  checkPermission('MEDICAL_STOCK', 'MEDICAL_ITEMS', 'view'),
  medicalController.getBatches,
);

// 4. List all medical items
router.get(
  '/items',
  checkPermission('MEDICAL_STOCK', 'MEDICAL_ITEMS', 'view'),
  medicalController.getMedicalItems,
);

// 5. Get single medical item details with active batches
router.get(
  '/items/:id',
  checkPermission('MEDICAL_STOCK', 'MEDICAL_ITEMS', 'view'),
  medicalController.getMedicalItemById,
);

// 6. Create new medical item
router.post(
  '/items',
  checkPermission('MEDICAL_STOCK', 'MEDICAL_ITEMS', 'add'),
  validateCreateMedicalItem,
  medicalController.createMedicalItem,
);

// 7. Update medical item
router.post(
  '/items/:id/update',
  checkPermission('MEDICAL_STOCK', 'MEDICAL_ITEMS', 'edit'),
  validateUpdateMedicalItem,
  medicalController.updateMedicalItem,
);

// 8. Delete medical item
router.post(
  '/items/:id/delete',
  checkPermission('MEDICAL_STOCK', 'MEDICAL_ITEMS', 'delete'),
  medicalController.deleteMedicalItem,
);

// ==========================================
// STOCK TRANSACTIONS & SUMMARY ENDPOINTS
// ==========================================

// 1. Dashboard summary
router.get(
  '/summary',
  checkPermission('MEDICAL_STOCK', 'STOCK_TRANSACTION', 'view'),
  medicalController.getMedicalSummary,
);

// 2. Stock Inward (Batch / Expiry based entry)
router.post(
  '/transactions/inward',
  checkPermission('MEDICAL_STOCK', 'STOCK_TRANSACTION', 'add'),
  validateStockInward,
  medicalController.recordInward,
);

// 3. Stock Outward (FEFO - First Expired, First Out)
router.post(
  '/transactions/outward',
  checkPermission('MEDICAL_STOCK', 'STOCK_TRANSACTION', 'add'),
  validateStockOutward,
  medicalController.recordOutward,
);

// 4. Stock Adjustment / Expired Disposal
router.post(
  '/transactions/adjustment',
  checkPermission('MEDICAL_STOCK', 'STOCK_TRANSACTION', 'add'),
  validateStockAdjustment,
  medicalController.recordAdjustment,
);

// 5. List transactions history / ledger
router.get(
  '/transactions',
  checkPermission('MEDICAL_STOCK', 'STOCK_TRANSACTION', 'view'),
  medicalController.getTransactions,
);

// 6. Single transaction details
router.get(
  '/transactions/:id',
  checkPermission('MEDICAL_STOCK', 'STOCK_TRANSACTION', 'view'),
  medicalController.getTransactionById,
);

module.exports = router;
