
const express = require("express");
const pool = require("../database");
const verificarToken = require("../middleware/auth");

const router = express.Router();

const TIPOS_PRECIO = ["fijo", "por_hora", "cotizacion"];

// GET /api/servicios/categorias
// Consultar las categorías activas
router.get("/categorias", verificarToken, async (req, res) => {
    try {
        const [categorias] = await pool.execute(
            `SELECT id_categoria, nombre, descripcion
             FROM categorias
             WHERE activa = TRUE
             ORDER BY nombre ASC`
        );

        return res.json({ categorias });
    } catch (error) {
        console.error("Error consultando categorías:", error.message);

        return res.status(500).json({
            mensaje: "No se pudieron consultar las categorías."
        });
    }
});

// GET /api/servicios/mis-servicios
// Consultar los servicios del usuario autenticado
router.get("/mis-servicios", verificarToken, async (req, res) => {
    try {
        const idUsuario = req.usuario.id_usuario;

        const [servicios] = await pool.execute(
            `SELECT
                s.id_servicio,
                s.id_categoria,
                c.nombre AS categoria,
                s.nombre,
                s.descripcion,
                s.precio_desde,
                s.tipo_precio,
                s.activo,
                s.fecha_creacion
             FROM servicios AS s
             INNER JOIN perfiles_profesionales AS p
                ON p.id_perfil = s.id_perfil
             INNER JOIN categorias AS c
                ON c.id_categoria = s.id_categoria
             WHERE p.id_usuario = ?
             ORDER BY s.fecha_creacion DESC`,
            [idUsuario]
        );

        return res.json({
            total: servicios.length,
            servicios
        });
    } catch (error) {
        console.error("Error consultando mis servicios:", error.message);

        return res.status(500).json({
            mensaje: "No se pudieron consultar tus servicios."
        });
    }
});

// POST /api/servicios
// Crear un servicio para el perfil del usuario autenticado
router.post("/", verificarToken, async (req, res) => {
    try {
        const idUsuario = req.usuario.id_usuario;

        if (!["profesional", "ambos"].includes(req.usuario.tipo_cuenta)) {
            return res.status(403).json({
                mensaje: "Tu cuenta no puede publicar servicios."
            });
        }

        const {
            id_categoria,
            nombre,
            descripcion,
            precio_desde,
            tipo_precio
        } = req.body;

        if (
            typeof nombre !== "string" ||
            !nombre.trim() ||
            nombre.trim().length > 150
        ) {
            return res.status(400).json({
                mensaje: "El nombre del servicio es obligatorio y debe tener máximo 150 caracteres."
            });
        }

        if (
            descripcion != null &&
            (typeof descripcion !== "string" ||
                descripcion.length > 5000)
        ) {
            return res.status(400).json({
                mensaje: "La descripción no es válida."
            });
        }

        const categoriaId = Number(id_categoria);

        if (!Number.isSafeInteger(categoriaId) || categoriaId < 1) {
            return res.status(400).json({
                mensaje: "Selecciona una categoría válida."
            });
        }

        const tipo = tipo_precio ?? "cotizacion";

        if (!TIPOS_PRECIO.includes(tipo)) {
            return res.status(400).json({
                mensaje: "El tipo de precio no es válido."
            });
        }

        let precio = null;

        if (
            precio_desde !== undefined &&
            precio_desde !== null &&
            precio_desde !== ""
        ) {
            precio = Number(precio_desde);

            if (
                !Number.isFinite(precio) ||
                precio < 0 ||
                precio > 99999999.99
            ) {
                return res.status(400).json({
                    mensaje: "El precio debe ser un número válido y no negativo."
                });
            }
        }

        if (
            (tipo === "fijo" || tipo === "por_hora") &&
            precio === null
        ) {
            return res.status(400).json({
                mensaje: "Este tipo de precio requiere indicar un importe."
            });
        }

        if (tipo === "cotizacion") {
            precio = null;
        }

        const [perfiles] = await pool.execute(
            `SELECT id_perfil
             FROM perfiles_profesionales
             WHERE id_usuario = ? AND disponible = TRUE
             LIMIT 1`,
            [idUsuario]
        );

        if (perfiles.length === 0) {
            return res.status(409).json({
                mensaje: "Necesitas un perfil profesional disponible para publicar servicios."
            });
        }

        const [categorias] = await pool.execute(
            `SELECT id_categoria
             FROM categorias
             WHERE id_categoria = ? AND activa = TRUE`,
            [categoriaId]
        );

        if (categorias.length === 0) {
            return res.status(400).json({
                mensaje: "La categoría seleccionada no existe o está inactiva."
            });
        }

        const [resultado] = await pool.execute(
            `INSERT INTO servicios (
                id_perfil,
                id_categoria,
                nombre,
                descripcion,
                precio_desde,
                tipo_precio
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
                perfiles[0].id_perfil,
                categoriaId,
                nombre.trim(),
                descripcion?.trim() || null,
                precio,
                tipo
            ]
        );

        return res.status(201).json({
            mensaje: "Servicio publicado correctamente.",
            id_servicio: resultado.insertId
        });
    } catch (error) {
        console.error("Error creando servicio:", error.message);

        return res.status(500).json({
            mensaje: "No se pudo publicar el servicio."
        });
    }
});

// PUT /api/servicios/:id
// Actualizar únicamente un servicio propio
router.put("/:id", verificarToken, async (req, res) => {
    try {
        const idServicio = Number(req.params.id);

        if (!Number.isSafeInteger(idServicio) || idServicio < 1) {
            return res.status(400).json({
                mensaje: "El identificador del servicio no es válido."
            });
        }

        const [servicios] = await pool.execute(
            `SELECT s.id_servicio
             FROM servicios AS s
             INNER JOIN perfiles_profesionales AS p
                ON p.id_perfil = s.id_perfil
             WHERE s.id_servicio = ?
               AND p.id_usuario = ?`,
            [idServicio, req.usuario.id_usuario]
        );

        if (servicios.length === 0) {
            return res.status(404).json({
                mensaje: "No se encontró un servicio propio con ese identificador."
            });
        }

        const {
            id_categoria,
            nombre,
            descripcion,
            precio_desde,
            tipo_precio
        } = req.body;

        const cambios = [];
        const valores = [];

        if (id_categoria !== undefined) {
            const categoriaId = Number(id_categoria);

            if (!Number.isSafeInteger(categoriaId) || categoriaId < 1) {
                return res.status(400).json({
                    mensaje: "La categoría no es válida."
                });
            }

            const [categorias] = await pool.execute(
                `SELECT id_categoria
                 FROM categorias
                 WHERE id_categoria = ? AND activa = TRUE`,
                [categoriaId]
            );

            if (categorias.length === 0) {
                return res.status(400).json({
                    mensaje: "La categoría no existe o está inactiva."
                });
            }

            cambios.push("id_categoria = ?");
            valores.push(categoriaId);
        }

        if (nombre !== undefined) {
            if (
                typeof nombre !== "string" ||
                !nombre.trim() ||
                nombre.trim().length > 150
            ) {
                return res.status(400).json({
                    mensaje: "El nombre del servicio no es válido."
                });
            }

            cambios.push("nombre = ?");
            valores.push(nombre.trim());
        }

        if (descripcion !== undefined) {
            if (
                descripcion !== null &&
                (typeof descripcion !== "string" ||
                    descripcion.length > 5000)
            ) {
                return res.status(400).json({
                    mensaje: "La descripción no es válida."
                });
            }

            cambios.push("descripcion = ?");
            valores.push(
                typeof descripcion === "string" && descripcion.trim()
                    ? descripcion.trim()
                    : null
            );
        }

        if (
            tipo_precio !== undefined &&
            !TIPOS_PRECIO.includes(tipo_precio)
        ) {
            return res.status(400).json({
                mensaje: "El tipo de precio no es válido."
            });
        }

        if (tipo_precio !== undefined) {
            cambios.push("tipo_precio = ?");
            valores.push(tipo_precio);
        }

        if (precio_desde !== undefined) {
            let precio = null;

            if (precio_desde !== null && precio_desde !== "") {
                precio = Number(precio_desde);

                if (
                    !Number.isFinite(precio) ||
                    precio < 0 ||
                    precio > 99999999.99
                ) {
                    return res.status(400).json({
                        mensaje: "El precio no es válido."
                    });
                }
            }

            cambios.push("precio_desde = ?");
            valores.push(precio);
        }

        if (tipo_precio === "cotizacion") {
            cambios.push("precio_desde = ?");
            valores.push(null);
        }

        if (cambios.length === 0) {
            return res.status(400).json({
                mensaje: "No proporcionaste cambios para actualizar."
            });
        }

        valores.push(idServicio, req.usuario.id_usuario);

        await pool.execute(
            `UPDATE servicios AS s
             INNER JOIN perfiles_profesionales AS p
                ON p.id_perfil = s.id_perfil
             SET ${cambios.join(", ")}
             WHERE s.id_servicio = ?
               AND p.id_usuario = ?`,
            valores
        );

        return res.json({
            mensaje: "Servicio actualizado correctamente."
        });
    } catch (error) {
        console.error("Error actualizando servicio:", error.message);

        return res.status(500).json({
            mensaje: "No se pudo actualizar el servicio."
        });
    }
});

// DELETE /api/servicios/:id
// Desactivar el servicio propio sin borrar el registro
router.delete("/:id", verificarToken, async (req, res) => {
    try {
        const idServicio = Number(req.params.id);

        if (!Number.isSafeInteger(idServicio) || idServicio < 1) {
            return res.status(400).json({
                mensaje: "El identificador del servicio no es válido."
            });
        }

        const [resultado] = await pool.execute(
            `UPDATE servicios AS s
             INNER JOIN perfiles_profesionales AS p
                ON p.id_perfil = s.id_perfil
             SET s.activo = FALSE
             WHERE s.id_servicio = ?
               AND p.id_usuario = ?
               AND s.activo = TRUE`,
            [idServicio, req.usuario.id_usuario]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensaje: "No se encontró un servicio activo de tu propiedad."
            });
        }

        return res.json({
            mensaje: "Servicio desactivado correctamente."
        });
    } catch (error) {
        console.error("Error desactivando servicio:", error.message);

        return res.status(500).json({
            mensaje: "No se pudo desactivar el servicio."
        });
    }
});

module.exports = router;
