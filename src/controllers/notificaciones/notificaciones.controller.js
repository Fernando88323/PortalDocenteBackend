const pool = require("../../database/config.js");

/// Obtener notificaciones del usuario autenticado (Ajustado a nueva estructura)
const getNotificaciones = async (req, res) => {
  try {
    // console.log("📬 Obteniendo notificaciones...");
    // console.log("🔍 req.user:", req.user);

    if (!req.user || !req.user.IDReferencia) {
      console.error("❌ Usuario no autenticado en getNotificaciones");
      return res.status(401).json({
        message: "Usuario no autenticado",
        debug: {
          userExists: !!req.user,
          idReferencia: req.user?.IDReferencia,
        },
      });
    }

    // Usar IDReferencia como en las solicitudes
    const userId = req.user.IDReferencia;
    // console.log("🆔 Obteniendo notificaciones para userId:", userId);

    const [notificaciones] = await pool.query(
      `SELECT
         n.IDNotificacion,
         n.mensaje,
         n.cuerpo,
         n.url_destino,
         n.leida,
         n.fecha,
         s.IDSolicitud,
         s.asunto        AS solicitud_asunto,
         s.cuerpo        AS solicitud_cuerpo,
         s.estado        AS solicitud_estado,
         n.remitente_nombre AS docente_nombre
       FROM notificaciones n
       LEFT JOIN solicitudes s
         ON n.solicitud_id = s.IDSolicitud
       WHERE n.IDUsuario = ?
       ORDER BY n.fecha DESC`,
      [userId]
    );

    // console.log("📄 Notificaciones encontradas:", notificaciones.length);

    // Para cada notificación, agrega archivos de la solicitud
    const resultados = await Promise.all(
      notificaciones.map(async (noti) => {
        let archivos = [];
        if (noti.IDSolicitud) {
          const [archRows] = await pool.query(
            `SELECT IDArchivo, ruta_archivo, nombre_original, tipo_mime, tamano_bytes, fecha_subida
               FROM solicitud_archivos
              WHERE solicitud_id = ?`,
            [noti.IDSolicitud]
          );
          archivos = archRows;
        }
        return { ...noti, archivos };
      })
    );

    res.status(200).json(resultados);
  } catch (error) {
    console.error("Error al obtener notificaciones:", error);
    res.status(500).json({ message: "Error al obtener notificaciones." });
  }
};

// GET: Detalles de una notificación específica por su ID, incluyendo archivos de la solicitud asociada
const getNotificacionById = async (req, res) => {
  const { id } = req.params; // Este es el ID de la Notificación (IDNotificacion)
  try {
    // Paso 1: Obtener los detalles de la notificación
    // Incluimos `solicitud_id` para luego poder buscar los archivos asociados
    const [notifRows] = await pool.query(
      `SELECT
         n.IDNotificacion,
         n.mensaje,
         n.cuerpo,
         n.url_destino,
         n.fecha,
         n.leida,
         n.solicitud_id, -- ¡Importante! Necesitamos este ID para los archivos
         n.remitente_nombre    AS docente_nombre,    -- <--- aquí
         s.asunto AS solicitud_asunto,
         s.cuerpo AS solicitud_cuerpo,
         s.estado AS solicitud_estado
       FROM notificaciones n
       LEFT JOIN solicitudes s ON n.solicitud_id = s.IDSolicitud
       WHERE n.IDNotificacion = ?`,
      [id]
    );

    if (notifRows.length === 0) {
      return res.status(404).json({ message: "Notificación no encontrada." });
    }

    const notification = notifRows[0];
    let archivos = [];

    // Paso 2: Si la notificación está asociada a una solicitud, obtener sus archivos
    // La tabla `solicitud_archivos` se enlaza con `solicitudes` por `solicitud_id`
    if (notification.solicitud_id) {
      const [archRows] = await pool.query(
        `SELECT
           IDArchivo,
           nombre_original,
           ruta_archivo,
           tipo_mime,
           tamano_bytes,
           fecha_subida
         FROM solicitud_archivos
         WHERE solicitud_id = ?`,
        [notification.solicitud_id]
      );
      archivos = archRows;
    }

    // Paso 3: Devolver la notificación con sus archivos adjuntos
    res.json({ ...notification, archivos });
  } catch (error) {
    // Aseguramos que el mensaje de error sea claro
    console.error(`Error al obtener la notificación con ID ${id}:`, error);
    res.status(500).json({
      message: "Error interno del servidor al obtener la notificación.",
    });
  }
};

// Marca una notificación como leída
const marcarLeida = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query(
      `UPDATE notificaciones SET leida = 1 WHERE IDNotificacion = ?`,
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Notificación no encontrada." });
    }
    res.status(200).json({ message: "Notificación marcada como leída." });
  } catch (error) {
    console.error("Error al marcar como leída:", error);
    res.status(500).json({ message: "Error al actualizar notificación." });
  }
};

// Cuenta las notificaciones no leídas del usuario autenticado
const contarNoLeidas = async (req, res) => {
  try {
    // console.log("🔔 Intentando contar notificaciones no leídas...");
    // console.log("🔍 req.user:", req.user);

    if (!req.user || !req.user.IDReferencia) {
      console.error("❌ Usuario no autenticado en contarNoLeidas");
      return res.status(401).json({
        message: "Usuario no autenticado",
        debug: {
          userExists: !!req.user,
          idReferencia: req.user?.IDReferencia,
        },
      });
    }

    // Usar IDReferencia como en las solicitudes
    const userId = req.user.IDReferencia;
    // console.log("🆔 Contando notificaciones para userId:", userId);

    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total FROM notificaciones WHERE IDUsuario = ? AND leida = 0`,
      [userId]
    );

    const total = rows[0].total;
    // console.log("📊 Notificaciones no leídas encontradas:", total);

    res.json({ total: total });
  } catch (error) {
    console.error("Error al contar no leídas:", error);
    res.status(500).json({ message: "Error al contar notificaciones." });
  }
};

module.exports = {
  getNotificaciones,
  getNotificacionById,
  marcarLeida,
  contarNoLeidas,
};
