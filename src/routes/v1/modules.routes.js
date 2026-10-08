const express = require('express');
const moduleController = require('../../controllers/module.controller');
const auth = require('../../middlewares/auth');
const adminOnly = require('../../middlewares/adminOnly');

const router = express.Router();

// Read endpoints (Available to authenticated users / admin)
router.get('/', auth, moduleController.getModules);
router.get('/:id', auth, moduleController.getModuleById);

// Write endpoints (Admin only)
router.post('/bulk', adminOnly, moduleController.bulkCreateModules);
router.post('/', adminOnly, moduleController.createModule);
router.put('/:id', adminOnly, moduleController.updateModule);
router.post('/:id/update', adminOnly, moduleController.updateModule);
router.delete('/:id', adminOnly, moduleController.deleteModule);
router.post('/:id/delete', adminOnly, moduleController.deleteModule);

// Sub-module management endpoints (Admin only)
router.post('/:id/submodules', adminOnly, moduleController.addSubModule);
router.post('/:id/submodules/:subModuleCode/delete', adminOnly, moduleController.removeSubModule);

module.exports = router;
