
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

// Cargar variables de entorno
dotenv.config({
    path: path.resolve(__dirname, "../.env")
});

// Obtener la ruta del certificado SSL
const rutaCertificado = path.resolve(
    __dirname,
    "..",
    process.env.DB_SSL_CA
);

// Leer el certificado de Aiven
const certificadoCA = fs.readFileSync(rutaCertificado);

// Configurar conexión MySQL
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    ssl: {
        ca: certificadoCA,
        rejectUnauthorized: true
    },

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;
