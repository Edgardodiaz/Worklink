
const express = require("express");
const pool = require("../database");
const verificarToken = require("../middleware/auth");

const router = express.Router();

// GET /api/favoritos
// Consultar los profesionales favoritos del cliente.
router.get("/", verificarToken, async (req, res) => {
    try {
        const idUsuario = req.usuario.id_usuario;
        const rol = req.usuario.tipo_cuenta;

        if (!["cliente", "ambos"].includes(rol)) {
            return res.status(403).json({
                mensaje: "Solo los clientes pueden consultar favoritos."
            });
        }

        const [favoritos] = await pool.execute(
            `SELECT
                p.id_perfil,
                p.titulo_profesional,
                p.descripcion,
                p.anios_experiencia,
                p.tarifa_base,
                p.departamento,
                p.municipio,
                p.foto_url,
                p.disponible,
                u.nombre,
                u.apellido,
                f.fecha_guardado
             FROM favoritos f
             INNER JOIN perfiles_profesionales p
                ON p.id_perfil = f.id_perfil
             INNER JOIN usuarios u
                ON u.id_usuario = p.id_usuario
             WHERE f.id_cliente = ?
             ORDER BY f.fecha_guardado DESC`,
            [idUsuario]
        );

        return res.json({
            total: favoritos.length,
            favoritos
        });
    } catch (error) {
        console.error("Error al consultar favoritos:", error);

        return res.status(500).json({
            mensaje: "Error interno al consultar favoritos."
        });
    }
});

// POST /api/favoritos
// Agregar un profesional a favoritos.
router.post("/", verificarToken, async (req, res) => {
    try {
        const idUsuario = req.usuario.id_usuario;
        const rol = req.usuario.tipo_cuenta;
        const idPerfil = Number(req.body.id_perfil);

        if (!["cliente", "ambos"].includes(rol)) {
            return res.status(403).json({
                mensaje: "Solo los clientes pueden guardar favoritos."
            });
        }

        if (
            !Number.isInteger(idPerfil) ||
            idPerfil <= 0
        ) {
            return res.status(400).json({
                mensaje: "El ID del perfil no es válido."
            });
        }

        const [perfiles] = await pool.execute(
            `SELECT id_perfil, id_usuario
             FROM perfiles_profesionales
             WHERE id_perfil = ?`,
            [idPerfil]
        );

        if (perfiles.length === 0) {
            return res.status(404).json({
                mensaje: "El perfil profesional no existe."
            });
        }

        if (Number(perfiles[0].id_usuario) === idUsuario) {
            return res.status(400).json({
                mensaje: "No puedes guardar tu propio perfil."
            });
        }

        await pool.execute(
            `INSERT INTO favoritos (id_cliente, id_perfil)
             VALUES (?, ?)`,
            [idUsuario, idPerfil]
        );

        return res.status(201).json({
            mensaje: "Profesional agregado a favoritos.",
            id_perfil: idPerfil
        });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                mensaje: "Este profesional ya está en tus favoritos."
            });
        }

        console.error("Error al agregar favorito:", error);

        return res.status(500).json({
            mensaje: "Error interno al agregar el favorito."
        });
    }
});

// DELETE /api/favoritos/:idPerfil
// Quitar un profesional de favoritos.
router.delete("/:idPerfil", verificarToken, async (req, res) => {
    try {
        const idUsuario = req.usuario.id_usuario;
        const rol = req.usuario.tipo_cuenta;
        const idPerfil = Number(req.params.idPerfil);

        if (!["cliente", "ambos"].includes(rol)) {
            return res.status(403).json({
                mensaje: "Solo los clientes pueden quitar favoritos."
            });
        }

        if (
            !Number.isInteger(idPerfil) ||
            idPerfil <= 0
        ) {
            return res.status(400).json({
                mensaje: "El ID del perfil no es válido."
            });
        }

        const [resultado] = await pool.execute(
            `DELETE FROM favoritos
             WHERE id_cliente = ?
               AND id_perfil = ?`,
            [idUsuario, idPerfil]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensaje: "Ese profesional no está en tus favoritos."
            });
        }

        return res.json({
            mensaje: "Profesional eliminado de favoritos.",
            id_perfil: idPerfil
        });
    } catch (error) {
        console.error("Error al quitar favorito:", error);

        return res.status(500).json({
            mensaje: "Error interno al quitar el favorito."
        });
    }
});

module.exports = router;
