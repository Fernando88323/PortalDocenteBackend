// middlewares/authMiddleware/userData.js
const userData = async (req, res) => {
  try {
    const user = req.user;
    // console.log("Usuario en userData:", user);

    if (!user) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    res.json({
      IDUsuario: user.IDUsuario, // ID del usuario
      Usuario: user.Usuario, // Nombres del usuario
      Tipo: user.Tipo, // Apellidos del usuario
      IDReferencia: user.IDReferencia, // Título del usuario
      EmailKey: user.EmailKey,
      sistemaasignacionroles: user.sistemaasignacionroles,
      empleado: user.empleado, // Información del empleado (NombreCompleto, Titulo)
    });
  } catch (error) {
    console.error("Error obteniendo datos del usuario:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

module.exports = userData;
