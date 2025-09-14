import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pluginsDir = path.join(__dirname, "plugin");
app.use(express.static(path.join(__dirname, "public")));

let loadedRoutes = [];
let logBuffer = []; // لتخزين لوجات السيرفر

// دالة لطباعة اللوجات وتخزينها
function log(message) {
  const time = new Date().toLocaleTimeString();
  const fullMsg = `[${time}] ${message}`;
  console.log(fullMsg);
  logBuffer.push(fullMsg);
  if (logBuffer.length > 1000) logBuffer.shift(); // الحفاظ على حجم المربع
}

// تحميل البلوجنز وتحويل كل ملف إلى endpoint
async function loadPlugins() {
  log("🔄 بدء تحميل البلوجنز...");

  // إزالة routes القديمة
  loadedRoutes.forEach(r => {
    app._router.stack = app._router.stack.filter(
      layer => !(layer.route && layer.route.path === r.path)
    );
  });
  loadedRoutes = [];

  if (!fs.existsSync(pluginsDir)) {
    log(`⚠️ مجلد plugin غير موجود: ${pluginsDir}`);
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
            const plugin = await import(pathToFileURL(filePath).href + `?update=${Date.now()}`);
            if (typeof plugin.default === "function") {
              const routePath = `/api/${section}/${file.replace(".js", "")}`;
              const router = express.Router();
              plugin.default(router, express);
              app.use(routePath, router);
              loadedRoutes.push({ section, file, path: routePath });
              log(`✅ Loaded: ${routePath}`);
            } else {
              log(`❌ الملف ${file} لا يحتوي على export default function`);
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

// Endpoint لإعادة تحميل البلوجنز
app.get("/api/reload", async (req, res) => {
  await loadPlugins();
  res.json({ loaded: loadedRoutes.length });
});

// Endpoint يعرض قائمة الـ APIs
app.get("/api/list", async (req, res) => {
  await loadPlugins();
  res.json(loadedRoutes);
});

// Endpoint لجلب اللوجات
app.get("/api/logs", (req, res) => {
  res.json(logBuffer);
});

// الصفحة الرئيسية
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ar">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Abyss API console</title>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500&family=Fira+Code&display=swap" rel="stylesheet">
<style>
  body { margin:0; font-family:'Fira Code', monospace; background:#0a0a0a; color:#0ff; display:flex; flex-direction:column; align-items:center; justify-content:flex-start; min-height:100vh; }
  h1 { font-family:'Orbitron', sans-serif; margin:20px 0; text-shadow: 0 0 10px #8a2be2, 0 0 20px #00faff; }
  button { padding:10px 20px; font-size:16px; cursor:pointer; margin:10px; border:2px solid #00faff; background:#000; color:#0ff; border-radius:8px; transition: 0.3s; }
  button:hover { box-shadow: 0 0 10px #00faff, 0 0 20px #8a2be2; transform: scale(1.05); }
  #logBox { width:90%; max-width:1200px; height:400px; background:#111; border:1px solid #8a2be2; border-radius:8px; margin-top:20px; overflow:auto; padding:10px; font-size:14px; color:#0ff; white-space:pre-wrap; }
  a { color:#ff003c; text-decoration:none; }
  a:hover { text-decoration:underline; }
</style>
</head>
<body>
<h1>Abyss API Dashboard</h1>
<p>عدد البلوجنز المحملة: <span id="pluginCount">0</span></p>
<button id="reloadBtn">🔄 إعادة تحميل البلوجنز</button>
<button id="copyBtn">📋 نسخ الـ Logs</button>
<div id="logBox"></div>

<script>
const pluginCount = document.getElementById('pluginCount');
const logBox = document.getElementById('logBox');
const reloadBtn = document.getElementById('reloadBtn');
const copyBtn = document.getElementById('copyBtn');

async function updateLogs() {
  const res = await fetch('/api/logs');
  const logs = await res.json();
  logBox.textContent = logs.join('\\n');
  logBox.scrollTop = logBox.scrollHeight;
}

async function updatePluginCount() {
  const res = await fetch('/api/list');
  const data = await res.json();
  pluginCount.textContent = data.length;
}

reloadBtn.addEventListener('click', async () => {
  await fetch('/api/reload');
  await updatePluginCount();
  await updateLogs();
});

copyBtn.addEventListener('click', () => {
  navigator.clipboard.writeText(logBox.textContent)
    .then(() => alert('✅ تم نسخ كل الـ Logs'))
    .catch(() => alert('❌ فشل النسخ'));
});

setInterval(updateLogs, 1000);
setInterval(updatePluginCount, 2000);

updateLogs();
updatePluginCount();
</script>
</body>
</html>
  `);
});

// تشغيل السيرفر
loadPlugins().then(() => {
  app.listen(PORT, () => console.log(`🚀 Server running: http://localhost:${PORT}`));
});
