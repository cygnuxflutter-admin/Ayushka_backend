const express = require('express');
const milkController = require('../../controllers/milk.controller');
const {
  validateSingleProduction,
  validateBulkProduction,
  validateCreateDistribution,
  validateCreateDisposal,
} = require('../../validators/milk.validator');
const checkPermission = require('../../middlewares/checkPermission');

const router = express.Router();

// ==========================================
// 1. SUMMARY & FRIDGE STOCK (Specific routes first)
// ==========================================

// Daily balance sheet summary (production, distribution, fridge stock)
router.get(
  '/daily-summary',
  checkPermission('MILK_MGMT', 'MILK_PRODUCTION', 'view'),
  milkController.getDailySummary,
);

// All dates with remaining milk stored in fridge
router.get(
  '/fridge-stock',
  checkPermission('MILK_MGMT', 'MILK_DISTRIBUTION', 'view'),
  milkController.getFridgeStock,
);

// Run/trigger monthly variance alert check across all cows
router.post(
  '/alerts/check-monthly',
  checkPermission('MILK_MGMT', 'MILK_PRODUCTION', 'view'),
  milkController.checkMonthlyAlerts,
);

// ==========================================
// 2. MILK PRODUCTION
// ==========================================

// List cow-wise milk production records
router.get(
  '/production',
  checkPermission('MILK_MGMT', 'MILK_PRODUCTION', 'view'),
  milkController.getProductionList,
);

// Single cow milk production entry
router.post(
  '/production',
  checkPermission('MILK_MGMT', 'MILK_PRODUCTION', 'add'),
  validateSingleProduction,
  milkController.recordProduction,
);

// Bulk cow milk production entry (multiple cows in one shift)
router.post(
  '/production/bulk',
  checkPermission('MILK_MGMT', 'MILK_PRODUCTION', 'add'),
  validateBulkProduction,
  milkController.recordBulkProduction,
);

// ==========================================
// 3. MILK DISTRIBUTION
// ==========================================

// List milk distribution entries
router.get(
  '/distribution',
  checkPermission('MILK_MGMT', 'MILK_DISTRIBUTION', 'view'),
  milkController.getDistributionList,
);

// Record milk distribution (supports same-day shift-wise & next-day ALL-milk pool)
router.post(
  '/distribution',
  checkPermission('MILK_MGMT', 'MILK_DISTRIBUTION', 'add'),
  validateCreateDistribution,
  milkController.recordDistribution,
);

// ==========================================
// 4. MILK DISPOSAL (SPOILED / WASTE MILK)
// ==========================================

// List milk disposal entries
router.get(
  '/dispose',
  checkPermission('MILK_MGMT', 'MILK_DISTRIBUTION', 'view'),
  milkController.getDisposalList,
);

// Record spoiled milk disposal
router.post(
  '/dispose',
  checkPermission('MILK_MGMT', 'MILK_DISTRIBUTION', 'add'),
  validateCreateDisposal,
  milkController.recordDisposal,
);

module.exports = router;
