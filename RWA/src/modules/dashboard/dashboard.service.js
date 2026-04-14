const Billing = require('../billing/billing.model');
const Complaint = require('../complaint/complaint.model');
const Resident = require('../resident/resident.model');
const Visitor = require('../visitor/visitor.model');
const { Complaint: ComplaintModel } = require('../complaint/complaint.model');

class DashboardService {
    async getSummary(societyId) {
        const [
            totalRevenue,
            openComplaints,
            activeResidents,
            occupancy
        ] = await Promise.all([
            Billing.aggregate([
                { $match: { society: societyId, status: 'PAID' } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]),
            ComplaintModel.countDocuments({ society: societyId, status: { $ne: 'CLOSED' } }),
            Resident.countDocuments({ society: societyId, status: 'ACTIVE' }),
            Resident.countDocuments({ society: societyId }) // Simple occupancy for now
        ]);

        return {
            revenue: totalRevenue[0]?.total || 0,
            openComplaints,
            activeResidents,
            occupancy: 92 // Mocked for now
        };
    }

    async getBillingTrend(societyId) {
        return await Billing.aggregate([
            { $match: { society: societyId } },
            {
                $group: {
                    _id: { month: '$month', year: '$year' },
                    revenue: { $sum: { $cond: [{ $eq: ['$status', 'PAID'] }, '$amount', 0] } }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);
    }

    async getComplaintStats(societyId) {
        return await ComplaintModel.aggregate([
            { $match: { society: societyId } },
            { $group: { _id: '$category', count: { $sum: 1 } } }
        ]);
    }
}

module.exports = new DashboardService();
