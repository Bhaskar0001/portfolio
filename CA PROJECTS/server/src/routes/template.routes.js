const express = require('express');
const router = express.Router();
const templateController = require('../controllers/template.controller');
const { authenticate } = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');
const { requirePerm } = require('../middleware/rbac');

router.use(authenticate, tenantIsolation);

router.get('/', templateController.list);
router.get('/:id', templateController.getById);
router.post('/', requirePerm('ADMIN:TEMPLATES'), templateController.create);
router.put('/:id', requirePerm('ADMIN:TEMPLATES'), templateController.update);
router.delete('/:id', requirePerm('ADMIN:TEMPLATES'), templateController.remove);

module.exports = router;
