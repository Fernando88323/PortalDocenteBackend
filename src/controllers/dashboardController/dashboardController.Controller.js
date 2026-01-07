const pool = require("../../database/config.js");

/**
 * Obtener información del docente
 * Asume que req.user.id es IDDocente
 */
async function getUserInfo(docenteId) {
  const [rows] = await pool.query(
    `SELECT d.IDDocente, d.Nombres, d.Apellidos, u.Usuario AS username, d.Titulo
     FROM docente d
     JOIN usuarios u ON d.IDUsuario = u.IDUsuario
     WHERE d.IDDocente = ?`,
    [docenteId]
  );
  return rows[0] || null;
}

/**
 * Obtener notificaciones: notas pendientes (tabla grades), permisos de ausencia, boletas de renta
 */
async function getNotifications(docenteId) {
  const notifications = [];

  // 1. Notas pendientes (valor NULL)
  const [pendingGrades] = await pool.query(
    `SELECT g.IDGrade AS id, a.Title AS title, a.DueDate AS dueDate
     FROM grades g
     JOIN assignments a ON g.IDAssignment = a.IDAssignment
     WHERE g.IDDocente = ? AND g.valor IS NULL`,
    [docenteId]
  );
  pendingGrades.forEach((g) => {
    notifications.push({
      id: `grade-${g.id}`,
      message: `Ingresa nota: ${g.title}`,
      dueDate: g.dueDate.toISOString().split("T")[0],
    });
  });

  // 2. Permisos de ausencia pendientes
  const [pendingPerms] = await pool.query(
    `SELECT pa.IDPermiso AS id, pa.StudentName AS studentName, pa.RequestDate AS requestDate
     FROM permisos_ausencias pa
     WHERE pa.IDDocente = ? AND pa.Status = 'PENDING'`,
    [docenteId]
  );
  pendingPerms.forEach((p) => {
    notifications.push({
      id: `perm-${p.id}`,
      message: `Permiso de ausencia: ${p.studentName}`,
      dueDate: p.requestDate.toISOString().split("T")[0],
    });
  });

  // 3. Boletas de renta sin revisar
  const [pendingRents] = await pool.query(
    `SELECT br.IDBoleta AS id, br.UploadDate AS uploadDate
     FROM boletas_renta br
     WHERE br.IDDocente = ? AND br.Reviewed = 0`,
    [docenteId]
  );
  pendingRents.forEach((r) => {
    notifications.push({
      id: `rent-${r.id}`,
      message: `Revisar boleta de renta ID ${r.id}`,
      dueDate: r.uploadDate.toISOString().split("T")[0],
    });
  });

  return notifications;
}

/**
 * Obtener métricas clave: total de grupos, total de estudiantes, porcentaje de notas finales cargadas,
 * cantidad aprobados/reprobados, porcentaje de aprobados
 * Para integrarlo despues en el dashboard
 */
async function getMetrics(docenteId) {
  // Total grupos
  const [[{ totalCourses }]] = await pool.query(
    `SELECT COUNT(*) AS totalCourses
     FROM grupos
     WHERE IDDocente = ?`,
    [docenteId]
  );

  // Total estudiantes distintos inscritos bajo ese docente
  const [[{ totalStudents }]] = await pool.query(
    `SELECT COUNT(DISTINCT ei.IDExpediente) AS totalStudents
     FROM estudiantes_inscripciones ei
     JOIN grupos g ON ei.IDGrupo = g.IDGrupo
     WHERE g.IDDocente = ?`,
    [docenteId]
  );

  // Notas finales cargadas vs pendientes (campo NF en estudiantes_inscripciones)
  const [[{ totalRecords }]] = await pool.query(
    `SELECT COUNT(*) AS totalRecords
     FROM estudiantes_inscripciones ei
     JOIN grupos g ON ei.IDGrupo = g.IDGrupo
     WHERE g.IDDocente = ?`,
    [docenteId]
  );
  const [[{ missingFinals }]] = await pool.query(
    `SELECT COUNT(*) AS missingFinals
     FROM estudiantes_inscripciones ei
     JOIN grupos g ON ei.IDGrupo = g.IDGrupo
     WHERE g.IDDocente = ? AND ei.NF = 0`,
    [docenteId]
  );
  const notesLoaded =
    totalRecords > 0
      ? Math.round(((totalRecords - missingFinals) / totalRecords) * 100)
      : 0;

  // Aprobados vs reprobados según NF >= 6
  const [[{ passed }]] = await pool.query(
    `SELECT COUNT(*) AS passed
     FROM estudiantes_inscripciones ei
     JOIN grupos g ON ei.IDGrupo = g.IDGrupo
     WHERE g.IDDocente = ? AND ei.NF >= 6`,
    [docenteId]
  );
  const [[{ failed }]] = await pool.query(
    `SELECT COUNT(*) AS failed
     FROM estudiantes_inscripciones ei
     JOIN grupos g ON ei.IDGrupo = g.IDGrupo
     WHERE g.IDDocente = ? AND ei.NF < 6`,
    [docenteId]
  );
  const passedPercentage =
    passed + failed > 0 ? Math.round((passed / (passed + failed)) * 100) : 0;

  return {
    totalStudents,
    totalCourses,
    notesLoaded,
    passed,
    failed,
    passedPercentage,
  };
}

/**
 * Datos para gráficas: promedio de nota final (NF) por grupo
 * Para integrarlo despues en el dashboard
 */
async function getChartData(docenteId) {
  const [groups] = await pool.query(
    `SELECT IDGrupo AS id, Nombre AS name
     FROM grupos
     WHERE IDDocente = ?`,
    [docenteId]
  );
  const data = [];
  for (const grp of groups) {
    const [[{ average }]] = await pool.query(
      `SELECT IFNULL(ROUND(AVG(ei.NF), 0), 0) AS average
       FROM estudiantes_inscripciones ei
       WHERE ei.IDGrupo = ?`,
      [grp.id]
    );
    data.push({ group: grp.name, average });
  }
  return data;
}

/**
 * Fechas próximas de assignments en los próximos 7 días
 * Para integrarlo despues en el dashboard
 */
async function getUpcomingDates(docenteId) {
  const [rows] = await pool.query(
    `SELECT DueDate AS dueDate
     FROM assignments a
     WHERE a.IDDocente = ?
       AND a.DueDate BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)`,
    [docenteId]
  );
  return rows.map((r) => r.dueDate.toISOString());
}

module.exports = {
  getUserInfo,
  getNotifications,
  getMetrics,
  getChartData,
  getUpcomingDates,
};
