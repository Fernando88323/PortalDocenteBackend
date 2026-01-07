// src/routes/posgrado.routes.js
const express = require('express');
const router = express.Router();

const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });
const { crearPosgrado, getPosgradosByPerfil, eliminarPosgrado, actualizarPosgrado } = require('../../controllers/posgrado/posgrado.controller');

// Actualizar posgrado por ID
router.put('/:id', upload.single('DiplomaPDF'), actualizarPosgrado);

// Crear posgrado (con PDF)
router.post('/', upload.single('DiplomaPDF'), crearPosgrado);

// Obtener posgrados por perfil
router.get('/:fkPerfil', getPosgradosByPerfil);


// Eliminar posgrado por ID
router.delete('/:id', eliminarPosgrado);

module.exports = router;
