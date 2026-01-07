const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Define la ruta absoluta donde quieras guardar los archivos de perfil
const uploadDir = path.join(__dirname, "../../../uploads/perfil");

// Si no existe, la creamos (recursive en true para anidar carpetas)
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    // Usar timestamp genérico si no hay user disponible aún
    const userId = req.user?.IDDocente || "temp";
    cb(null, `perfil-${userId}-${timestamp}${ext}`);
  },
});

// Filtro para validar que solo sean imágenes
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(
      new Error(
        "Solo se permiten archivos de imagen (jpeg, jpg, png, gif, webp)"
      )
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
  },
});

module.exports = upload;
