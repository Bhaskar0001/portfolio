const express = require('express');
const router = express.Router();
const visitorController = require('./visitor.controller');
const { verifyJWT, authorizeRoles } = require('../../middleware/auth');

router.use(verifyJWT);

router.post('/pre-register', authorizeRoles('RESIDENT'), visitorController.registerVisitor);
router.post('/:id/check-in', authorizeRoles('SECURITY', 'ADMIN'), visitorController.checkIn);
router.post('/:id/check-out', authorizeRoles('SECURITY', 'ADMIN'), visitorController.checkOut);
router.get('/active', authorizeRoles('SECURITY', 'ADMIN'), visitorController.getActiveVisitors);

module.exports = router;
