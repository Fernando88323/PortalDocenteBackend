const express = require("express");
const router = express.Router();
const validateTokenMiddleware = require("../../midlewares/authMiddleware/authMiddleware.js");

const {
  getDecanos,
} = require("../../controllers/decanos/decanos.controller.js");

router.get("/", validateTokenMiddleware, getDecanos);

module.exports = router;
