// src/middleware/upload.js
const multer = require("multer");
const path = require("path");

// Donde guardarás las fotos:
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../../uploads")); // asegúrate de que exista esta carpeta
  },
  filename: function (req, file, cb) {
    // ej. perfil-1234567890.jpg
    const ext = path.extname(file.originalname);
    cb(null, `perfil-${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

module.exports = upload;
