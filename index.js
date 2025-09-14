const express = require("express");
const fs = require("fs");
const path = require("path");
const serverless = require("serverless-http");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// البلوجنز
const pluginsDir = path.join(__dirname, "plugin");
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
async function loadPlugins() {
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
  log(`📂 الأقسام الموجودة: ${sections.join(", ")}`);

  for (const section of sections) {
    const sectionPath = path.join(pluginsDir, section);
    if (fs.statSync(sectionPath).isDirectory()) {
      const files = fs.readdirSync(sectionPath);
      log(`📁 قسم ${section} يحتوي على الملفات: ${files.join(", ")}`);
      for (const file of files) {
        if (file.endsWith(".js")) {
          const filePath = path.join(sectionPath, file);
          try {
            const plugin = require(filePath);
            if (typeof plugin === "function") {
              const routePath = `/api/${section}/${file.replace(".js", "")}`;
              const router = express.Router();
              plugin(router); // البلوجن يستخدم Router اللي اتعمل هنا
              app.use(routePath, router);
              loadedRoutes.push({ section, file, path: routePath });
              log(`✅ Loaded: ${routePath}`);
            }
          } catch (err) {
            log(`❌ خطأ في تحميل ${filePath}: ${err}`);
          }
        }
      }
    }
  }
  log(`✨ عدد البلوجنز المحملة: ${loadedRoutes.length}`);
}

// إعادة تحميل البلوجنز
app.get("/api/reload", async (req, res) => {
  await loadPlugins();
  res.json({ loaded: loadedRoutes.length });
});

// قائمة البلوجنز
app.get("/api/list", async (req, res) => {
  await loadPlugins();
  res.json(loadedRoutes);
});

// اللوجات
app.get("/api/logs", (req, res) => {
  res.json(logBuffer);
});

// تشغيل السيرفر محلي
if (!process.env.VERCEL) {
  app.listen(3000, () =>
    console.log("🚀 Server running: http://localhost:3000")
  );
}

module.exports = serverless(app);
