const express = require('express');
const Type = require('../../models/Type');
const checkPermission = require('../../middlewares/checkPermission');
const createCatalogController = require('../../controllers/catalog.controller');

const router = express.Router();
const controller = createCatalogController(
  Type,
  ['gaushalaId', 'typeName'],
  null,
  'Type',
  { requireGaushala: true },
);

router.get('/', checkPermission('TYPE', 'TYPE_LIST', 'view'), controller.list);
router.post('/', checkPermission('TYPE', 'TYPE_LIST', 'add'), controller.create);
router.get('/:id', checkPermission('TYPE', 'TYPE_LIST', 'view'), controller.get);
router.post('/:id/update', checkPermission('TYPE', 'TYPE_LIST', 'edit'), controller.update);
router.post('/:id/delete', checkPermission('TYPE', 'TYPE_LIST', 'delete'), controller.remove);

module.exports = router;