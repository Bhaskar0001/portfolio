const Minio = require('minio');
const logger = require('../utils/logger');

let minioClient = null;

const getMinioClient = () => {
    if (minioClient) return minioClient;

    const env = require('./env');
    minioClient = new Minio.Client({
        endPoint: env.MINIO_ENDPOINT,
        port: parseInt(env.MINIO_PORT, 10),
        useSSL: env.MINIO_USE_SSL === 'true',
        accessKey: env.MINIO_ACCESS_KEY,
        secretKey: env.MINIO_SECRET_KEY,
    });

    return minioClient;
};

const ensureBucket = async (bucketName) => {
    const client = getMinioClient();
    try {
        const exists = await client.bucketExists(bucketName);
        if (!exists) {
            await client.makeBucket(bucketName);
            logger.info(`MinIO bucket "${bucketName}" created`);
        } else {
            logger.info(`MinIO bucket "${bucketName}" already exists`);
        }
    } catch (err) {
        logger.error('MinIO bucket check/create error:', err.message);
    }
};

module.exports = { getMinioClient, ensureBucket };
