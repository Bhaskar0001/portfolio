const Notice = require('../models/Notice');
const Client = require('../models/Client');
const mongoose = require('mongoose');

/**
 * Get high-level analytics for the dashboard
 */
exports.getDashboardStats = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;

        // 1. Total Demand at Risk (Sum of demandAmount for all non-resolved notices)
        const demandStats = await Notice.aggregate([
            { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), status: { $ne: 'Resolved' } } },
            { $group: { _id: null, totalDemand: { $sum: '$demandAmount' }, count: { $sum: 1 } } }
        ]);

        // 2. Status Distribution
        const statusStats = await Notice.aggregate([
            { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        // 3. Department Breakdown
        const deptStats = await Notice.aggregate([
            { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
            { $group: { _id: '$department', count: { $sum: 1 } } }
        ]);

        // 4. Monthly Trend (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        const monthlyStats = await Notice.aggregate([
            { 
                $match: { 
                    tenantId: new mongoose.Types.ObjectId(tenantId),
                    receivedDate: { $gte: sixMonthsAgo }
                } 
            },
            {
                $group: {
                    _id: {
                        month: { $month: '$receivedDate' },
                        year: { $year: '$receivedDate' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // 5. Client Risk Heatmap (Top 5 clients by notice count)
        const clientStats = await Notice.aggregate([
            { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
            { $group: { _id: '$clientId', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'clients',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'clientInfo'
                }
            },
            { $unwind: '$clientInfo' },
            {
                $project: {
                    name: '$clientInfo.name',
                    count: 1,
                    pan: '$clientInfo.pan'
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                summary: demandStats[0] || { totalDemand: 0, count: 0 },
                statusDistribution: statusStats,
                departmentBreakdown: deptStats,
                monthlyTrend: monthlyStats,
                topClients: clientStats
            }
        });
    } catch (err) {
        console.error('Analytics error:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
    }
};
