const Minio = require('minio');
const logger = require('../utils/logger');

let minioClient = null;

const getMinioClient = () => {
    if (!minioClient) {
        minioClient = new Minio.Client({
            endPoint: process.env.MINIO_ENDPOINT || 'localhost',
            port: parseInt(process.env.MINIO_PORT || '9000'),
            useSSL: process.env.MINIO_USE_SSL === 'true',
            accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
            secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
        });
    }
    return minioClient;
};

const BUCKET = process.env.MINIO_BUCKET || 'noticeradar';

const storageService = {
    /**
     * Ensure the bucket exists
     */
    async ensureBucket() {
        const client = getMinioClient();
        const exists = await client.bucketExists(BUCKET);
        if (!exists) {
            await client.makeBucket(BUCKET);
            logger.info(`Created MinIO bucket: ${BUCKET}`);
        }
    },

    /**
     * Generate a presigned URL for upload
     * @param {string} objectKey - e.g. tenantId/noticeId/filename.pdf
     * @param {number} expiry - seconds (default 1 hour)
     */
    async getUploadUrl(objectKey, expiry = 3600) {
        const client = getMinioClient();
        return client.presignedPutObject(BUCKET, objectKey, expiry);
    },

    /**
     * Generate a presigned URL for download
     * @param {string} objectKey
     * @param {number} expiry - seconds (default 1 hour)
     */
    async getDownloadUrl(objectKey, expiry = 3600) {
        const client = getMinioClient();
        return client.presignedGetObject(BUCKET, objectKey, expiry);
    },

    /**
     * Delete an object
     * @param {string} objectKey
     */
    async deleteObject(objectKey) {
        const client = getMinioClient();
        return client.removeObject(BUCKET, objectKey);
    },

    /**
     * Upload a buffer to storage
     * @param {string} objectKey
     * @param {Buffer} buffer
     * @param {string} contentType
     */
    async uploadBuffer(objectKey, buffer, contentType) {
        const client = getMinioClient();
        return client.putObject(BUCKET, objectKey, buffer, buffer.length, {
            'Content-Type': contentType,
        });
    },

    /**
     * Get object content as a buffer
     * @param {string} objectKey
     */
    async getBuffer(objectKey) {
        const client = getMinioClient();
        const dataStream = await client.getObject(BUCKET, objectKey);
        return new Promise((resolve, reject) => {
            const chunks = [];
            dataStream.on('data', (chunk) => chunks.push(chunk));
            dataStream.on('end', () => resolve(Buffer.concat(chunks)));
            dataStream.on('error', reject);
        });
    },

    /**
     * Download object to a local file
     * @param {string} objectKey
     * @param {string} filePath
     */
    async downloadToFile(objectKey, filePath) {
        const client = getMinioClient();
        return client.fGetObject(BUCKET, objectKey, filePath);
    },

    /**
     * Get object metadata
     * @param {string} objectKey
     */
    async getObjectStat(objectKey) {
        const client = getMinioClient();
        return client.statObject(BUCKET, objectKey);
    },
};

module.exports = storageService;
