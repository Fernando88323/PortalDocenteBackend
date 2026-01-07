const express = require("express");
const router = express.Router();
const {
  getCicloActual,
  getEvaluacionHabilitada,
  setEvaluacionHabilitada,
  getNotasHabilitadas,
  setNotasHabilitadas,
  setCuadrosNotasHabilitadosPorDocente,
  getPermisosDocenteGrupo,
} = require("../../controllers/configuracion/configuracion.controller"); // Asegúrate de que la ruta al controlador es correcta
const validateTokenMiddleware = require("../../midlewares/authMiddleware/authMiddleware"); // tu middleware de autenticación

router.get("/ciclo-actual", validateTokenMiddleware, getCicloActual);
router.get("/evaluacion", getEvaluacionHabilitada); // Removido middleware para consulta pública
router.get("/evaluacion-estado", getEvaluacionHabilitada); // Ruta alternativa para verificación rápida
router.post("/evaluacion", validateTokenMiddleware, setEvaluacionHabilitada);
router.get("/notas", validateTokenMiddleware, getNotasHabilitadas);
router.post("/notas", validateTokenMiddleware, setNotasHabilitadas);

// Habilitar/deshabilitar cuadro de notas por docente
router.post(
  "/docente/:idDocente/cuadrosNotasHabilitados",
  validateTokenMiddleware,
  setCuadrosNotasHabilitadosPorDocente
);

// Obtener permisos de cuadro de notas para docente y grupo específicos
router.get(
  "/docente/:idDocente/permisos-grupo/:grupoId",
  validateTokenMiddleware,
  getPermisosDocenteGrupo
);

module.exports = router;
