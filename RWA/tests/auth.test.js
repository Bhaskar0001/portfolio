const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/modules/auth/user.model');

describe('Auth Endpoints', () => {
    beforeAll(async () => {
        // Use a test DB or mock
        await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/society_os_test');
    });

    afterAll(async () => {
        await User.deleteMany({});
        await mongoose.connection.close();
    });

    it('should login an existing user', async () => {
        // Create user
        const userData = {
            name: 'Test Admin',
            email: 'admin@test.com',
            phone: '1234567890',
            password: 'password123',
            role: 'ADMIN'
        };
        await User.create(userData);

        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: 'admin@test.com',
                password: 'password123'
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('accessToken');
    });
});
