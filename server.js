const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./db');
const uploadRoute = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 3000;
const uploadDir = uploadRoute.uploadDir;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

app.use((req, res, next) => {
    console.log(`[PETICIÓN] ${req.method} ${req.url}`);
    next();
});

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Marketplace TPOX API',
        version: '1.0.0',
    });
});

app.get('/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({ success: true, status: 'ok', database: 'connected' });
    } catch (error) {
        res.status(503).json({
            success: false,
            status: 'degraded',
            database: 'disconnected',
            error: error.message,
        });
    }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/carrito', require('./routes/carrito'));
app.use('/api/ordenes', require('./routes/ordenes'));
app.use('/api/upload', uploadRoute);

app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
    console.error('[ERROR]', err);
    res.status(500).json({ success: false, error: err.message || 'Error interno del servidor' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor en línea en: http://localhost:${PORT}`);
    console.log(`📁 Uploads: ${uploadDir}`);
});
