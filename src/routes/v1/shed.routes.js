const express = require('express');
const Shed = require('../../models/Shed');
const adminOnly = require('../../middlewares/adminOnly');
const optionalAuth = require('../../middlewares/optionalAuth');
const createCatalogController = require('../../controllers/catalog.controller');

const router = express.Router();
const controller = createCatalogController(
  Shed,
  ['gaushalaId', 'shedName', 'shedNumber'],
  null,
  'Shed',
);


// Read endpoints (Parent: /api/v1/sheds)
router.get('/', optionalAuth, controller.list);
router.get('/:id', optionalAuth, controller.get);

// Write endpoints (Parent: /api/v1/sheds)
router.post('/', adminOnly, controller.create);
router.post('/:id/update', adminOnly, controller.update);
router.post('/:id/delete', adminOnly, controller.remove);

module.exports = router;