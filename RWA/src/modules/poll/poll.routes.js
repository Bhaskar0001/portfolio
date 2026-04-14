const express = require('express');
const router = express.Router();
const pollController = require('./poll.controller');
const { verifyJWT, authorizeRoles } = require('../../middleware/auth');

router.use(verifyJWT);

router.get('/', pollController.getPolls);
router.post('/', authorizeRoles('ADMIN'), pollController.createPoll);
router.post('/:id/vote', pollController.vote);

module.exports = router;
