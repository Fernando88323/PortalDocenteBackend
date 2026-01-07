// controllers/mantenimiento/mantenimiento.controller.js
const mantenimientoPage = (req, res) => {
  return res.status(503).set("Retry-After", "3600").json({
    status: 503,
    message: "El sitio está en mantenimiento. Por favor, vuelve más tarde.",
    retryAfterSeconds: 3600,
  });
};

module.exports = { mantenimientoPage };
