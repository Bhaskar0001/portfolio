const Document = require('../models/Document');
const Notice = require('../models/Notice');
const storageService = require('../services/storage.service');
const auditService = require('../services/audit.service');
const verificationService = require('../services/verification.service');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const { NotFoundError, BadRequestError } = require('../utils/errors');
const crypto = require('crypto');
const fs = require('fs');

const documentController = {
    // GET /api/documents?noticeId=xxx
    async list(req, res, next) {
        try {
            const { page, limit, skip, sort } = parsePagination(req.query);
            const filter = req.tenantFilter();
            if (req.query.noticeId) filter.noticeId = req.query.noticeId;
            if (req.query.category) filter.category = req.query.category;

            const [documents, total] = await Promise.all([
                Document.find(filter)
                    .populate('uploadedBy', 'firstName lastName email')
                    .sort(sort || { createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Document.countDocuments(filter),
            ]);

            res.json({ success: true, ...paginatedResponse(documents, total, { page, limit }) });
        } catch (err) { next(err); }
    },

    // POST /api/documents/presign — get presigned upload URL
    async presignUpload(req, res, next) {
        try {
            const { noticeId, fileName, fileType, fileSize, category, description } = req.body;

            // Verify notice belongs to tenant
            const notice = await Notice.findOne(req.tenantFilter({ _id: noticeId }));
            if (!notice) throw new NotFoundError('Notice not found');

            // Generate unique object key
            const ext = fileName.split('.').pop();
            const objectKey = `${req.tenantId}/${noticeId}/${crypto.randomUUID()}.${ext}`;

            // Create document record (pending upload)
            const doc = await Document.create(req.withTenant({
                noticeId,
                originalName: fileName,
                mimeType: fileType,
                sizeBytes: fileSize,
                category: category || 'SupportingDoc',
                description: description || '',
                storageKey: objectKey,
                storageBucket: process.env.MINIO_BUCKET || 'noticeradar',
                uploadStatus: 'Pending',
                uploadedBy: req.user.userId,
            }));

            // Get presigned URL
            const uploadUrl = await storageService.getUploadUrl(objectKey);

            await auditService.log({
                tenantId: req.tenantId,
                actorId: req.user.userId,
                actorEmail: req.user.email,
                action: 'DOCUMENT_UPLOAD_INIT',
                entityType: 'Document',
                entityId: doc._id,
                metadata: { fileName, noticeId },
                req,
            });

            res.status(201).json({
                success: true,
                data: {
                    document: doc,
                    uploadUrl,
                    objectKey,
                },
            });
        } catch (err) { next(err); }
    },

    // POST /api/documents/:id/complete — mark upload complete
    async completeUpload(req, res, next) {
        try {
            const doc = await Document.findOne(req.tenantFilter({ _id: req.params.id }));
            if (!doc) throw new NotFoundError('Document not found');

            doc.uploadStatus = 'Completed';
            await doc.save();

            res.json({ success: true, data: doc, message: 'Upload confirmed' });
        } catch (err) { next(err); }
    },

    // GET /api/documents/:id/secure-download — get watermarked PDF
    async getSecureDownload(req, res, next) {
        try {
            const Document = require('../models/Document');
            const Tenant = require('../models/Tenant');
            const watermarkService = require('../services/watermark.service');

            const doc = await Document.findOne(req.tenantFilter({ _id: req.params.id }));
            if (!doc) throw new NotFoundError('Document not found');
            
            if (doc._id.toString().endsWith('pdf') || doc.mimeType === 'application/pdf') {
                // 1. Download from storage to buffer
                const pdfBuffer = await storageService.getBuffer(doc.storageKey);

                // 2. Apply watermark
                const tenant = await Tenant.findById(req.tenantId);
                const watermarkText = watermarkService.generateWatermarkText(req.user, tenant);
                const watermarkedBuffer = await watermarkService.applyTextWatermark(pdfBuffer, watermarkText);

                // 3. Send as response
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="SECURE_${doc.originalName}"`);
                return res.send(watermarkedBuffer);
            }

            // Fallback for non-PDFs or failed watermarking
            const downloadUrl = await storageService.getDownloadUrl(doc.storageKey);
            res.redirect(downloadUrl);
        } catch (err) { next(err); }
    },

    // GET /api/documents/:id/download — get presigned download URL
    async getDownloadUrl(req, res, next) {
        try {
            const doc = await Document.findOne(req.tenantFilter({ _id: req.params.id }));
            if (!doc) throw new NotFoundError('Document not found');
            if (doc.uploadStatus !== 'Completed') {
                throw new BadRequestError('Document upload is not complete');
            }

            // Use a short expiry for secure downloads (5 minutes)
            const downloadUrl = await storageService.getDownloadUrl(doc.storageKey, 300);

            res.json({ success: true, data: { downloadUrl, document: doc } });
        } catch (err) { next(err); }
    },

    // DELETE /api/documents/:id
    async remove(req, res, next) {
        try {
            const doc = await Document.findOne(req.tenantFilter({ _id: req.params.id }));
            if (!doc) throw new NotFoundError('Document not found');

            // Delete from storage
            try {
                await storageService.deleteObject(doc.storageKey);
            } catch (err) {
                // Continue even if storage delete fails (object might not exist)
            }

            await Document.deleteOne({ _id: doc._id });

            await auditService.log({
                tenantId: req.tenantId,
                actorId: req.user.userId,
                actorEmail: req.user.email,
                action: 'DOCUMENT_DELETE',
                entityType: 'Document',
                entityId: doc._id,
                metadata: { fileName: doc.originalName },
                req,
            });

            res.json({ success: true, message: 'Document deleted' });
        } catch (err) { next(err); }
    },

    // POST /api/documents/:id/verify — trigger automated KYC verification
    async verify(req, res, next) {
        try {
            const doc = await Document.findOne(req.tenantFilter({ _id: req.params.id }));
            if (!doc) throw new NotFoundError('Document not found');
            if (doc.category !== 'KYC') throw new BadRequestError('Only KYC documents can be verified');

            // 1. Download to temp path
            const downloadUrl = await storageService.getDownloadUrl(doc.storageKey);
            // In a real environment, we'd use axios to download it or minio.fGetObject
            // For this implementation, we assume verificationService handles the temp file logic or we simulate it.
            // Since I don't have a real storage stream here, I'll assume the service logic needs a local path.

            const tempPath = `./uploads/verify_${Date.now()}_${doc.originalName}`;
            // Simulating download (in production we'd use minio client)
            await storageService.downloadToFile(doc.storageKey, tempPath);

            const status = await verificationService.verifyKycDocument(doc._id, tempPath);

            // Cleanup
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

            res.json({ success: true, data: { status }, message: `Verification result: ${status}` });
        } catch (err) { next(err); }
    },

    // POST /api/documents/bundle — bundle multiple docs into a ZIP
    async bundle(req, res, next) {
        try {
            const { name, documentIds } = req.body;
            if (!name || !documentIds || !Array.isArray(documentIds)) {
                throw new BadRequestError('Invalid bundle request');
            }

            await queueDocument({
                type: 'GENERATE_ZIP_PACKET',
                payload: { name, documentIds, tenantId: req.tenantId, userId: req.user.userId }
            });

            res.json({ success: true, message: 'ZIP bundling started in background' });
        } catch (err) { next(err); }
    },
};

module.exports = documentController;
