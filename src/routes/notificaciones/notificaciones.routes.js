const express = require("express");
const router = express.Router();
const {
  getNotificaciones,
  getNotificacionById,
  marcarLeida,
  contarNoLeidas,
} = require("../../controllers/notificaciones/notificaciones.controller.js");
const validateTokenMiddleware = require("../../midlewares/authMiddleware/authMiddleware.js");

router.get("/", validateTokenMiddleware, getNotificaciones);
router.put("/:id/leida", validateTokenMiddleware, marcarLeida);
router.get("/no-leidas/contador", validateTokenMiddleware, contarNoLeidas);
router.get("/:id", validateTokenMiddleware, getNotificacionById);

module.exports = router;
