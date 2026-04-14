const express = require('express');
const router = express.Router();
const residentController = require('./resident.controller');
const { verifyJWT, authorizeRoles } = require('../../middleware/auth');

router.use(verifyJWT);

router.post('/', authorizeRoles('ADMIN'), residentController.createResident);
router.get('/', authorizeRoles('ADMIN', 'RESIDENT'), residentController.getResidents);
router.get('/:id', authorizeRoles('ADMIN', 'RESIDENT'), residentController.getResident);
router.put('/:id', authorizeRoles('ADMIN', 'RESIDENT'), residentController.updateResident);
router.put('/:id/move-out', authorizeRoles('ADMIN'), residentController.moveOut);
router.post('/:id/vehicles', authorizeRoles('ADMIN', 'RESIDENT'), residentController.addVehicle);
router.delete('/:id/vehicles/:vid', authorizeRoles('ADMIN', 'RESIDENT'), residentController.removeVehicle);

module.exports = router;
