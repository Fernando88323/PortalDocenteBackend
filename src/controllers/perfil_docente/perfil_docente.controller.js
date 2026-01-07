// src/controllers/perfil_docente/perfil_docente.controller.js
const pool = require("../../database/config.js");
const path = require("path");
const fs = require("fs");
// Middleware para manejar archivos con multer
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Controlador para servir el PDF del diploma
const getDiplomaPDF = async (req, res) => {
  const idPosGrado = req.params.id;
  try {
    const [rows] = await pool.query(
      "SELECT DiplomaPDF FROM posgrado WHERE IDPosGrado = ? LIMIT 1",
      [idPosGrado]
    );
    if (!rows || rows.length === 0 || !rows[0].DiplomaPDF) {
      return res.status(404).send("Diploma no encontrado.");
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=diploma.pdf");
    res.send(rows[0].DiplomaPDF);
  } catch (error) {
    console.error("getDiplomaPDF error:", error);
    res.status(500).send("Error al obtener el diploma.");
  }
};

const getPerfilDocente = async (req, res) => {
  try {
    // Acceder correctamente al campo IDReferencia del usuario logueado
    const idReferencia = req.user?.IDReferencia;
    // console.log("getPerfilDocente - idReferencia:", idReferencia);
    if (!idReferencia) {
      return res
        .status(400)
        .json({ message: "No se pudo identificar el usuario logueado." });
    }

    const [rows] = await pool.query(
      `SELECT IDPerfil, Nombres, Apellidos, Titulo, Credencial, Activo, FechaCreacion, DUI, NIT, NUP, Direccion, FechaNacimiento, IDReferencia, Foto FROM perfil WHERE IDReferencia = ? LIMIT 1`,
      [idReferencia]
    );

    if (!rows || rows.length === 0) {
      return res.json({
        IDPerfil: null,
        Nombres: "",
        Apellidos: "",
        Titulo: "",
        Credencial: "",
        Activo: 1,
        FechaCreacion: null,
        DUI: "",
        NIT: "",
        NUP: "",
        Direccion: "",
        FechaNacimiento: null,
        IDReferencia: idReferencia,
        Foto: "",
      });
    }

    // Si hay foto, convertir a base64 y agregar prefijo MIME
    let perfil = rows[0];
    if (perfil && perfil.Foto) {
      if (Buffer.isBuffer(perfil.Foto)) {
        // Por defecto se asume JPEG, puedes ajustar según tu caso
        perfil.Foto = `data:image/jpeg;base64,${perfil.Foto.toString(
          "base64"
        )}`;
      }
    }
    res.json(perfil);
  } catch (error) {
    console.error("getPerfilDocente error:", error);
    res
      .status(500)
      .json({ message: "Ups! Algo salió mal al obtener el perfil." });
  }
};

// Nuevo controlador para actualizar perfil con foto
const updatePerfilDocente = async (req, res) => {
  const idReferencia = req.user?.IDReferencia ?? null;
  if (!idReferencia) {
    return res
      .status(400)
      .json({ message: "No se pudo identificar el usuario logueado." });
  }

  // Si viene por multipart/form-data, los campos están en req.body y la foto en req.file
  const {
    Nombres,
    Apellidos,
    Titulo,
    Credencial,
    Activo,
    DUI,
    NIT,
    NUP,
    Direccion,
    FechaNacimiento,
  } = req.body;
  let Foto = null;
  if (req.file && req.file.buffer) {
    Foto = req.file.buffer;
  } else if (req.body.Foto) {
    // Si viene en base64, decodificar a buffer
    if (
      typeof req.body.Foto === "string" &&
      req.body.Foto.startsWith("data:image")
    ) {
      const base64Data = req.body.Foto.split(",")[1];
      Foto = Buffer.from(base64Data, "base64");
    } else {
      Foto = req.body.Foto;
    }
  }

  try {
    // Verificar que el perfil existe y pertenece al usuario logueado
    const [rows] = await pool.query(
      `SELECT IDPerfil FROM perfil WHERE IDReferencia = ? LIMIT 1`,
      [idReferencia]
    );
    if (!rows || rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No existe perfil para este usuario." });
    }
    const idPerfil = rows[0].IDPerfil;

    // Actualizar los campos en la tabla perfil
    await pool.query(
      `UPDATE perfil SET
        Nombres = COALESCE(?, Nombres),
        Apellidos = COALESCE(?, Apellidos),
        Titulo = COALESCE(?, Titulo),
        Credencial = COALESCE(?, Credencial),
        Activo = COALESCE(?, Activo),
        DUI = COALESCE(?, DUI),
        NIT = COALESCE(?, NIT),
        NUP = COALESCE(?, NUP),
        Direccion = COALESCE(?, Direccion),
        FechaNacimiento = COALESCE(?, FechaNacimiento),
        Foto = COALESCE(?, Foto)
      WHERE IDPerfil = ? AND IDReferencia = ?`,
      [
        Nombres,
        Apellidos,
        Titulo,
        Credencial,
        Activo,
        DUI,
        NIT,
        NUP,
        Direccion,
        FechaNacimiento,
        Foto,
        idPerfil,
        idReferencia,
      ]
    );

    // Obtener el perfil actualizado
    const [updatedRows] = await pool.query(
      `SELECT IDPerfil, Nombres, Apellidos, Titulo, Credencial, Activo, FechaCreacion, DUI, NIT, NUP, Direccion, FechaNacimiento, IDReferencia, Foto FROM perfil WHERE IDPerfil = ? LIMIT 1`,
      [idPerfil]
    );

    res.json({
      message: "Perfil actualizado correctamente.",
      perfil: updatedRows[0],
    });
  } catch (error) {
    console.error("updatePerfilDocente error:", error);
    res.status(500).json({
      message: "Ups! Algo salió mal al actualizar el perfil.",
      error: error.message,
    });
  }
};

const crearPerfilDocente = async (req, res) => {
  try {
    const idReferencia = req.user?.ID ?? req.user?.id ?? null;
    const {
      Nombres,
      Apellidos,
      Titulo,
      Credencial,
      Activo,
      DUI,
      NIT,
      NUP,
      Direccion,
      FechaNacimiento,
      Foto,
    } = req.body;
    let FotoBuffer = null;
    if (req.file && req.file.buffer) {
      FotoBuffer = req.file.buffer;
    } else if (Foto) {
      if (typeof Foto === "string" && Foto.startsWith("data:image")) {
        const base64Data = Foto.split(",")[1];
        FotoBuffer = Buffer.from(base64Data, "base64");
      } else {
        FotoBuffer = Foto;
      }
    }

    if (
      !Nombres ||
      !Apellidos ||
      !Titulo ||
      Activo === undefined ||
      !idReferencia
    ) {
      return res.status(400).json({
        message: "Faltan campos obligatorios o usuario no identificado.",
      });
    }

    const [result] = await pool.query(
      `INSERT INTO perfil (Nombres, Apellidos, Titulo, Credencial, Activo, DUI, NIT, NUP, Direccion, FechaNacimiento, IDReferencia, Foto)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Nombres,
        Apellidos,
        Titulo,
        Credencial,
        Activo,
        DUI,
        NIT,
        NUP,
        Direccion,
        FechaNacimiento,
        idReferencia,
        FotoBuffer,
      ]
    );

    res
      .status(201)
      .json({ message: "Perfil guardado", IDPerfil: result.insertId });
  } catch (err) {
    console.error("crearPerfilDocente error:", err);
    res.status(500).json({ message: "Error interno" });
  }
};

module.exports = {
  crearPerfilDocente,
  getPerfilDocente,
  updatePerfilDocente,
  upload,
  getDiplomaPDF,
};
