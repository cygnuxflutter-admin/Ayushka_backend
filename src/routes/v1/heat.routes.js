const express = require('express');
const heatController = require('../../controllers/heat.controller');
const {
  validateCreateHeat,
  validateUpdateHeat,
} = require('../../validators/heat.validator');
const checkPermission = require('../../middlewares/checkPermission');

const router = express.Router();

// ==========================================
// ALERT / SPECIAL ENDPOINTS (Must come before /:id)
// ==========================================

// Active heats ready for mating
router.get(
  '/alerts/active',
  checkPermission('HEAT_MGMT', 'HEAT_LIST', 'view'),
  heatController.getActiveHeats,
);

// Cows with 3 or more consecutive heat cycles without conception
router.get(
  '/alerts/repeat',
  checkPermission('HEAT_MGMT', 'HEAT_LIST', 'view'),
  heatController.getRepeatHeatAlerts,
);

// ==========================================
// CRUD ENDPOINTS
// ==========================================

// List all heat records
router.get(
  '/',
  checkPermission('HEAT_MGMT', 'HEAT_LIST', 'view'),
  heatController.getHeatList,
);

// Get single heat record by ID
router.get(
  '/:id',
  checkPermission('HEAT_MGMT', 'HEAT_LIST', 'view'),
  heatController.getHeatById,
);

// Record new heat observation
router.post(
  '/',
  checkPermission('HEAT_MGMT', 'HEAT_LIST', 'add'),
  validateCreateHeat,
  heatController.createHeatRecord,
);

// Update heat record
router.post(
  '/:id/update',
  checkPermission('HEAT_MGMT', 'HEAT_LIST', 'edit'),
  validateUpdateHeat,
  heatController.updateHeatRecord,
);

// Delete heat record (soft delete)
router.post(
  '/:id/delete',
  checkPermission('HEAT_MGMT', 'HEAT_LIST', 'delete'),
  heatController.deleteHeatRecord,
);

module.exports = router;
