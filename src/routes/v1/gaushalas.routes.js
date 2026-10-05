const express = require('express');
const Gaushala = require('../../models/Gaushala');
const checkPermission = require('../../middlewares/checkPermission');
const createCatalogController = require('../../controllers/catalog.controller');

const router = express.Router();
const controller = createCatalogController(
  Gaushala,
  'gaushalaName',
  'gaushalaId',
  'Gaushala',
);

router.get('/', checkPermission('GAUSHALA', 'GAUSHALA_LIST', 'view'), controller.list);
router.post('/', checkPermission('GAUSHALA', 'GAUSHALA_LIST', 'add'), controller.create);
router.get('/:id', checkPermission('GAUSHALA', 'GAUSHALA_LIST', 'view'), controller.get);
router.post('/:id/update', checkPermission('GAUSHALA', 'GAUSHALA_LIST', 'edit'), controller.update);
router.post('/:id/delete', checkPermission('GAUSHALA', 'GAUSHALA_LIST', 'delete'), controller.remove);

module.exports = router;