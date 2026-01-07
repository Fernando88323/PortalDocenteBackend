const express = require("express");
const router = express.Router();

const {
  getGroupsApi,
} = require("../../controllers/grupos/grupos.controller.js");

router.post("/", getGroupsApi);

module.exports = router;
