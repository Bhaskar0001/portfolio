const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async (uri) => {
    try {
        mongoose.set('strictQuery', true);
        const conn = await mongoose.connect(uri, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            autoIndex: true,
        });
        logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (err) {
        logger.error('❌ MongoDB Connection Failure!');
        logger.error(`   URI: ${uri}`);
        logger.error(`   Error: ${err.message}`);
        logger.error('   Please ensure your MongoDB service is running.');
        throw err;
    }
};

mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
    logger.error('MongoDB error:', err.message);
});

module.exports = connectDB;
