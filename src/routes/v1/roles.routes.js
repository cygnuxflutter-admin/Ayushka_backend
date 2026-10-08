const express = require('express');
const Role = require('../../models/Role');
const checkPermission = require('../../middlewares/checkPermission');
const createCatalogController = require('../../controllers/catalog.controller');

const router = express.Router();
const controller = createCatalogController(Role, 'roleName', 'roleId', 'Role', { isRole: true });

router.get('/', checkPermission('ROLE', 'ROLE_LIST', 'view'), controller.list);
router.post('/', checkPermission('ROLE', 'ROLE_LIST', 'add'), controller.create);
router.get('/:id', checkPermission('ROLE', 'ROLE_LIST', 'view'), controller.get);
router.post('/:id/update', checkPermission('ROLE', 'ROLE_LIST', 'edit'), controller.update);
router.post('/:id/delete', checkPermission('ROLE', 'ROLE_LIST', 'delete'), controller.remove);

module.exports = router;