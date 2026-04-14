const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

async function checkDatabase() {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/noticeradar';
    console.log(`🔍 Checking MongoDB connection at: ${uri}`);

    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 3000
        });
        console.log('✅ Success! MongoDB is reachable and accepting connections.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed to connect to MongoDB.');

        if (err.message.includes('ECONNREFUSED')) {
            console.error('\nTips:');
            console.error('1. Check if the MongoDB service is running (net start MongoDB).');
            console.error('2. If using Docker, run: cd infra; docker-compose up -d.');
            console.error('3. Verify the MONGO_URI in your .env file.');
        } else {
            console.error(`Error: ${err.message}`);
        }
        process.exit(1);
    }
}

checkDatabase();
