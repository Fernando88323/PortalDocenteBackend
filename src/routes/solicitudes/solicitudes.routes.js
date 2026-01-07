const express = require("express");
const router = express.Router();
const upload = require("../../config/multerConfig.js");
const validateTokenMiddleware = require("../../midlewares/authMiddleware/authMiddleware.js");

const {
  getSolicitudes,
  createSolicitud,
  deleteSolicitud,
  getInbox,
  responseSolicitud1,
  mostrarResponseSolicitud,
  getInboxDocente,
  getBoletasRenta,
  getBoletaComprobante,
  getNotificacionesCount,
  marcarNotificacionLeida,
  marcarTodasLeidas,
} = require("../../controllers/solicitudes/solicitudes.controller.js");

router.get("/", validateTokenMiddleware, getSolicitudes);

router.get("/inbox", validateTokenMiddleware, getInbox);

router.get(
  "/:id/respuestas",
  validateTokenMiddleware,
  mostrarResponseSolicitud
);

router.get("/inbox-docente", validateTokenMiddleware, getInboxDocente);

// Ruta para mostrar boletas de renta del usuario autenticado
router.get("/boletas-renta", validateTokenMiddleware, getBoletasRenta);

// Ruta para descargar el comprobante de boleta de renta (longblob)
router.get(
  "/boletas-renta/:id/comprobante",
  validateTokenMiddleware,
  getBoletaComprobante
);

// Rutas para notificaciones
router.get(
  "/notificaciones/count",
  validateTokenMiddleware,
  getNotificacionesCount
);
router.put(
  "/notificaciones/:idNotificacion/leida",
  validateTokenMiddleware,
  marcarNotificacionLeida
);
router.put(
  "/notificaciones/marcar-todas-leidas",
  validateTokenMiddleware,
  marcarTodasLeidas
);

router.post(
  "/:id/responder",
  upload.array("archivos"),
  validateTokenMiddleware,
  responseSolicitud1
);

router.post(
  "/",
  upload.array("archivos", 10),
  validateTokenMiddleware,
  createSolicitud
);

router.delete("/:id", deleteSolicitud);

module.exports = router;
