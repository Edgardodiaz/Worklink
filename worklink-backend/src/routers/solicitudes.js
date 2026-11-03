
const express = require("express");
const pool = require("../database");
const verificarToken = require("../middleware/auth");

const router = express.Router();

// Estados permitidos en el sistema.
const ESTADOS = [
    "pendiente",
    "aceptada",
    "rechazada",
    "en_proceso",
    "completada",
    "cancelada"
];

// POST /api/solicitudes
// Crear una solicitud de servicio.
router.post("/", verificarToken, async (req, res) => {
    try {
        const {
            id_servicio,
            descripcion_problema,
            departamento,
            municipio,
            direccion,
            fecha_preferida,
            presupuesto
        } = req.body;

        const idCliente = req.usuario.id_usuario;
        const rol = req.usuario.tipo_cuenta;

        if (!["cliente", "profesional", "ambos"].includes(rol)) {
            return res.status(403).json({
                mensaje: "Tu cuenta no puede solicitar servicios."
            });
        }

        if (
            !id_servicio ||
            !Number.isInteger(Number(id_servicio)) ||
            !descripcion_problema?.trim() ||
            !departamento?.trim() ||
            !municipio?.trim() ||
            !direccion?.trim()
        ) {
            return res.status(400).json({
                mensaje: "Completa el servicio, el problema y la ubicación."
            });
        }

        if (
            presupuesto !== undefined &&
            presupuesto !== null &&
            (
                !Number.isFinite(Number(presupuesto)) ||
                Number(presupuesto) < 0
            )
        ) {
            return res.status(400).json({
                mensaje: "El presupuesto debe ser un número válido y no negativo."
            });
        }

        if (fecha_preferida) {
            const fecha = new Date(fecha_preferida);

            if (Number.isNaN(fecha.getTime())) {
                return res.status(400).json({
                    mensaje: "La fecha preferida no es válida."
                });
            }
        }

        // Verificar que el servicio esté activo y el perfil disponible.
        const [servicios] = await pool.execute(
            `SELECT s.id_servicio, p.id_usuario AS id_profesional
             FROM servicios s
             INNER JOIN perfiles_profesionales p
                ON p.id_perfil = s.id_perfil
             WHERE s.id_servicio = ?
               AND s.activo = TRUE
               AND p.disponible = TRUE`,
            [Number(id_servicio)]
        );

        if (servicios.length === 0) {
            return res.status(404).json({
                mensaje: "El servicio no existe o no está disponible."
            });
        }

        if (Number(servicios[0].id_profesional) === idCliente) {
            return res.status(400).json({
                mensaje: "No puedes solicitar tu propio servicio."
            });
        }

        const [resultado] = await pool.execute(
            `INSERT INTO solicitudes (
                id_cliente,
                id_servicio,
                descripcion_problema,
                departamento,
                municipio,
                direccion,
                fecha_preferida,
                presupuesto,
                estado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
            [
                idCliente,
                Number(id_servicio),
                descripcion_problema.trim(),
                departamento.trim(),
                municipio.trim(),
                direccion.trim(),
                fecha_preferida || null,
                presupuesto === undefined || presupuesto === null
                    ? null
                    : Number(presupuesto)
            ]
        );

        return res.status(201).json({
            mensaje: "Solicitud creada correctamente.",
            id_solicitud: resultado.insertId,
            estado: "pendiente"
        });
    } catch (error) {
        console.error("Error al crear solicitud:", error);

        return res.status(500).json({
            mensaje: "Error interno al crear la solicitud."
        });
    }
});

// GET /api/solicitudes/mis-solicitudes
// Consultar solicitudes propias según el rol.
router.get("/mis-solicitudes", verificarToken, async (req, res) => {
    try {
        const idUsuario = req.usuario.id_usuario;
        const rol = req.usuario.tipo_cuenta;

        let condicion;
        let parametros;

        if (rol === "cliente") {
            condicion = "s.id_cliente = ?";
            parametros = [idUsuario];
        } else if (rol === "profesional") {
            condicion = "p.id_usuario = ?";
            parametros = [idUsuario];
        } else if (rol === "ambos") {
            condicion = "(s.id_cliente = ? OR p.id_usuario = ?)";
            parametros = [idUsuario, idUsuario];
        } else {
            return res.status(403).json({
                mensaje: "No tienes permiso para consultar solicitudes."
            });
        }

        const [solicitudes] = await pool.execute(
            `SELECT
                s.id_solicitud,
                s.id_cliente,
                s.id_servicio,
                s.descripcion_problema,
                s.departamento,
                s.municipio,
                s.direccion,
                s.fecha_preferida,
                s.presupuesto,
                s.estado,
                s.fecha_solicitud,
                c.nombre AS nombre_cliente,
                c.apellido AS apellido_cliente,
                p.id_usuario AS id_profesional,
                u.nombre AS nombre_profesional,
                u.apellido AS apellido_profesional,
                sv.nombre AS nombre_servicio
             FROM solicitudes s
             INNER JOIN servicios sv
                ON sv.id_servicio = s.id_servicio
             INNER JOIN perfiles_profesionales p
                ON p.id_perfil = sv.id_perfil
             INNER JOIN usuarios c
                ON c.id_usuario = s.id_cliente
             INNER JOIN usuarios u
                ON u.id_usuario = p.id_usuario
             WHERE ${condicion}
             ORDER BY s.fecha_solicitud DESC`,
            parametros
        );

        return res.json({
            total: solicitudes.length,
            solicitudes
        });
    } catch (error) {
        console.error("Error al consultar solicitudes:", error);

        return res.status(500).json({
            mensaje: "Error interno al consultar las solicitudes."
        });
    }
});

// PATCH /api/solicitudes/:id/estado
// Actualizar estado según la propiedad de la solicitud.
router.patch("/:id/estado", verificarToken, async (req, res) => {
    try {
        const idSolicitud = Number(req.params.id);
        const idUsuario = req.usuario.id_usuario;
        const rol = req.usuario.tipo_cuenta;
        const { estado } = req.body;

        if (!Number.isInteger(idSolicitud) || idSolicitud <= 0) {
            return res.status(400).json({
                mensaje: "El ID de la solicitud no es válido."
            });
        }

        if (!ESTADOS.includes(estado)) {
            return res.status(400).json({
                mensaje: "El estado indicado no es válido."
            });
        }

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
             WHERE s.id_solicitud = ?`,
            [idSolicitud]
        );

        if (filas.length === 0) {
            return res.status(404).json({
                mensaje: "La solicitud no existe."
            });
        }

        const solicitud = filas[0];
        const esCliente = Number(solicitud.id_cliente) === idUsuario;
        const esProfesional =
            Number(solicitud.id_profesional) === idUsuario;

        let permitido = false;

        // El profesional puede aceptar o rechazar una solicitud pendiente.
        if (
            esProfesional &&
            ["profesional", "ambos"].includes(rol) &&
            solicitud.estado === "pendiente" &&
            ["aceptada", "rechazada"].includes(estado)
        ) {
            permitido = true;
        }

        // El profesional puede iniciar o completar un trabajo aceptado.
        if (
            esProfesional &&
            ["profesional", "ambos"].includes(rol) &&
            solicitud.estado === "aceptada" &&
            estado === "en_proceso"
        ) {
            permitido = true;
        }

        if (
            esProfesional &&
            ["profesional", "ambos"].includes(rol) &&
            solicitud.estado === "en_proceso" &&
            estado === "completada"
        ) {
            permitido = true;
        }

        // El cliente puede cancelar mientras el trabajo no haya comenzado.
        if (
            esCliente &&
            ["cliente", "ambos"].includes(rol) &&
            ["pendiente", "aceptada"].includes(solicitud.estado) &&
            estado === "cancelada"
        ) {
            permitido = true;
        }

        if (!permitido) {
            return res.status(403).json({
                mensaje: "No puedes realizar este cambio de estado."
            });
        }

        await pool.execute(
            `UPDATE solicitudes
             SET estado = ?
             WHERE id_solicitud = ?`,
            [estado, idSolicitud]
        );

        return res.json({
            mensaje: "Estado actualizado correctamente.",
            id_solicitud: idSolicitud,
            estado
        });
    } catch (error) {
        console.error("Error al actualizar solicitud:", error);

        return res.status(500).json({
            mensaje: "Error interno al actualizar la solicitud."
        });
    }
});

module.exports = router;
