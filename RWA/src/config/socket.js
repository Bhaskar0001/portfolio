const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('./index');
const User = require('../modules/auth/user.model');

const initSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    // Simple JWT Auth for Sockets
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) return next(new Error('Authentication error'));

            const decoded = jwt.verify(token, config.jwtSecret);
            const user = await User.findById(decoded.id);
            if (!user) return next(new Error('User not found'));

            socket.user = user;
            next();
        } catch (err) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`Socket Connected: ${socket.user.name} (${socket.id})`);

        // Join society-specific room
        if (socket.user.society) {
            socket.join(`society:${socket.user.society}`);
        }

        socket.on('disconnect', () => {
            console.log(`Socket Disconnected: ${socket.id}`);
        });
    });

    return io;
};

module.exports = initSocket;
