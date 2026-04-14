const Response = require('../models/Response');
const Notice = require('../models/Notice');
const Client = require('../models/Client');
const User = require('../models/User');
const auditService = require('../services/audit.service');
const notificationService = require('../services/notification.service');
const aiService = require('../services/ai.service');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const { queueDocument } = require('../jobs/queue');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/errors');

const responseController = {
    // GET /api/responses?noticeId=xxx
    async list(req, res, next) {
        try {
            const { page, limit, skip, sort } = parsePagination(req.query);
            const filter = req.tenantFilter();
            if (req.query.noticeId) filter.noticeId = req.query.noticeId;
            if (req.query.status) filter.status = req.query.status;

            const [responses, total] = await Promise.all([
                Response.find(filter)
                    .populate('noticeId', 'department section assessmentYear')
                    .populate('draftedBy', 'firstName lastName email')
                    .populate('reviewedBy', 'firstName lastName email')
                    .sort(sort)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Response.countDocuments(filter),
            ]);

            res.json({ success: true, ...paginatedResponse(responses, total, { page, limit }) });
        } catch (err) { next(err); }
    },

    // GET /api/responses/:id
    async getById(req, res, next) {
        try {
            const response = await Response.findOne(req.tenantFilter({ _id: req.params.id }))
                .populate('noticeId')
                .populate('draftedBy', 'firstName lastName email')
                .populate('reviewedBy', 'firstName lastName email')
                .populate('approvedBy', 'firstName lastName email')
                .lean();
            if (!response) throw new NotFoundError('Response not found');
            res.json({ success: true, data: response });
        } catch (err) { next(err); }
    },

    // POST /api/responses
    async create(req, res, next) {
        try {
            // Verify notice belongs to tenant
            const notice = await Notice.findOne(req.tenantFilter({ _id: req.body.noticeId }));
            if (!notice) throw new NotFoundError('Notice not found');

            const response = await Response.create(req.withTenant({
                ...req.body,
                draftedBy: req.user.userId,
                status: 'Draft',
                version: 1,
            }));

            // Update notice status
            if (notice.status === 'New' || notice.status === 'Acknowledged') {
                notice.status = 'InProgress';
                await notice.save();
            }

            await auditService.log({
                tenantId: req.tenantId,
                actorId: req.user.userId,
                actorEmail: req.user.email,
                action: 'RESPONSE_CREATE',
                entityType: 'Response',
                entityId: response._id,
                metadata: { noticeId: notice._id.toString() },
                req,
            });

            res.status(201).json({ success: true, data: response });
        } catch (err) { next(err); }
    },

    // PATCH /api/responses/:id (update draft)
    async update(req, res, next) {
        try {
            const response = await Response.findOne(req.tenantFilter({ _id: req.params.id }));
            if (!response) throw new NotFoundError('Response not found');
            if (response.status !== 'Draft' && response.status !== 'RevisionRequested') {
                throw new BadRequestError('Can only edit drafts or responses needing revision');
            }

            Object.assign(response, req.body);
            response.version += 1;
            await response.save();

            await auditService.log({
                tenantId: req.tenantId,
                actorId: req.user.userId,
                actorEmail: req.user.email,
                action: 'RESPONSE_UPDATE',
                entityType: 'Response',
                entityId: response._id,
                metadata: { version: response.version },
                req,
            });

            res.json({ success: true, data: response });
        } catch (err) { next(err); }
    },

    // POST /api/responses/:id/submit-review
    async submitForReview(req, res, next) {
        try {
            const response = await Response.findOne(req.tenantFilter({ _id: req.params.id }));
            if (!response) throw new NotFoundError('Response not found');
            if (!['Draft', 'RevisionRequested'].includes(response.status)) {
                throw new BadRequestError('Only drafts can be submitted for review');
            }

            response.status = 'InReview';
            response.submittedAt = new Date();
            await response.save();

            // Update notice status
            await Notice.findByIdAndUpdate(response.noticeId, { status: 'ResponseDrafted' });

            await auditService.log({
                tenantId: req.tenantId,
                actorId: req.user.userId,
                actorEmail: req.user.email,
                action: 'RESPONSE_SUBMIT_REVIEW',
                entityType: 'Response',
                entityId: response._id,
                req,
            });

            // Notify Partners/Admins
            const reviewers = await User.find({ tenantId: req.tenantId, roles: { $in: ['Partner', 'Admin'] } });
            for (const reviewer of reviewers) {
                await notificationService.send({
                    tenantId: req.tenantId,
                    userId: reviewer._id,
                    type: 'RESPONSE_UPDATE',
                    title: 'Response for Review',
                    message: `A new response has been submitted for review by ${req.user.firstName}.`,
                    link: `/tools/studio?responseId=${response._id}`,
                    metadata: { responseId: response._id }
                });
            }

            res.json({ success: true, data: response, message: 'Submitted for review' });
        } catch (err) { next(err); }
    },

    // POST /api/responses/:id/reviewer-comment
    async addReviewerComment(req, res, next) {
        try {
            const response = await Response.findOne(req.tenantFilter({ _id: req.params.id }));
            if (!response) throw new NotFoundError('Response not found');

            response.reviewerComments.push({
                reviewerId: req.user.userId,
                comment: req.body.comment,
                createdAt: new Date(),
            });
            await response.save();

            res.json({ success: true, data: response });
        } catch (err) { next(err); }
    },

    // POST /api/responses/:id/approve
    async approve(req, res, next) {
        try {
            const response = await Response.findOne(req.tenantFilter({ _id: req.params.id }));
            if (!response) throw new NotFoundError('Response not found');
            if (response.status !== 'InReview') {
                throw new BadRequestError('Only in-review responses can be approved');
            }

            response.status = 'Approved';
            response.reviewedBy = req.user.userId;
            response.approvedBy = req.user.userId;
            response.approvedAt = new Date();
            await response.save();

            await auditService.log({
                tenantId: req.tenantId,
                actorId: req.user.userId,
                actorEmail: req.user.email,
                action: 'RESPONSE_APPROVE',
                entityType: 'Response',
                entityId: response._id,
                req,
            });

            // Notify Drafter
            await notificationService.send({
                tenantId: req.tenantId,
                userId: response.draftedBy,
                type: 'RESPONSE_UPDATE',
                title: 'Response Approved',
                message: `Your draft has been approved by ${req.user.firstName}.`,
                link: `/tools/studio?responseId=${response._id}`,
                metadata: { responseId: response._id }
            });

            res.json({ success: true, data: response, message: 'Response approved' });
        } catch (err) { next(err); }
    },

    // POST /api/responses/:id/reject
    async reject(req, res, next) {
        try {
            const response = await Response.findOne(req.tenantFilter({ _id: req.params.id }));
            if (!response) throw new NotFoundError('Response not found');
            if (response.status !== 'InReview') {
                throw new BadRequestError('Only in-review responses can be rejected');
            }

            response.status = 'RevisionRequested';
            response.reviewedBy = req.user.userId;
            if (req.body.comment) {
                response.reviewerComments.push({
                    reviewerId: req.user.userId,
                    comment: req.body.comment,
                    createdAt: new Date(),
                });
            }
            await response.save();

            await auditService.log({
                tenantId: req.tenantId,
                actorId: req.user.userId,
                actorEmail: req.user.email,
                action: 'RESPONSE_REJECT',
                entityType: 'Response',
                entityId: response._id,
                req,
            });

            // Notify Drafter
            await notificationService.send({
                tenantId: req.tenantId,
                userId: response.draftedBy,
                type: 'RESPONSE_UPDATE',
                title: 'Revision Requested',
                message: `${req.user.firstName} requested a revision for your draft.`,
                link: `/tools/studio?responseId=${response._id}`,
                metadata: { responseId: response._id }
            });

            res.json({ success: true, data: response, message: 'Revision requested' });
        } catch (err) { next(err); }
    },

    // POST /api/responses/:id/generate-pdf
    async generatePdf(req, res, next) {
        try {
            const response = await Response.findOne(req.tenantFilter({ _id: req.params.id }))
                .populate('noticeId')
                .populate('draftedBy', 'firstName lastName');
            if (!response) throw new NotFoundError('Response not found');

            const isDraft = !['Approved', 'Filed'].includes(response.status);

            // Generate PDF HTML
            const html = generateResponsePdfHtml(response);

            // Actual Puppeteer PDF generation queued in background
            await queueDocument({
                type: 'GENERATE_RESPONSE_PDF',
                payload: {
                    responseId: response._id,
                    html,
                    tenantId: req.tenantId,
                    watermark: isDraft ? 'DRAFT - NOT FOR FILING' : null
                }
            });

            res.json({
                success: true,
                data: { html },
                message: 'PDF preview generated'
            });
        } catch (err) { next(err); }
    },

    // POST /api/responses/:id/mark-filed
    async markFiled(req, res, next) {
        try {
            const response = await Response.findOne(req.tenantFilter({ _id: req.params.id }));
            if (!response) throw new NotFoundError('Response not found');
            if (response.status !== 'Approved') {
                throw new BadRequestError('Only approved responses can be marked as filed');
            }

            response.status = 'Filed';
            response.filedAt = new Date();
            response.filingDetails = {
                filedDate: req.body.filedDate ? new Date(req.body.filedDate) : new Date(),
                acknowledgementNo: req.body.acknowledgementNo || '',
                filingMode: req.body.filingMode || 'Online',
                notes: req.body.notes || '',
            };
            await response.save();

            // Update notice status to Filed
            await Notice.findByIdAndUpdate(response.noticeId, { status: 'Filed' });

            await auditService.log({
                tenantId: req.tenantId,
                actorId: req.user.userId,
                actorEmail: req.user.email,
                action: 'RESPONSE_FILED',
                entityType: 'Response',
                entityId: response._id,
                metadata: { acknowledgementNo: req.body.acknowledgementNo },
                req,
            });

            res.json({ success: true, data: response, message: 'Response marked as filed' });
        } catch (err) { next(err); }
    },

    // POST /api/responses/ai-draft
    async generateAiDraft(req, res, next) {
        try {
            const { noticeId, customInstructions } = req.body;

            const notice = await Notice.findOne(req.tenantFilter({ _id: noticeId }));
            if (!notice) throw new NotFoundError('Notice not found');

            const client = await Client.findById(notice.clientId);
            if (!client) throw new NotFoundError('Client not linked to this notice. Please link it first.');

            const draftBody = await aiService.generateResponseDraft(notice, client, customInstructions);

            res.json({
                success: true,
                data: {
                    body: draftBody,
                    subject: `Response to ${notice.department} Notice - ${notice.din || notice._id}`,
                }
            });
        } catch (err) { next(err); }
    },

    // DELETE /api/responses/:id
    async delete(req, res, next) {
        try {
            const response = await Response.findOne({ _id: req.params.id, tenantId: req.tenantId });
            if (!response) {
                throw new NotFoundError('Response not found');
            }

            await response.deleteOne();

            // Audit
            await auditService.log({
                userId: req.user._id,
                tenantId: req.tenantId,
                action: 'RESPONSE:DELETE',
                resource: 'Response',
                resourceId: response._id,
                details: { status: response.status }
            });

            res.status(200).json({
                success: true,
                message: 'Response deleted successfully'
            });
        } catch (err) {
            next(err);
        }
    }
};

// ── PDF HTML Template ─────────────────────────────────
function generateResponsePdfHtml(response) {
    const notice = response.noticeId || {};
    const letterhead = response.letterhead || {};
    const drafter = response.draftedBy || {};

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', serif; font-size: 12pt; line-height: 1.8; color: #1a1a1a; padding: 40px 60px; }
    .letterhead { text-align: center; border-bottom: 2px solid #2563EB; padding-bottom: 16px; margin-bottom: 24px; }
    .firm-name { font-size: 18pt; font-weight: 700; color: #1E40AF; }
    .firm-details { font-size: 9pt; color: #555; margin-top: 4px; }
    .ref-block { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 10pt; color: #444; }
    .to-block { margin-bottom: 20px; }
    .to-block strong { display: block; margin-bottom: 4px; }
    .subject-line { font-weight: 600; margin-bottom: 16px; font-size: 11pt; }
    .body-content { margin-bottom: 24px; text-align: justify; }
    .signature { margin-top: 40px; }
    .signature .name { font-weight: 600; }
    .footer { margin-top: 40px; font-size: 8pt; color: #999; text-align: center; border-top: 1px solid #ddd; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="letterhead">
    <div class="firm-name">${letterhead.firmName || 'CA Firm Name'}</div>
    <div class="firm-details">
      ${letterhead.firmAddress || ''} ${letterhead.firmPhone ? '| Ph: ' + letterhead.firmPhone : ''} ${letterhead.firmEmail ? '| ' + letterhead.firmEmail : ''}
      ${letterhead.firmGSTIN ? '<br>GSTIN: ' + letterhead.firmGSTIN : ''}
    </div>
  </div>

  <div class="ref-block">
    <div>
      <strong>Ref:</strong> ${notice.din || 'N/A'}<br>
      <strong>Section:</strong> ${notice.section || 'N/A'}<br>
      <strong>AY:</strong> ${notice.assessmentYear || 'N/A'}
    </div>
    <div>
      <strong>Date:</strong> ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
    </div>
  </div>

  <div class="to-block">
    <strong>To,</strong>
    The Income Tax Officer / GST Commissioner<br>
    (As per the notice)
  </div>

  ${response.subject ? `<div class="subject-line">Sub: ${response.subject}</div>` : ''}

  <div class="body-content">
    ${response.body}
  </div>

  <div class="signature">
    <p>Yours faithfully,</p>
    <br><br>
    <p class="name">${drafter.firstName || ''} ${drafter.lastName || ''}</p>
    <p>${letterhead.firmName || ''}</p>
  </div>

  <div class="footer">
    Generated by NoticeRadar Enterprise | ${new Date().toISOString()}
  </div>
</body>
</html>`;
}

module.exports = responseController;
