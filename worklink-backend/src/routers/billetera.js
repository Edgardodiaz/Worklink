const express = require("express");
const router = express.Router();
const pool = require("../database");
const verificarToken = require("../middleware/auth");

// Obtener billetera del usuario autenticado
router.get("/", verificarToken, async (req, res) => {
    try {
        const idUsuario = req.usuario.id_usuario;

        // Crear billetera si todavía no existe
        await pool.query(
            `INSERT IGNORE INTO billeteras (id_usuario)
             VALUES (?)`,
            [idUsuario]
        );

        const [billeteras] = await pool.query(
            `SELECT
                id_billetera,
                saldo_disponible,
                saldo_pendiente,
                total_ganado
             FROM billeteras
             WHERE id_usuario = ?`,
            [idUsuario]
        );

        res.json({
            billetera: billeteras[0]
        });

    } catch (error) {
        console.error("Error al obtener billetera:", error);
        res.status(500).json({
            mensaje: "Error al consultar la billetera."
        });
    }
});

// Obtener movimientos de la billetera
router.get("/movimientos", verificarToken, async (req, res) => {
    try {
        const idUsuario = req.usuario.id_usuario;

        const [movimientos] = await pool.query(
            `SELECT
                m.id_movimiento,
                m.tipo,
                m.monto,
                m.descripcion,
                m.estado,
                m.fecha_creacion
             FROM movimientos_billetera m
             INNER JOIN billeteras b
                ON b.id_billetera = m.id_billetera
             WHERE b.id_usuario = ?
             ORDER BY m.fecha_creacion DESC`,
            [idUsuario]
        );

        res.json({ movimientos });

    } catch (error) {
        console.error("Error al obtener movimientos:", error);
        res.status(500).json({
            mensaje: "Error al consultar los movimientos."
        });
    }
});

module.exports = router;