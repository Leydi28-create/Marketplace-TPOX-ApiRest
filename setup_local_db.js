require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function main() {
    const host = process.env.DB_HOST || process.env.MYSQLHOST || '127.0.0.1';
    const port = Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306);
    const user = process.env.DB_USER || process.env.MYSQLUSER || 'root';
    const password = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '';
    const database = process.env.DB_NAME || process.env.MYSQLDATABASE || 'marketplace';

    const conn = await mysql.createConnection({
        host,
        port,
        user,
        password,
        multipleStatements: true,
        ...(host !== 'localhost' && host !== '127.0.0.1'
            ? { ssl: { rejectUnauthorized: false } }
            : {}),
    });

    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conn.query(`USE \`${database}\``);

    await conn.query(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id_usuario INT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL,
            email VARCHAR(150) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            telefono VARCHAR(50) NULL,
            direccion_envio VARCHAR(255) NULL,
            rol ENUM('BUYER','SELLER','ADMIN') NOT NULL DEFAULT 'BUYER',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS categorias (
            id_categoria INT AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(100) NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS productos (
            id_producto INT AUTO_INCREMENT PRIMARY KEY,
            id_vendedor INT NOT NULL,
            id_categoria INT NOT NULL,
            title VARCHAR(200) NOT NULL,
            descripcion TEXT NULL,
            price DECIMAL(10,2) NOT NULL,
            stock INT NOT NULL DEFAULT 0,
            url_imagen VARCHAR(500) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (id_vendedor) REFERENCES usuarios(id_usuario),
            FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria)
        );

        CREATE TABLE IF NOT EXISTS carrito (
            id_carrito INT AUTO_INCREMENT PRIMARY KEY,
            id_usuario INT NOT NULL,
            id_producto INT NOT NULL,
            cantidad INT NOT NULL DEFAULT 1,
            UNIQUE KEY uniq_usuario_producto (id_usuario, id_producto),
            FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
            FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
        );

        CREATE TABLE IF NOT EXISTS ordenes (
            id_orden INT AUTO_INCREMENT PRIMARY KEY,
            id_comprador INT NOT NULL,
            total_price DECIMAL(10,2) NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (id_comprador) REFERENCES usuarios(id_usuario)
        );

        CREATE TABLE IF NOT EXISTS orden_detalles (
            id_detalle INT AUTO_INCREMENT PRIMARY KEY,
            id_orden INT NOT NULL,
            id_producto INT NOT NULL,
            id_vendedor INT NOT NULL,
            title VARCHAR(200) NOT NULL,
            quantity INT NOT NULL,
            price_at_purchase DECIMAL(10,2) NOT NULL,
            FOREIGN KEY (id_orden) REFERENCES ordenes(id_orden),
            FOREIGN KEY (id_producto) REFERENCES productos(id_producto),
            FOREIGN KEY (id_vendedor) REFERENCES usuarios(id_usuario)
        );
    `);

    const categorias = ['Electrónica', 'Ropa', 'Hogar', 'Deportes'];
    for (const nombre of categorias) {
        await conn.query('INSERT IGNORE INTO categorias (nombre) VALUES (?)', [nombre]);
    }

    const users = [
        { email: 'julio@test.com', nombre: 'Julio', rol: 'BUYER', password: '123' },
        { email: 'seller@test.com', nombre: 'Vendedor Test', rol: 'SELLER', password: '123' },
    ];

    for (const user of users) {
        const hash = await bcrypt.hash(user.password, 10);
        const [rows] = await conn.query('SELECT id_usuario FROM usuarios WHERE email = ?', [user.email]);
        if (rows.length) {
            await conn.query(
                'UPDATE usuarios SET password = ?, nombre = ?, rol = ? WHERE email = ?',
                [hash, user.nombre, user.rol, user.email]
            );
        } else {
            await conn.query(
                'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)',
                [user.nombre, user.email, hash, user.rol]
            );
        }
    }

    const [sellers] = await conn.query("SELECT id_usuario FROM usuarios WHERE email = 'seller@test.com'");
    const [cats] = await conn.query("SELECT id_categoria FROM categorias WHERE nombre = 'Electrónica'");
    const [existingProducts] = await conn.query('SELECT COUNT(*) AS total FROM productos');

    if (existingProducts[0].total === 0 && sellers.length && cats.length) {
        await conn.query(
            `INSERT INTO productos (id_vendedor, id_categoria, title, descripcion, price, stock, url_imagen)
             VALUES (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?)`,
            [
                sellers[0].id_usuario, cats[0].id_categoria, 'Auriculares Bluetooth', 'Auriculares inalámbricos', 49.99, 20, null,
                sellers[0].id_usuario, cats[0].id_categoria, 'Mouse Gamer', 'Mouse óptico RGB', 29.99, 35, null,
            ]
        );
    }

    const [usuarios] = await conn.query('SELECT id_usuario, nombre, email, rol FROM usuarios');
    console.table(usuarios);
    console.log('Base local lista.');
    await conn.end();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
