const express = require('express');
const matingController = require('../../controllers/mating.controller');
const {
  validateRecordMating,
  validateUpdatePDStatus,
  validateRecordCalving,
  validateUpdateMating,
} = require('../../validators/mating.validator');
const checkPermission = require('../../middlewares/checkPermission');

const router = express.Router();

// ==========================================
// ALERT / SPECIAL ENDPOINTS (Must come before /:id)
// ==========================================

// Repeat breeder cows (3 or more failed matings)
router.get(
  '/alerts/repeat-breeders',
  checkPermission('MATING_MGMT', 'MATING_LIST', 'view'),
  matingController.getRepeatBreederAlerts,
);

// Matings due for Pregnancy Diagnosis (PD) check
router.get(
  '/alerts/pending-pd',
  checkPermission('MATING_MGMT', 'MATING_LIST', 'view'),
  matingController.getPendingPDAlerts,
);

// ==========================================
// CRUD & STATUS ENDPOINTS
// ==========================================

// List all mating records
router.get(
  '/',
  checkPermission('MATING_MGMT', 'MATING_LIST', 'view'),
  matingController.getMatingList,
);

// Get single mating record by ID
router.get(
  '/:id',
  checkPermission('MATING_MGMT', 'MATING_LIST', 'view'),
  matingController.getMatingById,
);

// Record new mating
router.post(
  '/',
  checkPermission('MATING_MGMT', 'MATING_LIST', 'add'),
  validateRecordMating,
  matingController.recordMating,
);

// Update mating details
router.post(
  '/:id/update',
  checkPermission('MATING_MGMT', 'MATING_LIST', 'edit'),
  validateUpdateMating,
  matingController.updateMating,
);

// Update Pregnancy Diagnosis (PD) result (POSITIVE / NEGATIVE)
router.post(
  '/:id/pd-status',
  checkPermission('MATING_MGMT', 'MATING_LIST', 'edit'),
  validateUpdatePDStatus,
  matingController.updatePDStatus,
);

// Record calving / delivery
router.post(
  '/:id/calving',
  checkPermission('MATING_MGMT', 'MATING_LIST', 'edit'),
  validateRecordCalving,
  matingController.recordCalving,
);

// Delete mating record (soft delete)
router.post(
  '/:id/delete',
  checkPermission('MATING_MGMT', 'MATING_LIST', 'delete'),
  matingController.deleteMating,
);

module.exports = router;
