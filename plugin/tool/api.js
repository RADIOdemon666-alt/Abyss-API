const express = require("express");

module.exports = () => {
  const router = express.Router();

  // 🌐 GET: اختبار بسيط
  router.get("/status", (req, res) => {
    res.json({
      success: true,
      endpoint: "status",
      message: "API تعمل بنجاح ✅",
      timestamp: new Date().toISOString()
    });
  });

  // 🌐 GET: جلب بيانات تجريبية
  router.get("/info", (req, res) => {
    res.json({
      success: true,
      endpoint: "info",
      data: {
        name: "Demo API",
        version: "1.0.0",
        description: "مثال API بسيط على طريقة المواقع الكبيرة"
      }
    });
  });

  // 🌐 POST: استقبال بيانات وتجربة
  router.post("/echo", (req, res) => {
    const payload = req.body;
    res.json({
      success: true,
      endpoint: "echo",
      received: payload,
      message: "تم استلام البيانات وعرضها بنجاح ✅"
    });
  });

  return router;
};
