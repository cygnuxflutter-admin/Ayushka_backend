const express = require('express');
const Type = require('../../models/Type');
const adminOnly = require('../../middlewares/adminOnly');
const createCatalogController = require('../../controllers/catalog.controller');

const router = express.Router();
const controller = createCatalogController(Type, 'typeName', null, 'Type');

router.use(adminOnly);
router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.get);
router.post('/:id/update', controller.update);
router.post('/:id/delete', controller.remove);

module.exports = router;