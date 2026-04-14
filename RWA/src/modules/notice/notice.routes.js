const express = require('express');
const router = express.Router();
const noticeController = require('./notice.controller');
const { verifyJWT, authorizeRoles } = require('../../middleware/auth');

router.use(verifyJWT);

router.post('/', authorizeRoles('ADMIN'), noticeController.createNotice);
router.get('/', noticeController.getNotices);
router.get('/:id', noticeController.getNotice);
router.put('/:id', authorizeRoles('ADMIN'), noticeController.updateNotice);
router.delete('/:id', authorizeRoles('ADMIN'), noticeController.deleteNotice);

module.exports = router;
