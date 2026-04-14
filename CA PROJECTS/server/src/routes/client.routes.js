const express = require('express');
const router = express.Router();
const clientController = require('../controllers/client.controller');
const { authenticate } = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');
const { requirePerm } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const { createClientSchema, updateClientSchema } = require('../validators/client.validator');

// All routes require auth + tenant
router.use(authenticate, tenantIsolation);

router.get('/', requirePerm('CLIENT:READ'), clientController.list);
router.get('/:id', requirePerm('CLIENT:READ'), clientController.getById);
router.post('/', requirePerm('CLIENT:WRITE'), validate(createClientSchema), clientController.create);
router.post('/bulk', requirePerm('CLIENT:WRITE'), clientController.bulkImport);
router.post('/:id/it-portal-credentials', requirePerm('CLIENT:WRITE'), clientController.updateItPortalCredentials);
router.delete('/:id', requirePerm('CLIENT:DELETE'), clientController.remove);

module.exports = router;
