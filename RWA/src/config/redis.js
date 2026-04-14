const redis = require('redis');
const config = require('./index');

const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

client.on('error', (err) => {
    if (process.env.NODE_ENV === 'development') {
        // Silent error for development unless explicitly configured
    } else {
        console.error('Redis Client Error', err);
    }
});
client.on('connect', () => console.log('✅ Redis Connected'));

const connectRedis = async () => {
    if (!process.env.REDIS_URL && process.env.NODE_ENV === 'development') {
        console.log('ℹ️ Redis URL not found. Skipping Redis connection in development.');
        return;
    }
    try {
        await client.connect();
    } catch (err) {
        console.error('Failed to connect to Redis:', err.message);
    }
};

module.exports = { client, connectRedis };
