const express = require("express");
const router = express.Router();

const {
  getDataGestionCuadroNota,
  updateGestionCuadroNota,
  buscarIDDocentePorFacultad,
} = require("../../controllers/dataGestion/gestionarCuadro.controller.js");
const validateTokenMiddleware = require("../../midlewares/authMiddleware/authMiddleware.js");

// POST body: se reenvía a Krakatoa
router.post(
  "/dataGestionCuadroNota",
  validateTokenMiddleware,
  getDataGestionCuadroNota
);

// Actualiza MODO
router.patch(
  "/updateGestionCuadroNota",
  validateTokenMiddleware,
  updateGestionCuadroNota
);

// Buscar IDDocente por facultad
router.post(
  "/buscarDocentePorFacultad",
  validateTokenMiddleware,
  buscarIDDocentePorFacultad
);

module.exports = router;
