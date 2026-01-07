const express = require("express");
const router = express.Router();
const {
  syncLanzamientos,
} = require("../../controllers/lanzamientos/lanzamientos.controller");
const validateTokenMiddleware = require("../../midlewares/authMiddleware/authMiddleware");

// Ruta para sincronizar lanzamientos desde la API externa
router.post("/sync", validateTokenMiddleware, syncLanzamientos);

module.exports = router;
