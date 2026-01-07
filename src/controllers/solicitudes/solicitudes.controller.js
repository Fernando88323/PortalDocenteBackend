const path = require("path");
const fs = require("fs");
const pool = require("../../database/config.js");
const http = require("http");
const multer = require("multer");
const dotenv = require("dotenv");
dotenv.config();

const getSolicitudes = async (req, res) => {
  try {
    const docenteId = req.user.IDReferencia;
    const { ciclo } = req.query;

    // console.log("🟢 ID del docente autenticado:", docenteId);

    // Construir la consulta base
    let consulta = `SELECT * FROM solicitudes WHERE docente_id = ?`;
    let parametros = [docenteId];

    // Comprobar si se proporcionó el parámetro ciclo
    if (ciclo) {
      // Usar campo ciclo directamente
      consulta += ` AND ciclo = ?`;
      parametros.push(ciclo);
    }

    consulta += ` ORDER BY fecha_creacion DESC`;

    const [solicitudes] = await pool.query(consulta, parametros);

    // console.log(`Solicitudes encontradas: ${solicitudes.length}`);
    /*     if (ciclo) {
      // console.log(
      //   `Solicitudes filtradas por ciclo '${ciclo}': ${solicitudes.length}`
      // );
    } else {
      // console.log("Sin filtro de ciclo - mostrando todas las solicitudes");
    } */

    const resultados = await Promise.all(
      solicitudes.map(async (sol) => {
        // Archivos de la solicitud
        const [archivos] = await pool.query(
          `SELECT IDArchivo, ruta_archivo, nombre_original, tipo_mime, tamano_bytes, fecha_subida
           FROM solicitud_archivos
           WHERE solicitud_id = ?`,
          [sol.IDSolicitud]
        );

        // Respuestas del decano
        const [respuestasRaw] = await pool.query(
          `SELECT r.*, ? AS remitente_nombre
           FROM respuestas_solicitud r
           WHERE r.solicitud_id = ? AND r.remitente_id = ?
           ORDER BY r.fecha ASC`,
          [sol.decano_id, sol.IDSolicitud, sol.decano_id]
        );

        const respuestas = respuestasRaw.map((r) => {
          let archivosArr = [];
          if (r.archivos) {
            try {
              archivosArr = JSON.parse(r.archivos);
              if (!Array.isArray(archivosArr)) archivosArr = [];
            } catch {
              archivosArr = [];
            }
          }
          return { ...r, archivos: archivosArr };
        });

        return { ...sol, archivos, respuestas };
      })
    );

    res.status(200).json({
      solicitudes: resultados,
      total: resultados.length,
      message: "Solicitudes obtenidas correctamente.",
    });
  } catch (error) {
    console.error("Error al obtener solicitudes:", error);
    res.status(500).json({ message: "Error al obtener solicitudes." });
  }
};

// Bandeja de entrada del decano
const getInbox = async (req, res) => {
  try {
    const decanoId = req.user.IDReferencia;

    // console.log("📬 Obteniendo inbox para decano ID:", decanoId);
    // console.log("🔍 Usuario completo:", {
    //     IDReferencia: req.user.IDReferencia,
    //     EmailKey: req.user.EmailKey,
    //     roles: req.user.sistemaasignacionroles?.map((r) => r.IDRol),
    // });

    // Primero verificar si hay notificaciones para este decano
    const [notificacionesCount] = await pool.query(
      `SELECT COUNT(*) as total FROM notificaciones WHERE IDUsuario = ?`,
      [decanoId]
    );
    // console.log(
    //   "📊 Total notificaciones para este decano:",
    //   notificacionesCount[0].total
    // );

    // También verificar todas las notificaciones existentes para debug
    const [todasNotificaciones] = await pool.query(
      `SELECT IDNotificacion, IDUsuario, mensaje, solicitud_id, tipo, fecha 
       FROM notificaciones 
       ORDER BY fecha DESC 
       LIMIT 10`
    );
    // console.log(
    //   "📋 Últimas 10 notificaciones en el sistema:",
    //   todasNotificaciones
    // );

    // 1. Trae las notificaciones y solicitudes asociadas
    const [rows] = await pool.query(
      `SELECT
           s.IDSolicitud,
           s.asunto,
           s.cuerpo            AS solicitud_cuerpo,
           s.fecha_creacion,
           s.estado            AS solicitud_estado,
           s.id_facultad,
           s.nombre_facultad,
           s.nombre_corto_facultad,
           s.ciclo,
           n.IDNotificacion,
           n.leida,
           n.fecha             AS noti_fecha,
           n.remitente_nombre  AS docente_nombre,
           n.mensaje,
           n.tipo
         FROM notificaciones n
         JOIN solicitudes     s ON n.solicitud_id = s.IDSolicitud
         WHERE n.IDUsuario = ?
         ORDER BY n.fecha DESC`,
      [decanoId]
    );

    // console.log("🔍 Consulta ejecutada para decano ID:", decanoId);
    // console.log("📄 Resultados encontrados:", rows.length);

    if (rows.length === 0) {
      // console.log(
      //   "⚠️ No se encontraron notificaciones. Verificando posibles causas..."
      // );

      // Verificar si el decanoId coincide con alguna solicitud
      const [solicitudesParaEsteDecano] = await pool.query(
        `SELECT IDSolicitud, decano_id, asunto FROM solicitudes WHERE decano_id = ?`,
        [decanoId]
      );
      // console.log(
      //   "📝 Solicitudes donde este usuario es decano:",
      //   solicitudesParaEsteDecano
      // );
    }

    // 2. Para cada solicitud, agrega el array de archivos
    const resultados = await Promise.all(
      rows.map(async (sol) => {
        const [archivos] = await pool.query(
          `SELECT IDArchivo, ruta_archivo, nombre_original, tipo_mime, tamano_bytes, fecha_subida
             FROM solicitud_archivos
           WHERE solicitud_id = ?`,
          [sol.IDSolicitud]
        );
        return { ...sol, archivos };
      })
    );

    res.status(200).json(resultados);
  } catch (err) {
    console.error("Error al obtener inbox:", err);
    res.status(500).json({ message: "Error al cargar bandeja de entrada." });
  }
};

const createSolicitud = async (req, res) => {
  try {
    if (!req.user?.IDReferencia) {
      return res
        .status(401)
        .json({ message: "Usuario no autenticado o token inválido." });
    }

    const {
      para,
      idFacultad,
      nombreFacultad,
      nombreCortoFacultad,
      asunto,
      cuerpo,
      ciclo,
    } = req.body;
    const docenteId = req.user.IDReferencia;
    const docenteNombre =
      req.user.empleado?.NombreCompleto || "Docente Desconocido";
    const docenteEmail = req.user.EmailKey || "Docente Email Desconocido";

    // console.log("📤 Creando solicitud con datos:", {
    //     idFacultad,
    //     nombreFacultad,
    //     nombreCortoFacultad,
    //     docenteId,
    //     docenteNombre,
    //     docenteEmail,
    //     ciclo, // ✅ Mostrar ciclo recibido
    // });

    // Validar que se recibieron los campos requeridos
    if (!idFacultad) {
      return res.status(400).json({
        message: "IDFacultad es requerido.",
      });
    }

    if (!nombreFacultad) {
      return res.status(400).json({
        message: "Nombre de la facultad es requerido.",
      });
    }

    if (!ciclo) {
      return res.status(400).json({
        message: "Ciclo es requerido.",
      });
    }

    // Validar formato del ciclo (XX/XX)
    const cicloRegex = /^\d{2}\/\d{2}$/;
    if (!cicloRegex.test(ciclo)) {
      return res.status(400).json({
        message:
          "Formato de ciclo inválido. Formato esperado: XX/XX (ej: 02/25)",
      });
    }

    // console.log("✅ Ciclo recibido del frontend:", ciclo);

    // Determinar el decano basado en el idFacultad usando el endpoint de decanos
    let decanoId = null;
    let decanoEmail = null;
    let decanoNombre = null;

    // Crear nombres cortos para las facultades (sin el nombre del decano honorífico)
    const nombreFacultadLimpio = nombreFacultad
      .replace(/\s*"[^"]*"\s*/g, "")
      .trim();
    const nombreCortoFacultadLimpio = nombreCortoFacultad
      .replace(/\s*"[^"]*"\s*/g, "")
      .trim();

    const API_DECANOS = process.env.API_DECANOS;
    const TOKEN = process.env.JWT_TOKEN_USO;

    try {
      // Llamar al endpoint local de decanos
      // console.log("🔄 Iniciando obtención de decanos...");
      // console.log("🔍 API_DECANOS:", API_DECANOS);
      // console.log("🔍 TOKEN disponible:", TOKEN ? "✅" : "❌");

      const response = await fetch(API_DECANOS, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TOKEN}`,
        },
      });

      // console.log("📡 Respuesta HTTP status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        // console.log("❌ Error en respuesta:", errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();
      // console.log("📄 Datos recibidos:", responseData);

      // Verificar estructura de respuesta
      if (
        !responseData.ok ||
        !responseData.data ||
        !Array.isArray(responseData.data)
      ) {
        // console.log("❌ Estructura de respuesta inválida:", responseData);
        return res.status(500).json({
          message:
            "Error en la estructura de respuesta del endpoint de decanos.",
        });
      }

      const decanosData = responseData.data;
      // console.log("✅ Decanos obtenidos:", decanosData.length);

      if (!decanosData || decanosData.length === 0) {
        // console.log("❌ No se encontraron decanos en la respuesta");
        return res.status(500).json({
          message: "No se encontraron decanos en el sistema.",
        });
      }

      // Buscar el decano correspondiente al IDFacultad
      // console.log("🔍 Buscando decano para IDFacultad:", idFacultad);
      // console.log(
      //   "🔍 Decanos disponibles:",
      //   decanosData.map((d) => ({
      //     IDFacultad: d.IDFacultad,
      //     Nombre: d.NombreEmpleado,
      //   }))
      // );

      const decano = decanosData.find(
        (d) => d.IDFacultad === parseInt(idFacultad)
      );

      if (!decano) {
        // console.log("❌ No se encontró decano para IDFacultad:", idFacultad);
        // console.log(
        //   "🔍 IDsFacultad disponibles:",
        //   decanosData.map((d) => d.IDFacultad)
        // );
        return res.status(400).json({
          message: `No se encontró un decano para la facultad con ID ${idFacultad}.`,
        });
      }

      decanoId = decano.IDEmpleado;
      decanoNombre = decano.NombreEmpleado;

      // console.log("✅ Decano encontrado:", {
      //       IDEmpleado: decanoId,
      //       Nombre: decanoNombre,
      // });
      // Generar email basado en la facultad (puedes ajustar según tu convención)
      const emailMapping = {
        1: "decanojuridicas@usonsonate.edu.sv",
        2: "decanoeconomia@usonsonate.edu.sv",
        3: "decanoingenieriayciencias@usonsonate.edu.sv",
      };
      decanoEmail =
        emailMapping[parseInt(idFacultad)] ||
        `decano${idFacultad}@usonsonate.edu.sv`;

      // console.log("✅ Decano encontrado:", {
      //       decanoId,
      //       decanoNombre,
      //       decanoEmail,
      //       idFacultad,
      //       nombreFacultad: nombreFacultadLimpio,
      //       nombreCortoFacultad: nombreCortoFacultadLimpio,
      // });
    } catch (error) {
      console.error("❌ Error obteniendo decanos:", error);
      return res.status(500).json({
        message: "Error al obtener información del decano.",
      });
    }

    // console.log("🎯 Decano determinado:", {
    //     decanoId,
    //     decanoNombre,
    //     decanoEmail,
    //     idFacultad,
    //     nombreFacultad: nombreFacultadLimpio,
    //     nombreCortoFacultad: nombreCortoFacultadLimpio,
    // });

    // Usar el ciclo enviado por el frontend
    // console.log(`📅 Usando ciclo recibido del frontend: ${ciclo}`);

    // Insertar la solicitud con información completa de la facultad
    const [insertResult] = await pool.query(
      `INSERT INTO solicitudes
           (docente_id, decano_id, id_facultad, nombre_facultad, nombre_corto_facultad, asunto, cuerpo, fecha_creacion, estado, docente_email, ciclo)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)`,
      [
        docenteId,
        decanoId,
        idFacultad,
        nombreFacultadLimpio,
        nombreCortoFacultadLimpio,
        asunto,
        cuerpo,
        "pendiente",
        docenteEmail,
        ciclo, // ✅ Usar ciclo del frontend
      ]
    );
    const newIDSolicitud = insertResult.insertId;

    // console.log("✅ Solicitud insertada con ID:", newIDSolicitud);

    // Manejar la subida de archivos
    if (req.files?.length) {
      // console.log(`📎 Subiendo ${req.files.length} archivos...`);
      for (const file of req.files) {
        await pool.query(
          `INSERT INTO solicitud_archivos
             (solicitud_id, ruta_archivo, nombre_original, tipo_mime, tamano_bytes)
           VALUES (?, ?, ?, ?, ?)`,
          [
            newIDSolicitud,
            `/uploads/${file.filename}`,
            file.originalname,
            file.mimetype,
            file.size,
          ]
        );
      }
      // console.log("✅ Archivos subidos correctamente");
    }

    // Crear notificación para el decano con información de la facultad
    // console.log("📬 Creando notificación para el decano...");
    // console.log("🎯 Datos para la notificación:", {
    //     decanoId: decanoId,
    //     decanoEmail: decanoEmail,
    //     docenteNombre: docenteNombre,
    //     solicitudId: newIDSolicitud,
    //     facultad: nombreCortoFacultadLimpio || nombreFacultadLimpio,
    // });

    const [notifResult] = await pool.query(
      `INSERT INTO notificaciones
           (IDUsuario, destinatario_email, mensaje, cuerpo, leida, fecha, IDRemitente, remitente_nombre, solicitud_id, tipo, url_destino)
         VALUES (?, ?, ?, ?, 0, NOW(), ?, ?, ?, ?, ?)`,
      [
        decanoId,
        decanoEmail,
        `Nueva solicitud de ${docenteNombre} (${
          nombreCortoFacultadLimpio || nombreFacultadLimpio
        }): ${asunto}`,
        cuerpo,
        docenteId,
        docenteNombre,
        newIDSolicitud,
        "solicitud",
        `/notificacion/${newIDSolicitud}`,
      ]
    );
    // console.log("✅ Notificación creada con ID:", notifResult.insertId);
    // console.log("📊 Notificación insertada para IDUsuario:", decanoId);

    // Responder con la solicitud creada y sus archivos
    const [solRows] = await pool.query(
      "SELECT * FROM solicitudes WHERE IDSolicitud = ?",
      [newIDSolicitud]
    );
    const [archRows] = await pool.query(
      `SELECT IDArchivo, ruta_archivo, nombre_original, tipo_mime, tamano_bytes, fecha_subida
         FROM solicitud_archivos
       WHERE solicitud_id = ?`,
      [newIDSolicitud]
    );

    // console.log("🎉 Solicitud enviada exitosamente");
    res.status(201).json({
      message: "Solicitud enviada correctamente.",
      solicitud: { ...solRows[0], archivos: archRows },
    });
  } catch (error) {
    console.error("❌ Error en createSolicitud:", error);

    // En caso de error, limpia los archivos subidos
    if (req.files) {
      req.files.forEach((file) => {
        const fullPath = path.resolve(
          __dirname,
          "../../uploads",
          file.filename
        );
        fs.promises.unlink(fullPath).catch((err) => {
          if (err.code !== "ENOENT")
            console.warn("Error borrando archivo de rollback:", err);
        });
      });
    }
    res.status(500).json({ message: "Error al guardar la solicitud." });
  }
};

// GET: obtener facultades con información completa
const getFacultades = async (req, res) => {
  try {
    // console.log("🔄 Obteniendo facultades...");

    // Aquí puedes obtener las facultades desde tu base de datos
    // Por ahora, devolveremos datos hardcodeados que coincidan con el frontend
    const facultades = [
      {
        IDFacultad: 1,
        Facultad: "Facultad de Ciencias Jurídicas",
        NombreCorto: "FCJ",
      },
      {
        IDFacultad: 2,
        Facultad: "Facultad de Economía y Ciencias Sociales",
        NombreCorto: "FECS",
      },
      {
        IDFacultad: 3,
        Facultad: "Facultad de Ingeniería y Ciencias Naturales",
        NombreCorto: "FICN",
      },
    ];

    // console.log("✅ Facultades obtenidas:", facultades);
    res.status(200).json(facultades);
  } catch (error) {
    console.error("❌ Error al obtener facultades:", error);
    res.status(500).json({ message: "Error al obtener facultades." });
  }
};

// DELETE: borra solicitud + archivos físicos + notificaciones
const deleteSolicitud = async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener rutas de archivos para borrarlos físicamente
    const [files] = await pool.query(
      `SELECT ruta_archivo
           FROM solicitud_archivos
         WHERE solicitud_id = ?`,
      [id]
    );
    for (const { ruta_archivo } of files) {
      const full = path.resolve(__dirname, "../../", ruta_archivo);
      await fs.promises.unlink(full).catch((err) => {
        if (err.code !== "ENOENT") console.warn("Error borrando archivo:", err);
      });
    }

    // Borrar registros de notificaciones, archivos y la solicitud
    await pool.query("DELETE FROM notificaciones     WHERE solicitud_id = ?", [
      id,
    ]);
    await pool.query("DELETE FROM solicitud_archivos WHERE solicitud_id = ?", [
      id,
    ]);

    const [result] = await pool.query(
      "DELETE FROM solicitudes WHERE IDSolicitud = ?",
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Solicitud no encontrada." });
    }

    res.status(200).json({
      message: "Solicitud, archivos y notificaciones eliminadas correctamente.",
    });
  } catch (error) {
    console.error("Error en deleteSolicitud:", error);
    res.status(500).json({ message: "Error al eliminar la solicitud." });
  }
};

// POST: responder a una solicitud (con archivos adjuntos)
const responseSolicitud1 = async (req, res) => {
  try {
    const solicitudId = req.params.id;
    const { cuerpo, archivos } = req.body;
    const remitenteId = req.user.IDReferencia;
    const remitenteEmail = req.user.EmailKey;

    const remitente = req.user;
    const remitenteNombreCompleto =
      remitente?.empleado?.NombreCompleto || "Decano Desconocido";

    // Busca el docente destinatario de la solicitud original
    const [solRows] = await pool.query(
      "SELECT docente_id, docente_email FROM solicitudes WHERE IDSolicitud = ?",
      [solicitudId]
    );
    if (!solRows.length)
      return res.status(404).json({ message: "Solicitud no encontrada" });

    const destinatarioId = solRows[0].docente_id;
    const emailDestinatario = solRows[0].docente_email;

    // Guarda la respuesta
    await pool.query(
      `INSERT INTO respuestas_solicitud (solicitud_id, remitente_id, destinatario_id, cuerpo, archivos, remitente_email, remitente_nombre)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        solicitudId,
        remitenteId,
        destinatarioId,
        cuerpo,
        JSON.stringify(archivos || []),
        remitenteEmail,
        remitenteNombreCompleto,
      ]
    );

    // Crea una notificación para el docente
    await pool.query(
      `INSERT INTO notificaciones
       (IDUsuario, destinatario_email, solicitud_id, mensaje, cuerpo, leida, IDRemitente, remitente_nombre, tipo, url_destino)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
      [
        destinatarioId,
        emailDestinatario || "",
        solicitudId,
        "Tu solicitud ha sido respondida",
        cuerpo,
        remitenteId,
        remitenteNombreCompleto,
        "respuesta",
        `/notificacion/${solicitudId}`,
      ]
    );

    res.json({ message: "Respuesta enviada correctamente" });
  } catch (err) {
    console.error("Error al responder solicitud:", err);
    res.status(500).json({
      message: "Error al responder solicitud",
      error: err.message,
    });
  }
};

// GET: mostrar respuestas de una solicitud específica con asunto de la solicitud
const mostrarResponseSolicitud = async (req, res) => {
  const solicitudId = req.params.id;
  try {
    const [rows] = await pool.query(
      `SELECT r.*, s.asunto
       FROM respuestas_solicitud r
       JOIN solicitudes s ON r.solicitud_id = s.IDSolicitud
       WHERE r.solicitud_id = ?
       ORDER BY r.fecha ASC`,
      [solicitudId]
    );
    // console.log("Respuestas obtenidas:", rows);
    res.json(rows);
  } catch (err) {
    console.error("Error al obtener respuestas con asunto:", err);
    res.status(500).json({ message: "Error al obtener respuestas." });
  }
};

// GET: bandeja de entrada del docente (respuestas para él)
const getInboxDocente = async (req, res) => {
  try {
    const docenteId = req.user.IDReferencia;

    // 1. Trae las solicitudes enviadas por el docente
    const [solicitudes] = await pool.query(
      `SELECT * FROM solicitudes WHERE docente_id = ? ORDER BY fecha_creacion DESC`,
      [docenteId]
    );

    // 2. Para cada solicitud, trae archivos y SOLO respuestas del decano
    const solicitudesConTodo = await Promise.all(
      solicitudes.map(async (sol) => {
        // Archivos de la solicitud
        const [archivos] = await pool.query(
          `SELECT IDArchivo, ruta_archivo, nombre_original, tipo_mime, tamano_bytes, fecha_subida
             FROM solicitud_archivos
           WHERE solicitud_id = ?`,
          [sol.IDSolicitud]
        );
        // Solo respuestas del decano (remitente_id = decano_id de la solicitud)
        const [respuestasRaw] = await pool.query(
          `SELECT r. *,? AS remitente_nombre
             FROM respuestas_solicitud r
           WHERE r.solicitud_id = ? AND r.remitente_id = ?
           ORDER BY r.fecha ASC`,
          [sol.decano_id, sol.IDSolicitud, sol.decano_id]
        );
        const respuestas = respuestasRaw.map((r) => {
          let archivosArr = [];
          if (r.archivos) {
            try {
              archivosArr = JSON.parse(r.archivos);
              if (!Array.isArray(archivosArr)) archivosArr = [];
            } catch {
              archivosArr = [];
            }
          }
          return { ...r, archivos: archivosArr };
        });
        return { ...sol, archivos, respuestas };
      })
    );

    res.json(solicitudesConTodo);
  } catch (error) {
    console.error("Error al obtener inbox del docente:", error);
    res.status(500).json({ message: "Error al cargar bandeja de entrada." });
  }
};

// GET: obtener conteo de notificaciones para el decano
const getNotificacionesCount = async (req, res) => {
  try {
    const decanoId = req.user.IDReferencia;

    // console.log(
    //   "🔔 Obteniendo conteo de notificaciones para decano ID:",
    //   decanoId
    // );

    // Contar notificaciones no leídas
    const [countNoLeidas] = await pool.query(
      `SELECT COUNT(*) as noLeidas FROM notificaciones WHERE IDUsuario = ? AND leida = 0`,
      [decanoId]
    );

    // Contar notificaciones totales
    const [countTotal] = await pool.query(
      `SELECT COUNT(*) as total FROM notificaciones WHERE IDUsuario = ?`,
      [decanoId]
    );

    const resultado = {
      noLeidas: countNoLeidas[0].noLeidas,
      total: countTotal[0].total,
      leidas: countTotal[0].total - countNoLeidas[0].noLeidas,
    };

    // console.log("📊 Conteo de notificaciones:", resultado);

    res.status(200).json(resultado);
  } catch (error) {
    console.error("Error al obtener conteo de notificaciones:", error);
    res
      .status(500)
      .json({ message: "Error al obtener conteo de notificaciones." });
  }
};

// PUT: marcar notificación como leída
const marcarNotificacionLeida = async (req, res) => {
  try {
    const { idNotificacion } = req.params;
    const decanoId = req.user.IDReferencia;

    // console.log("✅ Marcando notificación como leída:", {
    //   idNotificacion,
    //   decanoId,
    // });

    // Verificar que la notificación pertenece al usuario
    const [notif] = await pool.query(
      `SELECT IDNotificacion FROM notificaciones WHERE IDNotificacion = ? AND IDUsuario = ?`,
      [idNotificacion, decanoId]
    );

    if (notif.length === 0) {
      return res.status(404).json({ message: "Notificación no encontrada." });
    }

    // Marcar como leída
    await pool.query(
      `UPDATE notificaciones SET leida = 1 WHERE IDNotificacion = ?`,
      [idNotificacion]
    );

    // console.log("✅ Notificación marcada como leída");
    res.status(200).json({ message: "Notificación marcada como leída." });
  } catch (error) {
    console.error("Error al marcar notificación como leída:", error);
    res
      .status(500)
      .json({ message: "Error al marcar notificación como leída." });
  }
};

// PUT: marcar todas las notificaciones como leídas
const marcarTodasLeidas = async (req, res) => {
  try {
    const decanoId = req.user.IDReferencia;

    // console.log(
    //   "✅ Marcando todas las notificaciones como leídas para decano:",
    //   decanoId
    // );

    await pool.query(
      `UPDATE notificaciones SET leida = 1 WHERE IDUsuario = ? AND leida = 0`,
      [decanoId]
    );

    // console.log("✅ Todas las notificaciones marcadas como leídas");
    res
      .status(200)
      .json({ message: "Todas las notificaciones marcadas como leídas." });
  } catch (error) {
    console.error(
      "Error al marcar todas las notificaciones como leídas:",
      error
    );
    res.status(500).json({
      message: "Error al marcar todas las notificaciones como leídas.",
    });
  }
};

// GET: mostrar boletas de renta del usuario autenticado
const getBoletasRenta = async (req, res) => {
  try {
    const idReferencia = req.user?.IDReferencia;
    if (!idReferencia) {
      return res
        .status(400)
        .json({ message: "No se pudo identificar el usuario logueado." });
    }
    // Buscar el perfil correspondiente
    const [perfilRows] = await pool.query(
      `SELECT IDPerfil FROM perfil WHERE IDReferencia = ? LIMIT 1`,
      [idReferencia]
    );
    if (!perfilRows || perfilRows.length === 0) {
      return res
        .status(404)
        .json({ message: "Error: No existe perfil para este usuario." });
    }
    const perfilId = perfilRows[0].IDPerfil;
    // Traer boletas con el blob
    const [boletas] = await pool.query(
      `SELECT IDBoleta, UploadDate, Reviewed, FilePath
       FROM boletas_renta
       WHERE IDPerfil = ?
       ORDER BY UploadDate DESC`,
      [perfilId]
    );
    // Convertir el blob a base64 para mostrarlo en JSON
    const boletasConArchivo = boletas.map((b) => ({
      ...b,
      archivoBase64: b.FilePath
        ? Buffer.from(b.FilePath).toString("base64")
        : null,
    }));
    res.status(200).json({
      boletas: boletasConArchivo,
      total: boletasConArchivo.length,
      message: "Boletas de renta obtenidas correctamente.",
    });
  } catch (error) {
    console.error("Error al obtener boletas de renta:", error);
    res
      .status(500)
      .json({ message: "Error al obtener boletas de renta.", error });
  }
};

// GET: descargar comprobante de boleta de renta (longblob)
const getBoletaComprobante = async (req, res) => {
  try {
    const idBoleta = req.params.id;
    const [rows] = await pool.query(
      `SELECT FilePath FROM boletas_renta WHERE IDBoleta = ? LIMIT 1`,
      [idBoleta]
    );
    if (!rows || rows.length === 0 || !rows[0].FilePath) {
      return res.status(404).json({ message: "Comprobante no encontrado." });
    }
    // Detecta tipo de archivo (PDF/DOCX) por cabecera simple
    let mimeType = "application/pdf";
    const buf = rows[0].FilePath;
    if (buf && buf.length > 4) {
      // DOCX: PK\x03\x04, PDF: %PDF
      if (buf[0] === 0x50 && buf[1] === 0x4b)
        mimeType =
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      else if (
        buf[0] === 0x25 &&
        buf[1] === 0x44 &&
        buf[2] === 0x46 &&
        buf[3] === 0x50 &&
        buf[4] === 0x44 &&
        buf[5] === 0x46
      )
        mimeType = "application/pdf";
    }
    res.setHeader("Content-Type", mimeType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename=comprobante_${idBoleta}.${
        mimeType === "application/pdf" ? "pdf" : "docx"
      }`
    );
    res.send(buf);
  } catch (error) {
    console.error("Error al obtener comprobante:", error);
    res.status(500).json({ message: "Error al obtener comprobante.", error });
  }
};

module.exports = {
  getSolicitudes,
  createSolicitud,
  deleteSolicitud,
  getInbox,
  getInboxDocente,
  responseSolicitud1,
  mostrarResponseSolicitud,
  getBoletasRenta,
  getBoletaComprobante,
  getFacultades,
  getNotificacionesCount,
  marcarNotificacionLeida,
  marcarTodasLeidas,
};
