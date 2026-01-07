// Actualizar posgrado por ID
const actualizarPosgrado = async (req, res) => {
  try {
    const { id } = req.params;
    const { fkPerfil, Fecha, Lugar, Especialidad, preservarArchivo } = req.body;

    // console.log("🔄 Actualizando posgrado:", {
    //     id,
    //     fkPerfil,
    //     Fecha,
    //     Lugar,
    //     Especialidad,
    //     preservarArchivo,
    //     tieneArchivo: !!req.file,
    //     archivoEnBody: !!req.body.DiplomaPDF,
    //   });

    if (!id || !fkPerfil || !Fecha || !Lugar || !Especialidad) {
      // console.log("❌ Faltan campos obligatorios:", {
      //   id,
      //   fkPerfil,
      //   Fecha,
      //   Lugar,
      //   Especialidad,
      // });
      return res.status(400).json({ message: "Faltan campos obligatorios." });
    }

    let DiplomaPDF = null;

    // Si se debe preservar el archivo existente, hacer UPDATE sin modificar DiplomaPDF
    if (preservarArchivo === true || preservarArchivo === "true") {
      // console.log(
      //   "📁 Preservando archivo existente - Solo actualizando campos de texto"
      // );

      const [result] = await pool.query(
        `UPDATE posgrado SET fkPerfil = ?, Fecha = ?, Lugar = ?, Especialidad = ? WHERE IDPosGrado = ?`,
        [fkPerfil, Fecha, Lugar, Especialidad, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Posgrado no encontrado." });
      }

      // console.log("✅ Posgrado actualizado (archivo preservado)");
      res.json({ message: "Posgrado actualizado correctamente." });
      return;
    }

    // Si no se preserva el archivo, procesar nuevo archivo
    if (req.file && req.file.buffer) {
      // console.log("📎 Procesando archivo nuevo desde multer");
      DiplomaPDF = req.file.buffer;
    } else if (req.body.DiplomaPDF) {
      // console.log("📎 Procesando archivo desde body");
      if (
        typeof req.body.DiplomaPDF === "string" &&
        req.body.DiplomaPDF.startsWith("data:application/pdf")
      ) {
        const base64Data = req.body.DiplomaPDF.split(",")[1];
        DiplomaPDF = Buffer.from(base64Data, "base64");
      } else {
        DiplomaPDF = req.body.DiplomaPDF;
      }
    }

    // console.log("🔄 Actualizando posgrado con nuevo archivo");

    const [result] = await pool.query(
      `UPDATE posgrado SET fkPerfil = ?, Fecha = ?, Lugar = ?, Especialidad = ?, DiplomaPDF = ? WHERE IDPosGrado = ?`,
      [fkPerfil, Fecha, Lugar, Especialidad, DiplomaPDF, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Posgrado no encontrado." });
    }

    // console.log("✅ Posgrado actualizado con nuevo archivo");
    res.json({ message: "Posgrado actualizado correctamente." });
  } catch (err) {
    console.error("❌ actualizarPosgrado error:", err);
    res.status(500).json({ message: "Error interno", error: err.message });
  }
};
// src/controllers/posgrado/posgrado.controller.js
const pool = require("../../database/config.js");

// Crear posgrado
const crearPosgrado = async (req, res) => {
  try {
    const { fkPerfil, Fecha, Lugar, Especialidad } = req.body;
    let DiplomaPDF = null;
    if (req.file && req.file.buffer) {
      DiplomaPDF = req.file.buffer;
    } else if (req.body.DiplomaPDF) {
      if (
        typeof req.body.DiplomaPDF === "string" &&
        req.body.DiplomaPDF.startsWith("data:application/pdf")
      ) {
        const base64Data = req.body.DiplomaPDF.split(",")[1];
        DiplomaPDF = Buffer.from(base64Data, "base64");
      } else {
        DiplomaPDF = req.body.DiplomaPDF;
      }
    }
    if (!fkPerfil || !Fecha || !Lugar || !Especialidad) {
      return res.status(400).json({ message: "Faltan campos obligatorios." });
    }
    const [result] = await pool.query(
      `INSERT INTO posgrado (fkPerfil, Fecha, Lugar, Especialidad, DiplomaPDF) VALUES (?, ?, ?, ?, ?)`,
      [fkPerfil, Fecha, Lugar, Especialidad, DiplomaPDF]
    );
    res
      .status(201)
      .json({ message: "Posgrado guardado", IDPosGrado: result.insertId });
  } catch (err) {
    console.error("crearPosgrado error:", err);
    res.status(500).json({ message: "Error interno" });
  }
};

// Obtener posgrados por perfil
const getPosgradosByPerfil = async (req, res) => {
  try {
    const { fkPerfil } = req.params;
    const [rows] = await pool.query(
      `SELECT IDPosGrado, fkPerfil, Fecha, Lugar, Especialidad, DiplomaPDF FROM posgrado WHERE fkPerfil = ?`,
      [fkPerfil]
    );
    // Convertir PDF a base64 para enviar al frontend
    const posgrados = rows.map((row) => {
      if (row.DiplomaPDF && Buffer.isBuffer(row.DiplomaPDF)) {
        row.DiplomaPDF = `data:application/pdf;base64,${row.DiplomaPDF.toString(
          "base64"
        )}`;
      }
      return row;
    });
    res.json(posgrados);
  } catch (err) {
    console.error("getPosgradosByPerfil error:", err);
    res.status(500).json({ message: "Error interno" });
  }
};

// Eliminar posgrado por ID
const eliminarPosgrado = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: "ID de posgrado requerido." });
    }
    const [result] = await pool.query(
      "DELETE FROM posgrado WHERE IDPosGrado = ?",
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Posgrado no encontrado." });
    }
    res.json({ message: "Posgrado eliminado correctamente." });
  } catch (err) {
    console.error("eliminarPosgrado error:", err);
    res.status(500).json({ message: "Error interno" });
  }
};

module.exports = {
  crearPosgrado,
  getPosgradosByPerfil,
  eliminarPosgrado,
  actualizarPosgrado,
};
