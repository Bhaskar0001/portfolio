const billingService = require('./billing.service');
const reportService = require('../../services/report.service');
const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/ApiResponse');

const setConfig = catchAsync(async (req, res) => {
    const config = await billingService.setConfig(req.body);
    res.status(200).json(new ApiResponse(200, config, 'Billing config saved'));
});

const getConfig = catchAsync(async (req, res) => {
    const config = await billingService.getConfig(req.params.societyId);
    res.status(200).json(new ApiResponse(200, config, 'Billing config fetched'));
});

const generateBills = catchAsync(async (req, res) => {
    const { societyId, month, year } = req.body;
    const result = await billingService.generateBills(societyId, month, year);
    res.status(201).json(new ApiResponse(201, result, `${result.generated} bills generated`));
});

const getBills = catchAsync(async (req, res) => {
    const bills = await billingService.getBills(req.query);
    res.status(200).json(new ApiResponse(200, bills, 'Bills fetched'));
});

const getBill = catchAsync(async (req, res) => {
    const bill = await billingService.getBillById(req.params.id);
    res.status(200).json(new ApiResponse(200, bill, 'Bill details fetched'));
});

const recordPayment = catchAsync(async (req, res) => {
    const bill = await billingService.recordPayment(req.params.id, {
        ...req.body,
        receivedBy: req.user._id
    });
    res.status(200).json(new ApiResponse(200, bill, 'Payment recorded'));
});

const getOverdueBills = catchAsync(async (req, res) => {
    const bills = await billingService.getOverdueBills(req.query.society);
    res.status(200).json(new ApiResponse(200, bills, 'Overdue bills fetched'));
});

const downloadInvoice = catchAsync(async (req, res) => {
    const bill = await billingService.getBillById(req.params.id);
    const pdfBytes = await reportService.generateBillPDF({
        billNumber: bill.billNumber,
        month: bill.month,
        year: bill.year,
        residentName: bill.resident?.name,
        flatDetails: `${bill.flat?.block}-${bill.flat?.flatNumber}`,
        amount: bill.amount,
        lateFee: bill.lateFee,
        totalAmount: bill.totalAmount
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${bill.billNumber}.pdf`);
    res.send(Buffer.from(pdfBytes));
});

module.exports = {
    setConfig,
    getConfig,
    generateBills,
    getBills,
    getBill,
    recordPayment,
    getOverdueBills,
    downloadInvoice
};
