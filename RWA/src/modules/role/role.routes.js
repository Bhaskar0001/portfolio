const express = require('express');
const router = express.Router();
const roleService = require('./role.service');
const { protect, authorize } = require('../../middleware/auth');

router.use(protect);
router.use(authorize('ADMIN'));

router.post('/', async (req, res) => {
    try {
        const role = await roleService.createRole({ ...req.body, society: req.user.society });
        res.status(201).json({ success: true, data: role });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const roles = await roleService.getSocietyRoles(req.user.society);
        res.json({ success: true, data: roles });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

router.patch('/:id', async (req, res) => {
    try {
        const role = await roleService.updateRole(req.params.id, req.body);
        res.json({ success: true, data: role });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

module.exports = router;
