
const express = require("express");
const pool = require("../database");
const verificarToken = require("../middleware/auth");

const router = express.Router();

// POST /api/resenas
// Crear una reseña para una solicitud completada.
router.post("/", verificarToken, async (req, res) => {
    try {
        const idCliente = req.usuario.id_usuario;
        const rol = req.usuario.tipo_cuenta;
        const { id_solicitud, puntuacion, comentario } = req.body;

        if (!["cliente", "ambos"].includes(rol)) {
            return res.status(403).json({
                mensaje: "Tu cuenta no puede publicar reseñas."
            });
        }

        if (
            !Number.isInteger(Number(id_solicitud)) ||
            Number(id_solicitud) <= 0
        ) {
            return res.status(400).json({
                mensaje: "El ID de la solicitud no es válido."
            });
        }

        if (
            puntuacion === undefined ||
            puntuacion === null ||
            puntuacion === "" ||
            !Number.isInteger(Number(puntuacion)) ||
            Number(puntuacion) < 1 ||
            Number(puntuacion) > 5
        ) {
            return res.status(400).json({
                mensaje: "La puntuación debe ser un número entero entre 1 y 5."
            });
        }

        if (
            comentario !== undefined &&
            comentario !== null &&
            typeof comentario !== "string"
        ) {
            return res.status(400).json({
                mensaje: "El comentario debe ser texto."
            });
        }

        const comentarioFinal = comentario?.trim() || null;

        if (comentarioFinal && comentarioFinal.length > 1000) {
            return res.status(400).json({
                mensaje: "El comentario no puede superar los 1000 caracteres."
            });
        }

        // Verificar que la solicitud pertenezca al cliente
        // y que el trabajo haya sido completado.
        const [solicitudes] = await pool.execute(
            `SELECT id_solicitud, estado
             FROM solicitudes
             WHERE id_solicitud = ?
               AND id_cliente = ?`,
            [Number(id_solicitud), idCliente]
        );

        if (solicitudes.length === 0) {
            return res.status(404).json({
                mensaje: "La solicitud no existe o no te pertenece."
            });
        }

        if (solicitudes[0].estado !== "completada") {
            return res.status(400).json({
                mensaje: "Solo puedes calificar solicitudes completadas."
            });
        }

        const [resultado] = await pool.execute(
            `INSERT INTO resenas (
                id_solicitud,
                puntuacion,
                comentario
            ) VALUES (?, ?, ?)`,
            [
                Number(id_solicitud),
                Number(puntuacion),
                comentarioFinal
            ]
        );

        return res.status(201).json({
            mensaje: "Reseña publicada correctamente.",
            id_resena: resultado.insertId,
            id_solicitud: Number(id_solicitud),
            puntuacion: Number(puntuacion)
        });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                mensaje: "Esta solicitud ya tiene una reseña."
            });
        }

        console.error("Error al publicar reseña:", error);

        return res.status(500).json({
            mensaje: "Error interno al publicar la reseña."
        });
    }
});

// GET /api/resenas/profesional/:idPerfil
// Consultar reseñas públicas de un perfil profesional.
router.get("/profesional/:idPerfil", async (req, res) => {
    try {
        const idPerfil = Number(req.params.idPerfil);

        if (!Number.isInteger(idPerfil) || idPerfil <= 0) {
            return res.status(400).json({
                mensaje: "El ID del perfil no es válido."
            });
        }

        const [resenas] = await pool.execute(
            `SELECT
                r.id_resena,
                r.puntuacion,
                r.comentario,
                r.fecha_resena,
                s.id_solicitud,
                c.nombre AS nombre_cliente
             FROM resenas r
             INNER JOIN solicitudes s
                ON s.id_solicitud = r.id_solicitud
             INNER JOIN servicios sv
                ON sv.id_servicio = s.id_servicio
             INNER JOIN usuarios c
                ON c.id_usuario = s.id_cliente
             WHERE sv.id_perfil = ?
             ORDER BY r.fecha_resena DESC`,
            [idPerfil]
        );

        const promedio = resenas.length
            ? Number(
                (
                    resenas.reduce(
                        (suma, r) => suma + Number(r.puntuacion),
                        0
                    ) / resenas.length
                ).toFixed(2)
            )
            : null;

        return res.json({
            id_perfil: idPerfil,
            total: resenas.length,
            promedio,
            resenas
        });
    } catch (error) {
        console.error("Error al consultar reseñas:", error);

        return res.status(500).json({
            mensaje: "Error interno al consultar las reseñas."
        });
    }
});

module.exports = router;
