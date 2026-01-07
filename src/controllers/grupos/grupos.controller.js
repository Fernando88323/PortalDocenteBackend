const pool = require("../../database/config.js");
const dotenv = require("dotenv");
dotenv.config();

// Obteniendo lista de grupos del docente del ciclo actual.
const getGroupsApi = async (req, res) => {
  try {
    const { iddocente, ciclo } = req.body;
    if (!iddocente || !ciclo) {
      return res
        .status(400)
        .json({ message: "Faltan datos obligatorios: iddocente o ciclo." });
    }

    const TOKEN = process.env.JWT_TOKEN_USO;
    if (!TOKEN) {
      return res
        .status(500)
        .json({ message: "Token no configurado en el servidor." });
    }

    const API_PLANIFICACION = process.env.API_ENDPOINT;

    const response = await fetch(API_PLANIFICACION, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ iddocente, ciclo }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Error en la respuesta de la API: ${response.statusText}. Detalle: ${errorText}`
      );
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error en getGroupsApi:", error);
    res.status(500).json({
      message: "Ups! Algo salió mal al obtener la información.",
      error: error.message,
    });
  }
};

module.exports = {
  getGroupsApi,
};
