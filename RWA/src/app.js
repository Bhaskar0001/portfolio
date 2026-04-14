const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const apiLimiter = require('./middleware/rateLimit');
const { connectRedis } = require('./config/redis');
const errorHandler = require('./middleware/error');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

// Rate Limiting
app.use('/api', apiLimiter);

// Initialize Redis
connectRedis();

// Route Registration
app.use('/api/v1/auth', require('./modules/auth/auth.routes'));
app.use('/api/v1/dashboard', require('./modules/dashboard/dashboard.routes'));
app.use('/api/v1/societies', require('./modules/society/society.routes'));
app.use('/api/v1/flats', require('./modules/flat/flat.routes'));
app.use('/api/v1/amenities', require('./modules/amenity/amenity.routes'));
app.use('/api/v1/roles', require('./modules/role/role.routes'));
app.use('/api/v1/billing', require('./modules/billing/billing.routes'));
app.use('/api/v1/complaints', require('./modules/complaint/complaint.routes'));
app.use('/api/v1/notices', require('./modules/notice/notice.routes'));
app.use('/api/v1/residents', require('./modules/resident/resident.routes'));
app.use('/api/v1/staff', require('./modules/staff/staff.routes'));
app.use('/api/v1/visitors', require('./modules/visitor/visitor.routes'));
app.use('/api/v1/payments', require('./modules/payment/payment.routes'));
app.use('/api/v1/polls', require('./modules/poll/poll.routes'));
app.use('/api/v1/finance', require('./modules/finance/finance.routes'));
app.use('/api/v1/notifications', require('./modules/notification/notification.routes'));
app.use('/api/v1/daily-help', require('./modules/daily-help/daily-help.routes'));

// Error Handling
app.use(errorHandler);

module.exports = app;
