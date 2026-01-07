const pool = require("../../database/config.js");

// Obteniendo Lista de Estudiantes desde la API
// Esta función obtiene los estudiantes de un grupo específico desde una API externa
const getStudentsApi = async (req, res) => {
  try {
    // Obtenemos el token desde las variables de entorno
    const TOKEN = process.env.JWT_TOKEN_USO;
    if (!TOKEN) {
      return res
        .status(500)
        .json({ message: "Token no configurado en el servidor." });
    }

    // URL base de la API almacenada en las variables de entorno
    const API_PLANIFICACION_STUDENTS = process.env.API_ENDPOINT_STUDENTS;

    // Recuperamos el idGrupo (puede venir por params o por query, según la implementación)
    const { groupId } = req.params; // alternativamente: req.query.idGrupo

    // Armamos la URL final apuntando al recurso específico del grupo
    const url = `${API_PLANIFICACION_STUDENTS}/${groupId}`;

    // Realizamos la petición GET a la API con los headers necesarios
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
    });

    // Validamos si la respuesta fue exitosa
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Error en la respuesta de la API: ${response.statusText}. Detalle: ${errorText}`
      );
    }

    const data = await response.json();

    // Respondemos con la información obtenida de la API
    res.json(data);
  } catch (error) {
    // console.log("Error en getStudentsApi:", error);
    console.error("Error en getStudentsApi:", error);

    res.status(500).json({
      message: "Ups! Algo salió mal al obtener la información.",
      error: error.message,
    });
  }
};

const getStudentsApiReportList = async (req, res) => {
  try {
    const TOKEN = process.env.JWT_TOKEN_USO;
    if (!TOKEN) {
      return res
        .status(500)
        .json({ message: "Token no configurado en el servidor." });
    }

    // NUEVA URL del endpoint externo
    const API_REPORTE_ASISTENCIA = process.env.API_REPORTE_ASISTENCIA;

    // EXTRAEMOS datos del body
    const { idgrupo, ciclo } = req.body;

    if (!idgrupo || !ciclo) {
      return res
        .status(400)
        .json({ message: "iddocente y ciclo son requeridos" });
    }

    // Realizamos la petición POST a la API externa
    const response = await fetch(API_REPORTE_ASISTENCIA, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ idgrupo, ciclo }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Error en la API externa: ${response.statusText}. Detalle: ${errorText}`
      );
    }

    const data = await response.json();
    res.json(data);
    // console.log("✅ [BACKEND] Estudiantes obtenidos correctamente:", data);
  } catch (error) {
    console.error("Error en getStudentsApi:", error);
    res.status(500).json({
      message: "Error al obtener los estudiantes desde la API externa.",
      error: error.message,
    });
  }
};

// Actualizando Estudiantes en la API
const updateNotasGrupo = async (req, res) => {
  const { groupId } = req.params;
  const notas = req.body; // directamente el array de notas

  if (!groupId || isNaN(Number(groupId))) {
    return res.status(400).json({ message: "ID de grupo inválido" });
  }

  if (!Array.isArray(notas) || notas.length === 0) {
    return res
      .status(400)
      .json({ message: "El body debe contener un array de notas" });
  }

  // Validar que cada objeto tenga IDInscripcion
  const notasInvalidas = notas.filter((n) => !n.IDInscripcion);
  if (notasInvalidas.length > 0) {
    return res.status(400).json({
      message: "Uno o más objetos de nota no tienen IDInscripcion.",
      detalles: notasInvalidas,
    });
  }

  // 🟡 Logs útiles
  // console.log("✅ [BACKEND] Grupo recibido:", groupId);
  // console.log(
  //   "✅ [BACKEND] Notas recibidas en el body:\n",
  //   JSON.stringify(notas, null, 2)
  // );

  const API_NOTAS = process.env.API_NOTAS;
  const JWT_TOKEN_USO = process.env.JWT_TOKEN_USO;

  try {
    // console.log("📤 [API EXTERNA] Enviando payload a la API externa...");

    const responseFromApi = await fetch(API_NOTAS, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${JWT_TOKEN_USO}`,
      },
      body: JSON.stringify(notas),
    });

    const rawNotas = await responseFromApi.text();
    // console.log("📥 [API EXTERNA] Respuesta cruda:\n", rawNotas);

    let dataFromApi;
    try {
      dataFromApi = JSON.parse(rawNotas);
      // console.log("✅ [API EXTERNA] Respuesta parseada:\n", dataFromApi);
    } catch {
      console.error("❌ [ERROR] Fallo al parsear respuesta de la API externa");
      return res.status(500).json({
        message: "Respuesta no válida de la API externa (notas)",
        error: rawNotas,
      });
    }

    if (!responseFromApi.ok) {
      return res.status(responseFromApi.status).json({
        message:
          "Error al comunicar con la API externa para actualizar las notas.",
        error: dataFromApi,
      });
    }

    return res.json({
      message: "Notas enviadas correctamente a la API externa.",
      // data: dataFromApi.data,
      respuestaApiExterna: dataFromApi,
    });
  } catch (error) {
    console.error("❌ [ERROR API EXTERNA] Error inesperado:", error);
    return res.status(500).json({
      message: "Error al comunicar con la API externa.",
      error: error.message,
    });
  }
};

//Eliminando un nuevo Estudiante
const deleteStudent = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM estudiantes_identificaciones WHERE IDExpediente = ?",
      [id]
    );
    if (result.affectedRows <= 0) {
      return res.status(404).json({
        message: "Estudiante a eliminar no encontrado.",
      });
    }
    //Operacion exitosa!
    res.json("Estudiante eliminado satisfactoriamente!");
  } catch (error) {
    res.status(500).json({
      message: "Ups! Algo salió mal al eliminar un estudiante.",
    });
  }
};

module.exports = {
  getStudentsApi,
  getStudentsApiReportList,
  updateNotasGrupo,
  deleteStudent,
};
