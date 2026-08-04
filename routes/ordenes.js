const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/authMiddleware');

// POST crear orden desde el carrito
router.post('/', auth, async (req, res) => {
    const id_comprador = req.user.id;
    try {
        // Obtener carrito del usuario
        const [carrito] = await db.query(`
            SELECT c.cantidad, p.id_producto, p.id_vendedor, p.title, p.price, p.stock
            FROM carrito c
            JOIN productos p ON c.id_producto = p.id_producto
            WHERE c.id_usuario = ?
        `, [id_comprador]);

        if (carrito.length === 0) return res.status(400).json({ success: false, error: 'Carrito vacío' });

        // Verificar stock
        for (const item of carrito) {
            if (item.cantidad > item.stock) {
                return res.status(400).json({ success: false, error: `Stock insuficiente para: ${item.title}` });
            }
        }

        // Calcular total
        const total = carrito.reduce((sum, item) => sum + item.price * item.cantidad, 0);

        // Crear orden
        const [orden] = await db.query(
            'INSERT INTO ordenes (id_comprador, total_price) VALUES (?, ?)',
            [id_comprador, total]
        );
        const id_orden = orden.insertId;

        // Insertar detalles y actualizar stock
        for (const item of carrito) {
            await db.query(
                'INSERT INTO orden_detalles (id_orden, id_producto, id_vendedor, title, quantity, price_at_purchase) VALUES (?, ?, ?, ?, ?, ?)',
                [id_orden, item.id_producto, item.id_vendedor, item.title, item.cantidad, item.price]
            );
            await db.query(
                'UPDATE productos SET stock = stock - ? WHERE id_producto = ?',
                [item.cantidad, item.id_producto]
            );
        }

        // Limpiar carrito
        await db.query('DELETE FROM carrito WHERE id_usuario = ?', [id_comprador]);

        res.json({ success: true, message: 'Orden creada', id_orden, total });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET órdenes del usuario
router.get('/', auth, async (req, res) => {
    try {
        const [ordenes] = await db.query(`
            SELECT o.id_orden, o.total_price, o.status, o.created_at
            FROM ordenes o
            WHERE o.id_comprador = ?
            ORDER BY o.created_at DESC
        `, [req.user.id]);

        res.json({ success: true, data: ordenes });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET detalle de una orden
router.get('/:id', auth, async (req, res) => {
    try {
        const [orden] = await db.query(
            'SELECT * FROM ordenes WHERE id_orden = ? AND id_comprador = ?',
            [req.params.id, req.user.id]
        );
        if (orden.length === 0) return res.status(404).json({ success: false, error: 'Orden no encontrada' });

        const [detalles] = await db.query(
            'SELECT * FROM orden_detalles WHERE id_orden = ?',
            [req.params.id]
        );

        res.json({ success: true, orden: orden[0], detalles });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;