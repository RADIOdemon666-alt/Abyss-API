const express = require('express');
const router = express.Router();

// مثال endpoint
router.get('/hello', (req, res) => {
  res.json({ message: "Hello from Download API!" });
});

module.exports = router;
