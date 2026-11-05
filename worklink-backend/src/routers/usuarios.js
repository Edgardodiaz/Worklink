const express = require("express");
const multer = require("multer");
const pool = require("../database");
const cloudinary = require("../config/cloudinary");
const verificarToken = require("../middleware/auth");

const router = express.Router();

// Almacenar temporalmente la imagen en memoria
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // Máximo 5 MB
    },
    fileFilter: (req, file, callback) => {
        const formatosPermitidos = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        if (!formatosPermitidos.includes(file.mimetype)) {
            return callback(
                new Error("Solo se permiten imágenes JPG, PNG o WEBP.")
            );
        }

        callback(null, true);
    }
});

// Subir fotografía del usuario
router.post(
    "/foto",
    verificarToken,
    upload.single("foto"),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    mensaje: "Debes seleccionar una fotografía."
                });
            }

            const resultado = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        folder: "worklink/fotos_perfil",
                        resource_type: "image",
                        transformation: [
                            {
                                width: 800,
                                height: 800,
                                crop: "limit"
                            }
                        ]
                    },
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    }
                );

                stream.end(req.file.buffer);
            });

            const fotoUrl = resultado.secure_url;

            await pool.execute(
                `UPDATE usuarios
                 SET foto_url = ?
                 WHERE id_usuario = ?`,
                [fotoUrl, req.usuario.id_usuario]
            );

            return res.json({
                mensaje: "Fotografía actualizada correctamente.",
                foto_url: fotoUrl
            });

        } catch (error) {
            console.error("Error al subir fotografía:", error.message);

            return res.status(500).json({
                mensaje: "No se pudo actualizar la fotografía."
            });
        }
    }
);

// Manejar errores de carga
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        return res.status(400).json({
            mensaje: error.code === "LIMIT_FILE_SIZE"
                ? "La imagen no puede superar los 5 MB."
                : "No se pudo procesar la imagen."
        });
    }

    if (error) {
        return res.status(400).json({
            mensaje: error.message
        });
    }

    next();
});

module.exports = router;