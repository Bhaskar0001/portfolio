const Notice = require('../models/Notice');
const logger = require('../utils/logger');

/**
 * Reconciliation Service
 * Matches Ledger entries from Tally/ERP with Notice demands
 */
class ReconciliationService {
    /**
     * Reconcile batch of ledger entries
     * @param {Array} entries - Parsed ledger rows
     * @param {string} tenantId 
     */
    async reconcile(entries, tenantId) {
        const results = {
            totalProcessed: entries.length,
            matched: 0,
            discrepancies: 0,
            updates: []
        };

        try {
            // Find all non-closed notices for this tenant
            const notices = await Notice.find({
                tenantId,
                status: { $nin: ['Filed', 'Closed'] },
                demandAmount: { $gt: 0 }
            }).populate('clientId', 'name pan');

            for (const notice of notices) {
                // Try to find a match in the entries
                // Criteria: 
                // 1. Amount matches exactly
                // 2. Particulars contains Client PAN or Name
                // 3. Date is after notice issue date (optional check)

                const match = entries.find(entry => {
                    const entryAmount = Math.abs(parseFloat(entry.Amount || entry.Debit || entry.Credit || 0));
                    const particulars = (entry.Particulars || entry.Description || '').toLowerCase();
                    const clientPan = notice.clientId?.pan?.toLowerCase();
                    const clientName = notice.clientId?.name?.toLowerCase();

                    const amountMatches = entryAmount === notice.demandAmount;
                    const panMatches = clientPan && particulars.includes(clientPan);
                    const nameMatches = clientName && particulars.includes(clientName);

                    return amountMatches && (panMatches || nameMatches);
                });

                if (match) {
                    notice.reconciliationStatus = 'Matched';
                    notice.ledgerMatch = {
                        entryId: match.Date + '-' + (match.VchNo || 'N/A'),
                        amount: Math.abs(parseFloat(match.Amount || match.Debit || match.Credit)),
                        date: new Date(match.Date),
                        particulars: match.Particulars || match.Description || '',
                        remarks: 'Auto-matched via Tally Sync'
                    };

                    await notice.save();
                    results.matched++;
                    results.updates.push({
                        noticeId: notice._id,
                        clientName: notice.clientId?.name,
                        amount: notice.demandAmount,
                        status: 'Matched'
                    });
                } else {
                    // Check for near-misses (Amount matches but PAN/Name doesn't)
                    const nearMiss = entries.find(entry => {
                        const entryAmount = Math.abs(parseFloat(entry.Amount || entry.Debit || entry.Credit || 0));
                        return entryAmount === notice.demandAmount;
                    });

                    if (nearMiss) {
                        notice.reconciliationStatus = 'Discrepancy';
                        await notice.save();
                        results.discrepancies++;
                    }
                }
            }

            return results;
        } catch (err) {
            logger.error('Reconciliation Error:', err);
            throw err;
        }
    }
}

module.exports = new ReconciliationService();
