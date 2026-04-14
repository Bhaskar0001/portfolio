const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const { apiLimiter } = require('./middleware/rateLimiter');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const { initKeycloak } = require('./config/keycloak');
const { auditContextMiddleware } = require('./utils/auditContext');


// Routes
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const clientRoutes = require('./routes/client.routes');
const noticeRoutes = require('./routes/notice.routes');
const responseRoutes = require('./routes/response.routes');
const documentRoutes = require('./routes/document.routes');
const notificationRoutes = require('./routes/notification.routes');
const adminRoutes = require('./routes/admin.routes');
const templateRoutes = require('./routes/template.routes');
const integrationRoutes = require('./routes/integration.routes');
const portalRoutes = require('./routes/portal.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const importRoutes = require('./routes/import.routes');
const clientPortalRoutes = require('./routes/client-portal.routes');
const mfaRoutes = require('./routes/mfa.routes');

const createApp = () => {
    const app = express();

    // CORS - Must be very first
    app.use(cors({
        origin: true, // Allow all origins in development for debugging
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }));

    // Debug Log Middleware
    app.use((req, res, next) => {
        logger.debug(`${req.method} ${req.url} [IP: ${req.ip}]`);
        next();
    });

    // Initialize Keycloak
    initKeycloak(app);

    // Trust proxy (for Nginx)
    app.set('trust proxy', 1);

    // Security headers (Helmet)
    app.use(helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" } // Allow cross-origin images/etc.
    }));

    // Body parsing
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Cookies
    app.use(cookieParser());

    // Audit Context
    app.use(auditContextMiddleware);

    // Compression
    app.use(compression());

    // Request logging
    app.use(morgan('combined', { stream: logger.stream }));

    // Rate limiting (Relaxed for dev)
    app.use('/api/', rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 2000, // Very high for dev
        standardHeaders: true,
        legacyHeaders: false,
    }));

    // ── Routes ──────────────────────────────────────────────

    // Health checks (no auth)
    app.use('/', healthRoutes);

    // Auth routes
    app.use('/api/auth', authRoutes);

    // Client routes
    app.use('/api/clients', clientRoutes);

    // Notice routes
    app.use('/api/notices', noticeRoutes);

    // Response routes
    app.use('/api/responses', responseRoutes);

    // Document routes
    app.use('/api/documents', documentRoutes);

    // Integration routes
    app.use('/api/integrations', integrationRoutes);

    // Notification routes
    app.use('/api/notifications', notificationRoutes);

    // Admin routes
    app.use('/api/admin', adminRoutes);

    // Template routes
    app.use('/api/templates', templateRoutes);

    // Document Request Portal routes
    app.use('/api/document-requests', portalRoutes);

    // Analytics routes
    app.use('/api/analytics', analyticsRoutes);

    // Import routes
    app.use('/api/import', importRoutes);

    // Client Portal routes
    app.use('/api/client-portal', clientPortalRoutes);

    // MFA routes
    app.use('/api/mfa', mfaRoutes);

    // ── 404 handler ─────────────────────────────────────────
    app.use((req, res) => {
        res.status(404).json({
            success: false,
            code: 'NOT_FOUND',
            message: `Route ${req.method} ${req.path} not found`,
        });
    });

    // ── Error handler ───────────────────────────────────────
    app.use(errorHandler);

    return app;
};

module.exports = createApp;
