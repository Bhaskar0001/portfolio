const express = require('express');
const router = express.Router();
const flatController = require('./flat.controller');
const { verifyJWT, authorizeRoles } = require('../../middleware/auth');

router.use(verifyJWT);

// Special routes first
router.get('/my/parking', flatController.getMyParking);
router.get('/search-vehicle', flatController.searchVehicle);

// Standard CRUD
router.post('/', authorizeRoles('ADMIN'), flatController.createFlat);
router.get('/', flatController.getFlats);
router.get('/:id', flatController.getFlat);
router.put('/:id', authorizeRoles('ADMIN'), flatController.updateFlat);
router.put('/:id/assign', authorizeRoles('ADMIN'), flatController.assignResident);

module.exports = router;
