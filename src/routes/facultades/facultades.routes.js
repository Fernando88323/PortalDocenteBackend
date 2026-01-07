const express = require("express");
const router = express.Router();
const validateTokenMiddleware = require("../../midlewares/authMiddleware/authMiddleware.js");

const {
  getFacultades,
} = require("../../controllers/facultades/facultades.controller.js");

router.get("/", validateTokenMiddleware, getFacultades);

module.exports = router;
