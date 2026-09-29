const express = require('express');
const BreedType = require('../../models/BreedType');
const adminOnly = require('../../middlewares/adminOnly');
const createCatalogController = require('../../controllers/catalog.controller');

const router = express.Router();
const controller = createCatalogController(
  BreedType,
  'breedName',
  null,
  'Breed type',
);

router.use(adminOnly);
router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.get);
router.post('/:id/update', controller.update);
router.post('/:id/delete', controller.remove);

module.exports = router;