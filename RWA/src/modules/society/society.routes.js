const express = require('express');
const router = express.Router();
const societyController = require('./society.controller');
const { verifyJWT, authorizeRoles } = require('../../middleware/auth');

// All society routes require login
router.use(verifyJWT);

router.post('/', authorizeRoles('ADMIN'), societyController.createSociety);
router.get('/:id', societyController.getSociety);
router.put('/:id', authorizeRoles('ADMIN'), societyController.updateSociety);
router.post('/:id/blocks', authorizeRoles('ADMIN'), societyController.addBlock);

module.exports = router;
