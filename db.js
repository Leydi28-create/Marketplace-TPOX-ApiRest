const mysql = require('mysql2');
require('dotenv').config();

const host = process.env.DB_HOST || process.env.MYSQLHOST || '127.0.0.1';
const port = Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306);
const user = process.env.DB_USER || process.env.MYSQLUSER;
const password = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD;
const database = process.env.DB_NAME || process.env.MYSQLDATABASE;

const isLocal = host === 'localhost' || host === '127.0.0.1';

const pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 15000,
});

const db = pool.promise();

db.query('SELECT 1')
    .then(() => console.log(`✅ Base de datos conectada (${host}:${port}/${database})`))
    .catch((err) => console.error('❌ Error de base de datos:', err.message));

module.exports = db;
