const db = require('./db');

async function checkDatabase() {
    try {
        console.log("=== USUARIOS ===");
        const [usuarios] = await db.query("SELECT id_usuario, nombre, email, rol, telefono FROM usuarios");
        console.table(usuarios);

        console.log("\n=== PRODUCTOS ===");
        const [productos] = await db.query("SELECT id_producto, title, price, stock, id_vendedor FROM productos");
        console.table(productos);

        console.log("\n=== ÓRDENES ===");
        const [ordenes] = await db.query("SELECT id_orden, id_comprador, total_price, status, created_at FROM ordenes");
        console.table(ordenes);

        console.log("\n=== DETALLES DE ÓRDENES ===");
        const [detalles] = await db.query("SELECT id_detalle, id_orden, id_producto, title, quantity, price_at_purchase FROM orden_detalles");
        console.table(detalles);

    } catch (error) {
        console.error("Error al consultar la base de datos:", error);
    } finally {
        process.exit(0);
    }
}

checkDatabase();
