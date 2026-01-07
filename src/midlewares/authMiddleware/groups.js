// middlewares/authMiddleware/grupos.js
const gruposProtected = async (req, res) => {
  try {
    const user = req.user;
    // console.log("Usuario en gruposProtected:", user);

    if (!user) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    res.json({
      IDReferencia: user.IDReferencia, // ID del usuario
    });
  } catch (error) {
    console.error(
      "Error obteniendo datos de usuario en gruposProtected:",
      error
    );
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

module.exports = gruposProtected;
