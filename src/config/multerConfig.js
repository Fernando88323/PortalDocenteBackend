const fs = require("fs");
const path = require("path");
const multer = require("multer");

// Define la ruta absoluta donde quieras guardar los archivos
const uploadDir = path.join(__dirname, "../../uploads");

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
    cb(null, `${file.fieldname}-${timestamp}${ext}`);
  },
});

const upload = multer({ storage });

module.exports = upload;
