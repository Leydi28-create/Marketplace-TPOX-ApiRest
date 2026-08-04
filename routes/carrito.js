const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/authMiddleware');

// GET carrito del usuario
router.get('/', auth, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT c.id_carrito, c.cantidad, p.id_producto, p.title, p.price, p.url_imagen, p.stock
            FROM carrito c
            JOIN productos p ON c.id_producto = p.id_producto
            WHERE c.id_usuario = ?
        `, [req.user.id]);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST agregar al carrito
router.post('/', auth, async (req, res) => {
    const { id_producto, cantidad } = req.body;
    try {
        await db.query(`
            INSERT INTO carrito (id_usuario, id_producto, cantidad)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE cantidad = cantidad + ?
        `, [req.user.id, id_producto, cantidad || 1, cantidad || 1]);
        res.json({ success: true, message: 'Producto agregado al carrito' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT actualizar cantidad
router.put('/:id_producto', auth, async (req, res) => {
    const { cantidad } = req.body;
    try {
        await db.query(
            'UPDATE carrito SET cantidad = ? WHERE id_usuario = ? AND id_producto = ?',
            [cantidad, req.user.id, req.params.id_producto]
        );
        res.json({ success: true, message: 'Cantidad actualizada' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE eliminar del carrito
router.delete('/:id_producto', auth, async (req, res) => {
    try {
        await db.query(
            'DELETE FROM carrito WHERE id_usuario = ? AND id_producto = ?',
            [req.user.id, req.params.id_producto]
        );
        res.json({ success: true, message: 'Producto eliminado del carrito' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;