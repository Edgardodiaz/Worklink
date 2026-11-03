
const express = require("express");
const pool = require("../database");
const verificarToken = require("../middleware/auth");

const router = express.Router();

const camposPublicos = `
    p.id_perfil,
    p.id_usuario,
    u.nombre,
    u.apellido,
    p.titulo_profesional,
    p.descripcion,
    p.anios_experiencia,
    p.tarifa_base,
    p.departamento,
    p.municipio,
    p.foto_url,
    p.disponible,
    p.verificado,
    p.fecha_creacion
`;

// GET /api/perfiles
// Consultar perfiles públicos
router.get("/", async (req, res) => {
    try {
        const { busqueda, municipio, categoria } = req.query;

        let sql = `
            SELECT DISTINCT ${camposPublicos}
            FROM perfiles_profesionales AS p
            INNER JOIN usuarios AS u
                ON u.id_usuario = p.id_usuario
            LEFT JOIN servicios AS s
                ON s.id_perfil = p.id_perfil
                AND s.activo = TRUE
            LEFT JOIN categorias AS c
                ON c.id_categoria = s.id_categoria
            WHERE u.estado = 'activo'
                AND p.disponible = TRUE
        `;

        const parametros = [];

        if (typeof busqueda === "string" && busqueda.trim()) {
            sql += `
                AND (
                    p.titulo_profesional LIKE ?
                    OR p.descripcion LIKE ?
                    OR CONCAT(u.nombre, ' ', u.apellido) LIKE ?
                    OR s.nombre LIKE ?
                    OR c.nombre LIKE ?
                )
            `;

            const termino = `%${busqueda.trim()}%`;
            parametros.push(
                termino, termino, termino, termino, termino
            );
        }

        if (typeof municipio === "string" && municipio.trim()) {
            sql += " AND p.municipio = ?";
            parametros.push(municipio.trim());
        }

        if (typeof categoria === "string" && categoria.trim()) {
            sql += " AND c.nombre = ?";
            parametros.push(categoria.trim());
        }

        sql += " ORDER BY p.id_perfil DESC";

        const [perfiles] = await pool.execute(sql, parametros);

        res.json({
            total: perfiles.length,
            perfiles
        });
    } catch (error) {
        console.error("Error consultando perfiles:", error.message);

        res.status(500).json({
            mensaje: "No se pudieron consultar los perfiles."
        });
    }
});


/* GET /api/perfiles/mi-perfil
   Consultar el perfil profesional de la cuenta autenticada. */
router.get("/mi-perfil", verificarToken, async (req, res) => {
    try {
        const idUsuario = req.usuario.id_usuario;

        const [perfiles] = await pool.execute(
            `SELECT
                id_perfil,
                id_usuario,
                titulo_profesional,
                descripcion,
                anios_experiencia,
                tarifa_base,
                departamento,
                municipio,
                direccion_referencia,
                foto_url,
                disponible,
                verificado
             FROM perfiles_profesionales
             WHERE id_usuario = ?
             LIMIT 1`,
            [idUsuario]
        );

        if (perfiles.length === 0) {
            return res.json({ perfil: null });
        }

        return res.json({ perfil: perfiles[0] });
    } catch (error) {
        console.error("Error consultando perfil propio:", error.message);

        return res.status(500).json({
            mensaje: "No se pudo consultar tu perfil profesional."
        });
    }
});


// GET /api/perfiles/:id
// Consultar un perfil público
router.get("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id < 1) {
            return res.status(400).json({
                mensaje: "El identificador del perfil no es válido."
            });
        }

        const [perfiles] = await pool.execute(
            `SELECT ${camposPublicos}
             FROM perfiles_profesionales AS p
             INNER JOIN usuarios AS u
                ON u.id_usuario = p.id_usuario
             WHERE p.id_perfil = ?
                AND u.estado = 'activo'
                AND p.disponible = TRUE`,
            [id]
        );

        if (perfiles.length === 0) {
            return res.status(404).json({
                mensaje: "Perfil no encontrado o no disponible."
            });
        }

        const [servicios] = await pool.execute(
            `SELECT
                s.id_servicio,
                s.nombre,
                s.descripcion,
                s.precio_desde,
                s.tipo_precio,
                c.nombre AS categoria
             FROM servicios AS s
             INNER JOIN categorias AS c
                ON c.id_categoria = s.id_categoria
             WHERE s.id_perfil = ?
                AND s.activo = TRUE
             ORDER BY s.id_servicio DESC`,
            [id]
        );

        res.json({
            perfil: perfiles[0],
            servicios
        });
    } catch (error) {
        console.error("Error consultando perfil:", error.message);

        res.status(500).json({
            mensaje: "No se pudo consultar el perfil."
        });
    }
});

// POST /api/perfiles
// Crear el perfil del usuario autenticado
router.post("/", verificarToken, async (req, res) => {
    try {
        const idUsuario = req.usuario.id_usuario;

        if (!["cliente", "profesional", "ambos"].includes(req.usuario.tipo_cuenta)) {            
            return res.status(403).json({
                mensaje: "Tu cuenta no está habilitada para ofrecer servicios."
            });
        }

        const {
            titulo_profesional,
            descripcion,
            anios_experiencia,
            tarifa_base,
            departamento,
            municipio,
            direccion_referencia,
            foto_url
        } = req.body;

        if (
            typeof titulo_profesional !== "string" ||
            !titulo_profesional.trim()
        ) {
            return res.status(400).json({
                mensaje: "El título profesional es obligatorio."
            });
        }

        if (titulo_profesional.trim().length > 120) {
            return res.status(400).json({
                mensaje: "El título no puede superar 120 caracteres."
            });
        }

        if (
            descripcion != null &&
            (typeof descripcion !== "string" || descripcion.length > 5000)
        ) {
            return res.status(400).json({
                mensaje: "La descripción no es válida o es demasiado larga."
            });
        }

        const experiencia = anios_experiencia ?? 0;

        if (
            !Number.isInteger(experiencia) ||
            experiencia < 0 ||
            experiencia > 100
        ) {
            return res.status(400).json({
                mensaje: "Los años de experiencia deben estar entre 0 y 100."
            });
        }

        let tarifa = null;

        if (tarifa_base !== undefined && tarifa_base !== null && tarifa_base !== "") {
            tarifa = Number(tarifa_base);

            if (!Number.isFinite(tarifa) || tarifa < 0 || tarifa > 99999999.99) {
                return res.status(400).json({
                    mensaje: "La tarifa base no es válida."
                });
            }
        }

        for (const [campo, valor] of [
            ["departamento", departamento],
            ["municipio", municipio],
            ["direccion_referencia", direccion_referencia]
        ]) {
            if (valor != null && typeof valor !== "string") {
                return res.status(400).json({
                    mensaje: `El campo ${campo} debe ser texto.`
                });
            }
        }

        if (
            foto_url != null &&
            (typeof foto_url !== "string" || foto_url.length > 500)
        ) {
            return res.status(400).json({
                mensaje: "La dirección de la foto no es válida."
            });
        }

        // Comprobar si el usuario ya tiene un perfil
        const [existentes] = await pool.execute(
            "SELECT id_perfil FROM perfiles_profesionales WHERE id_usuario = ?",
            [idUsuario]
        );

        if (existentes.length > 0) {
            return res.status(409).json({
                mensaje: "Ya tienes un perfil profesional."
            });
        }

        const [resultado] = await pool.execute(
            `INSERT INTO perfiles_profesionales (
                id_usuario,
                titulo_profesional,
                descripcion,
                anios_experiencia,
                tarifa_base,
                departamento,
                municipio,
                direccion_referencia,
                foto_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                idUsuario,
                titulo_profesional.trim(),
                descripcion?.trim() || null,
                experiencia,
                tarifa,
                departamento?.trim() || null,
                municipio?.trim() || null,
                direccion_referencia?.trim() || null,
                foto_url?.trim() || null
            ]
        );

        res.status(201).json({
            mensaje: "Perfil profesional creado correctamente.",
            id_perfil: resultado.insertId
        });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                mensaje: "Ya existe un perfil para esta cuenta."
            });
        }

        console.error("Error creando perfil:", error.message);

        res.status(500).json({
            mensaje: "No se pudo crear el perfil."
        });
    }
});

// PUT /api/perfiles/:id
// Actualizar únicamente el perfil propio
router.put("/:id", verificarToken, async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id < 1) {
            return res.status(400).json({
                mensaje: "El identificador no es válido."
            });
        }

        const campos = {
            titulo_profesional: { max: 120 },
            descripcion: { max: 5000 },
            anios_experiencia: { min: 0, max: 100, integer: true },
            tarifa_base: { min: 0, max: 99999999.99, numeric: true },
            departamento: { max: 100 },
            municipio: { max: 100 },
            direccion_referencia: { max: 255 },
            foto_url: { max: 500 }
        };

        const actualizaciones = [];
        const valores = [];

        for (const [campo, reglas] of Object.entries(campos)) {
            if (!Object.prototype.hasOwnProperty.call(req.body, campo)) {
                continue;
            }

            let valor = req.body[campo];

            if (campo === "tarifa_base" && valor === null) {
                actualizaciones.push("tarifa_base = ?");
                valores.push(null);
                continue;
            }

            if (valor === null && campo !== "titulo_profesional") {
                actualizaciones.push(`${campo} = ?`);
                valores.push(null);
                continue;
            }

            if (reglas.integer) {
                if (
                    !Number.isInteger(valor) ||
                    valor < reglas.min ||
                    valor > reglas.max
                ) {
                    return res.status(400).json({
                        mensaje: "Los años de experiencia no son válidos."
                    });
                }
            } else if (reglas.numeric) {
                valor = Number(valor);

                if (
                    !Number.isFinite(valor) ||
                    valor < reglas.min ||
                    valor > reglas.max
                ) {
                    return res.status(400).json({
                        mensaje: "La tarifa base no es válida."
                    });
                }
            } else {
                if (typeof valor !== "string") {
                    return res.status(400).json({
                        mensaje: `El campo ${campo} debe ser texto.`
                    });
                }

                valor = valor.trim();

                if (!valor && campo === "titulo_profesional") {
                    return res.status(400).json({
                        mensaje: "El título profesional no puede estar vacío."
                    });
                }

                if (valor.length > reglas.max) {
                    return res.status(400).json({
                        mensaje: `El campo ${campo} supera el límite permitido.`
                    });
                }
            }

            actualizaciones.push(`${campo} = ?`);
            valores.push(valor);
        }

        if (actualizaciones.length === 0) {
            return res.status(400).json({
                mensaje: "No proporcionaste campos válidos para actualizar."
            });
        }

        valores.push(id, req.usuario.id_usuario);

        const [resultado] = await pool.execute(
            `UPDATE perfiles_profesionales
             SET ${actualizaciones.join(", ")}
             WHERE id_perfil = ?
                AND id_usuario = ?`,
            valores
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensaje: "No se encontró un perfil propio con ese identificador."
            });
        }

        res.json({
            mensaje: "Perfil actualizado correctamente."
        });
    } catch (error) {
        console.error("Error actualizando perfil:", error.message);

        res.status(500).json({
            mensaje: "No se pudo actualizar el perfil."
        });
    }
});

// DELETE /api/perfiles/:id
// Desactivar el perfil propio sin borrar los datos
router.delete("/:id", verificarToken, async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id < 1) {
            return res.status(400).json({
                mensaje: "El identificador no es válido."
            });
        }

        const [resultado] = await pool.execute(
            `UPDATE perfiles_profesionales
             SET disponible = FALSE
             WHERE id_perfil = ?
                AND id_usuario = ?`,
            [id, req.usuario.id_usuario]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({
                mensaje: "No se encontró un perfil propio con ese identificador."
            });
        }

        res.json({
            mensaje: "Perfil desactivado correctamente."
        });
    } catch (error) {
        console.error("Error desactivando perfil:", error.message);

        res.status(500).json({
            mensaje: "No se pudo desactivar el perfil."
        });
    }
});

module.exports = router;
