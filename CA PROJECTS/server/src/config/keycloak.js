const Keycloak = require('keycloak-connect');
const session = require('express-session');
const env = require('./env');

/**
 * Keycloak Configuration
 * Configures the Keycloak adapter for Express.
 */
let keycloak = null;

const initKeycloak = (app) => {
    if (keycloak) return keycloak;

    const memoryStore = new session.MemoryStore();

    app.use(session({
        secret: env.JWT_ACCESS_SECRET,
        resave: false,
        saveUninitialized: true,
        store: memoryStore
    }));

    const config = {
        realm: env.KEYCLOAK_REALM,
        'auth-server-url': env.KEYCLOAK_AUTH_SERVER_URL,
        resource: env.KEYCLOAK_CLIENT_ID,
        'secret': env.KEYCLOAK_CLIENT_SECRET,
        'confidential-port': 0,
        'ssl-required': 'external',
        'public-client': false
    };

    keycloak = new Keycloak({ store: memoryStore }, config);
    return keycloak;
};

const getKeycloak = () => {
    if (!keycloak) {
        throw new Error('Keycloak not initialized. Call initKeycloak(app) first.');
    }
    return keycloak;
};

module.exports = { initKeycloak, getKeycloak };
