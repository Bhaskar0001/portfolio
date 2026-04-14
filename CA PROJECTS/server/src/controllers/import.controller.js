const xlsx = require('xlsx');
const reconciliationService = require('../services/reconciliation.service');
const logger = require('../utils/logger');
const fs = require('fs');

const importController = {
    /**
     * POST /api/import/ledger
     * Upload and reconcile Tally ledger
     */
    async importLedger(req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).json({ success: false, message: 'No file uploaded' });
            }

            // Read the file
            const workbook = xlsx.readFile(req.file.path);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Convert to JSON
            const data = xlsx.utils.sheet_to_json(worksheet);

            if (data.length === 0) {
                return res.status(400).json({ success: false, message: 'File is empty or invalid format' });
            }

            logger.info(`Processing ledger import: ${data.length} rows for Tenant: ${req.tenantId}`);

            // Run reconciliation
            const results = await reconciliationService.reconcile(data, req.tenantId);

            // Clean up the temporary file
            fs.unlinkSync(req.file.path);

            res.json({
                success: true,
                message: 'Ledger processed successfully',
                data: results
            });

        } catch (error) {
            logger.error('Import Error:', error);
            // Ensure file is deleted even on error if it exists
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            next(error);
        }
    }
};

module.exports = importController;
