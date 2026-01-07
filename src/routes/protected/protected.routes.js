const express = require("express");
const router = express.Router();
const validateMicrosoftToken = require("../../midlewares/authMiddleware/authMiddleware");
const userData = require("../../midlewares/authMiddleware/userData");
const gruposProtected = require("../../midlewares/authMiddleware/groups");
const {
  getNotifications,
  getMetrics,
  getChartData,
  getUpcomingDates,
} = require("../../controllers/dashboardController/dashboardController.Controller");

// Ruta principal del dashboard
router.get("/validate-token", validateMicrosoftToken, (req, res) => {
  res.status(200).json({ message: "Acceso permitido", user: req.user });
});

// Ruta para obtener datos adicionales del usuario
router.get("/me", validateMicrosoftToken, userData, (req, res) => {
  res.status(200).json({ message: "Datos de usuario", user: req.user });
});

// Ruta para obtener datos adicionales del usuario
router.get("/grupos", validateMicrosoftToken, gruposProtected, (req, res) => {
  res.status(200).json({ message: "Grupos", user: req.user });
});

// GET /protected/dashboard/notifications
router.get("/notifications", validateMicrosoftToken, async (req, res) => {
  try {
    const notifications = await getNotifications(req.user.id);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener notificaciones" });
  }
});

// GET /protected/dashboard/metrics
// Para utilzarlo despues en el dashboard
router.get("/metrics", validateMicrosoftToken, async (req, res) => {
  try {
    const metrics = await getMetrics(req.user.id);
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener métricas" });
  }
});

// GET /protected/dashboard/chart-data
// Para utilzarlo despues en el dashboard
router.get("/chart-data", validateMicrosoftToken, async (req, res) => {
  try {
    const data = await getChartData(req.user.id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener datos de gráficas" });
  }
});

// GET /protected/dashboard/dates
// Para utilzarlo despues en el dashboard
router.get("/dates", validateMicrosoftToken, async (req, res) => {
  try {
    const dates = await getUpcomingDates(req.user.id);
    res.json(dates);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener fechas próximas" });
  }
});

module.exports = router;
