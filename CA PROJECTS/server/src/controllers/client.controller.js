const Client = require('../models/Client');
const Notice = require('../models/Notice');
const auditService = require('../services/audit.service');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const { NotFoundError } = require('../utils/errors');

const clientController = {
    // GET /api/clients
    async list(req, res, next) {
        try {
            const { page, limit, skip, sort } = parsePagination(req.query);
            const filter = req.tenantFilter();

            if (req.query.search) {
                filter.$or = [
                    { name: { $regex: req.query.search, $options: 'i' } },
                    { pan: { $regex: req.query.search, $options: 'i' } },
                ];
            }
            if (req.query.status) filter.status = req.query.status;
            if (req.query.entityType) filter.entityType = req.query.entityType;

            const [clients, total] = await Promise.all([
                Client.find(filter).sort(sort).skip(skip).limit(limit).lean(),
                Client.countDocuments(filter),
            ]);

            res.json({ success: true, ...paginatedResponse(clients, total, { page, limit }) });
        } catch (err) { next(err); }
    },

    // GET /api/clients/:id
    async getById(req, res, next) {
        try {
            const client = await Client.findOne(req.tenantFilter({ _id: req.params.id })).lean();
            if (!client) throw new NotFoundError('Client not found');

            // Get notice count for this client
            const noticeCount = await Notice.countDocuments(req.tenantFilter({ clientId: client._id }));

            res.json({ success: true, data: { ...client, noticeCount } });
        } catch (err) { next(err); }
    },

    // POST /api/clients
    async create(req, res, next) {
        try {
            const client = await Client.create(req.withTenant({
                ...req.body,
                createdBy: req.user.userId,
            }));

            await auditService.log({
                tenantId: req.tenantId,
                actorId: req.user.userId,
                actorEmail: req.user.email,
                action: 'CLIENT_CREATE',
                entityType: 'Client',
                entityId: client._id,
                metadata: { name: client.name, pan: client.pan },
                req,
            });

            res.status(201).json({ success: true, data: client });
        } catch (err) { next(err); }
    },

    // PUT /api/clients/:id
    async update(req, res, next) {
        try {
            const client = await Client.findOneAndUpdate(
                req.tenantFilter({ _id: req.params.id }),
                { $set: req.body },
                { new: true, runValidators: true }
            );
            if (!client) throw new NotFoundError('Client not found');

            await auditService.log({
                tenantId: req.tenantId,
                actorId: req.user.userId,
                actorEmail: req.user.email,
                action: 'CLIENT_UPDATE',
                entityType: 'Client',
                entityId: client._id,
                metadata: { changes: Object.keys(req.body) },
                req,
            });

            res.json({ success: true, data: client });
        } catch (err) { next(err); }
    },

    // DELETE /api/clients/:id (soft delete — set inactive)
    async remove(req, res, next) {
        try {
            const client = await Client.findOneAndUpdate(
                req.tenantFilter({ _id: req.params.id }),
                { $set: { status: 'inactive' } },
                { new: true }
            );
            if (!client) throw new NotFoundError('Client not found');

            await auditService.log({
                tenantId: req.tenantId,
                actorId: req.user.userId,
                actorEmail: req.user.email,
                action: 'CLIENT_DELETE',
                entityType: 'Client',
                entityId: client._id,
                req,
            });

            res.json({ success: true, message: 'Client deactivated' });
        } catch (err) { next(err); }
    },

    // POST /api/clients/bulk
    async bulkImport(req, res, next) {
        try {
            const { clients } = req.body;
            if (!Array.isArray(clients)) throw new BadRequestError('Invalid data format');

            const results = { imported: 0, skipped: 0, errors: [] };

            for (const clientData of clients) {
                try {
                    // Check if PAN already exists for this tenant
                    const existing = await Client.findOne({
                        tenantId: req.tenantId,
                        pan: clientData.pan.toUpperCase()
                    });

                    if (existing) {
                        results.skipped++;
                        continue;
                    }

                    await Client.create(req.withTenant({
                        ...clientData,
                        createdBy: req.user.userId
                    }));
                    results.imported++;
                } catch (err) {
                    results.errors.push({ pan: clientData.pan, error: err.message });
                }
            }

            await auditService.log({
                tenantId: req.tenantId,
                actorId: req.user.userId,
                actorEmail: req.user.email,
                action: 'CLIENT_BULK_IMPORT',
                entityType: 'Client',
                metadata: { imported: results.imported, skipped: results.skipped },
                req,
            });

            res.json({ success: true, data: results });
        } catch (err) { next(err); }
    },

    // POST /api/clients/:id/it-portal-credentials
    async updateItPortalCredentials(req, res, next) {
        try {
            const { username, password } = req.body;
            if (!username || !password) {
                return res.status(400).json({ success: false, message: 'Username and password are required' });
            }

            const { encrypt } = require('../utils/crypto');
            
            const client = await Client.findOneAndUpdate(
                req.tenantFilter({ _id: req.params.id }),
                { 
                    $set: { 
                        'itPortal.username': username,
                        'itPortal.password': encrypt(password),
                        'itPortal.status': 'Pending', // Will be updated by RPA service
                        'itPortal.lastSync': null
                    } 
                },
                { new: true }
            );

            if (!client) throw new NotFoundError('Client not found');

            await auditService.log({
                tenantId: req.tenantId,
                actorId: req.user.userId,
                actorEmail: req.user.email,
                action: 'CLIENT_IT_PORTAL_CREDENTIALS_UPDATE',
                entityType: 'Client',
                entityId: client._id,
                metadata: { username }, // Never log passwords
                req,
            });

            res.json({ success: true, message: 'IT Portal credentials updated successfully', data: { status: client.itPortal.status } });
        } catch (err) { next(err); }
    },
};

module.exports = clientController;
