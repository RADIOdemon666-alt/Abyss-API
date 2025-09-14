const express = require("express");
const fs = require("fs");
const path = require("path");
const serverless = require("serverless-http");

const app = express();
const __dirnamePath = __dirname;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirnamePath, "public")));

const pluginsDir = path.join(__dirnamePath, "plugin");
let loadedRoutes = [];
let logBuffer = [];

// دالة اللوج
function log(msg) {
  const time = new Date().toLocaleTimeString();
  const full = `[${time}] ${msg}`;
  console.log(full);
  logBuffer.push(full);
  if (logBuffer.length > 1000) logBuffer.shift();
}

// تحميل البلوجنز
function loadPlugins() {
  log("🔄 بدء تحميل البلوجنز...");
  
  // إزالة أي روت قديم
  loadedRoutes.forEach(r => {
    app._router.stack = app._router.stack.filter(
      layer => !(layer.route && layer.route.path === r.path)
    );
  });
  loadedRoutes = [];

  if (!fs.existsSync(pluginsDir)) {
    log(`⚠️ مجلد plugins غير موجود: ${pluginsDir}`);
    return;
  }

  const sections = fs.readdirSync(pluginsDir);
  for (const section of sections) {
    const sectionPath = path.join(pluginsDir, section);
    if (fs.statSync(sectionPath).isDirectory()) {
      const files = fs.readdirSync(sectionPath);
      for (const file of files) {
        if (file.endsWith(".js")) {
          const filePath = path.join(sectionPath, file);
          try {
            delete require.cache[require.resolve(filePath)]; // مسح الكاش
            const plugin = require(filePath);
            if (typeof plugin === "function") {
              const routePath = `/api/${section}/${file.replace(".js", "")}`;
              const router = express.Router();
              plugin(router);
              app.use(routePath, router);
              loadedRoutes.push({ section, file, path: routePath });
              log(`✅ Loaded: ${routePath}`);
            } else {
              log(`⚠️ الملف ليس بلوجن صالح: ${filePath}`);
            }
          } catch (err) {
            log(`❌ خطأ في تحميل ${filePath}: ${err.message}`);
          }
        }
      }
    }
  }
  log(`✨ عدد البلوجنز المحملة: ${loadedRoutes.length}`);
}

// تحميل البلوجنز مرة واحدة عند تشغيل السيرفر
loadPlugins();

// API لإعادة تحميل البلوجنز الجديدة فقط
app.get("/api/reload", (req, res) => {
  loadPlugins();
  res.json({ message: "🔄 البلوجنز تم تحديثها في الذاكرة بدون إعادة تشغيل" });
});

// API لعرض البلوجنز
app.get("/api/list", (req, res) => {
  res.json(loadedRoutes);
});

// API للّوج
app.get("/api/logs", (req, res) => {
  res.json(logBuffer);
});

// تشغيل السيرفر محلي
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () =>
    console.log(`🚀 Server running: http://localhost:${PORT}`)
  );
}

// تصدير للـ serverless
module.exports = serverless(app);
