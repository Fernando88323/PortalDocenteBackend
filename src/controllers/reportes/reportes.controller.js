// Controlador para obtener tasa de aprobación desde la API Krakatoa
const getTasaAprobacion = async (req, res) => {
  try {
    const { ciclo } = req.body;

    if (!ciclo) {
      return res.status(400).json({
        message: "Ciclo es requerido.",
      });
    }

    const KRAK_URL = process.env.API_TASA_APROBACION;

    const TOKEN = process.env.JWT_TOKEN_USO;

    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ciclo: String(ciclo) }),
    };

    if (TOKEN) options.headers.Authorization = `Bearer ${TOKEN}`;

    const response = await fetch(KRAK_URL, options);

    if (!response.ok) {
      const text = await response.text();
      console.error("Error response from Krakatoa:", response.status, text);
      return res.status(502).json({
        message: "Error al consultar servicio externo de reportes.",
        status: response.status,
        detail: text,
      });
    }

    const data = await response.json();

    // Responder con la misma estructura o con data.data si existe
    if (data && Object.prototype.hasOwnProperty.call(data, "data")) {
      return res.json({ ok: true, data: data.data });
    }

    return res.json(data);
  } catch (error) {
    console.error("getTasaAprobacion error:", error);
    return res.status(500).json({
      message: "Ups! Error al obtener la tasa de aprobación.",
      error: error.message,
    });
  }
};

// Llama al endpoint Krakatoa que devuelve la lista de inscripciones/estudiantes del grupo
const getTasaAprobacionGrupo = async (req, res) => {
  try {
    const { idgrupo, ciclo } = req.body;

    if (!idgrupo || !ciclo) {
      return res.status(400).json({
        message:
          "Faltan campos obligatorios en el body: idgrupo y ciclo son requeridos.",
      });
    }

    const KRAK_URL = process.env.API_TASA_APROBACION_GRUPO;

    const TOKEN = process.env.JWT_TOKEN_USO;

    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idgrupo: String(idgrupo), ciclo: String(ciclo) }),
    };

    if (TOKEN) options.headers.Authorization = `Bearer ${TOKEN}`;

    const response = await fetch(KRAK_URL, options);

    if (!response.ok) {
      const text = await response.text();
      console.error(
        "Error response from Krakatoa (grupo):",
        response.status,
        text
      );
      return res.status(502).json({
        message: "Error al consultar servicio externo de reportes (grupo).",
        status: response.status,
        detail: text,
      });
    }

    const data = await response.json();

    // Esperamos estructura { ok: true, mensaje: '', data: [...] }
    if (data && Object.prototype.hasOwnProperty.call(data, "data")) {
      return res.json({ ok: true, data: data.data });
    }

    return res.json(data);
  } catch (error) {
    console.error("getTasaAprobacionGrupo error:", error);
    return res.status(500).json({
      message: "Ups! Error al obtener la lista de inscripciones del grupo.",
      error: error.message,
    });
  }
};

// Nueva función para estudiantes solventes
const getSolvenciaDePagos = async (req, res) => {
  try {
    const { ciclo, idgrupo, cuota } = req.body;

    // console.log("Datos recibidos:", { ciclo, idgrupo, cuota });

    if (
      !ciclo ||
      !idgrupo ||
      cuota === null ||
      cuota === undefined ||
      cuota === ""
    ) {
      return res.status(400).json({
        message:
          "Faltan campos obligatorios en el body: ciclo, idgrupo y cuota son requeridos.",
      });
    }

    const KRAK_URL = process.env.API_ESTUDIANTES_SOLVENTES;

    const TOKEN = process.env.JWT_TOKEN_USO;

    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ciclo: String(ciclo),
        idgrupo: String(idgrupo),
        cuota: String(cuota),
      }),
    };

    if (TOKEN) options.headers.Authorization = `Bearer ${TOKEN}`;

    const response = await fetch(KRAK_URL, options);

    if (!response.ok) {
      const text = await response.text();
      console.error(
        "Error response from Krakatoa (estudiantes solventes):",
        response.status,
        text
      );
      return res.status(502).json({
        message:
          "Error al consultar servicio externo de estudiantes solventes.",
        status: response.status,
        detail: text,
      });
    }

    const data = await response.json();

    // Asumimos que la API devuelve todos los estudiantes del grupo
    // Filtramos solventes (CuotaPagos >= cuota) y no solventes
    if (data && Object.prototype.hasOwnProperty.call(data, "data")) {
      const allStudents = data.data;
      const cuotaNum = parseInt(cuota);
      const solventes = allStudents.filter(
        (student) => student.CuotaPagos >= cuotaNum
      );
      const noSolventes = allStudents.filter(
        (student) => student.CuotaPagos < cuotaNum
      );

      return res.json({
        ok: true,
        cantidadSolventes: solventes.length,
        cantidadNoSolventes: noSolventes.length,
        totalRegistros: allStudents.length,
        data: solventes,
      });
    }

    return res.json(data);
  } catch (error) {
    console.error("getEstudiantesSolventes error:", error);
    return res.status(500).json({
      message: "Ups! Error al obtener la lista de estudiantes solventes.",
      error: error.message,
    });
  }
};

module.exports = {
  getTasaAprobacion,
  getTasaAprobacionGrupo,
  getSolvenciaDePagos,
};
