const pool = require("../../database/config.js");

// Obtener el ciclo actual desde el sistema de configuración
const getCicloActual = async (req, res) => {
  try {
    // Token que se enviará, asegúrate de que esté definido en tus variables de entorno
    const TOKEN = process.env.JWT_TOKEN_USO;
    if (!TOKEN) {
      return res
        .status(500)
        .json({ message: "Token no configurado en el servidor." });
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
      const errorText = await response.text();
      throw new Error(
        `Error en la API externa: ${response.status} ${response.statusText}. Detalle: ${errorText}`
      );
    }

    const data = await response.json();

    // Extraer el ciclo actual basado en la estructura real de la respuesta
    let cicloActual = null;

    if (
      data &&
      data.ok &&
      data.data &&
      Array.isArray(data.data) &&
      data.data.length > 0
    ) {
      // La respuesta tiene la estructura: { ok: true, mensaje: "", data: [{ CicloInscripcion: "02/24" }] }
      cicloActual = data.data[0].CicloInscripcion;
    }

    res.json({
      cicloActual: cicloActual,
      mensaje: data.mensaje || "Ciclo actual obtenido correctamente",
      ok: data.ok || false,
    });
  } catch (error) {
    console.error("Error en getCicloActual:", error);
    res.status(500).json({
      message: "Error al obtener el ciclo actual desde la API externa.",
      error: error.message,
    });
  }
};

// Obtener el estado de habilitación de evaluación desde la API externa
const getEvaluacionHabilitada = async (req, res) => {
  try {
    // Token que se enviará
    const TOKEN = process.env.JWT_TOKEN_USO;
    if (!TOKEN) {
      return res
        .status(500)
        .json({ message: "Token no configurado en el servidor." });
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
      const errorText = await response.text();
      throw new Error(
        `Error en la API externa: ${response.status} ${response.statusText}. Detalle: ${errorText}`
      );
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
      // La respuesta tiene la estructura: { ok: true, mensaje: "", data: [{ CicloInscripcion: "02/24", DetenerEvaluacionDesempeno: "SI" }] }
      const detenerEvaluacion = data.data[0].DetenerEvaluacionDesempeno;

      // Si DetenerEvaluacionDesempeno es "SI", significa que NO debe mostrar las evaluaciones (habilitada = false)
      // Si DetenerEvaluacionDesempeno es "NO", significa que SÍ debe mostrar las evaluaciones (habilitada = true)
      evaluacionHabilitada = detenerEvaluacion === "NO";
    }

    res.json({
      habilitada: evaluacionHabilitada,
      mensaje: data.mensaje || "Estado de evaluación obtenido correctamente",
      ok: data.ok || false,
      cicloActual: data.data?.[0]?.CicloInscripcion || null,
      detenerEvaluacion: data.data?.[0]?.DetenerEvaluacionDesempeno || null,
    });
  } catch (error) {
    console.error("Error en getEvaluacionHabilitada:", error);

    // En caso de error, devolver un valor por defecto (evaluaciones deshabilitadas)
    res.status(500).json({
      message: "Error al obtener el estado de evaluación desde la API externa.",
      error: error.message,
      habilitada: false, // Por defecto deshabilitada en caso de error
    });
  }
};

// Cambiar el estado (solo decano) - NOTA: Esta función ahora es complementaria
// ya que el estado principal viene del endpoint externo
const setEvaluacionHabilitada = async (req, res) => {
  try {
    // Imprime todo el objeto user para depuración
    // console.log("req.user recibido:", req.user);

    if (!req.user || !Array.isArray(req.user.sistemaasignacionroles)) {
      // Devuelve el objeto recibido para depuración
      return res.status(403).json({
        message: "No autorizado",
        user: req.user,
      });
    }

    // Soporta array de objetos {IDRol} o array de números
    const roles = req.user.sistemaasignacionroles.map((r) =>
      typeof r === "object" ? r.IDRol : r
    );
    const tieneRol2 = roles.includes(2);
    const tieneRol10 = roles.includes(10);

    // Solo permitir si:
    // - Tiene ambos roles 2 y 10
    // - O solo tiene el rol 2
    const autorizado =
      (tieneRol2 && tieneRol10) || (tieneRol2 && roles.length === 1);

    if (!autorizado) {
      // Devuelve los roles procesados para depuración
      return res.status(403).json({
        message: "No autorizado",
        rolesRecibidos: req.user.sistemaasignacionroles,
        rolesProcesados: roles,
      });
    }

    const { habilitada } = req.body; // true/false

    // ADVERTENCIA: Esta configuración local puede ser sobrescrita por el endpoint externo
    await pool.query(
      "UPDATE configuraciones SET valor = ? WHERE clave = 'evaluacion_habilitada'",
      [habilitada ? "1" : "0"]
    );

    res.json({
      message:
        "Configuración local actualizada. NOTA: El estado final depende del endpoint externo.",
      advertencia:
        "Esta configuración puede ser sobrescrita por el sistema de configuración externo.",
    });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar configuración." });
  }
};

// Obtener el estado de habilitación de notas
const getNotasHabilitadas = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT valor FROM configuraciones WHERE clave = 'notas_habilitadas' LIMIT 1"
    );
    res.json({ habilitada: rows[0]?.valor === "1" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al consultar configuración de notas." });
  }
};

// Cambiar el estado de habilitación de notas (solo decano o decano/docente)
const setNotasHabilitadas = async (req, res) => {
  try {
    if (!req.user || !Array.isArray(req.user.sistemaasignacionroles)) {
      return res.status(403).json({
        message: "No autorizado",
        user: req.user,
      });
    }

    const roles = req.user.sistemaasignacionroles.map((r) =>
      typeof r === "object" ? r.IDRol : r
    );
    const tieneRol2 = roles.includes(2);
    const tieneRol10 = roles.includes(10);

    // Solo permitir si:
    // - Tiene ambos roles 2 y 10
    // - O solo tiene el rol 2
    const autorizado =
      (tieneRol2 && tieneRol10) || (tieneRol2 && roles.length === 1);

    if (!autorizado) {
      return res.status(403).json({
        message: "No autorizado",
        rolesRecibidos: req.user.sistemaasignacionroles,
        rolesProcesados: roles,
      });
    }

    const { habilitada } = req.body; // true/false
    await pool.query(
      "UPDATE configuraciones SET valor = ? WHERE clave = 'notas_habilitadas'",
      [habilitada ? "1" : "0"]
    );
    res.json({ message: "Configuración de notas actualizada." });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error al actualizar configuración de notas." });
  }
};

// Habilitar/deshabilitar cuadro de notas para un docente específico
// POST /configuracion/docente/:idDocente/cuadrosNotasHabilitados
// Body: { habilitada: true|false }
/*

Guardaremos una fila por docente usando una clave única basada en idDocente,
por ejemplo: clave = 'cuadrosNotasHabilitados_docente_569' y valor = '1'|'0'.
*/
const setCuadrosNotasHabilitadosPorDocente = async (req, res) => {
  try {
    // autorización: solo decano (rol 2) o administrador según la política existente
    if (!req.user || !Array.isArray(req.user.sistemaasignacionroles)) {
      return res.status(403).json({ message: "No autorizado", user: req.user });
    }

    const roles = req.user.sistemaasignacionroles.map((r) =>
      typeof r === "object" ? r.IDRol : r
    );
    const tieneRol2 = roles.includes(2);
    const tieneRol10 = roles.includes(10);
    const autorizado =
      (tieneRol2 && tieneRol10) || (tieneRol2 && roles.length === 1);

    if (!autorizado) {
      return res
        .status(403)
        .json({ message: "No autorizado", rolesProcesados: roles });
    }

    const { idDocente } = req.params;
    const { habilitada, idGrupo, nombreMateria } = req.body;

    if (!idDocente)
      return res
        .status(400)
        .json({ message: "idDocente es requerido en la ruta" });
    if (habilitada === undefined)
      return res
        .status(400)
        .json({ message: "Body debe incluir 'habilitada' booleano" });

    // Guardar en la tabla `configuraciones` usando claves compactas (máx 50 chars)
    const valor = habilitada ? "1" : "0";
    // Clave compacta: cn = cuadro notas
    // - con grupo:  cn_d{docente}_g{grupo}
    // - sin grupo:  cn_d{docente}
    const claveDocente =
      idGrupo !== undefined && idGrupo !== null && String(idGrupo) !== ""
        ? `cuadroNotaHab_d${idDocente}_grupo${idGrupo}`
        : `cuadroNotaH_d${idDocente}`;

    await pool.query(
      "INSERT INTO configuraciones (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)",
      [claveDocente, valor]
    );

    // Si se provee nombreMateria y hay idGrupo, almacenarlo en una clave separada (truncado a 50 chars)
    let claveMateria;
    if (
      nombreMateria &&
      idGrupo !== undefined &&
      idGrupo !== null &&
      String(idGrupo) !== ""
    ) {
      claveMateria = `cuadroNotaMateriaHab_d${idDocente}_grupo${idGrupo}`; // cnm = cuadro notas materia
      const valorMateria = String(nombreMateria).slice(0, 50);
      await pool.query(
        "INSERT INTO configuraciones (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)",
        [claveMateria, valorMateria]
      );
    }

    return res.json({
      message: "Configuración por docente actualizada.",
      idDocente,
      idGrupo: idGrupo ?? null,
      nombreMateria: nombreMateria ?? null,
      clave: claveDocente,
      claveMateria: claveMateria ?? null,
      valor,
    });
  } catch (error) {
    console.error("setCuadrosNotasHabilitadosPorDocente error:", error);
    return res.status(500).json({
      message: "Error al actualizar configuración por docente.",
      error: error.message,
    });
  }
};

// Obtener permisos de cuadro de notas para un docente y grupo específicos
// GET /configuracion/docente/:idDocente/permisos-grupo/:grupoId
const getPermisosDocenteGrupo = async (req, res) => {
  try {
    const { idDocente, grupoId } = req.params;

    if (!idDocente || !grupoId) {
      return res.status(400).json({
        message: "idDocente y grupoId son requeridos en la ruta",
      });
    }

    let claveDocente;
    let tipoPermiso = "especifico";

    // Manejo especial para grupoId === "general"
    if (grupoId === "general") {
      claveDocente = `cuadroNotaH_d${idDocente}`;
      tipoPermiso = "global";
    } else {
      // Buscar permisos específicos del grupo
      claveDocente = `cuadroNotaHab_d${idDocente}_grupo${grupoId}`;
    }

    const [rows] = await pool.query(
      "SELECT valor FROM configuraciones WHERE clave = ? LIMIT 1",
      [claveDocente]
    );

    if (rows.length > 0) {
      const habilitada = rows[0].valor === "1";
      return res.json({
        habilitada,
        idDocente,
        grupoId,
        clave: claveDocente,
        tipo: tipoPermiso,
      });
    } else {
      // Si no hay registro específico para el grupo, verificar permisos globales del docente
      if (tipoPermiso === "especifico") {
        const claveGlobal = `cuadroNotaH_d${idDocente}`;
        const [globalRows] = await pool.query(
          "SELECT valor FROM configuraciones WHERE clave = ? LIMIT 1",
          [claveGlobal]
        );

        if (globalRows.length > 0) {
          const habilitada = globalRows[0].valor === "1";
          return res.json({
            habilitada,
            idDocente,
            grupoId,
            clave: claveGlobal,
            tipo: "global", // indica que es permiso global, no específico del grupo
          });
        }
      }

      // En lugar de devolver 404, devolver habilitada: false por defecto
      return res.json({
        habilitada: false,
        idDocente,
        grupoId,
        clave: claveDocente,
        tipo: tipoPermiso,
        mensaje: "Sin permisos configurados, usando valor por defecto: false",
      });
    }
  } catch (error) {
    console.error("getPermisosDocenteGrupo error:", error);
    return res.status(500).json({
      message: "Error al consultar permisos de docente-grupo.",
      error: error.message,
    });
  }
};

// ...al final del archivo, exporta las nuevas funciones:
module.exports = {
  getCicloActual,
  getEvaluacionHabilitada,
  setEvaluacionHabilitada,
  getNotasHabilitadas,
  setNotasHabilitadas,
  setCuadrosNotasHabilitadosPorDocente,
  getPermisosDocenteGrupo,
};
