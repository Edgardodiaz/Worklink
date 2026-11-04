
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

// Cargar .env local. En Render se utilizan las variables configuradas
// directamente en el panel del servicio.
dotenv.config({
    path: path.resolve(__dirname, "../.env")
});

// Obtener el certificado SSL
let certificadoCA;

if (process.env.DB_SSL_CA_BASE64) {
    // Render: certificado recibido mediante Base64
    certificadoCA = Buffer.from(
        process.env.DB_SSL_CA_BASE64,
        "base64"
    ).toString("utf8");

} else if (process.env.DB_SSL_CA) {
    // Computadora local: certificado desde archivo
    const rutaCertificado = path.resolve(
        __dirname,
        "..",
        process.env.DB_SSL_CA
    );

    certificadoCA = fs.readFileSync(rutaCertificado, "utf8");

} else {
    throw new Error(
        "No se encontró DB_SSL_CA_BASE64 ni DB_SSL_CA."
    );
}

// Crear pool de conexiones
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
