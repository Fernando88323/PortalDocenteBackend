const express = require("express");
const router = express.Router();

const {
  getTasaAprobacion,
  getTasaAprobacionGrupo,
  getSolvenciaDePagos,
} = require("../../controllers/reportes/reportes.controller.js");
const validateTokenMiddleware = require("../../midlewares/authMiddleware/authMiddleware.js");

// POST que envía idgrupo y ciclo en el body a la API externa
router.post("/tasa-aprobacion", validateTokenMiddleware, getTasaAprobacion);

// Requiere idgrupo y ciclo en el body
// Ruta alternativa por compatibilidad: usa el controlador específico
router.post(
  "/tasa-aprobacion-grupo",
  validateTokenMiddleware,
  getTasaAprobacionGrupo
);

// Requiere ciclo, idgrupo, cuota en el body
router.post("/solvencia-pagos", validateTokenMiddleware, getSolvenciaDePagos);

module.exports = router;
