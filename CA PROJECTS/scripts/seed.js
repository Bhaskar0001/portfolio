const path = require('path');
const serverDir = path.join(__dirname, '../server');
require('dotenv').config({ path: path.join(serverDir, '.env') });
const mongoose = require(path.join(serverDir, 'node_modules/mongoose'));
const env = require(path.join(serverDir, 'src/config/env'));
const User = require(path.join(serverDir, 'src/models/User'));
const Tenant = require(path.join(serverDir, 'src/models/Tenant'));
const Client = require(path.join(serverDir, 'src/models/Client'));
const Notice = require(path.join(serverDir, 'src/models/Notice'));
const bcrypt = require('bcryptjs');

async function seed() {
    console.log('🌱 Starting database seeding...');
    console.log(`📂 Configuration: Loading from ${path.join(__dirname, '../server/.env')}`);

    const uri = process.env.MONGO_URI || 'UNDEFINED';
    const redactedUri = uri.replace(/:([^@]+)@/, ':****@');
    console.log(`🔗 Target URI: ${redactedUri}`);

    try {
        mongoose.set('debug', true);
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ Connected to MongoDB successfully. State:', mongoose.connection.readyState);

        // Clear existing data (sequentially for better debugging)
        console.log('🧹 Clearing existing data...');
        console.log('- Users...');
        await User.deleteMany({});
        console.log('- Tenants...');
        await Tenant.deleteMany({});
        console.log('- Clients...');
        await Client.deleteMany({});
        console.log('- Notices...');
        await Notice.deleteMany({});
        console.log('✅ Clear completed.');

        // 1. Create Tenant
        const tenant = await Tenant.create({
            name: 'Acme CA Firm',
            slug: 'acme-ca',
            status: 'active',
            settings: {
                branding: { firmName: 'Acme CA Firm', primaryColor: '#2563eb' }
            }
        });

        // 2. Create Admin User
        const admin = await User.create({
            tenantId: tenant._id,
            email: 'admin@acme-ca.com',
            passwordHash: 'Admin@123', // Will be hashed by pre-save hook
            firstName: 'Principal',
            lastName: 'CA',
            roles: ['TenantAdmin'],
            status: 'active'
        });

        // 3. Create Staff User
        const staff = await User.create({
            tenantId: tenant._id,
            email: 'staff@acme-ca.com',
            passwordHash: 'Admin@123',
            firstName: 'Tax',
            lastName: 'Assistant',
            roles: ['Staff'],
            status: 'active'
        });

        // 4. Create Dummy Clients
        const client1 = await Client.create({
            tenantId: tenant._id,
            name: 'Reliance Industries Ltd',
            entityType: 'Company',
            pan: 'PANRI1234L',
            gstins: [{ gstin: '27AAACR1234L1Z5', state: 'Maharashtra' }],
            createdBy: admin._id,
            status: 'active'
        });

        const client2 = await Client.create({
            tenantId: tenant._id,
            name: 'John Doe',
            entityType: 'Individual',
            pan: 'ABCDE1234F',
            createdBy: staff._id,
            status: 'active'
        });

        // 5. Create Dummy Notices
        await Notice.create({
            tenantId: tenant._id,
            clientId: client1._id,
            department: 'IncomeTax',
            din: 'ITD20249981',
            assessmentYear: '2023-24',
            section: '143(1)',
            receivedDate: new Date(),
            status: 'New',
            priority: 'High'
        });

        await Notice.create({
            tenantId: tenant._id,
            clientId: client2._id,
            department: 'GST',
            din: 'GSTORD1122',
            assessmentYear: '2024-25',
            section: '73',
            receivedDate: new Date(Date.now() - 86400000 * 5),
            status: 'InProgress',
            priority: 'Medium'
        });

        console.log('✅ Seeding completed successfully!');
        console.log('------------------------------');
        console.log('Login URL: http://localhost:3000');
        console.log('Admin: admin@acme-ca.com / Admin@123');
        console.log('Staff: staff@acme-ca.com / Admin@123');
        console.log('------------------------------');

        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed.');
        if (err.message.includes('ECONNREFUSED') || err.message.includes('topology')) {
            console.error('🚨 DATABASE UNREACHABLE: Is MongoDB running?');
            console.log('Try running: node scripts/db-check.js to diagnose.');
        } else {
            console.error(err);
        }
        process.exit(1);
    }
}

seed();
