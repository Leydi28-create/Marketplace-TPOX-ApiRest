const db = require('./db');
const bcrypt = require('bcryptjs');

async function createOrUpdateUsers() {
    const users = [
        { email: 'julio@test.com', nombre: 'Julio', rol: 'BUYER', rawPassword: '123' },
        { email: 'seller@test.com', nombre: 'Vendedor Test', rol: 'SELLER', rawPassword: '123' }
    ];

    try {
        for (const user of users) {
            const hashedPassword = await bcrypt.hash(user.rawPassword, 10);
            const [rows] = await db.query('SELECT * FROM usuarios WHERE email = ?', [user.email]);
            if (rows.length > 0) {
                await db.query('UPDATE usuarios SET password = ?, nombre = ?, rol = ? WHERE email = ?', [hashedPassword, user.nombre, user.rol, user.email]);
                console.log(`Usuario ${user.email} actualizado con la contraseña: ${user.rawPassword}`);
            } else {
                await db.query(
                    'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
                    [user.nombre, user.email, hashedPassword, user.rol]
                );
                console.log(`Usuario ${user.email} creado con la contraseña: ${user.rawPassword}`);
            }
        }
    } catch (error) {
        console.error("Error al crear/actualizar usuarios:", error);
    } finally {
        process.exit(0);
    }
}

createOrUpdateUsers();
