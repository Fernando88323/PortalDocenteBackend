const express = require("express");
const router = express.Router();
const {
  mantenimientoPage,
} = require("../../controllers/mantenimiento/mantenimiento.controller");

// Ruta para verificar si el sistema está en modo mantenimiento (Si mas adelante de utiliza)
router.get("/", (req, res) => {
  // console.log("Valor de MAINTENANCE_MODE:", process.env.MAINTENANCE_MODE); // <--- Agrega esto
  if (process.env.MAINTENANCE_MODE === "true") {
    return mantenimientoPage(req, res);
  }
  return res.status(200).json({ message: "OK - No está en mantenimiento" });
});

module.exports = router;
