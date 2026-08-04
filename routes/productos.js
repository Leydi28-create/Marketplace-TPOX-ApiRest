const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/authMiddleware');

// GET todos los productos
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT p.*, u.nombre as vendedor, c.nombre as categoria 
            FROM productos p
            JOIN usuarios u ON p.id_vendedor = u.id_usuario
            JOIN categorias c ON p.id_categoria = c.id_categoria
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET producto por ID
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT p.*, u.nombre as vendedor, c.nombre as categoria 
            FROM productos p
            JOIN usuarios u ON p.id_vendedor = u.id_usuario
            JOIN categorias c ON p.id_categoria = c.id_categoria
            WHERE p.id_producto = ?
        `, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, error: 'Producto no encontrado' });
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST crear producto (cualquier usuario autenticado; se marca como SELLER)
router.post('/', auth, async (req, res) => {
    const { id_categoria, categoria, title, descripcion, price, stock, url_imagen } = req.body;

    if (!title || !descripcion || price == null || stock == null) {
        return res.status(400).json({ success: false, error: 'Título, descripción, precio y stock son requeridos' });
    }

    try {
        let categoryId = id_categoria ? Number(id_categoria) : null;

        if (!categoryId && categoria) {
            const [cats] = await db.query(
                'SELECT id_categoria FROM categorias WHERE nombre = ? LIMIT 1',
                [categoria.trim()]
            );
            if (cats.length > 0) {
                categoryId = cats[0].id_categoria;
            } else {
                const [createdCat] = await db.query(
                    'INSERT INTO categorias (nombre) VALUES (?)',
                    [categoria.trim()]
                );
                categoryId = createdCat.insertId;
            }
        }

        if (!categoryId) {
            return res.status(400).json({ success: false, error: 'Categoría requerida' });
        }

        // Permitir publicar aunque el JWT diga BUYER (modo vendedor local)
        await db.query('UPDATE usuarios SET rol = ? WHERE id_usuario = ?', ['SELLER', req.user.id]);

        const [result] = await db.query(
            'INSERT INTO productos (id_vendedor, id_categoria, title, descripcion, price, stock, url_imagen) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, categoryId, title, descripcion, price, stock, url_imagen || null]
        );

        res.json({
            success: true,
            message: 'Producto creado',
            id: result.insertId,
            id_producto: result.insertId,
            id_categoria: categoryId,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT actualizar producto (solo el vendedor dueño)
router.put('/:id', auth, async (req, res) => {
    const { title, descripcion, price, stock, url_imagen, id_categoria } = req.body;
    try {
        const [rows] = await db.query('SELECT * FROM productos WHERE id_producto = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, error: 'Producto no encontrado' });
        if (rows[0].id_vendedor !== req.user.id) return res.status(403).json({ success: false, error: 'No autorizado' });

        await db.query(
            'UPDATE productos SET title=?, descripcion=?, price=?, stock=?, url_imagen=?, id_categoria=? WHERE id_producto=?',
            [title, descripcion, price, stock, url_imagen, id_categoria, req.params.id]
        );
        res.json({ success: true, message: 'Producto actualizado' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE producto (solo el vendedor dueño)
router.delete('/:id', auth, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM productos WHERE id_producto = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ success: false, error: 'Producto no encontrado' });
        if (rows[0].id_vendedor !== req.user.id) return res.status(403).json({ success: false, error: 'No autorizado' });

        await db.query('DELETE FROM productos WHERE id_producto = ?', [req.params.id]);
        res.json({ success: true, message: 'Producto eliminado' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;