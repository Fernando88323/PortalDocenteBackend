const express = require("express");
const router = express.Router();
const {
  upload,
} = require("../../controllers/perfil_docente/perfil_docente.controller");
const validateTokenMiddleware = require("../../midlewares/authMiddleware/authMiddleware.js");

const {
  getPerfilDocente,
  updatePerfilDocente,
  getDiplomaPDF,
} = require("../../controllers/perfil_docente/perfil_docente.controller");

router.post("/", validateTokenMiddleware, getPerfilDocente);
router.put(
  "/",
  validateTokenMiddleware,
  upload.single("Foto"),
  updatePerfilDocente
);
router.get("/diploma/:id", validateTokenMiddleware, getDiplomaPDF);

module.exports = router;
