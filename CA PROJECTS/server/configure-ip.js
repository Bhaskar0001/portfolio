const mongoose = require('mongoose');
require('dotenv').config();
const Tenant = require('./src/models/Tenant');

async function configureIp(tenantSlug, ipAddress) {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const tenant = await Tenant.findOne({ slug: tenantSlug });
        if (!tenant) {
            console.error('Tenant not found');
            return;
        }

        if (!tenant.settings) tenant.settings = {};
        if (!tenant.settings.security) tenant.settings.security = {};
        
        const whitelist = tenant.settings.security.ipWhitelist || [];
        if (!whitelist.includes(ipAddress)) {
            whitelist.push(ipAddress);
            tenant.settings.security.ipWhitelist = whitelist;
            await tenant.save();
            console.log(`Successfully added ${ipAddress} to whitelist for ${tenantSlug}`);
        } else {
            console.log(`${ipAddress} is already in the whitelist`);
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

// Usage: node configure-ip.js <tenant-slug> <ip-to-whitelist>
const [slug, ip] = process.argv.slice(2);
if (!slug || !ip) {
    console.log('Usage: node configure-ip.js <tenant-slug> <ip-to-whitelist>');
    process.exit(1);
}

configureIp(slug, ip);
