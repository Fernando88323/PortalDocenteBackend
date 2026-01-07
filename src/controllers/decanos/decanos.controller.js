const dotenv = require("dotenv");
dotenv.config();

const getDecanos = async (req, res) => {
  try {
    // --- Validación básica de autenticación ---
    if (!req.user || !req.user.sistemaasignacionroles) {
      return res.status(401).json({
        message: "No autenticado",
      });
    }

    // --- Consulta a API externa ---
    const TOKEN = process.env.JWT_TOKEN_USO;
    if (!TOKEN) {
      return res
        .status(500)
        .json({ message: "Token no configurado en el servidor." });
    }

    const API_DECANOS = process.env.API_DECANOS;

    // Realizar la petición GET a la API externa con el token de autorización
    const response = await fetch(API_DECANOS, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
    });

    // Verificar si la respuesta fue exitosa
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Error en API externa: ${response.status} ${response.statusText}. Detalle: ${errorText}`
      );
    }

    const data = await response.json();
    // console.log("Respuesta API Decanos:", JSON.stringify(data, null, 2));

    // Validar estructura de respuesta
    if (!data) {
      throw new Error("La respuesta de la API está vacía");
    }

    // Verificar que la respuesta tenga la estructura esperada
    if (!data.ok || !data.data || !Array.isArray(data.data)) {
      console.error("Estructura de respuesta recibida:", JSON.stringify(data));
      throw new Error(
        "Formato de respuesta no válido. Se esperaba { ok: true, data: [...] }"
      );
    }

    // Extraer los decanos de la respuesta
    const decanos = data.data;

    res.json({
      ok: data.ok,
      mensaje: data.mensaje || "Decanos obtenidos correctamente",
      decanos: decanos,
      total: decanos.length,
    });
  } catch (error) {
    console.error("Error en getDecanos:", error);
    res.status(500).json({
      message: "Error al obtener los decanos desde la API externa.",
      error: error.message,
    });
  }
};

module.exports = {
  getDecanos,
};
