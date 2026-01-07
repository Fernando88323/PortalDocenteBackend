const pool = require("../../database/config.js");
require("dotenv").config();
const { generateToken } = require("../../utils/jwt/jwt.js");
const http = require("http");

// Función para validar que el email sea de Microsoft
function isValidMicrosoftEmail(email) {
  const regex = /^[^\s@]+@(usonsonate\.edu\.sv|outlook\.com)$/i;
  return regex.test(email);
}

const callToKraken = ({ email, password }) => {
  return new Promise((resolve, reject) => {
    let resultado = "";

    // Convertimos el puerto a número utilizando parseInt
    const port = parseInt(process.env.API_PORT, 10);

    const options = {
      host: process.env.API_HOST,
      port: port,
      path: process.env.API_PATH,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    };

    // OPTIONS esta en variables de entorno
    const receptor = http
      .request(options, (resp) => {
        resp.setEncoding("utf8");
        resp.on("data", (chunk) => {
          // console.log("ok->", chunk.toString());
          resultado += chunk;
        });
        resp.on("end", () => {
          // console.log("resultado->", resultado);
          const resulta = JSON.parse(resultado);
          resolve(resulta);
        });
      })
      .on("error", (error) => {
        // console.log("error->", error);
        reject(error);
      });

    receptor.write(JSON.stringify({ email, password }));
    receptor.end();
  });
};

// Controlador para manejar el login
const login = async (req, res) => {
  const { Usuario, Contrasenia } = req.body;

  // console.log("parametros->", req.body);

  if (!Usuario || !Contrasenia) {
    return res
      .status(400)
      .json({ error: "Usuario y Contraseña son requeridos." });
  }

  // Validar en el backend que el correo sea de Microsoft
  if (!isValidMicrosoftEmail(Usuario)) {
    return res.status(400).json({
      error: "El correo ingresado no es válido.",
    });
  }

  const dataLogin = await callToKraken({
    email: Usuario,
    password: Contrasenia,
  });

  try {
    if (dataLogin.ok === true) {
      const { data } = dataLogin;
      const {
        IDUsuario,
        Usuario,
        Tipo,
        IDReferencia,
        EmailKey,
        sistemaasignacionroles,
        empleado,
      } = data;
      const { NombreCompleto, Titulo } = empleado;
      const token = generateToken(
        IDUsuario,
        Usuario,
        Tipo,
        IDReferencia,
        EmailKey,
        sistemaasignacionroles,
        empleado
      );

      // Se guarda el token en una cookie HTTP-Only
      res.cookie("accessToken", token, {
        httpOnly: true, // No accesible desde JavaScript en el navegador
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 3 * 60 * 60 * 1000, // Expira en 3 hora
        path: "/",
      });

      // console.log("token->", token);

      // Se redirige al dashboard en el frontend si fue exitoso
      return res.status(200).json({
        ok: true,
        mensaje: "Inicio de sesion exitoso",
        data,
        token,
      });
    } else {
      return res.status(401).json({
        error: "Credenciales inválidas",
      });
    }
  } catch (error) {
    console.error("Error en login:", error);
    return res.status(500).json({
      error: "Error interno en el inicio de sesión",
    });
  }
};

module.exports = {
  login,
};
