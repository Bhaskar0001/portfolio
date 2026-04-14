const DocumentRequest = require('../models/DocumentRequest');
const Notice = require('../models/Notice');
const Client = require('../models/Client');
const whatsappService = require('../services/whatsapp.service');
const upload = require('../config/multer');
const path = require('path');

const portalController = {
    /**
     * POST /api/document-requests
     * CA creates a document request for a client linked to a notice
     */
    async create(req, res, next) {
        try {
            const { noticeId, clientId, requestedDocs, message, clientEmail, expiresInDays } = req.body;

            // Validate notice exists
            const notice = await Notice.findOne({ _id: noticeId, tenantId: req.tenantId });
            if (!notice) return res.status(404).json({ success: false, message: 'Notice not found' });

            // Get client name and phone
            const client = await Client.findById(clientId).select('name email phone').lean();

            const docRequest = await DocumentRequest.create({
                tenantId: req.tenantId,
                noticeId,
                clientId,
                createdBy: req.userId,
                requestedDocs: requestedDocs.map(d => ({
                    label: d.label,
                    description: d.description || '',
                    required: d.required !== false
                })),
                message: message || '',
                clientName: client?.name || '',
                clientEmail: clientEmail || client?.email || '',
                expiresAt: expiresInDays
                    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
                    : undefined
            });

            // Generate shareable link
            const portalUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/portal/${docRequest.accessToken}`;

            // Trigger WhatsApp alert to client
            if (client?.phone) {
                const noticeType = notice.department || 'Notice';
                await whatsappService.sendDocumentRequest(client.phone, client.name, noticeType, portalUrl);
            }

            res.status(201).json({
                success: true,
                data: {
                    _id: docRequest._id,
                    accessToken: docRequest.accessToken,
                    portalUrl,
                    status: docRequest.status,
                    expiresAt: docRequest.expiresAt,
                    requestedDocs: docRequest.requestedDocs
                }
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/document-requests
     * List all document requests for the tenant
     */
    async list(req, res, next) {
        try {
            const { status, noticeId } = req.query;
            const filter = { tenantId: req.tenantId };
            if (status) filter.status = status;
            if (noticeId) filter.noticeId = noticeId;

            const requests = await DocumentRequest.find(filter)
                .populate('noticeId', 'din section department assessmentYear')
                .populate('clientId', 'name pan')
                .populate('createdBy', 'firstName lastName')
                .sort({ createdAt: -1 })
                .lean();

            res.json({ success: true, data: requests });
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/document-requests/:id
     * Get a single document request
     */
    async getById(req, res, next) {
        try {
            const docRequest = await DocumentRequest.findOne({
                _id: req.params.id,
                tenantId: req.tenantId
            })
                .populate('noticeId', 'din section department assessmentYear demandAmount')
                .populate('clientId', 'name pan email')
                .populate('createdBy', 'firstName lastName')
                .lean();

            if (!docRequest) return res.status(404).json({ success: false, message: 'Request not found' });

            res.json({ success: true, data: docRequest });
        } catch (error) {
            next(error);
        }
    },

    // ── PUBLIC ROUTES (no auth) ─────────────────────────────

    /**
     * GET /api/portal/:token
     * Client accesses the upload portal via secure link (NO login required)
     */
    async getPortal(req, res, next) {
        try {
            const docRequest = await DocumentRequest.findOne({ accessToken: req.params.token })
                .select('-tenantId -createdBy')
                .lean();

            if (!docRequest) return res.status(404).json({ success: false, message: 'Invalid or expired link' });
            if (docRequest.expiresAt && new Date(docRequest.expiresAt) < new Date()) {
                return res.status(410).json({ success: false, message: 'This link has expired. Please contact your CA.' });
            }

            res.json({
                success: true,
                data: {
                    _id: docRequest._id,
                    clientName: docRequest.clientName,
                    message: docRequest.message,
                    requestedDocs: docRequest.requestedDocs,
                    status: docRequest.status,
                    expiresAt: docRequest.expiresAt
                }
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/portal/:token/upload/:docIndex
     * Client uploads a document to a specific slot (NO login required)
     */
    async uploadDocument(req, res, next) {
        try {
            const docRequest = await DocumentRequest.findOne({ accessToken: req.params.token });
            if (!docRequest) return res.status(404).json({ success: false, message: 'Invalid link' });
            if (docRequest.expiresAt && new Date(docRequest.expiresAt) < new Date()) {
                return res.status(410).json({ success: false, message: 'This link has expired.' });
            }

            const docIndex = parseInt(req.params.docIndex, 10);
            if (isNaN(docIndex) || docIndex < 0 || docIndex >= docRequest.requestedDocs.length) {
                return res.status(400).json({ success: false, message: 'Invalid document index' });
            }

            if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

            // Save file info to the specific slot
            docRequest.requestedDocs[docIndex].uploadedFile = {
                filename: req.file.filename,
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                size: req.file.size,
                uploadedAt: new Date()
            };

            // Recalculate status
            docRequest.recalcStatus();
            await docRequest.save();

            res.json({
                success: true,
                message: 'Document uploaded successfully',
                data: {
                    status: docRequest.status,
                    uploadedDoc: docRequest.requestedDocs[docIndex]
                }
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = portalController;
