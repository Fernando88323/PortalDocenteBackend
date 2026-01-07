const jwt = require("jsonwebtoken");
require("dotenv").config();

const validateTokenMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const tokenFromHeader = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;
    const token = req.cookies.accessToken || tokenFromHeader;

    // console.log("Token recibido en el backend:", token?.slice(0, 10) + "...");

    if (!token) {
      return res
        .status(401)
        .json({ error: "Acceso no autorizado, token requerido" });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        if (err.name === "TokenExpiredError") {
          return res.status(401).json({ error: "La sesión ha expirado" });
        } else if (err.name === "JsonWebTokenError") {
          return res.status(401).json({
            error: "Token no válido. Por favor, vuelva a iniciar sesión!",
          });
        } else {
          return res.status(400).json({ error: "La sesión no es válida" });
        }
      }

      // Ajuste: asignar solo los datos del usuario
      req.user = decoded.data || decoded; // decoded.data para tu caso, fallback a decoded por compatibilidad

      //-- ajuste luego
      // Asignar IDDocente correctamente
      if (!req.user.IDDocente) {
        // Si existe IDReferencia, úsalo como IDDocente
        if (req.user.IDReferencia) {
          req.user.IDDocente = req.user.IDReferencia;
        } else if (req.user.empleado && req.user.empleado.IDDocente) {
          req.user.IDDocente = req.user.empleado.IDDocente;
        }
      }

      // Debug: log para entender la estructura del token
      // console.log(
      //   "Token decodificado completo:",
      //   JSON.stringify(decoded, null, 2)
      // );
      // console.log("req.user asignado:", JSON.stringify(req.user, null, 2));
      // -- aqui
      next();
    });
  } catch (error) {
    console.error("Error en la verificación del token:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

module.exports = validateTokenMiddleware;
