const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const config = require('./config');
const initSocket = require('./config/socket');

const server = http.createServer(app);

// Initialize Socket.io
const io = initSocket(server);

// Make io accessible globally and to routers
app.set('io', io);
global.io = io;

const startServer = async () => {
    try {
        await connectDB();
        server.listen(config.port, () => {
            console.log(`
🚀 SocietyOS Server Running
-----------------------------------
Port: ${config.port}
Env:  ${config.env}
Real-time: Socket.io Enabled
-----------------------------------
            `);
        });
    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
};

startServer();
