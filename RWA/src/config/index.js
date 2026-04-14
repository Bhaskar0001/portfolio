require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/societyos',
  mongoose: {
    url: process.env.MONGO_URI || 'mongodb://localhost:27017/societyos',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-key',
    expire: process.env.JWT_EXPIRE || '24h',
    refreshSecret: process.env.REFRESH_TOKEN_SECRET || 'your-refresh-token-secret',
    refreshExpire: process.env.REFRESH_TOKEN_EXPIRE || '7d'
  },
  appUrl: process.env.APP_URL || 'http://localhost:5000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  payu: {
    key: process.env.PAYU_MERCHANT_KEY || 'gtKFFx', // Test Key
    salt: process.env.PAYU_MERCHANT_SALT || 'eCwWELJv', // Test Salt
    baseUrl: process.env.PAYU_BASE_URL || 'https://test.payu.in'
  }
};

module.exports = config;
