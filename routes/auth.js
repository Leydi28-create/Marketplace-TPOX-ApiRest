const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

// REGISTRO
router.post('/register', async (req, res) => {
    const { nombre, email, password, telefono, direccion_envio, rol } = req.body;

    if (!nombre || !email || !password) {
        return res.status(400).json({ success: false, error: 'Nombre, email y password son requeridos' });
    }

    try {
        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ success: false, error: 'JWT_SECRET no configurado' });
        }

        const safeRol = rol === 'SELLER' ? 'SELLER' : 'BUYER';
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            'INSERT INTO usuarios (nombre, email, password, telefono, direccion_envio, rol) VALUES (?, ?, ?, ?, ?, ?)',
            [nombre.trim(), email.trim(), hashedPassword, telefono, direccion_envio, safeRol]
        );

        const token = jwt.sign(
            { id: result.insertId, rol: safeRol },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Usuario registrado',
            id: result.insertId,
            token,
            usuario: {
                id: result.insertId,
                nombre: nombre.trim(),
                email: email.trim(),
                rol: safeRol,
            },
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, error: 'El email ya está registrado' });
        }
        res.status(500).json({ success: false, error: error.message });
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    let { email, password } = req.body;
    if (email) email = email.trim();

    if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email y password son requeridos' });
    }

    if (!process.env.JWT_SECRET) {
        return res.status(500).json({ success: false, error: 'JWT_SECRET no configurado' });
    }

    console.log(`[LOGIN TRY] Email: "${email}"`);
    try {
        const [rows] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        console.log(`[LOGIN DB] Encontrados: ${rows.length} usuarios`);

        if (rows.length === 0) {
            return res.status(401).json({ success: false, error: 'Usuario no encontrado' });
        }

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({ success: false, error: 'Contraseña incorrecta' });
        }

        const token = jwt.sign(
            { id: user.id_usuario, rol: user.rol },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token,
            usuario: {
                id: user.id_usuario,
                nombre: user.nombre,
                email: user.email,
                rol: user.rol,
            },
        });
    } catch (error) {
        console.error('[LOGIN ERROR]', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
