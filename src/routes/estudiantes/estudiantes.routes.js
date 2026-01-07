const express = require("express");
const router = express.Router();
const { errors } = require("celebrate");
const {
  validateBulkNotes,
} = require("../../midlewares/validators/notes.validator.js");

const {
  getStudentsApi,
  getStudentsApiReportList,
  updateNotasGrupo,
  deleteStudent,
} = require("../../controllers/estudiantes/estudiantes.controller.js");

// Lista de estudiantes de un grupo específico
router.get("/grupo/:groupId/estudiantes", getStudentsApi);

// Ruta para obtener estudiantes de un grupo específico para reportes de lista de estudiantes
router.post("/", getStudentsApiReportList);

// Validamos notas con celebrate rango 0.0 - 10.0
router.put("/grupo/:groupId/notas", validateBulkNotes, updateNotasGrupo);

// Middleware para formatear errores de celebrate
router.use(errors());

router.delete("/:id", deleteStudent);

module.exports = router;
