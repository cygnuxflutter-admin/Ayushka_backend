const express = require('express');
const Shed = require('../../models/Shed');
const checkPermission = require('../../middlewares/checkPermission');
const createCatalogController = require('../../controllers/catalog.controller');

const router = express.Router();
const controller = createCatalogController(
  Shed,
  ['gaushalaId', 'shedName', 'shedNumber'],
  null,
  'Shed',
);

// Read endpoints (Parent: /api/v1/sheds)
router.get('/', checkPermission('SHED', 'SHED_LIST', 'view'), controller.list);
router.get('/:id', checkPermission('SHED', 'SHED_LIST', 'view'), controller.get);

// Write endpoints (Parent: /api/v1/sheds)
router.post('/', checkPermission('SHED', 'SHED_LIST', 'add'), controller.create);
router.post('/:id/update', checkPermission('SHED', 'SHED_LIST', 'edit'), controller.update);
router.post('/:id/delete', checkPermission('SHED', 'SHED_LIST', 'delete'), controller.remove);

module.exports = router;