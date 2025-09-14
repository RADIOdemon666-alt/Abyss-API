const express = require("express");

module.exports = () => {
  const router = express.Router();

  router.get("/hello", (req, res) => {
    res.json({ message: "Hello from Tool API!" });
  });

  return router;
};
