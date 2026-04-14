const crypto = require('crypto');
const Payment = require('./payment.model');
const Billing = require('../billing/billing.model');
const config = require('../../config');

class PaymentService {
    // PayU Hash Sequence: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||salt
    generateHash(params) {
        const { txnId, amount, productInfo, firstName, email } = params;
        const hashString = `${config.payu.key}|${txnId}|${amount}|${productInfo}|${firstName}|${email}|||||||||||${config.payu.salt}`;
        return crypto.createHash('sha512').update(hashString).digest('hex');
    }

    async initiatePayment(billId, userId) {
        const bill = await Billing.findById(billId)
            .populate('resident')
            .populate('flat');

        if (!bill) throw new Error('Bill not found');

        const txnId = `TXN_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        const hash = this.generateHash({
            txnId,
            amount: bill.amount,
            productInfo: `Maintenance_${bill.month}_${bill.year}`,
            firstName: bill.resident.user.name.split(' ')[0],
            email: bill.resident.user.email || 'no-email@societyos.com'
        });

        const payment = await Payment.create({
            billId,
            society: bill.society,
            flat: bill.flat,
            resident: bill.resident,
            txnId,
            amount: bill.amount,
            hash
        });

        return {
            txnId,
            hash,
            key: config.payu.key,
            amount: bill.amount,
            productInfo: `Maintenance_${bill.month}_${bill.year}`,
            firstName: bill.resident.user.name.split(' ')[0],
            email: bill.resident.user.email || 'no-email@societyos.com',
            surl: `${config.appUrl}/api/v1/payments/success`,
            furl: `${config.appUrl}/api/v1/payments/failure`
        };
    }

    async verifyResponse(response) {
        // Reverse Hash Sequence: salt|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
        const { status, email, firstname, productinfo, amount, txnid, hash } = response;
        const reverseHashString = `${config.payu.salt}|${status}|||||||||||${email}|${firstname}|${productinfo}|${amount}|${txnid}|${config.payu.key}`;
        const calculatedHash = crypto.createHash('sha512').update(reverseHashString).digest('hex');

        if (calculatedHash !== hash) {
            throw new Error('Hash verification failed - Potential tampering');
        }

        const payment = await Payment.findOne({ txnId: txnid });
        if (!payment) throw new Error('Transaction not found');

        payment.status = status === 'success' ? 'SUCCESS' : 'FAILED';
        payment.payuResponse = response;
        await payment.save();

        if (payment.status === 'SUCCESS') {
            const bill = await Billing.findById(payment.billId);
            bill.status = 'PAID';
            bill.paidAmount = payment.amount;
            bill.paymentDate = new Date();
            await bill.save();

            // Notify via Socket
            const io = global.io; // Need to ensure io is available globally or passed
            if (io) {
                io.to(`society:${payment.society}`).emit('billing:payment', {
                    billId: bill._id,
                    amount: bill.amount,
                    resident: payment.resident
                });
            }
        }

        return payment;
    }
}

module.exports = new PaymentService();
