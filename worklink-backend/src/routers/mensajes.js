
const express = require("express");
const pool = require("../database");
const verificarToken = require("../middleware/auth");

const router = express.Router();

// Obtener una solicitud y verificar quién participa
async function obtenerSolicitud(idSolicitud) {
    const [filas] = await pool.execute(
        `SELECT
            s.id_solicitud,
            s.id_cliente,
            s.estado,
            p.id_usuario AS id_profesional
         FROM solicitudes s
         INNER JOIN servicios sv
            ON sv.id_servicio = s.id_servicio
         INNER JOIN perfiles_profesionales p
            ON p.id_perfil = sv.id_perfil
         WHERE s.id_solicitud = ?
         LIMIT 1`,
        [idSolicitud]
    );

    return filas[0] || null;
}

function participaEnSolicitud(solicitud, idUsuario) {
    return solicitud && (
        Number(solicitud.id_cliente) === Number(idUsuario) ||
        Number(solicitud.id_profesional) === Number(idUsuario)
    );
}

// GET: obtener los mensajes de una solicitud
router.get("/:idSolicitud", verificarToken, async (req, res) => {
    try {
        const idSolicitud = Number(req.params.idSolicitud);
        const idUsuario = req.usuario.id_usuario;

        if (!Number.isInteger(idSolicitud) || idSolicitud <= 0) {
            return res.status(400).json({
                mensaje: "El ID de la solicitud no es válido."
            });
        }

        const solicitud = await obtenerSolicitud(idSolicitud);

        if (!solicitud) {
            return res.status(404).json({
                mensaje: "No se encontró la solicitud."
            });
        }

        if (!participaEnSolicitud(solicitud, idUsuario)) {
            return res.status(403).json({
                mensaje: "No tenés permiso para ver estos mensajes."
            });
        }

        const [mensajes] = await pool.execute(
            `SELECT
                m.id_mensaje,
                m.id_solicitud,
                m.id_remitente,
                m.mensaje,
                m.fecha_envio,
                u.nombre AS nombre_remitente,
                u.apellido AS apellido_remitente
             FROM mensajes m
             INNER JOIN usuarios u
                ON u.id_usuario = m.id_remitente
             WHERE m.id_solicitud = ?
             ORDER BY m.id_mensaje ASC`,
            [idSolicitud]
        );

        return res.json({
            id_solicitud: idSolicitud,
            total: mensajes.length,
            mensajes
        });
    } catch (error) {
        console.error("Error al obtener mensajes:", error);

        return res.status(500).json({
            mensaje: "Error al cargar los mensajes."
        });
    }
});

// POST: enviar un mensaje
router.post("/:idSolicitud", verificarToken, async (req, res) => {
    try {
        const idSolicitud = Number(req.params.idSolicitud);
        const idUsuario = req.usuario.id_usuario;
        const mensaje = req.body.mensaje;

        if (!Number.isInteger(idSolicitud) || idSolicitud <= 0) {
            return res.status(400).json({
                mensaje: "El ID de la solicitud no es válido."
            });
        }

        if (typeof mensaje !== "string" ||
            mensaje.trim().length === 0 ||
            mensaje.trim().length > 2000) {
            return res.status(400).json({
                mensaje: "El mensaje debe tener entre 1 y 2000 caracteres."
            });
        }

        const solicitud = await obtenerSolicitud(idSolicitud);

        if (!solicitud) {
            return res.status(404).json({
                mensaje: "No se encontró la solicitud."
            });
        }

        if (!participaEnSolicitud(solicitud, idUsuario)) {
            return res.status(403).json({
                mensaje: "No tenés permiso para enviar mensajes aquí."
            });
        }

        if (["completada", "cancelada", "rechazada"].includes(solicitud.estado)) {
            return res.status(400).json({
                mensaje: "No se pueden enviar mensajes en una solicitud cerrada."
            });
        }

        const [resultado] = await pool.execute(
            `INSERT INTO mensajes
                (id_solicitud, id_remitente, mensaje)
             VALUES (?, ?, ?)`,
            [idSolicitud, idUsuario, mensaje.trim()]
        );

        return res.status(201).json({
            mensaje: "Mensaje enviado correctamente.",
            id_mensaje: resultado.insertId
        });
    } catch (error) {
        console.error("Error al enviar mensaje:", error);

        return res.status(500).json({
            mensaje: "Error al enviar el mensaje."
        });
    }
});

module.exports = router;
