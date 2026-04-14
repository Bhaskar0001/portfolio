const itdService = require('../services/itd.service');
const gstnService = require('../services/gstn.service');
const auditService = require('../services/audit.service');
const { BadRequestError } = require('../utils/errors');

const integrationController = {
    // POST /api/integrations/itd/sync
    async syncItd(req, res, next) {
        try {
            const { pan, clientId } = req.body;
            if (!pan) throw new BadRequestError('PAN is required');

            const result = await itdService.syncNotices(pan, {
                tenantId: req.tenantId,
                clientId: clientId
            });

            await auditService.log({
                tenantId: req.tenantId,
                actorId: req.user.userId,
                action: 'ITD_SYNC_TRIGGERED',
                entityType: 'Client',
                entityId: clientId || pan,
                metadata: result,
                req
            });

            res.json(result);
        } catch (err) { next(err); }
    },

    // POST /api/integrations/gstn/sync
    async syncGstn(req, res, next) {
        try {
            const { gstin, clientId } = req.body;
            if (!gstin) throw new BadRequestError('GSTIN is required');

            const result = await gstnService.syncNotices(gstin, {
                tenantId: req.tenantId,
                clientId: clientId
            });

            await auditService.log({
                tenantId: req.tenantId,
                actorId: req.user.userId,
                action: 'GSTN_SYNC_TRIGGERED',
                entityType: 'Client',
                entityId: clientId || gstin,
                metadata: result,
                req
            });

            res.json(result);
        } catch (err) { next(err); }
    },

    // GET /api/integrations/verify-pan/:pan
    async verifyPan(req, res, next) {
        try {
            const result = await itdService.verifyPan(req.params.pan);
            res.json(result);
        } catch (err) { next(err); }
    }
};

module.exports = integrationController;
