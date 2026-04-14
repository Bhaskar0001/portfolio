const crypto = require('crypto');

// The key should be exactly 32 bytes for AES-256
const ENCRYPTION_KEY = process.env.RPA_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex').slice(0, 32);

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

/**
 * Encrypts a plain text string securely using AES-256-GCM
 * Returns a combined hex string containing salt:iv:authTag:encryptedData
 */
function encrypt(text) {
    if (!text) return text;

    try {
        const iv = crypto.randomBytes(IV_LENGTH);
        const salt = crypto.randomBytes(SALT_LENGTH);
        
        // Derive key using pbkdf2 to add an extra layer of security
        const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, 'sha512');

        const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag().toString('hex');

        // Format: salt:iv:authTag:encryptedData
        return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (error) {
        console.error('Encryption failed:', error);
        throw new Error('Failed to encrypt data');
    }
}

/**
 * Decrypts a secure string created by encrypt()
 */
function decrypt(secureData) {
    if (!secureData || !secureData.includes(':')) return secureData;

    try {
        const parts = secureData.split(':');
        if (parts.length !== 4) throw new Error('Invalid encrypted data format');

        const salt = Buffer.from(parts[0], 'hex');
        const iv = Buffer.from(parts[1], 'hex');
        const authTag = Buffer.from(parts[2], 'hex');
        const encryptedText = parts[3];

        const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, 'sha512');

        const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('Decryption failed:', error);
        throw new Error('Failed to decrypt data. Key might have changed or data is corrupted.');
    }
}

module.exports = {
    encrypt,
    decrypt
};
