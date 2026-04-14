const { client } = require('../config/redis');

const cache = (duration) => {
    return async (req, res, next) => {
        if (!client.isOpen) return next();

        const key = `__express__${req.originalUrl || req.url}`;
        try {
            const cachedBody = await client.get(key);
            if (cachedBody) {
                return res.json(JSON.parse(cachedBody));
            } else {
                res.sendResponse = res.json;
                res.json = (body) => {
                    client.setEx(key, duration, JSON.stringify(body));
                    res.sendResponse(body);
                };
                next();
            }
        } catch (err) {
            console.error('Cache Middleware Error:', err);
            next();
        }
    };
};

module.exports = cache;
