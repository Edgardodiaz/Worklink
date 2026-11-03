
const express = require("express");
const cors = require("cors");
const pool = require("./database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const verificarToken = require("./middleware/auth");
const rutasPerfiles = require("./routers/perfiles");
const rutasServicios = require("./routers/servicios");
const rutasSolicitudes = require("./routers/solicitudes");
const rutasResenias = require("./routers/resenias");
const rutasFavoritos = require("./routers/favoritos");
const rutasMensajes = require("./routers/mensajes");
const billeteraRouter = require("./routers/billetera");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/perfiles", rutasPerfiles);
app.use("/api/servicios", rutasServicios);
app.use("/api/solicitudes", rutasSolicitudes);
app.use("/api/resenas", rutasResenias);
app.use("/api/favoritos", rutasFavoritos);
app.use("/api/mensajes", rutasMensajes);
app.use("/api/billetera", billeteraRouter);
// Comprobar que el servidor funciona
app.get("/", (req, res) => {
    res.json({
        proyecto: "Worklink API",
        mensaje: "El servidor está funcionando."
    });
});

// Comprobar la conexión con MySQL
app.get("/api/health", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT DATABASE() AS base_datos, 1 AS conexion"
        );

        res.json({
            estado: "correcto",
            mensaje: "Conexión con MySQL exitosa.",
            base_datos: rows[0].base_datos
        });
    } catch (error) {
        console.error("Error de conexión con MySQL:", error.message);

        res.status(500).json({
            estado: "error",
            mensaje: "No se pudo conectar con la base de datos."
        });
    }
});


app.get("/api/profesionales", async (req, res) => {
    try {
        const sql = `
            SELECT
                p.id_perfil,
                u.nombre,
                u.apellido,
                p.titulo_profesional,
                p.descripcion,
                p.anios_experiencia,
                p.tarifa_base,
                p.departamento,
                p.municipio,
                p.foto_url,
                p.disponible
            FROM perfiles_profesionales AS p
            INNER JOIN usuarios AS u
                ON p.id_usuario = u.id_usuario
            WHERE u.estado = 'activo'
            ORDER BY p.id_perfil DESC
        `;

        const [profesionales] = await pool.query(sql);

        res.json({
            total: profesionales.length,
            profesionales
        });
    } catch (error) {
        console.error("Error al consultar profesionales:", error.message);

        res.status(500).json({
            mensaje: "No se pudieron consultar los profesionales."
        });
    }
});


app.post("/api/usuarios", async (req, res) => {
    try {
        const {
            nombre,
            apellido,
            correo,
            contrasena,
            telefono,
            tipo_cuenta
        } = req.body;

        // Validar los campos obligatorios
        if (
            typeof nombre !== "string" ||
            typeof apellido !== "string" ||
            typeof correo !== "string" ||
            typeof contrasena !== "string"
        ) {
            return res.status(400).json({
                mensaje: "Nombre, apellido, correo y contraseña son obligatorios."
            });
        }

        const nombreLimpio = nombre.trim();
        const apellidoLimpio = apellido.trim();
        const correoLimpio = correo.trim().toLowerCase();

        if (!nombreLimpio || !apellidoLimpio) {
            return res.status(400).json({
                mensaje: "El nombre y el apellido no pueden estar vacíos."
            });
        }

        if (
            nombreLimpio.length > 80 ||
            apellidoLimpio.length > 80
        ) {
            return res.status(400).json({
                mensaje: "El nombre o apellido supera el límite permitido."
            });
        }

        if (
            correoLimpio.length > 150 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLimpio)
        ) {
            return res.status(400).json({
                mensaje: "Introduce un correo electrónico válido."
            });
        }

        if (contrasena.length < 8 || contrasena.length > 72) {
            return res.status(400).json({
                mensaje: "La contraseña debe tener entre 8 y 72 caracteres."
            });
        }

        const rolesPermitidos = ["cliente", "profesional", "ambos"];

        const rol = tipo_cuenta || "cliente";

        if (!rolesPermitidos.includes(rol)) {
            return res.status(400).json({
                mensaje: "El tipo de cuenta no es válido."
            });
        }

        // Comprobar si el correo ya está registrado
        const [existentes] = await pool.execute(
            "SELECT id_usuario FROM usuarios WHERE correo = ?",
            [correoLimpio]
        );

        if (existentes.length > 0) {
            return res.status(409).json({
                mensaje: "Este correo ya está registrado."
            });
        }

        // Proteger la contraseña antes de guardarla
        const contrasenaHash = await bcrypt.hash(contrasena, 12);

        const [resultado] = await pool.execute(
            `INSERT INTO usuarios
                (nombre, apellido, correo, contrasena_hash, telefono, tipo_cuenta)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                nombreLimpio,
                apellidoLimpio,
                correoLimpio,
                contrasenaHash,
                typeof telefono === "string" && telefono.trim()
                    ? telefono.trim().slice(0, 20)
                    : null,
                rol
            ]
        );

        return res.status(201).json({
            mensaje: "Usuario registrado correctamente.",
            usuario: {
                id_usuario: resultado.insertId,
                nombre: nombreLimpio,
                apellido: apellidoLimpio,
                correo: correoLimpio,
                tipo_cuenta: rol
            }
        });

    } catch (error) {
        console.error("Error al registrar usuario:", error.message);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                mensaje: "Este correo ya está registrado."
            });
        }

        return res.status(500).json({
            mensaje: "Ocurrió un error al registrar el usuario."
        });
    }
});


app.put("/api/usuarios/me", verificarToken, async (req, res) => {
    try {
        const idUsuario = req.usuario.id_usuario;
        const { nombre, apellido, correo, telefono } = req.body;

        if (
            typeof nombre !== "string" ||
            typeof apellido !== "string" ||
            typeof correo !== "string"
        ) {
            return res.status(400).json({
                mensaje: "Nombre, apellido y correo son obligatorios."
            });
        }

        const nombreLimpio = nombre.trim();
        const apellidoLimpio = apellido.trim();
        const correoLimpio = correo.trim().toLowerCase();

        if (!nombreLimpio || !apellidoLimpio) {
            return res.status(400).json({
                mensaje: "El nombre y el apellido no pueden estar vacíos."
            });
        }

        if (nombreLimpio.length > 80 || apellidoLimpio.length > 80) {
            return res.status(400).json({
                mensaje: "El nombre o apellido supera el límite permitido."
            });
        }

        if (
            correoLimpio.length > 150 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLimpio)
        ) {
            return res.status(400).json({
                mensaje: "Introduce un correo electrónico válido."
            });
        }

        if (
            telefono != null &&
            (typeof telefono !== "string" || telefono.trim().length > 20)
        ) {
            return res.status(400).json({
                mensaje: "El teléfono no es válido."
            });
        }

        const [existentes] = await pool.execute(
            `SELECT id_usuario
             FROM usuarios
             WHERE correo = ? AND id_usuario <> ?
             LIMIT 1`,
            [correoLimpio, idUsuario]
        );

        if (existentes.length > 0) {
            return res.status(409).json({
                mensaje: "Ese correo ya está registrado por otra cuenta."
            });
        }

        await pool.execute(
            `UPDATE usuarios
             SET nombre = ?, apellido = ?, correo = ?, telefono = ?
             WHERE id_usuario = ?`,
            [
                nombreLimpio,
                apellidoLimpio,
                correoLimpio,
                telefono?.trim() || null,
                idUsuario
            ]
        );

        const [usuarios] = await pool.execute(
            `SELECT id_usuario, nombre, apellido, correo,
                    telefono, tipo_cuenta
             FROM usuarios
             WHERE id_usuario = ?
             LIMIT 1`,
            [idUsuario]
        );

        return res.json({
            mensaje: "Tus datos personales se actualizaron correctamente.",
            usuario: usuarios[0]
        });
    } catch (error) {
        console.error("Error actualizando datos personales:", error.message);

        return res.status(500).json({
            mensaje: "No se pudieron actualizar tus datos personales."
        });
    }
});


app.post("/api/auth/login", async (req, res) => {
    try {
        const { correo, contrasena } = req.body;

        // Validar los datos recibidos
        if (
            typeof correo !== "string" ||
            typeof contrasena !== "string" ||
            !correo.trim() ||
            !contrasena
        ) {
            return res.status(400).json({
                mensaje: "Debes proporcionar correo y contraseña."
            });
        }

        const correoLimpio = correo.trim().toLowerCase();

        // Buscar al usuario por correo
        const [usuarios] = await pool.execute(
            `SELECT id_usuario, nombre, apellido, correo,
                    contrasena_hash, tipo_cuenta, estado
             FROM usuarios
             WHERE correo = ?
             LIMIT 1`,
            [correoLimpio]
        );

        if (usuarios.length === 0) {
            return res.status(401).json({
                mensaje: "Correo o contraseña incorrectos."
            });
        }

        const usuario = usuarios[0];

        // Comprobar la contraseña
        const contrasenaValida = await bcrypt.compare(
            contrasena,
            usuario.contrasena_hash
        );

        if (!contrasenaValida) {
            return res.status(401).json({
                mensaje: "Correo o contraseña incorrectos."
            });
        }

        // Impedir el acceso a cuentas inactivas o suspendidas
        if (usuario.estado !== "activo") {
            return res.status(403).json({
                mensaje: "Esta cuenta no está disponible."
            });
        }

        // Crear el token de acceso
        const token = jwt.sign(
            {
                rol: usuario.tipo_cuenta
            },
            process.env.JWT_SECRET,
            {
                subject: String(usuario.id_usuario),
                expiresIn: process.env.JWT_EXPIRES_IN || "15m",
                algorithm: "HS256"
            }
        );

        // Devolver el token y los datos públicos
        return res.status(200).json({
            mensaje: "Inicio de sesión exitoso.",
            token,
            usuario: {
                id_usuario: usuario.id_usuario,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                correo: usuario.correo,
                tipo_cuenta: usuario.tipo_cuenta
            }
        });

    } catch (error) {
        console.error("Error en el inicio de sesión:", error.message);

        return res.status(500).json({
            mensaje: "Ocurrió un error al iniciar sesión."
        });
    }
});

app.get("/api/auth/me", verificarToken, async (req, res) => {
    try {
        const [usuarios] = await pool.execute(
            `SELECT id_usuario, nombre, apellido, correo,
                telefono, tipo_cuenta, estado
            FROM usuarios
            WHERE id_usuario = ?
            LIMIT 1`,
            [req.usuario.id_usuario]
        );

        if (usuarios.length === 0 || usuarios[0].estado !== "activo") {
            return res.status(401).json({
                mensaje: "La cuenta no está disponible."
            });
        }

        return res.json({
            usuario: usuarios[0]
        });
    } catch (error) {
        console.error("Error al consultar la cuenta:", error.message);

        return res.status(500).json({
            mensaje: "No se pudo consultar el usuario."
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Worklink API disponible en http://localhost:${PORT}`);
});
