require("dotenv").config();
require("./src/database/config");
const express = require("express");
const app = express();
app.use(express.json());
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
app.use(cookieParser());

const path = require("path");
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/*
app.use(
  cors({
    origin: "http://localhost:3000", // Especificamos el origen permitido
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true, // Permitir el envio de cookies y autenticacion
    allowedHeaders: ["Authorization", "Content-Type"], // Permitir headers necesarios
  })
);
*/

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Ruta principal
app.use("/", require("./src/routes/index"));

// Para manejar rutas no definidas
app.use((req, res, next) => {
  res.status(404).json({
    message: "Endpoint no encontrado.",
  });
});

// Levantando el servidor
app.set("puerto", process.env.PORT || 4001);
app.listen(app.get("puerto"), () => {
  console.log("Corriendo en el puerto:", app.get("puerto"));
});
