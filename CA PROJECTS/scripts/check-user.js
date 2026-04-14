const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

async function checkUser() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
        const user = await User.findOne({ email: 'admin@acme-ca.com' });

        if (user) {
            console.log('User found:');
            console.log(JSON.stringify(user, null, 2));
        } else {
            console.log('User not found');
        }

        const Tenant = mongoose.model('Tenant', new mongoose.Schema({}, { strict: false }));
        const tenants = await Tenant.find({});
        console.log('Tenants:', tenants.length);
        tenants.forEach(t => console.log(`- ${t.name} (${t._id})`));

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

checkUser();
