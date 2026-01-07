const express = require("express");
const logoutRouter = express.Router();

// Elimina la cookie del accessToken
logoutRouter.get("/", (req, res) => {
  res.cookie("accessToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    expires: new Date(0), // La cookie expira inmediatamente
    path: "/",
  });
  // console.log("Sesión cerrada: accessToken eliminado.");
  res.status(200).json({ message: "Logout exitoso" });
});
module.exports = logoutRouter;
