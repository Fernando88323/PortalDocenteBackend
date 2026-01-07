const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PSW,
  database: process.env.DB,
  port: process.env.DBPORT,
  multipleStatements: true,
});

// (Opcional) probar conexión al arrancar
(async () => {
  try {
    const conn = await pool.getConnection();
    conn.release();
    // console.log("✅ Conectado a la DB");
  } catch (err) {
    console.error("❌ Error de conexión a la DB:", err);
  }
})();

module.exports = pool;
