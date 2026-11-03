
const jwt = require("jsonwebtoken");

function verificarToken(req, res, next) {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
        return res.status(401).json({
            mensaje: "Debes iniciar sesión para acceder."
        });
    }

    const token = authorization.slice(7).trim();

    try {
        const payload = jwt.verify(
            token,
            process.env.JWT_SECRET,
            { algorithms: ["HS256"] }
        );

        req.usuario = {
            id_usuario: Number(payload.sub),
            tipo_cuenta: payload.rol
        };

        return next();
    } catch (error) {
        return res.status(401).json({
            mensaje: "El token es inválido o ha expirado."
        });
    }
}

module.exports = verificarToken;
 