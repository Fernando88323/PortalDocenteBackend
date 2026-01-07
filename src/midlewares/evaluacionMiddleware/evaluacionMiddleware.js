const verificarEvaluacionesHabilitadas = async (req, res, next) => {
  try {
    // Token que se enviará, asegúrate de que esté definido en tus variables de entorno
    const TOKEN = process.env.JWT_TOKEN_USO;
    if (!TOKEN) {
      return res.status(500).json({
        message: "Token no configurado en el servidor.",
        evaluacionesHabilitadas: false,
      });
    }

    const API_SISTEMA_CONFIGURACION_CICLO =
      process.env.API_SISTEMA_CONFIGURACION;

    // Realizar la petición GET a la API externa con el token de autorización
    const response = await fetch(API_SISTEMA_CONFIGURACION_CICLO, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
    });

    // Verificar si la respuesta fue exitosa
    if (!response.ok) {
      console.error(
        `Error en API externa: ${response.status} ${response.statusText}`
      );
      return res.status(503).json({
        message: "Las evaluaciones no están disponibles en este momento.",
        evaluacionesHabilitadas: false,
        error: "Error de comunicación con el sistema de configuración",
      });
    }

    const data = await response.json();

    // Extraer el estado de evaluación basado en la estructura de la respuesta
    let evaluacionHabilitada = false; // Por defecto deshabilitada

    if (
      data &&
      data.ok &&
      data.data &&
      Array.isArray(data.data) &&
      data.data.length > 0
    ) {
      const detenerEvaluacion = data.data[0].DetenerEvaluacionDesempeno;

      // Si DetenerEvaluacionDesempeno es "SI", significa que NO debe mostrar las evaluaciones (habilitada = false)
      // Si DetenerEvaluacionDesempeno es "NO", significa que SÍ debe mostrar las evaluaciones (habilitada = true)
      evaluacionHabilitada = detenerEvaluacion === "NO";
    }

    // Si las evaluaciones están deshabilitadas, denegar el acceso
    if (!evaluacionHabilitada) {
      return res.status(403).json({
        message: "Las evaluaciones están actualmente deshabilitadas.",
        evaluacionesHabilitadas: false,
        detenerEvaluacion: data.data?.[0]?.DetenerEvaluacionDesempeno || null,
        cicloActual: data.data?.[0]?.CicloInscripcion || null,
      });
    }

    // Si las evaluaciones están habilitadas, permitir continuar
    req.evaluacionesData = {
      habilitada: evaluacionHabilitada,
      cicloActual: data.data?.[0]?.CicloInscripcion || null,
      detenerEvaluacion: data.data?.[0]?.DetenerEvaluacionDesempeno || null,
    };

    next();
  } catch (error) {
    console.error("Error en verificarEvaluacionesHabilitadas:", error);

    // En caso de error, denegar el acceso por seguridad
    return res.status(500).json({
      message: "Error al verificar el estado de las evaluaciones.",
      evaluacionesHabilitadas: false,
      error: error.message,
    });
  }
};

module.exports = verificarEvaluacionesHabilitadas;
