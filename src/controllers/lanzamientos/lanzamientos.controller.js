const pool = require("../../database/config.js");
require("dotenv").config();

// Función para sincronizar lanzamientos desde la API externa
const syncLanzamientos = async (req, res) => {
  try {
    const { ciclo } = req.body;

    if (!ciclo) {
      return res.status(400).json({
        message: "El campo 'ciclo' es requerido en el body de la solicitud",
      });
    }

    const TOKEN = process.env.JWT_TOKEN_USO;
    const API_LANZAMIENTOS = process.env.API_LANZAMIENTOS;

    if (!TOKEN) {
      return res.status(401).json({ message: "TOKEN no configurado" });
    }

    // Consumir la API externa con POST y body
    const response = await fetch(API_LANZAMIENTOS, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ ciclo }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(502).json({
        message: "Error al consultar API externa de lanzamientos",
        status: response.status,
        detalle: errorText,
      });
    }

    const data = await response.json();

    if (!data.ok || !Array.isArray(data.data)) {
      return res.status(500).json({
        message: "Formato inesperado en respuesta de API externa",
        respuesta: data,
      });
    }

    const lanzamientosExternos = data.data;
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      let insertados = 0;
      let omitidos = 0;
      const duplicados = [];

      for (const lanzamiento of lanzamientosExternos) {
        const {
          IDLanzamiento: idExterno,
          Inicio,
          Final,
          IDCuestionario,
          Ciclo,
          Descripcion,
        } = lanzamiento;

        // Verificar si ya existe un lanzamiento con el mismo IDLanzamiento
        const [existing] = await conn.query(
          `SELECT IDLanzamiento FROM lanzamientos WHERE IDLanzamiento = ?`,
          [idExterno]
        );

        if (existing.length > 0) {
          // console.log(`Lanzamiento ya existe: IDLanzamiento=${idExterno}`);
          omitidos++;
          duplicados.push(idExterno);
          continue;
        }

        // Insertar nuevo lanzamiento con el IDLanzamiento exacto
        await conn.query(
          `INSERT INTO lanzamientos (IDLanzamiento, Inicio, Final, IDCuestionario, Ciclo, Descripcion)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            idExterno,
            new Date(Inicio),
            new Date(Final),
            IDCuestionario,
            Ciclo,
            Descripcion,
          ]
        );

        insertados++;
        // console.log(
        //         `Lanzamiento insertado: IDLanzamiento=${idExterno}, IDCuestionario=${IDCuestionario}, Ciclo=${Ciclo}`
        //       );
      }

      await conn.commit();

      const statusCode = duplicados.length > 0 ? 409 : 200;
      const message =
        duplicados.length > 0
          ? "Sincronización completada, pero se detectaron lanzamientos duplicados"
          : "Sincronización de lanzamientos completada";

      res.status(statusCode).json({
        message,
        ciclo,
        totalExternos: lanzamientosExternos.length,
        insertados,
        omitidos,
        duplicados,
      });
    } catch (error) {
      await conn.rollback();
      console.error("Error durante la sincronización:", error);
      res.status(500).json({
        message: "Error interno durante la sincronización",
        error: error.message,
      });
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error("Error en syncLanzamientos:", error.message || error);
    res.status(500).json({
      message: "Error al sincronizar lanzamientos",
      error: error.message,
    });
  }
};

module.exports = {
  syncLanzamientos,
};
