const admin = require('firebase-admin');

// Note: In production, place your serviceAccountKey.json in the config folder
// and initialize with: 
// admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const initFirebase = () => {
    try {
        if (!process.env.FIREBASE_PROJECT_ID) {
            console.warn('Firebase Project ID missing. Push notifications disabled.');
            return null;
        }

        admin.initializeApp({
            projectId: process.env.FIREBASE_PROJECT_ID
        });

        console.log('Firebase Admin Initialized');
        return admin;
    } catch (err) {
        console.error('Firebase Initialization Error:', err.message);
        return null;
    }
};

module.exports = { initFirebase, admin };
