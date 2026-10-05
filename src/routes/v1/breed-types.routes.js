const express = require('express');
const BreedType = require('../../models/BreedType');
const checkPermission = require('../../middlewares/checkPermission');
const createCatalogController = require('../../controllers/catalog.controller');

const router = express.Router();
const controller = createCatalogController(
  BreedType,
  'breedName',
  null,
  'Breed type',
);

router.get('/', checkPermission('BREED_TYPE', 'BREED_TYPE_LIST', 'view'), controller.list);
router.post('/', checkPermission('BREED_TYPE', 'BREED_TYPE_LIST', 'add'), controller.create);
router.get('/:id', checkPermission('BREED_TYPE', 'BREED_TYPE_LIST', 'view'), controller.get);
router.post('/:id/update', checkPermission('BREED_TYPE', 'BREED_TYPE_LIST', 'edit'), controller.update);
router.post('/:id/delete', checkPermission('BREED_TYPE', 'BREED_TYPE_LIST', 'delete'), controller.remove);

module.exports = router;