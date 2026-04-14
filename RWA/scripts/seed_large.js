const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/modules/auth/user.model');
const Society = require('./src/modules/society/society.model');
const Flat = require('./src/modules/flat/flat.model');
const Resident = require('./src/modules/resident/resident.model');
const { Bill, MaintenanceCharge } = require('./src/modules/billing/billing.model');

dotenv.config();

const SEED_COUNT = 100; // Starting with 100 per block for test

const seedRealData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB for seeding...');

        // 1. Create Society
        const society = await Society.create({
            name: "Mega City RWA",
            address: "Highway 9, Outer Ring Road",
            city: "Bangalore",
            state: "Karnataka",
            pincode: "560001",
            registrationNumber: "RWA-MEGA-001",
            admin: new mongoose.Types.ObjectId() // Dummy admin
        });

        // 2. Create Billing Config
        await MaintenanceCharge.create({
            society: society._id,
            charges: [
                { flatType: '2BHK', amount: 2500 },
                { flatType: '3BHK', amount: 3500 }
            ],
            dueDay: 10
        });

        const blocks = ['A', 'B', 'C', 'D'];

        for (const block of blocks) {
            console.log(`Seeding block ${block}...`);
            for (let i = 1; i <= SEED_COUNT; i++) {
                // Create User
                const user = await User.create({
                    name: `Resident ${block}-${i}`,
                    email: `res${block}${i}@example.com`,
                    phone: `90000${block.charCodeAt(0)}${String(i).padStart(3, '0')}`.slice(0, 10),
                    password: 'password123',
                    role: 'RESIDENT',
                    society: society._id
                });

                // Create Flat
                const flat = await Flat.create({
                    flatNumber: `${i}`,
                    floor: Math.ceil(i / 10),
                    block: block,
                    society: society._id,
                    type: i % 2 === 0 ? '3BHK' : '2BHK',
                    area: i % 2 === 0 ? 1500 : 1200,
                    owner: user._id,
                    isOccupied: true,
                    residents: [user._id]
                });

                // Create Resident Record
                await Resident.create({
                    user: user._id,
                    society: society._id,
                    flat: flat._id,
                    type: 'OWNER',
                    isActive: true
                });

                // Create some Bills
                await Bill.create({
                    society: society._id,
                    flat: flat._id,
                    billNumber: `BILL-2024-03-${block}-${i}`,
                    month: 3,
                    year: 2024,
                    amount: i % 2 === 0 ? 3500 : 2500,
                    totalAmount: i % 2 === 0 ? 3500 : 2500,
                    balance: i % 2 === 0 ? 3500 : 2500,
                    dueDate: new Date(2024, 2, 10),
                    status: 'PENDING'
                });
            }
        }

        console.log('Successfully seeded Mega City with 400 residents!');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedRealData();
