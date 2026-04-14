const express = require('express');
const router = express.Router();
const helpController = require('./daily-help.controller');
const { verifyJWT } = require('../../middleware/auth');

router.use(verifyJWT);

router.get('/', helpController.getMyHelp);
router.post('/', helpController.registerHelp);
router.patch('/:id/status', helpController.updateStatus);

module.exports = router;
