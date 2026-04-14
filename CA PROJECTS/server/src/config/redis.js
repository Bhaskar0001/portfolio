const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient = null;

const getRedisClient = () => {
    if (redisClient) return redisClient;

    const env = require('./env');
    redisClient = new Redis({
        host: env.REDIS_HOST,
        port: parseInt(env.REDIS_PORT, 10),
        password: env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null, // Required for BullMQ
        retryStrategy: (times) => {
            if (times > 10) return null;
            return Math.min(times * 200, 5000);
        },
    });

    redisClient.on('connect', () => logger.info('Redis connected'));
    redisClient.on('error', (err) => logger.error('Redis error:', err.message));

    return redisClient;
};

module.exports = { getRedisClient };
