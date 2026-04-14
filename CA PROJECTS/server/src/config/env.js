const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { z } = require('zod');

const envSchema = z.object({
    PORT: z.string().default('5000'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    MONGO_URI: z.string().min(1, 'MONGO_URI is required'),

    JWT_ACCESS_SECRET: z.string().min(16),
    JWT_REFRESH_SECRET: z.string().min(16),
    ACCESS_TOKEN_TTL: z.string().default('15m'),
    REFRESH_TOKEN_TTL: z.string().default('7d'),

    KEYCLOAK_REALM: z.string().default('noticeradar'),
    KEYCLOAK_AUTH_SERVER_URL: z.string().default('http://localhost:8080'),
    KEYCLOAK_CLIENT_ID: z.string().default('server-api'),
    KEYCLOAK_CLIENT_SECRET: z.string().default(''),

    MINIO_ENDPOINT: z.string().default('localhost'),
    MINIO_PORT: z.string().default('9000'),
    MINIO_ACCESS_KEY: z.string().default('minioadmin'),
    MINIO_SECRET_KEY: z.string().default('minioadmin'),
    MINIO_USE_SSL: z.string().default('false'),
    MINIO_BUCKET: z.string().default('notices'),

    REDIS_HOST: z.string().default('localhost'),
    REDIS_PORT: z.string().default('6379'),
    REDIS_PASSWORD: z.string().default(''),

    SMTP_HOST: z.string().default('smtp.mailtrap.io'),
    SMTP_PORT: z.string().default('2525'),
    SMTP_USER: z.string().default(''),
    SMTP_PASS: z.string().default(''),
    SMTP_FROM: z.string().default('noreply@noticeradar.app'),

    CORS_ORIGIN: z.string().default('http://localhost:3000'),

    // AI & OCR
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_MODEL: z.string().default('gpt-4o-mini'),

    // Email Ingestion (IMAP)
    IMAP_HOST: z.string().optional(),
    IMAP_PORT: z.string().default('993'),
    IMAP_USER: z.string().optional(),
    IMAP_PASS: z.string().optional(),
    IMAP_TLS: z.string().default('true'),

    // Portal Integrations (Dummy Keys)
    ITD_API_KEY: z.string().optional().default('DUMMY_ITD_KEY_123'),
    GSTN_API_KEY: z.string().optional().default('DUMMY_GSTN_KEY_456'),
    TRACES_API_KEY: z.string().optional().default('DUMMY_TRACES_KEY_789'),
    ENABLE_BACKGROUND_JOBS: z.string().default('true'),
});

let env;
try {
    env = envSchema.parse(process.env);
} catch (err) {
    console.error('❌ Invalid environment variables:');
    if (err.errors) {
        console.error(err.errors.map(e => `  ${e.path.join('.')}: ${e.message}`).join('\n'));
    } else {
        console.error(err);
    }
    process.exit(1);
}

module.exports = env;
