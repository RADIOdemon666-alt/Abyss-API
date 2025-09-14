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

// تحميل البلوجنز
async function loadPlugins() {
  loadedRoutes.forEach(r => {
    app._router.stack = app._router.stack.filter(
      layer => !(layer.route && layer.route.path === r.path)
    );
  });
  loadedRoutes = [];

  if (!fs.existsSync(pluginsDir)) return;

  const sections = fs.readdirSync(pluginsDir);

  for (const section of sections) {
    const sectionPath = path.join(pluginsDir, section);

    if (fs.statSync(sectionPath).isDirectory()) {
      const files = fs.readdirSync(sectionPath);

      for (const file of files) {
        if (file.endsWith(".js")) {
          const filePath = path.join(sectionPath, file);
          try {
            const plugin = await import(pathToFileURL(filePath).href + `?update=${Date.now()}`);
            if (typeof plugin.default === "function") {
              const routePath = `/api/${section}`;
              const router = express.Router();
              plugin.default(router, express);
              app.use(routePath, router);
              loadedRoutes.push({ section, file, path: routePath });
              console.log(`✅ Loaded: ${routePath} from ${file}`);
            }
          } catch (err) {
            console.error(`❌ Error loading ${filePath}:`, err);
          }
        }
      }
    }
  }
}

// مراقبة البلوجنز
function watchPlugins() {
  if (!fs.existsSync(pluginsDir)) return;

  fs.watch(pluginsDir, { recursive: true }, (eventType, filename) => {
    if (filename && filename.endsWith(".js")) {
      console.log(`🔄 Detected change in plugin: ${filename}. Reloading plugins...`);
      loadPlugins();
    }
  });
}

// Route افتراضي للصفحة الرئيسية مع زر إعادة التحميل
app.get("/", (req, res) => {
  res.send(`
    <html>
    <head>
      <title>Abyss API</title>
    </head>
    <body style="font-family:sans-serif; background:#111; color:#0f0; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh;">
      <h1>Abyss API</h1>
      <p>عدد البلوجنز المحملة: ${loadedRoutes.length}</p>
      <button id="reload" style="padding:10px 20px; font-size:16px; cursor:pointer; margin-top:20px;">🔄 إعادة تحميل البلوجنز</button>

      <script>
        document.getElementById('reload').addEventListener('click', () => {
          fetch('/api/reload')
            .then(res => res.json())
            .then(data => alert('✅ Reloaded: ' + data.loaded + ' plugins'))
            .catch(err => alert('❌ Error: ' + err));
        });
      </script>
    </body>
    </html>
  `);
});

// Endpoint لإعادة تحميل البلوجنز من الزر
app.get("/api/reload", async (req, res) => {
  await loadPlugins();
  res.json({ loaded: loadedRoutes.length });
});

// Endpoint يعرض قائمة الـ APIs
app.get("/api/list", async (req, res) => {
  await loadPlugins();
  res.json(loadedRoutes);
});

// تشغيل السيرفر
loadPlugins().then(() => {
  watchPlugins(); // بدء المراقبة
  app.listen(PORT, () => {
    console.log(`🚀 Server running: http://localhost:${PORT}`);
  });
});
