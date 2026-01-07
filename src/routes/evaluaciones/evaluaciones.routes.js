const express = require("express");
const router = express.Router();
const {
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
} = require("../../controllers/evaluaciones/evaluaciones.controller.js");
const verificarEvaluacionesHabilitadas = require("../../midlewares/evaluacionMiddleware/evaluacionMiddleware");
const validateTokenMiddleware = require("../../midlewares/authMiddleware/authMiddleware");

// Ruta para verificar el estado de las evaluaciones (sin middleware restrictivo)
router.get("/estado", getEstadoEvaluaciones);

// Rutas para obtener preguntas (requieren evaluaciones habilitadas)
router.get(
  "/",
  verificarEvaluacionesHabilitadas,
  validateTokenMiddleware,
  getPreguntas
); // Todas las preguntas
router.get(
  "/docente",
  verificarEvaluacionesHabilitadas,
  validateTokenMiddleware,
  getPreguntasDocente
); // Solo preguntas de autoevaluación docente (IDCuestionario = 2)
router.get(
  "/decano",
  verificarEvaluacionesHabilitadas,
  validateTokenMiddleware,
  getPreguntasDecano
); // Solo preguntas de evaluación decano (IDCuestionario = 3)
router.get(
  "/lanzamiento/:IDLanzamiento",
  verificarEvaluacionesHabilitadas,
  validateTokenMiddleware,
  getPreguntasPorLanzamiento
); // Preguntas por lanzamiento activo

// Rutas para lanzamientos (requieren evaluaciones habilitadas)
router.get(
  "/lanzamientos",
  verificarEvaluacionesHabilitadas,
  validateTokenMiddleware,
  getLanzamientos
);
router.get(
  "/lanzamientos/activos/docente",
  verificarEvaluacionesHabilitadas,
  validateTokenMiddleware,
  getLanzamientosActivosDocente
);

// Rutas para evaluaciones (requieren evaluaciones habilitadas)
router.post(
  "/autoevaluacion",
  verificarEvaluacionesHabilitadas,
  validateTokenMiddleware,
  guardarAutoevaluacionDocente
);
router.post(
  "/decano/finalizar",
  verificarEvaluacionesHabilitadas,
  validateTokenMiddleware,
  guardarEvaluacionDecano
);

// Rutas para cuestionarios (requieren evaluaciones habilitadas)
router.get(
  "/cuestionarios",
  verificarEvaluacionesHabilitadas,
  validateTokenMiddleware,
  getCuestionarios
);

// Rutas para evaluaciones específicas por docente (requieren evaluaciones habilitadas)
router.get(
  "/docente/:IDReferencia",
  verificarEvaluacionesHabilitadas,
  validateTokenMiddleware,
  getEvaluacionesDocente
);
router.get(
  "/verificar/:IDReferencia/:IDLanzamiento",
  verificarEvaluacionesHabilitadas,
  validateTokenMiddleware,
  verificarEvaluacionDocente
);
// Protegemos solo la ruta que requiere rol decano (también requiere evaluaciones habilitadas)
router.get(
  "/decano/facultad/:IDFacultad/docentes",
  verificarEvaluacionesHabilitadas,
  validateTokenMiddleware,
  getDocentesPorFacultadDecano
);

module.exports = router;
