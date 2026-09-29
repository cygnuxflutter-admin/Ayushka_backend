const express = require('express');
const Shed = require('../../models/Shed');
const adminOnly = require('../../middlewares/adminOnly');
const createCatalogController = require('../../controllers/catalog.controller');

const router = express.Router();
const controller = createCatalogController(
  Shed,
  ['shedName', 'shedNumber'],
  null,
  'Shed',
);

router.use(adminOnly);
router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.get);
router.post('/:id/update', controller.update);
router.post('/:id/delete', controller.remove);

module.exports = router;