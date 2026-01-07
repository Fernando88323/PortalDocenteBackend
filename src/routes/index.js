const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");

// Rutas protegidas
// Aquí montamos las rutas protegidas del dashboard
router.use("/protected/dashboard", require("./protected/protected.routes.js"));

// Logout
// Esta ruta maneja el cierre de sesión y elimina la cookie del accessToken
router.use("/logout", require("./logout/logout.routes.js"));

const mantenimientoRoutes = require("./mantenimiento/mantenimiento.routes");

router.use("/mantenimientos", mantenimientoRoutes);

// Login y rutas asociadas
router.use("/", require("./loginJWT/login.routes.js"));
router.use(
  "/perfil_docente",
  require("./perfil_docente/perfil_docente.routes.js")
);

router.use("/estudiantes", require("./estudiantes/estudiantes.routes.js"));
// Ruta para servir archivos PDF de compribantes de retencion de renta
router.get("/uploads/boletas/:filename", (req, res) => {
  let filePath = req.params.filename;
  // Si la ruta empieza por /uploads/, se quita
  if (filePath.startsWith("/uploads/")) {
    filePath = filePath.replace("/uploads/", "");
  }
  // Construye la ruta absoluta
  const absPath = path.join(__dirname, "../../uploads", filePath);
  if (fs.existsSync(absPath)) {
    res.sendFile(absPath);
  } else {
    res.status(404).json({ message: "Archivo no encontrado." });
  }
});

// Rutas de funcionalidades del sistema
router.use("/grupos", require("./grupos/grupos.routes.js"));
router.use("/solicitudes", require("./solicitudes/solicitudes.routes.js"));
router.use("/evaluaciones", require("./evaluaciones/evaluaciones.routes.js"));
router.use("/lanzamientos", require("./lanzamientos/lanzamientos.routes.js"));
router.use(
  "/gestionarCuadro",
  require("./gestionarCuadro/gestionarCuadro.routes.js")
);
router.use(
  "/configuracion",
  require("./configuracion/configuracion.routes.js")
);
router.use(
  "/notificaciones",
  require("./notificaciones/notificaciones.routes.js")
);
router.use("/facultades", require("./facultades/facultades.routes.js"));
router.use("/decanos", require("./decanos/decanos.routes.js"));
router.use("/reportes", require("./reportes/reportes.routes.js"));
router.use("/posgrado", require("./posgrado/posgrado.routes.js"));

module.exports = router;
