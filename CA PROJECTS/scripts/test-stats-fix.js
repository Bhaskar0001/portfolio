const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

const Notice = require('../server/src/models/Notice');

async function testStats() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const tenantIdStr = '67c7fd80ecfc98f80456570c'; // The tenant ID from our check-user script
        const tenantId = require('mongoose').Types.ObjectId.createFromHexString(tenantIdStr);

        const stats = await Notice.aggregate([
            { $match: { tenantId: tenantId } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);

        console.log('Stats by Status:', JSON.stringify(stats, null, 2));

        const total = await Notice.countDocuments({ tenantId });
        console.log('Total Notices for Tenant:', total);

        await mongoose.disconnect();
    } catch (err) {
        console.error('Test failed:', err);
    }
}

testStats();
