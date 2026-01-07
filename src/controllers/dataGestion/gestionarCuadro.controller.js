require("dotenv").config();

// Controlador que llama al endpoint Krakatoa: dataGestionCuadroNota
const getDataGestionCuadroNota = async (req, res) => {
  try {
    const { ciclo, IDFacultad } = req.body || {};

    if (!ciclo) {
      return res.status(400).json({
        message:
          'El campo \'ciclo\' es requerido en el body. Ej: { "ciclo": "02/24" }',
      });
    }

    const API_DATA_GESTION_CUADRO_NOTA =
      process.env.API_DATA_GESTION_CUADRO_NOTA;
    const TOKEN = process.env.JWT_TOKEN_USO;

    if (!TOKEN) {
      return res.status(401).json({
        message: "No se encontró el token de autorización.",
      });
    }

    const response = await fetch(API_DATA_GESTION_CUADRO_NOTA, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ ciclo }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Error response:", response.status, text);
      return res.status(502).json({
        message: "Error al consultar servicio extern.",
        status: response.status,
        detail: text,
      });
    }

    const data = await response.json();

    if (data && Object.prototype.hasOwnProperty.call(data, "data")) {
      // Aplicar filtro por facultad si se proporcionó (idFacultad/IDFacultad o facultad)
      let filtered = Array.isArray(data.data) ? data.data.slice() : [];
      const filtroIdFacultad = IDFacultad;

      if (
        filtroIdFacultad !== undefined &&
        filtroIdFacultad !== null &&
        String(filtroIdFacultad) !== ""
      ) {
        const idStr = String(filtroIdFacultad);
        filtered = filtered.filter(
          (item) => item && String(item.IDFacultad) === idStr
        );
      }

      const totalRegistros = filtered.length;

      // Calcular número de docentes únicos por Facultad. Preferimos IDDocente.
      let totalDocentes = 0;
      if (Array.isArray(filtered)) {
        const docentesSet = new Set();
        filtered.forEach((item) => {
          if (!item) return;
          if (
            item.IDDocente !== undefined &&
            item.IDDocente !== null &&
            item.IDDocente !== ""
          ) {
            docentesSet.add(String(item.IDDocente));
          } else if (item.Docente) {
            docentesSet.add(String(item.Docente).trim());
          }
        });
        totalDocentes = docentesSet.size;
      }

      const resp = {
        ok: true,
        message: "Datos obtenidos correctamente",
        totalRegistros,
        totalDocentes,
        data: filtered,
      };

      // Incluir información del filtro aplicado para transparencia
      if (filtroIdFacultad)
        resp.filtro = { idFacultad: String(filtroIdFacultad) };

      return res.json(resp);
    }

    return res.json(data);
  } catch (error) {
    console.error("getDataGestionCuadroNota error:", error);
    return res.status(500).json({
      message: "Ups! Error al obtener dataGestionCuadroNota.",
      error: error.message,
    });
  }
};

// Actualiza el MODO en gestiónCuadroNota
const updateGestionCuadroNota = async (req, res) => {
  try {
    const { IDGrupo, Ciclo, Modo } = req.body || {};

    // Validar campos obligatorios
    if (!IDGrupo || !Ciclo || !Modo) {
      return res.status(400).json({
        message:
          'Los campos IDGrupo, Ciclo y Modo son requeridos en el body. Ej: { "IDGrupo": 10916, "Ciclo": "02/24", "Modo": "REPOSICION" }',
      });
    }

    const API_GESTION_CUADRO_NOTA_MODO =
      process.env.API_GESTION_CUADRO_NOTA_MODO;

    const TOKEN = process.env.JWT_TOKEN_USO;

    if (!TOKEN) {
      return res.status(401).json({
        message: "No se encontró el token de autorización.",
      });
    }

    const payload = {
      IDGrupo: Number(IDGrupo),
      Ciclo: String(Ciclo),
      Modo: String(Modo),
    };

    const response = await fetch(API_GESTION_CUADRO_NOTA_MODO, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Error response:", response.status, text);
      return res.status(502).json({
        message: "Error al actualizar gestión cuadro nota.",
        status: response.status,
        detail: text,
      });
    }

    const data = await response.json();

    // Devolver la respuesta tal como viene
    return res.json(data);
  } catch (error) {
    console.error("updateGestionCuadroNota error:", error);
    return res.status(500).json({
      message: "Ups! Error al actualizar gestión cuadro nota.",
      error: error.message,
    });
  }
};

// Función para buscar IDDocente de una facultad específica
const buscarIDDocentePorFacultad = async (req, res) => {
  try {
    const { ciclo, IDFacultad, nombreDocente, IDDocente } = req.body || {};

    if (!ciclo) {
      return res.status(400).json({
        message:
          'El campo \'ciclo\' es requerido en el body. Ej: { "ciclo": "02/24" }',
      });
    }

    if (!IDFacultad) {
      return res.status(400).json({
        message:
          "El campo 'IDFacultad' es requerido en el body. Ej: { \"IDFacultad\": 1 }",
      });
    }

    const API_DATA_GESTION_CUADRO_NOTA =
      process.env.API_DATA_GESTION_CUADRO_NOTA;
    const TOKEN = process.env.JWT_TOKEN_USO;

    if (!TOKEN) {
      return res.status(401).json({
        message: "No se encontró el token de autorización.",
      });
    }

    const response = await fetch(API_DATA_GESTION_CUADRO_NOTA, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ ciclo }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Error response:", response.status, text);
      return res.status(502).json({
        message: "Error al consultar servicio externo.",
        status: response.status,
        detail: text,
      });
    }

    const data = await response.json();

    if (data && Object.prototype.hasOwnProperty.call(data, "data")) {
      // Filtrar por facultad
      let filtered = Array.isArray(data.data) ? data.data.slice() : [];
      const idStr = String(IDFacultad);

      filtered = filtered.filter(
        (item) => item && String(item.IDFacultad) === idStr
      );

      // Si se proporciona nombreDocente, buscar por nombre también
      if (nombreDocente && String(nombreDocente).trim() !== "") {
        const nombreBuscar = String(nombreDocente).trim().toLowerCase();
        filtered = filtered.filter(
          (item) =>
            item &&
            item.Docente &&
            String(item.Docente).toLowerCase().includes(nombreBuscar)
        );
      }

      // Si se proporciona IDDocente, buscar por IDDocente específico
      if (
        IDDocente !== undefined &&
        IDDocente !== null &&
        String(IDDocente).trim() !== ""
      ) {
        const idDocenteBuscar = String(IDDocente);
        filtered = filtered.filter(
          (item) =>
            item &&
            item.IDDocente !== undefined &&
            item.IDDocente !== null &&
            String(item.IDDocente) === idDocenteBuscar
        );
      }

      // Extraer IDDocente únicos de la facultad
      const docentesEncontrados = [];
      const docentesSet = new Set();

      filtered.forEach((item) => {
        if (!item) return;

        const idDocente = item.IDDocente;
        const nombreDocente = item.Docente;

        if (
          idDocente !== undefined &&
          idDocente !== null &&
          idDocente !== "" &&
          !docentesSet.has(String(idDocente))
        ) {
          docentesSet.add(String(idDocente));
          docentesEncontrados.push({
            IDDocente: idDocente,
            Docente: nombreDocente || "N/A",
            IDFacultad: item.IDFacultad,
            Facultad: item.Facultad || "N/A",
          });
        }
      });

      const resp = {
        ok: true,
        message: IDDocente
          ? `Se encontró información del docente con ID ${IDDocente} en la facultad ${IDFacultad}`
          : `Se encontraron ${docentesEncontrados.length} docentes en la facultad ${IDFacultad}`,
        totalDocentes: docentesEncontrados.length,
        IDFacultad: IDFacultad,
        ...(IDDocente && { IDDocenteBuscado: IDDocente }),
        docentes: docentesEncontrados,
      };

      return res.json(resp);
    }

    return res.json({
      ok: false,
      message: "No se encontraron datos en la respuesta del servicio.",
    });
  } catch (error) {
    console.error("buscarIDDocentePorFacultad error:", error);
    return res.status(500).json({
      message: "Ups! Error al buscar IDDocente por facultad.",
      error: error.message,
    });
  }
};

module.exports = {
  getDataGestionCuadroNota,
  updateGestionCuadroNota,
  buscarIDDocentePorFacultad,
};
