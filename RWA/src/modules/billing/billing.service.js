const { MaintenanceCharge, Bill } = require('./billing.model');
const Flat = require('../flat/flat.model');
const Resident = require('../resident/resident.model');
const NotificationService = require('../notification/notification.service');
const ApiError = require('../../utils/ApiError');

// ─── Config ─────────────────────────────────────────────

const setConfig = async (data) => {
    const existing = await MaintenanceCharge.findOne({ society: data.society });
    if (existing) {
        Object.assign(existing, data);
        await existing.save();
        return existing;
    }
    return await MaintenanceCharge.create(data);
};

const getConfig = async (societyId) => {
    const config = await MaintenanceCharge.findOne({ society: societyId });
    if (!config) {
        throw new ApiError(404, 'Billing config not set for this society');
    }
    return config;
};

// ─── Bill Generation ────────────────────────────────────

const generateBills = async (societyId, month, year) => {
    const config = await MaintenanceCharge.findOne({ society: societyId });
    if (!config) {
        throw new ApiError(400, 'Set billing config before generating bills');
    }

    // Get all occupied flats
    const flats = await Flat.find({ society: societyId, isOccupied: true })
        .populate('owner');

    if (flats.length === 0) {
        throw new ApiError(400, 'No occupied flats found in this society');
    }

    const bills = [];
    const errors = [];

    for (const flat of flats) {
        // Check for duplicate
        const existing = await Bill.findOne({ flat: flat._id, month, year });
        if (existing) {
            errors.push(`Bill already exists for flat ${flat.flatNumber} (${flat.block})`);
            continue;
        }

        // Find charge for flat type
        const chargeConfig = config.charges.find(c => c.flatType === flat.type);
        if (!chargeConfig) {
            errors.push(`No charge configured for flat type ${flat.type} (${flat.flatNumber})`);
            continue;
        }

        // Find owner resident
        const owner = await Resident.findOne({
            flat: flat._id,
            type: 'OWNER',
            isActive: true
        });

        const dueDate = new Date(year, month - 1, config.dueDay);
        const billNumber = `BILL-${year}-${String(month).padStart(2, '0')}-${flat.block}-${flat.flatNumber}`;

        const bill = await Bill.create({
            society: societyId,
            flat: flat._id,
            resident: owner ? owner._id : null,
            billNumber,
            month,
            year,
            amount: chargeConfig.amount,
            lateFee: 0,
            totalAmount: chargeConfig.amount,
            paidAmount: 0,
            balance: chargeConfig.amount,
            status: 'PENDING',
            dueDate,
            payments: []
        });
        bills.push(bill);

        // Notify Resident
        if (owner) {
            await NotificationService.create({
                userId: owner.user,
                society: societyId,
                title: 'New Maintenance Bill',
                body: `Bill of ₹${bill.amount} generated for ${month}/${year}. Due by ${config.dueDay}th.`,
                type: 'BILLING',
                data: { billId: bill._id }
            });
        }
    }

    return { generated: bills.length, bills, errors };
};

// ─── Get Bills ──────────────────────────────────────────

const getBills = async (reqQuery) => {
    const { page = 1, limit = 10, society, status, month, year } = reqQuery;
    const query = {};
    if (society) query.society = society;
    if (status) query.status = status;
    if (month) query.month = Number(month);
    if (year) query.year = Number(year);

    const skip = (page - 1) * limit;

    const bills = await Bill.find(query)
        .populate('flat', 'flatNumber block floor')
        .populate('resident', 'user')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

    const total = await Bill.countDocuments(query);

    return {
        bills,
        total,
        pages: Math.ceil(total / limit),
        currentPage: Number(page)
    };
};

const getBillById = async (id) => {
    const bill = await Bill.findById(id)
        .populate('flat', 'flatNumber block floor type')
        .populate('resident')
        .populate('payments.receivedBy', 'name');
    if (!bill) {
        throw new ApiError(404, 'Bill not found');
    }

    // Dynamic late fee calculation
    await calculateLateFee(bill);

    return bill;
};

// ─── Record Payment ─────────────────────────────────────

const recordPayment = async (billId, paymentData) => {
    const bill = await Bill.findById(billId);
    if (!bill) {
        throw new ApiError(404, 'Bill not found');
    }
    if (bill.status === 'PAID') {
        throw new ApiError(400, 'Bill is already fully paid');
    }

    // Recalculate late fee before payment
    await calculateLateFee(bill);

    if (paymentData.amount > bill.balance) {
        throw new ApiError(400, `Payment amount ₹${paymentData.amount} exceeds balance ₹${bill.balance}`);
    }

    bill.payments.push(paymentData);
    bill.paidAmount += paymentData.amount;
    bill.balance = bill.totalAmount - bill.paidAmount;

    if (bill.balance <= 0) {
        bill.status = 'PAID';
        bill.paidDate = new Date();
        bill.balance = 0;
    } else {
        bill.status = 'PARTIAL';
    }

    await bill.save();

    // Notify Resident
    await NotificationService.create({
        userId: bill.resident.user, // Assuming resident is populated or has user field
        society: bill.society,
        title: 'Payment Received',
        body: `Payment of ₹${paymentData.amount} recorded for ${bill.month}/${bill.year}.`,
        type: 'BILLING',
        data: { billId: bill._id }
    });

    return bill;
};

// ─── Overdue Bills ──────────────────────────────────────

const getOverdueBills = async (societyId) => {
    const now = new Date();
    const bills = await Bill.find({
        society: societyId,
        status: { $in: ['PENDING', 'PARTIAL'] },
        dueDate: { $lt: now }
    })
        .populate('flat', 'flatNumber block')
        .populate('resident');

    // Update status to OVERDUE
    for (const bill of bills) {
        if (bill.status !== 'OVERDUE') {
            await calculateLateFee(bill);
            bill.status = 'OVERDUE';
            await bill.save();
        }
    }

    return bills;
};

// ─── Late Fee Calculator ────────────────────────────────

const calculateLateFee = async (bill) => {
    const config = await MaintenanceCharge.findOne({ society: bill.society });
    if (!config) return;

    const now = new Date();
    const graceEnd = new Date(bill.dueDate);
    graceEnd.setDate(graceEnd.getDate() + config.gracePeriodDays);

    if (now > graceEnd && bill.status !== 'PAID') {
        const daysLate = Math.floor((now - graceEnd) / (1000 * 60 * 60 * 24));
        bill.lateFee = daysLate * config.lateFeePerDay;
        bill.totalAmount = bill.amount + bill.lateFee;
        bill.balance = bill.totalAmount - bill.paidAmount;
    }
};

module.exports = {
    setConfig,
    getConfig,
    generateBills,
    getBills,
    getBillById,
    recordPayment,
    getOverdueBills
};
