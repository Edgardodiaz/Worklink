const cloudinary = require("cloudinary").v2;

// Carga automáticamente las credenciales de CLOUDINARY_URL
cloudinary.config();

module.exports = cloudinary;