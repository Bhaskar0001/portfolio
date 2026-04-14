const Template = require('../models/Template');
const auditService = require('../services/audit.service');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const { NotFoundError } = require('../utils/errors');

const templateController = {
    // GET /api/templates
    async list(req, res, next) {
        try {
            const { page, limit, skip, sort } = parsePagination(req.query);
            const filter = req.tenantFilter();

            if (req.query.department) filter.department = req.query.department;
            if (req.query.status) filter.status = req.query.status;
            if (req.query.search) {
                filter.$text = { $search: req.query.search };
            }

            const [templates, total] = await Promise.all([
                Template.find(filter)
                    .sort(sort || { createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Template.countDocuments(filter)
            ]);

            res.json({
                success: true,
                ...paginatedResponse(templates, total, { page, limit })
            });
        } catch (err) {
            next(err);
        }
    },

    // GET /api/templates/:id
    async getById(req, res, next) {
        try {
            const template = await Template.findOne(req.tenantFilter({ _id: req.params.id })).lean();
            if (!template) throw new NotFoundError('Template not found');
            res.json({ success: true, data: template });
        } catch (err) {
            next(err);
        }
    },

    // POST /api/templates
    async create(req, res, next) {
        try {
            const template = await Template.create(req.withTenant({
                ...req.body,
                createdBy: req.user.userId
            }));

            await auditService.log({
                tenantId: req.tenantId,
                actorId: req.user.userId,
                actorEmail: req.user.email,
                action: 'TEMPLATE_CREATE',
                entityType: 'Template',
                entityId: template._id,
                metadata: { name: template.name },
                req
            });

            res.status(201).json({ success: true, data: template });
        } catch (err) {
            next(err);
        }
    },

    // PUT /api/templates/:id
    async update(req, res, next) {
        try {
            const template = await Template.findOneAndUpdate(
                req.tenantFilter({ _id: req.params.id }),
                { ...req.body },
                { new: true, runValidators: true }
            );

            if (!template) throw new NotFoundError('Template not found');

            await auditService.log({
                tenantId: req.tenantId,
                actorId: req.user.userId,
                actorEmail: req.user.email,
                action: 'TEMPLATE_UPDATE',
                entityType: 'Template',
                entityId: template._id,
                metadata: { name: template.name },
                req
            });

            res.json({ success: true, data: template });
        } catch (err) {
            next(err);
        }
    },

    // DELETE /api/templates/:id
    async remove(req, res, next) {
        try {
            const template = await Template.findOneAndDelete(req.tenantFilter({ _id: req.params.id }));
            if (!template) throw new NotFoundError('Template not found');

            await auditService.log({
                tenantId: req.tenantId,
                actorId: req.user.userId,
                actorEmail: req.user.email,
                action: 'TEMPLATE_DELETE',
                entityType: 'Template',
                entityId: template._id,
                metadata: { name: template.name },
                req
            });

            res.json({ success: true, message: 'Template deleted' });
        } catch (err) {
            next(err);
        }
    }
};

module.exports = templateController;
