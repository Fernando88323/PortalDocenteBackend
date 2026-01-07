const pool = require("../../database/config.js");

// Obtener preguntas por lanzamiento activo
const getPreguntasPorLanzamiento = async (req, res) => {
  const { IDLanzamiento } = req.params;

  if (!IDLanzamiento || isNaN(Number(IDLanzamiento))) {
    return res.status(400).json({
      message: "IDLanzamiento es requerido y debe ser un número válido",
    });
  }

  const conn = await pool.getConnection();
  try {
    // 1. Verificar que el lanzamiento existe y obtener su información
    const [lanzamientoInfo] = await conn.query(
      `SELECT l.IDLanzamiento, l.Inicio, l.Final, l.IDCuestionario, l.Ciclo, l.Descripcion,
              c.Cuestionario, c.Ponderacion, c.RolEvaluador
       FROM lanzamientos l
       INNER JOIN cuestionarios c ON l.IDCuestionario = c.IDCuestionario
       WHERE l.IDLanzamiento = ?`,
      [Number(IDLanzamiento)]
    );

    if (lanzamientoInfo.length === 0) {
      return res.status(404).json({
        message: "El lanzamiento especificado no existe",
      });
    }

    const lanzamiento = lanzamientoInfo[0];

    // 2. Verificar que el lanzamiento está activo
    const now = new Date();
    const estaActivo =
      now >= new Date(lanzamiento.Inicio) && now <= new Date(lanzamiento.Final);

    if (!estaActivo) {
      return res.status(400).json({
        message: "El período de evaluación no está activo",
        lanzamiento: lanzamiento,
        fechaActual: now,
      });
    }

    // 3. Obtener las preguntas según el IDCuestionario del lanzamiento
    const [preguntasResult] = await conn.query(
      "SELECT * FROM preguntas WHERE IDCuestionario = ? ORDER BY Orden, IDPregunta",
      [lanzamiento.IDCuestionario]
    );

    res.status(200).json({
      message: "OK!",
      lanzamiento: lanzamiento,
      preguntas: preguntasResult,
      estaActivo: estaActivo,
      fechaConsulta: now,
    });
  } catch (error) {
    console.error("Error al obtener las preguntas del lanzamiento:", error);
    res.status(500).json({
      message: "Error al obtener las preguntas del lanzamiento",
    });
  } finally {
    conn.release();
  }
};

// Obtener todas las preguntas con información de aspectos
const getPreguntas = async (req, res) => {
  const sql = `
    SELECT p.IDPregunta, p.Pregunta, p.IDCuestionario, p.Orden, p.IDAspecto,
           a.Aspecto, a.Ponderacion as PonderacionAspecto,
           c.Cuestionario, c.RolEvaluador
    FROM preguntas p
    LEFT JOIN aspectos a ON p.IDAspecto = a.IDAspecto
    LEFT JOIN cuestionarios c ON p.IDCuestionario = c.IDCuestionario
    ORDER BY p.IDCuestionario, p.Orden, p.IDPregunta
  `;
  try {
    const [db] = await pool.query(sql);
    res.status(200).json({
      message: "OK!",
      db,
    });
  } catch (error) {
    console.error("Error al obtener las preguntas:", error);
    res.status(500).json({
      message: "Error al obtener las preguntas",
    });
  }
};

// Obtener preguntas específicas para docentes (IDCuestionario = 2)
const getPreguntasDocente = async (req, res) => {
  const sql = `
    SELECT p.IDPregunta, p.Pregunta, p.IDCuestionario, p.Orden, p.IDAspecto,
           a.Aspecto, a.Ponderacion as PonderacionAspecto
    FROM preguntas p
    LEFT JOIN aspectos a ON p.IDAspecto = a.IDAspecto
    WHERE p.IDCuestionario = 2
    ORDER BY p.Orden, p.IDPregunta
  `;
  try {
    const [db] = await pool.query(sql);
    res.status(200).json({
      message: "OK!",
      preguntas: db,
      cuestionario: "Autoevaluación Docente",
    });
  } catch (error) {
    console.error("Error al obtener las preguntas del docente:", error);
    res.status(500).json({
      message: "Error al obtener las preguntas del docente",
    });
  }
};

const guardarAutoevaluacionDocente = async (req, res) => {
  // 🔍 DEBUG COMPLETO del request body
  // console.log(
  //   "🎯 DEBUG COMPLETO - Request Body:",
  //   JSON.stringify(req.body, null, 2)
  // );
  // console.log("🔍 DEBUG - Tipo de req.body:", typeof req.body);
  // console.log("🔍 DEBUG - Keys disponibles:", Object.keys(req.body));

  // ⚠️ VALIDACIÓN DE CAMPOS OBSOLETOS
  const camposObsoletos = [];
  if (req.body.IDCuestionario !== undefined) {
    camposObsoletos.push(
      "IDCuestionario (se obtiene automáticamente del lanzamiento)"
    );
  }
  if (req.body.Ponderacion !== undefined) {
    camposObsoletos.push(
      "Ponderacion (se obtiene automáticamente del cuestionario)"
    );
  }

  if (camposObsoletos.length > 0) {
    // console.log(
    //   "⚠️ ADVERTENCIA - Campos obsoletos detectados:",
    //   camposObsoletos
    // );
    // console.log(
    //   "✅ SUGERENCIA - El frontend debe enviar solo: IDDocente, IDReferencia, IDLanzamiento, IDGrupo, NombreMateria, Comentarios, respuestas"
    // );
  }

  const {
    IDDocente,
    IDReferencia, // IDReferencia del usuario logueado
    IDLanzamiento,
    IDGrupo,
    NombreMateria,
    Comentarios, // Comentarios del docente
    respuestas,
  } = req.body;

  // 🔍 DEBUG INDIVIDUAL de cada campo
  // console.log("🎯 DEBUG INDIVIDUAL:");
  // console.log("- IDDocente:", IDDocente, "tipo:", typeof IDDocente);
  // console.log("- IDReferencia:", IDReferencia, "tipo:", typeof IDReferencia);
  // console.log("- IDLanzamiento:", IDLanzamiento, "tipo:", typeof IDLanzamiento);
  // console.log("- IDGrupo:", IDGrupo, "tipo:", typeof IDGrupo);
  // console.log("- NombreMateria:", NombreMateria, "tipo:", typeof NombreMateria);
  // console.log("- Comentarios:", Comentarios, "tipo:", typeof Comentarios);
  // console.log("- respuestas:", respuestas, "tipo:", typeof respuestas);

  // 🚨 VERIFICACIÓN ESPECÍFICA DE COMENTARIOS
  if (Comentarios === undefined) {
    // console.log(
    //   "🚨 PROBLEMA DETECTADO: El campo 'Comentarios' no está presente en el request body"
    // );
    // console.log(
    //   "✅ SOLUCIÓN FRONTEND: Agregar 'Comentarios: \"texto aquí\"' al payload"
    // );
  } else {
    // console.log("✅ Campo Comentarios presente:", Comentarios);
  }

  // Validaciones básicas
  const docenteNum = Number(IDDocente);
  const referenciaNum = Number(IDReferencia);
  const lanzamientoNum = Number(IDLanzamiento);

  // Validar que IDReferencia coincida con IDDocente (seguridad)
  if (docenteNum !== referenciaNum) {
    return res.status(403).json({
      message: "No tienes permiso para crear evaluaciones para otro docente",
    });
  }

  // Validar parámetros básicos
  if (
    [docenteNum, referenciaNum, lanzamientoNum].some((n) => Number.isNaN(n)) ||
    typeof respuestas !== "object" ||
    Object.keys(respuestas).length === 0
  ) {
    return res.status(400).json({
      message: "Payload inválido: revisa que los campos sean correctos.",
    });
  }

  const gruposValidos =
    Array.isArray(IDGrupo) && IDGrupo.every((g) => typeof g === "number");
  const materiasValidas =
    Array.isArray(NombreMateria) &&
    NombreMateria.every((m) => typeof m === "string");

  if (!gruposValidos || !materiasValidas) {
    return res.status(400).json({
      message: "IDGrupo y NombreMateria deben ser arrays válidos.",
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Verificar que el lanzamiento existe y está activo
    const [lanzamientoInfo] = await conn.query(
      `SELECT l.IDLanzamiento, l.Inicio, l.Final, l.IDCuestionario, l.Ciclo, l.Descripcion,
              c.Cuestionario, c.Ponderacion, c.RolEvaluador
       FROM lanzamientos l
       INNER JOIN cuestionarios c ON l.IDCuestionario = c.IDCuestionario
       WHERE l.IDLanzamiento = ?`,
      [lanzamientoNum]
    );

    if (lanzamientoInfo.length === 0) {
      await conn.rollback();
      return res.status(404).json({
        message: "El lanzamiento especificado no existe",
      });
    }

    const lanzamiento = lanzamientoInfo[0];
    const now = new Date();

    // 2. Verificar que el lanzamiento está en el período válido
    if (
      now < new Date(lanzamiento.Inicio) ||
      now > new Date(lanzamiento.Final)
    ) {
      await conn.rollback();
      return res.status(400).json({
        message: "El período de evaluación no está activo",
        periodo: {
          inicio: lanzamiento.Inicio,
          final: lanzamiento.Final,
          actual: now,
        },
      });
    }

    // 3. Verificar que el cuestionario es para docentes (autoevaluación)
    if (lanzamiento.RolEvaluador !== "DOCENTE") {
      await conn.rollback();
      return res.status(400).json({
        message: "Este lanzamiento no corresponde a una autoevaluación docente",
        rolRequerido: lanzamiento.RolEvaluador,
      });
    }

    const cuestionarioNum = lanzamiento.IDCuestionario;
    const ponderacionNum = Number(lanzamiento.Ponderacion);

    // console.log("Información del lanzamiento:", lanzamiento);
    // console.log("Información del lanzamiento:", lanzamiento);

    // 4. Verificar si el docente ya realizó esta evaluación
    const [existingEvaluations] = await conn.query(
      `SELECT IDEvaluacion FROM docentes_evaluaciones 
       WHERE IDEvaluado = ? AND IDLanzamiento = ? AND IDCuestionario = ? AND IDEvaluador = ?`,
      [docenteNum, lanzamientoNum, cuestionarioNum, docenteNum]
    );

    if (existingEvaluations.length > 0) {
      await conn.rollback();
      return res.status(409).json({
        message: "Ya has realizado esta evaluación anteriormente",
        evaluacionesExistentes: existingEvaluations,
      });
    }

    // Generar fechas en formato MySQL usando hora local
    const fechaActual = new Date();
    // Ajustar a zona horaria local (GMT-6 para Honduras)
    const offsetLocal = -6 * 60; // GMT-6 en minutos
    const fechaLocal = new Date(
      fechaActual.getTime() + offsetLocal * 60 * 1000
    );

    const fechaMaestra = fechaLocal.toISOString().slice(0, 10); // YYYY-MM-DD
    const fechaFinalizacion = fechaLocal
      .toISOString()
      .slice(0, 19)
      .replace("T", " "); // YYYY-MM-DD HH:mm:ss
    const fechaDetalle = fechaFinalizacion; // Usar la misma fecha para el detalle

    const IDEvaluacionesGuardadas = [];

    // console.log("Fechas generadas:", {
    //     fechaMaestra,
    //     fechaFinalizacion,
    //     fechaDetalle,
    //   });
    // console.log("Grupos recibidos:", IDGrupo);
    // console.log("Materias recibidas:", NombreMateria);
    // console.log("Comentarios recibidos:", Comentarios);
    // console.log("Respuestas recibidas:", respuestas);

    // 🔍 DEBUG AVANZADO - Estructura de respuestas
    if (respuestas && typeof respuestas === "object") {
      // console.log("🎯 DEBUG - Respuestas keys:", Object.keys(respuestas));
      // console.log(
      //   "🎯 DEBUG - Primera respuesta:",
      //   respuestas[Object.keys(respuestas)[0]]
      // );

      // Verificar si hay estructura anidada con comentarios
      for (const [preguntaId, data] of Object.entries(respuestas)) {
        // console.log(`🎯 DEBUG - Pregunta ${preguntaId}:`, {
        //   data: data,
        //   type: typeof data,
        //   hasComentarios: data && data.Comentarios !== undefined,
        // });
        break; // Solo mostrar la primera para no saturar logs
      }
    }

    // 🔧 POSIBLES SOLUCIONES - Buscar comentarios en diferentes ubicaciones
    let comentariosFinales = Comentarios;

    // Opción 1: Comentarios directos en el body
    if (!comentariosFinales && req.body.comentarios) {
      comentariosFinales = req.body.comentarios;
      // console.log(
      //   "✅ Comentarios encontrados en req.body.comentarios:",
      //   comentariosFinales
      // );
    }

    // Opción 2: Comentarios dentro del objeto respuestas
    if (!comentariosFinales && respuestas && typeof respuestas === "object") {
      if (respuestas.Comentarios) {
        comentariosFinales = respuestas.Comentarios;
        // console.log(
        //   "✅ Comentarios encontrados en respuestas.Comentarios:",
        //   comentariosFinales
        // );
      }
      if (respuestas.comentarios) {
        comentariosFinales = respuestas.comentarios;
        // console.log(
        //   "✅ Comentarios encontrados en respuestas.comentarios:",
        //   comentariosFinales
        // );
      }
    }

    // Opción 3: Buscar en cualquier parte del request body
    if (!comentariosFinales) {
      const searchForComments = (obj, path = "") => {
        if (typeof obj !== "object" || obj === null) return null;

        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;

          if (
            key.toLowerCase().includes("comentario") &&
            typeof value === "string"
          ) {
            // console.log(`✅ Comentarios encontrados en ${currentPath}:`, value);
            return value;
          }

          if (typeof value === "object" && value !== null) {
            const found = searchForComments(value, currentPath);
            if (found) return found;
          }
        }
        return null;
      };

      comentariosFinales = searchForComments(req.body);
    }

    // console.log("🎯 COMENTARIOS FINALES A USAR:", comentariosFinales);

    // Obtener IDMateria desde la base de datos si es necesario
    // Por ahora usaremos 0 como default según el DDL
    const defaultIDMateria = 0;

    for (let i = 0; i < IDGrupo.length; i++) {
      const grupoNum = IDGrupo[i];
      const materiaStr = NombreMateria[i];

      // Obtener información de las preguntas y aspectos para calcular la calificación
      const [preguntasInfo] = await conn.query(
        `SELECT p.IDPregunta, p.Pregunta, p.IDAspecto, a.Aspecto, a.Ponderacion as PonderacionAspecto
         FROM preguntas p
         LEFT JOIN aspectos a ON p.IDAspecto = a.IDAspecto
         WHERE p.IDCuestionario = ?
         ORDER BY p.Orden, p.IDPregunta`,
        [cuestionarioNum]
      );

      // Crear un mapa para acceso rápido a la información de las preguntas
      const preguntasMap = {};
      preguntasInfo.forEach((row) => {
        preguntasMap[row.IDPregunta] = {
          Pregunta: row.Pregunta,
          IDAspecto: row.IDAspecto, // ← IDAspecto real de la tabla aspectos (no IDGrupo)
          Aspecto: row.Aspecto || "Evaluación General",
          PonderacionAspecto: Number(row.PonderacionAspecto) || 100.0,
        };
      });

      // console.log(
      //   `🎯 DEBUG - Preguntas cargadas para grupo ${grupoNum}:`,
      //   Object.keys(preguntasMap).length,
      //   "preguntas con sus respectivos aspectos"
      // );

      // Preparar datos para insertar en el detalle y calcular calificación
      const detalleInsert = [];
      let calificacionTotal = 0;
      let ponderacionTotalUsada = 0;

      for (const [IDPregunta, aspectos] of Object.entries(respuestas)) {
        const notaPorAspecto = aspectos[grupoNum]; // Extrae la nota para este grupo
        if (notaPorAspecto === undefined) continue;

        const preguntaInfo = preguntasMap[IDPregunta];
        if (!preguntaInfo) continue;

        const nota = Number(notaPorAspecto);

        // Validar que la nota esté en el rango de 1-10
        if (nota < 1 || nota > 10) {
          await conn.rollback();
          return res.status(400).json({
            message: `La nota para la pregunta ${IDPregunta} debe estar entre 1 y 10. Valor recibido: ${nota}`,
            pregunta: preguntaInfo.Pregunta,
            grupoAfectado: grupoNum,
          });
        }

        const ponderacionAspecto = preguntaInfo.PonderacionAspecto;

        // Calcular contribución a la calificación (ajustado para rango 1-10)
        // Usar la nota multiplicada por la ponderación como porcentaje
        const contribucion = (nota * ponderacionAspecto) / 100;
        calificacionTotal += contribucion;
        ponderacionTotalUsada += ponderacionAspecto;

        // ✅ CORREGIDO: Usar el IDAspecto real de la pregunta desde la tabla aspectos
        detalleInsert.push([
          0, // IDEvaluacion se actualizará después
          fechaDetalle,
          Number(IDPregunta),
          preguntaInfo.Pregunta,
          preguntaInfo.IDAspecto, // ← CORREGIDO: IDAspecto real de la tabla aspectos
          preguntaInfo.Aspecto,
          ponderacionAspecto,
          nota,
        ]);

        // 🔍 DEBUG: Verificar IDAspecto correcto
        // console.log(
        //   `✅ Pregunta ${IDPregunta}: IDAspecto=${preguntaInfo.IDAspecto}, Aspecto="${preguntaInfo.Aspecto}", Nota=${nota}`
        // );
      }

      // Calcular calificación final (promedio ponderado en escala 1-10)
      const calificacionFinal =
        ponderacionTotalUsada > 0
          ? (calificacionTotal / ponderacionTotalUsada) * 100
          : 0;

      // console.log(`Calificación calculada para grupo ${grupoNum}:`, {
      //       calificacionTotal,
      //       ponderacionTotalUsada,
      //       calificacionFinal,
      //     });

      // console.log(`Calificación calculada para grupo ${grupoNum}:`, {
      //       calificacionTotal,
      //       ponderacionTotalUsada,
      //       calificacionFinal,
      //     });

      // Inserción maestra por grupo con calificación calculada
      const [result] = await conn.query(
        `INSERT INTO docentes_evaluaciones
        (Fecha, Finalizacion, IDCuestionario, IDLanzamiento, IDEvaluador, IDEvaluado, IDGrupo, IDMateria, Estado, Ponderacion, Calificacion, Comentarios)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'EDITABLE', ?, ?, ?)`,
        [
          fechaMaestra,
          fechaFinalizacion, // Agregar fecha de finalización
          cuestionarioNum,
          lanzamientoNum,
          docenteNum, // IDEvaluador (el docente se autoevalúa)
          docenteNum, // IDEvaluado (el mismo docente)
          grupoNum,
          defaultIDMateria, // IDMateria - usando 0 como default según DDL
          ponderacionNum,
          calificacionFinal, // Calificación calculada automáticamente
          comentariosFinales || null, // Usar comentarios encontrados
        ]
      );

      const IDEvaluacion = result.insertId;
      IDEvaluacionesGuardadas.push(IDEvaluacion);

      // Actualizar el IDEvaluacion en los detalles
      detalleInsert.forEach((detalle) => {
        detalle[0] = IDEvaluacion;
      });

      if (detalleInsert.length > 0) {
        await conn.query(
          `INSERT INTO docentes_evaluaciones_detalle
          (IDEvaluacion, Fecha, IDPregunta, Pregunta, IDAspecto, Aspecto, PonderacionAspecto, Nota)
          VALUES ?`,
          [detalleInsert]
        );

        // console.log(
        //   `✅ Insertadas ${detalleInsert.length} respuestas en detalle para grupo ${grupoNum}`
        // );
      } else {
        // console.log(
        //   `⚠️ No se encontraron respuestas válidas para grupo ${grupoNum}`
        // );
      }
    }

    await conn.commit();
    res.status(201).json({
      message:
        "Autoevaluaciones de docente guardadas exitosamente para todos los grupos.",
      evaluaciones: IDEvaluacionesGuardadas,
      fechaFinalizacion: fechaFinalizacion,
      gruposEvaluados: IDGrupo.length,
      comentarios: comentariosFinales || "Sin comentarios",
      debug: {
        comentariosEncontrados: comentariosFinales ? true : false,
        comentariosOriginales: Comentarios,
        estructuraOriginal: Object.keys(req.body),
        problemaDetectado:
          Comentarios === undefined
            ? "Campo Comentarios faltante en frontend"
            : "OK",
        solucionSugerida:
          Comentarios === undefined
            ? "Agregar 'Comentarios' al payload del frontend"
            : "No aplica",
        camposObsoletos: [
          req.body.IDCuestionario !== undefined ? "IDCuestionario" : null,
          req.body.Ponderacion !== undefined ? "Ponderacion" : null,
        ].filter(Boolean),
      },
    });
  } catch (error) {
    await conn.rollback();
    console.error(
      "Error al guardar la autoevaluación:",
      error.message,
      error.stack
    );

    res
      .status(500)
      .json({ message: "Error interno al guardar la autoevaluación." });
  } finally {
    conn.release();
  }
};

// Obtener preguntas específicas para decanos (IDCuestionario = 3)
const getPreguntasDecano = async (req, res) => {
  const sql = `
    SELECT p.IDPregunta, p.Pregunta, p.IDCuestionario, p.Orden, p.IDAspecto,
           a.Aspecto, a.Ponderacion as PonderacionAspecto
    FROM preguntas p
    LEFT JOIN aspectos a ON p.IDAspecto = a.IDAspecto
    WHERE p.IDCuestionario = 3
    ORDER BY p.Orden, p.IDPregunta
  `;
  try {
    const [db] = await pool.query(sql);
    res.status(200).json({
      message: "OK!",
      preguntas: db,
      cuestionario: "Evaluación Decano",
    });
  } catch (error) {
    console.error("Error al obtener las preguntas del decano:", error);
    res.status(500).json({
      message: "Error al obtener las preguntas del decano",
    });
  }
};

const guardarEvaluacionDecano = async (req, res) => {
  // 🔍 DEBUG COMPLETO del request body
  // console.log(
  //   "🎯 DEBUG EVALUACIÓN DECANO - Request Body:",
  //   JSON.stringify(req.body, null, 2)
  // );
  // console.log("🔍 DEBUG - Tipo de req.body:", typeof req.body);
  // console.log("🔍 DEBUG - Keys disponibles:", Object.keys(req.body));

  // --- VALIDACIÓN DE AUTENTICACIÓN BÁSICA ---
  if (!req.user) {
    // console.log("USER:", req.user);
    return res.status(401).json({
      message: "No autenticado",
    });
  }

  const {
    IDEvaluador, // Decano que evalúa
    IDEvaluado, // Docente evaluado
    IDLanzamiento,
    IDGrupo, // Puede venir como número o array de números
    IDMateria, // Puede venir como número o array (paralelo a IDGrupo)
    IDFacultad,
    Comentarios,
    respuestas, // Estructura esperada multi-grupo: respuestas[IDPregunta][IDGrupo] = nota
  } = req.body;

  // 🔍 DEBUG INDIVIDUAL de cada campo
  // console.log("🎯 DEBUG INDIVIDUAL:");
  // console.log("- IDEvaluador:", IDEvaluador, "tipo:", typeof IDEvaluador);
  // console.log("- IDEvaluado:", IDEvaluado, "tipo:", typeof IDEvaluado);
  // console.log("- IDLanzamiento:", IDLanzamiento, "tipo:", typeof IDLanzamiento);
  // console.log("- IDGrupo:", IDGrupo, "tipo:", typeof IDGrupo);
  // console.log("- IDMateria:", IDMateria, "tipo:", typeof IDMateria);
  // console.log("- IDFacultad:", IDFacultad, "tipo:", typeof IDFacultad);
  // console.log("- Comentarios:", Comentarios, "tipo:", typeof Comentarios);
  // console.log("- respuestas:", respuestas, "tipo:", typeof respuestas);

  // Validaciones básicas
  const evaluadorNum = Number(IDEvaluador);
  const evaluadoNum = Number(IDEvaluado);
  const lanzamientoNum = Number(IDLanzamiento);
  const facultadNum = Number(IDFacultad);

  // Normalizar grupos y materias a arrays
  const gruposArray = Array.isArray(IDGrupo)
    ? IDGrupo.map((g) => Number(g)).filter((g) => !Number.isNaN(g))
    : [Number(IDGrupo)];
  const materiasArray = Array.isArray(IDMateria)
    ? IDMateria.map((m) => Number(m)).filter((m) => !Number.isNaN(m))
    : [IDMateria === undefined || IDMateria === null ? 0 : Number(IDMateria)];

  if (materiasArray.length !== gruposArray.length) {
    // Alinear longitud rellenando con 0 si faltan materias
    while (materiasArray.length < gruposArray.length) materiasArray.push(0);
  }

  // Validar parámetros básicos
  if (
    [evaluadorNum, evaluadoNum, lanzamientoNum, facultadNum].some((n) =>
      Number.isNaN(n)
    ) ||
    !Array.isArray(gruposArray) ||
    gruposArray.length === 0 ||
    typeof respuestas !== "object" ||
    Object.keys(respuestas).length === 0
  ) {
    return res.status(400).json({
      message:
        "Payload inválido: revisa campos numéricos, grupos y estructura de respuestas.",
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Verificar que el lanzamiento existe y está activo (para decanos)
    const [lanzamientoInfo] = await conn.query(
      `SELECT l.IDLanzamiento, l.Inicio, l.Final, l.IDCuestionario, l.Ciclo, l.Descripcion,
              c.Cuestionario, c.Ponderacion, c.RolEvaluador
       FROM lanzamientos l
       INNER JOIN cuestionarios c ON l.IDCuestionario = c.IDCuestionario
       WHERE l.IDLanzamiento = ?`,
      [lanzamientoNum]
    );

    if (lanzamientoInfo.length === 0) {
      await conn.rollback();
      return res.status(404).json({
        message: "El lanzamiento especificado no existe",
      });
    }

    const lanzamiento = lanzamientoInfo[0];
    const now = new Date();

    // 2. Verificar que el lanzamiento está en el período válido
    if (
      now < new Date(lanzamiento.Inicio) ||
      now > new Date(lanzamiento.Final)
    ) {
      await conn.rollback();
      return res.status(400).json({
        message: "El período de evaluación no está activo",
        periodo: {
          inicio: lanzamiento.Inicio,
          final: lanzamiento.Final,
          actual: now,
        },
      });
    }

    // 3. Verificar que el cuestionario es para decanos
    if (lanzamiento.RolEvaluador !== "DECANO") {
      await conn.rollback();
      return res.status(400).json({
        message: "Este lanzamiento no corresponde a una evaluación de decano",
        rolRequerido: lanzamiento.RolEvaluador,
      });
    }

    // 4. Verificar que IDCuestionario = 3 (evaluación de decano)
    const cuestionarioNum = lanzamiento.IDCuestionario;
    if (cuestionarioNum !== 3) {
      await conn.rollback();
      return res.status(400).json({
        message: "El cuestionario debe ser ID = 3 para evaluaciones de decano",
        cuestionarioRecibido: cuestionarioNum,
      });
    }

    // Ponderación del lanzamiento/cuestonario. Ahora en decanos_evaluaciones.Ponderacion = DECIMAL(5,2) (permite 100.00)
    let ponderacionNum = Number(lanzamiento.Ponderacion);
    if (Number.isNaN(ponderacionNum)) ponderacionNum = 0;
    const PONDERACION_MAX = 100.0; // nuevo máximo permitido
    const PONDERACION_MIN = 0.0;
    const ponderacionFinal = Math.min(
      PONDERACION_MAX,
      Math.max(PONDERACION_MIN, ponderacionNum)
    );

    // console.log("🔧 DEBUG PONDERACION NORMALIZADA (decano):", {
    //     ponderacionOriginalRaw: lanzamiento.Ponderacion,
    //     ponderacionConvertida: ponderacionNum,
    //     aplicada: ponderacionFinal,
    //     limiteMax: PONDERACION_MAX,
    //     limiteMin: PONDERACION_MIN,
    //     recortada: ponderacionNum !== ponderacionFinal,
    //   });

    if (!Number.isFinite(ponderacionFinal)) {
      await conn.rollback();
      return res.status(400).json({
        message: "Valor de ponderación inválido tras normalización",
        ponderacionOriginal: lanzamiento.Ponderacion,
        ponderacionNormalizada: ponderacionFinal,
      });
    }

    // console.log(
    //     "📊 Información del lanzamiento para decano (ponderación normalizada):",
    //     {
    //       ...lanzamiento,
    //       ponderacionOriginal: ponderacionNum,
    //       ponderacionFinal,
    //     }
    //   );

    // Generar fechas en formato MySQL usando hora local (comunes para todos los grupos en esta petición)
    const fechaActual = new Date();
    const offsetLocal = -6 * 60; // Honduras GMT-6
    const fechaLocal = new Date(
      fechaActual.getTime() + offsetLocal * 60 * 1000
    );
    const fechaMaestra = fechaLocal.toISOString().slice(0, 10);
    const fechaFinalizacion = fechaLocal
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");
    const fechaDetalleBase = fechaFinalizacion;
    // console.log("🕒 Fechas generadas para evaluación decano (multi-grupo):", {
    //     fechaMaestra,
    //     fechaFinalizacion,
    //     zonaHoraria: "GMT-6",
    //     grupos: gruposArray,
    //   });

    // Obtener información de las preguntas del cuestionario de decano (IDCuestionario = 3)
    const [preguntasInfo] = await conn.query(
      `SELECT p.IDPregunta, p.Pregunta, p.IDAspecto, a.Aspecto, a.Ponderacion as PonderacionAspecto
       FROM preguntas p
       LEFT JOIN aspectos a ON p.IDAspecto = a.IDAspecto
       WHERE p.IDCuestionario = ?
       ORDER BY p.Orden, p.IDPregunta`,
      [cuestionarioNum]
    );

    // Crear un mapa para acceso rápido a la información de las preguntas
    const preguntasMap = {};
    preguntasInfo.forEach((row) => {
      preguntasMap[row.IDPregunta] = {
        Pregunta: row.Pregunta,
        IDAspecto: row.IDAspecto, // ← IDAspecto real de la tabla aspectos
        Aspecto: row.Aspecto || "Evaluación General",
        PonderacionAspecto: Number(row.PonderacionAspecto) || 100.0,
      };
    });

    // console.log(
    //   `🎯 DEBUG - Preguntas cargadas para evaluación decano:`,
    //   Object.keys(preguntasMap).length,
    //   "preguntas con sus respectivos aspectos"
    // );

    const evaluacionesInsertadas = [];

    for (let idx = 0; idx < gruposArray.length; idx++) {
      const grupoNum = gruposArray[idx];
      const materiaNum = materiasArray[idx] ?? 0;

      // Evitar NaN
      if (Number.isNaN(grupoNum)) {
        // console.log(`⚠️ Grupo inválido en posición ${idx}, se omite.`);
        continue;
      }

      // Verificar duplicado por grupo
      const [existingEvaluations] = await conn.query(
        `SELECT IDEvaluacion FROM decanos_evaluaciones 
         WHERE IDEvaluador = ? AND IDEvaluado = ? AND IDLanzamiento = ? AND IDGrupo = ? AND IDMateria = ?`,
        [evaluadorNum, evaluadoNum, lanzamientoNum, grupoNum, materiaNum]
      );
      if (existingEvaluations.length > 0) {
        // console.log(
        //         `⚠️ Ya existe evaluación para grupo ${grupoNum}, se omite creación.`
        //       );
        continue; // No abortar toda la transacción, solo omitir
      }

      // Construir detalle y calificación para este grupo
      const detalleInsert = [];
      let calificacionTotal = 0;
      let ponderacionTotalUsada = 0;

      for (const [IDPregunta, paquete] of Object.entries(respuestas)) {
        const preguntaInfo = preguntasMap[IDPregunta];
        if (!preguntaInfo) continue;

        let nota;
        // Estructura multi-grupo: paquete[grupoNum] = nota
        if (
          paquete &&
          typeof paquete === "object" &&
          paquete.hasOwnProperty(grupoNum)
        ) {
          nota = Number(paquete[grupoNum]);
        } else if (typeof paquete === "number") {
          // fallback: valor plano aplicado a todos los grupos (si el frontend así lo envió)
          nota = Number(paquete);
        } else {
          continue; // no hay nota para este grupo
        }

        if (Number.isNaN(nota)) nota = 0;

        // Validar que la nota esté en el rango de 1-10
        if (nota < 1 || nota > 10) {
          await conn.rollback();
          return res.status(400).json({
            message: `La nota para la pregunta ${IDPregunta} del grupo ${grupoNum} debe estar entre 1 y 10. Valor recibido: ${nota}`,
            pregunta: preguntaInfo.Pregunta,
            grupoAfectado: grupoNum,
          });
        }

        const ponderacionAspecto = preguntaInfo.PonderacionAspecto;

        // Calcular contribución a la calificación (ajustado para rango 1-10)
        // Usar la nota multiplicada por la ponderación como porcentaje
        const contribucion = (nota * ponderacionAspecto) / 100;
        calificacionTotal += contribucion;
        ponderacionTotalUsada += ponderacionAspecto;
        detalleInsert.push([
          0,
          fechaDetalleBase,
          Number(IDPregunta),
          preguntaInfo.Pregunta,
          preguntaInfo.IDAspecto,
          preguntaInfo.Aspecto,
          ponderacionAspecto,
          nota,
        ]);
      }

      const calificacionFinal =
        ponderacionTotalUsada > 0
          ? (calificacionTotal / ponderacionTotalUsada) * 100
          : 0;

      // console.log(`� Resumen grupo ${grupoNum}:`, {
      //       calificacionTotal,
      //       ponderacionTotalUsada,
      //       calificacionFinal,
      //       calificacionFinalValida,
      //       ponderacionValida,
      //       detalle: detalleInsert.length,
      //     });
      const calificacionFinalValida = Math.max(
        -999.9999,
        Math.min(999.9999, calificacionFinal || 0)
      );

      const ponderacionValida = ponderacionFinal; // misma ponderación del cuestionario

      // console.log(`📊 Resumen grupo ${grupoNum}:`, {
      //       calificacionTotal,
      //       ponderacionTotalUsada,
      //       calificacionFinal,
      //       calificacionFinalValida,
      //       ponderacionValida,
      //       detalle: detalleInsert.length,
      //     });

      const valoresParaInsertar = [
        fechaMaestra,
        fechaFinalizacion,
        cuestionarioNum,
        lanzamientoNum,
        evaluadorNum,
        evaluadoNum,
        grupoNum,
        materiaNum,
        "EDITABLE",
        ponderacionValida,
        calificacionFinalValida,
        facultadNum,
        Comentarios || null,
      ];

      // Validaciones numéricas
      let invalido = false;
      for (let i = 0; i < valoresParaInsertar.length; i++) {
        const valor = valoresParaInsertar[i];
        if (
          typeof valor === "number" &&
          (!Number.isFinite(valor) || Number.isNaN(valor))
        ) {
          invalido = true;
          // console.log(
          //   `❌ Valor inválido en índice ${i} para grupo ${grupoNum}: ${valor}`
          // );
          break;
        }
      }
      if (invalido) continue;

      const [result] = await conn.query(
        `INSERT INTO decanos_evaluaciones
        (Fecha, Finalizacion, IDCuestionario, IDLanzamiento, IDEvaluador, IDEvaluado, IDGrupo, IDMateria, Estado, Ponderacion, Calificacion, IDFacultad, Comentarios)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        valoresParaInsertar
      );
      const IDEvaluacion = result.insertId;
      evaluacionesInsertadas.push({
        IDEvaluacion,
        grupo: grupoNum,
        materia: materiaNum,
        calificacion: calificacionFinalValida,
      });

      // Actualizar detalle con ID de evaluación
      detalleInsert.forEach((row) => (row[0] = IDEvaluacion));
      if (detalleInsert.length > 0) {
        await conn.query(
          `INSERT INTO decanos_evaluaciones_detalle
          (IDEvaluacion, Fecha, IDPregunta, Pregunta, IDAspecto, Aspecto, PonderacionAspecto, Nota)
          VALUES ?`,
          [detalleInsert]
        );
      }
    }

    await conn.commit();
    return res.status(201).json({
      message: "Evaluaciones de decano procesadas.",
      totalGruposRecibidos: gruposArray.length,
      totalEvaluacionesInsertadas: evaluacionesInsertadas.length,
      evaluaciones: evaluacionesInsertadas,
      gruposOmitidos: gruposArray.length - evaluacionesInsertadas.length,
    });
  } catch (error) {
    await conn.rollback();
    console.error(
      "Error al guardar la evaluación de decano:",
      error.message,
      error.stack
    );

    res.status(500).json({
      message: "Error interno al guardar la evaluación de decano.",
      error: error.message,
    });
  } finally {
    conn.release();
  }
};

// Obtener todos los lanzamientos con información de cuestionarios
const getLanzamientos = async (req, res) => {
  const sql = `
    SELECT l.IDLanzamiento, l.Inicio, l.Final, l.IDCuestionario, l.Ciclo, l.Descripcion,
           c.Cuestionario, c.Ponderacion, c.RolEvaluador
    FROM lanzamientos l
    INNER JOIN cuestionarios c ON l.IDCuestionario = c.IDCuestionario
    ORDER BY l.Inicio DESC
  `;
  try {
    const [db] = await pool.query(sql);
    res.status(200).json({
      message: "OK!",
      db,
    });
  } catch (error) {
    console.error("Error al obtener los lanzamientos:", error);
    res.status(500).json({
      message: "Error al obtener los lanzamientos",
    });
  }
};

// Obtener lanzamientos activos para autoevaluación docente
const getLanzamientosActivosDocente = async (req, res) => {
  const now = new Date();
  const sql = `
    SELECT l.IDLanzamiento, l.Inicio, l.Final, l.IDCuestionario, l.Ciclo, l.Descripcion,
           c.Cuestionario, c.Ponderacion, c.RolEvaluador
    FROM lanzamientos l
    INNER JOIN cuestionarios c ON l.IDCuestionario = c.IDCuestionario
    WHERE c.RolEvaluador = 'DOCENTE' 
      AND ? >= l.Inicio 
      AND ? <= l.Final
    ORDER BY l.Inicio DESC
  `;

  try {
    const [db] = await pool.query(sql, [now, now]);
    res.status(200).json({
      message: "OK!",
      lanzamientosActivos: db,
      fechaConsulta: now,
    });
  } catch (error) {
    console.error(
      "Error al obtener los lanzamientos activos para docentes:",
      error
    );
    res.status(500).json({
      message: "Error al obtener los lanzamientos activos para docentes",
    });
  }
};

// Obtener todos los cuestionarios
const getCuestionarios = async (req, res) => {
  const sql = "SELECT * FROM cuestionarios ORDER BY IDCuestionario ASC";
  try {
    const [db] = await pool.query(sql);
    res.status(200).json({
      message: "OK!",
      db,
    });
  } catch (error) {
    console.error("Error al obtener los cuestionarios:", error);
    res.status(500).json({
      message: "Error al obtener los cuestionarios",
    });
  }
};

// Obtener evaluaciones de un docente específico por IDReferencia
const getEvaluacionesDocente = async (req, res) => {
  const { IDReferencia } = req.params;

  if (!IDReferencia || isNaN(Number(IDReferencia))) {
    return res.status(400).json({
      message: "IDReferencia es requerido y debe ser un número válido",
    });
  }

  const sql = `
    SELECT * FROM docentes_evaluaciones 
    WHERE IDEvaluado = ? AND IDEvaluador = ?
    ORDER BY Fecha DESC
  `;

  try {
    const [db] = await pool.query(sql, [
      Number(IDReferencia),
      Number(IDReferencia),
    ]);
    res.status(200).json({
      message: "OK!",
      db,
    });
  } catch (error) {
    console.error("Error al obtener las evaluaciones del docente:", error);
    res.status(500).json({
      message: "Error al obtener las evaluaciones del docente",
    });
  }
};

// Verificar si un docente ya realizó una evaluación específica
const verificarEvaluacionDocente = async (req, res) => {
  const { IDReferencia, IDLanzamiento } = req.params;

  if (!IDReferencia || !IDLanzamiento) {
    return res.status(400).json({
      message: "IDReferencia e IDLanzamiento son requeridos",
    });
  }

  const conn = await pool.getConnection();
  try {
    // 1. Verificar que el lanzamiento existe y obtener su información
    const [lanzamientoInfo] = await conn.query(
      `SELECT l.IDLanzamiento, l.Inicio, l.Final, l.IDCuestionario, l.Ciclo, l.Descripcion,
              c.Cuestionario, c.Ponderacion, c.RolEvaluador
       FROM lanzamientos l
       INNER JOIN cuestionarios c ON l.IDCuestionario = c.IDCuestionario
       WHERE l.IDLanzamiento = ?`,
      [Number(IDLanzamiento)]
    );

    if (lanzamientoInfo.length === 0) {
      return res.status(404).json({
        message: "El lanzamiento especificado no existe",
      });
    }

    const lanzamiento = lanzamientoInfo[0];

    // 2. Verificar que es un lanzamiento para docentes
    if (lanzamiento.RolEvaluador !== "DOCENTE") {
      return res.status(400).json({
        message: "Este lanzamiento no corresponde a una autoevaluación docente",
        rolRequerido: lanzamiento.RolEvaluador,
      });
    }

    // 3. Verificar si ya realizó la evaluación
    const [evaluacionesExistentes] = await conn.query(
      `SELECT * FROM docentes_evaluaciones 
       WHERE IDEvaluado = ? AND IDLanzamiento = ? AND IDCuestionario = ? AND IDEvaluador = ?`,
      [
        Number(IDReferencia),
        Number(IDLanzamiento),
        lanzamiento.IDCuestionario,
        Number(IDReferencia), // IDEvaluador = IDReferencia para autoevaluaciones
      ]
    );

    // 4. Verificar si el lanzamiento está activo
    const now = new Date();
    const estaActivo =
      now >= new Date(lanzamiento.Inicio) && now <= new Date(lanzamiento.Final);

    res.status(200).json({
      message: "OK!",
      lanzamiento: lanzamiento,
      yaRealizada: evaluacionesExistentes.length > 0,
      evaluacionesExistentes: evaluacionesExistentes,
      estaActivo: estaActivo,
      fechaActual: now,
    });
  } catch (error) {
    console.error("Error al verificar la evaluación del docente:", error);
    res.status(500).json({
      message: "Error al verificar la evaluación del docente",
    });
  } finally {
    conn.release();
  }
};

// Obtener docentes de la misma facultad del decano para evaluación
const getDocentesPorFacultadDecano = async (req, res) => {
  try {
    const { IDFacultad } = req.params; // IDFacultad solicitada
    const ciclo = req.query.ciclo; // Permitir filtrar por ciclo

    // --- Control de autenticación básico ---
    if (!req.user) {
      return res.status(401).json({
        message: "No autenticado",
      });
    }

    // Validar parámetro IDFacultad
    if (!IDFacultad || isNaN(Number(IDFacultad))) {
      return res.status(400).json({
        message: "IDFacultad es requerido y debe ser numérico",
      });
    }
    const facultadNum = Number(IDFacultad);

    // Cargar vars de entorno (solo si no se han cargado antes)
    try {
      require("dotenv").config();
    } catch (_) {}
    const TOKEN = process.env.JWT_TOKEN_USO;
    const API_DOCENTES = process.env.API_DOCENTES;

    if (!TOKEN) {
      return res.status(500).json({ message: "JWT_TOKEN_USO no configurado" });
    }

    // Consumir API externa (usa POST como en getFacultades)
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
      return res.status(502).json({
        message: "Error al consultar API externa de docentes",
        status: response.status,
        detalle: errorText,
      });
    }

    const data = await response.json();
    // Estructura esperada ejemplo: { ok: true, mensaje: "", data: [ ... ] }
    const registros = Array.isArray(data)
      ? data
      : data.docentes || data.data || [];

    if (!Array.isArray(registros)) {
      return res
        .status(500)
        .json({ message: "Formato inesperado en API externa" });
    }

    // Filtrar por facultad solicitada
    const registrosFacultad = registros.filter(
      (r) => Number(r.IDFacultad) === facultadNum
    );

    if (!registrosFacultad.length) {
      return res.status(200).json({
        message: "Sin docentes para esta facultad o ciclo",
        ciclo,
        IDFacultad: facultadNum,
        docentes: [],
      });
    }

    // Consolidar docentes únicos (unificar filas por materia / grupo)
    const docentesMap = new Map();
    registrosFacultad.forEach((r) => {
      const id = r.IDDocente || r.IDEmpleado || r.IDUsuario; // tolerancia a distintos campos
      if (!id) return;
      if (!docentesMap.has(id)) {
        docentesMap.set(id, {
          IDDocente: id,
          NombreCompleto:
            r.NombreCompleto ||
            r.NombreEmpleado ||
            r.Docente ||
            r.Nombre ||
            "(Sin Nombre)",
          IDFacultad: r.IDFacultad,
          Facultad: r.Facultad || obtenerNombreFacultad(r.IDFacultad),
          Materias: [],
          Grupos: [],
        });
      }
      const entry = docentesMap.get(id);
      // En la estructura dada: Nombre = nombre de materia, IDGrupo = grupo
      if (r.Nombre && !entry.Materias.includes(r.Nombre))
        entry.Materias.push(r.Nombre);
      if (r.IDGrupo && !entry.Grupos.includes(r.IDGrupo))
        entry.Grupos.push(r.IDGrupo);
      // Compatibilidad con posibles campos alternos
      if (r.Materia && !entry.Materias.includes(r.Materia))
        entry.Materias.push(r.Materia);
      if (r.Grupo && !entry.Grupos.includes(r.Grupo))
        entry.Grupos.push(r.Grupo);
    });

    const docentes = Array.from(docentesMap.values());

    res.status(200).json({
      message: "OK",
      ciclo,
      IDFacultad: facultadNum,
      Facultad: docentes[0]?.Facultad || obtenerNombreFacultad(facultadNum),
      totalDocentes: docentes.length,
      docentes,
    });
  } catch (error) {
    console.error(
      "Error en getDocentesPorFacultadDecano:",
      error.message || error
    );
    res
      .status(500)
      .json({ message: "Error al obtener docentes de la facultad" });
  }
};

// Helper local para mapear IDFacultad a nombre si la API no lo trae
function obtenerNombreFacultad(id) {
  const mapa = {
    1: "FACULTAD DE CIENCIAS JURIDICAS",
    2: "FACULTAD DE ECONOMIA Y CIENCIAS SOCIALES",
    3: "FACULTAD DE INGENIERIA Y CIENCIAS NATURALES",
  };
  return mapa[id] || `FACULTAD ${id}`;
}

// Función para obtener el estado de las evaluaciones desde la API externa
const getEstadoEvaluaciones = async (req, res) => {
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
      const detenerEvaluacion = data.data[0].DetenerEvaluacionDesempeno;

      // Si DetenerEvaluacionDesempeno es "SI", significa que NO debe mostrar las evaluaciones (habilitada = false)
      // Si DetenerEvaluacionDesempeno es "NO", significa que SÍ debe mostrar las evaluaciones (habilitada = true)
      evaluacionHabilitada = detenerEvaluacion === "NO";
    }

    res.json({
      evaluacionesHabilitadas: evaluacionHabilitada,
      mensaje: evaluacionHabilitada
        ? "Las evaluaciones están disponibles"
        : "Las evaluaciones están temporalmente deshabilitadas",
      cicloActual: data.data?.[0]?.CicloInscripcion || null,
      detenerEvaluacion: data.data?.[0]?.DetenerEvaluacionDesempeno || null,
      ok: data.ok || false,
    });
  } catch (error) {
    console.error("Error en getEstadoEvaluaciones:", error);

    // En caso de error, devolver evaluaciones deshabilitadas
    res.status(500).json({
      message: "Error al verificar el estado de las evaluaciones.",
      error: error.message,
      evaluacionesHabilitadas: false,
    });
  }
};

module.exports = {
  getPreguntasPorLanzamiento,
  getPreguntas,
  getPreguntasDocente,
  getPreguntasDecano,
  guardarAutoevaluacionDocente,
  guardarEvaluacionDecano,
  getLanzamientos,
  getLanzamientosActivosDocente,
  getCuestionarios,
  getEvaluacionesDocente,
  verificarEvaluacionDocente,
  getDocentesPorFacultadDecano,
  getEstadoEvaluaciones,
};
