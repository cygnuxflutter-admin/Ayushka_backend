const express = require('express');
const dashboardController = require('../../controllers/dashboard.controller');
const optionalAuth = require('../../middlewares/optionalAuth');

const router = express.Router();

// GET /api/v1/dashboard/alerts-summary?gaushalaId=<ID>
router.get('/alerts-summary', optionalAuth, dashboardController.getAlertsSummary);

module.exports = router;
