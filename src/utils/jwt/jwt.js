// utils/jwt/jwt.js
const { sign, verify } = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "token 2024";

const generateToken = (
  IDUsuario,
  Usuario,
  Tipo,
  IDReferencia,
  EmailKey,
  sistemaasignacionroles,
  empleado
) => {
  const token = sign(
    {
      IDUsuario,
      Usuario,
      Tipo,
      IDReferencia,
      EmailKey,
      sistemaasignacionroles,
      empleado, // Incluimos solo los campos necesarios del empleado
    },
    JWT_SECRET,
    {
      expiresIn: "3h", // Token válido por 3 horas
      algorithm: "HS256",
    }
  );
  return token;
};

const verifyToken = (token) => {
  try {
    return verify(token, JWT_SECRET);
  } catch (err) {
    throw err;
  }
};

module.exports = {
  generateToken,
  verifyToken,
};
