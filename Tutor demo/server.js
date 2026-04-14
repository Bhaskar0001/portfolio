import express from 'express';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import dotenv from 'dotenv';

// ESM compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// Serve static frontend
app.use(express.static(path.join(__dirname, 'frontend')));

// Mock Vercel API routing
// Dynamically load API routes from the /api folder
app.all('/api/:category/:action', async (req, res) => {
    const { category, action } = req.params;
    const apiFilePath = path.join(__dirname, 'api', category, `${action}.js`);
    
    try {
        // Convert path to file:// URL for dynamic import on Windows
        const apiFileUrl = pathToFileURL(apiFilePath).href;
        const module = await import(apiFileUrl);
        const handler = module.default || module;
        
        if (typeof handler === 'function') {
            await handler(req, res);
        } else {
            res.status(500).json({ error: 'Invalid API handler', details: 'Export is not a function' });
        }
    } catch (err) {
        console.error(`API Error (${category}/${action}):`, err);
        res.status(404).json({ error: 'API route not found', details: err.message });
    }
});

// Single category API routes like /api/health
app.all('/api/:action', async (req, res) => {
    const { action } = req.params;
    const apiFilePath = path.join(__dirname, 'api', `${action}.js`);
    
    try {
        const apiFileUrl = pathToFileURL(apiFilePath).href;
        const module = await import(apiFileUrl);
        const handler = module.default || module;
        
        if (typeof handler === 'function') {
            await handler(req, res);
        } else {
            res.status(500).json({ error: 'Invalid API handler', details: 'Export is not a function' });
        }
    } catch (err) {
        console.error(`API Error (${action}):`, err);
        res.status(404).json({ error: 'API route not found', details: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`\n🚀 Tutor Booking System running at:`);
    console.log(`👉 http://localhost:${PORT}\n`);
    console.log(`Connected to MongoDB: ${process.env.MONGODB_URI ? 'YES' : 'NO'}`);
});
