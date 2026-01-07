const dotenv = require("dotenv");
dotenv.config();

// Obtenemos lista de facultades desde API externa
const getFacultades = async (req, res) => {
  try {
    // --- Validación básica de autenticación ---
    if (!req.user || !req.user.sistemaasignacionroles) {
      return res.status(401).json({
        message: "No autenticado",
      });
    }

    // --- Consulta a API externa ---
    const TOKEN = process.env.JWT_TOKEN_USO;
    const API_DOCENTES = process.env.API_DOCENTES;

    if (!TOKEN) {
      return res
        .status(500)
        .json({ message: "Token no configurado en el servidor." });
    }

    if (!API_DOCENTES) {
      return res
        .status(500)
        .json({ message: "URL de API_DOCENTES no configurada." });
    }

    const ciclo = req.query.ciclo || "01/24"; // ciclo quemado

    const response = await fetch(API_DOCENTES, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ ciclo }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Error en API externa: ${response.status} ${response.statusText}. Detalle: ${errorText}`
      );
    }

    const data = await response.json();
    // console.log("Respuesta API:", JSON.stringify(data, null, 2));

    // Validate response structure
    if (!data) {
      throw new Error("La respuesta de la API está vacía");
    }

    // Check if response is an array or has a specific property that contains the array
    const docentes = Array.isArray(data) ? data : data.docentes || data.data;

    if (!Array.isArray(docentes)) {
      console.error("Estructura de respuesta recibida:", JSON.stringify(data));
      throw new Error(
        "Formato de respuesta no válido. Se esperaba un array de docentes."
      );
    }

    if (docentes.length === 0) {
      console.warn("No se encontraron docentes para el ciclo:", ciclo);
      return res.json([]);
    }

    // Validar que los objetos tienen las propiedades necesarias
    if (!docentes[0]?.IDFacultad || !docentes[0]?.Facultad) {
      console.error("Estructura de docente inválida:", docentes[0]);
      throw new Error(
        "Los datos de docentes no contienen las propiedades IDFacultad y Facultad requeridas"
      );
    }

    // Obtener todas las facultades únicas
    const facultadesUnicas = Array.from(
      new Map(
        docentes.map((d) => [
          d.IDFacultad,
          { IDFacultad: d.IDFacultad, Facultad: d.Facultad },
        ])
      ).values()
    );

    // Ordenar las facultades por IDFacultad de forma ascendente
    facultadesUnicas.sort((a, b) => a.IDFacultad - b.IDFacultad);

    // console.log("Facultades únicas encontradas:", facultadesUnicas.length);
    res.json(facultadesUnicas);
  } catch (error) {
    console.error("Error en getFacultades:", error.message || error);
    res.status(500).json({
      message: "Error al obtener facultades.",
      error: error.message,
      details: {
        ciclo: req.query.ciclo || "01/04",
        timestamp: new Date().toISOString(),
      },
    });
  }
};

module.exports = { getFacultades };
