import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// مسار مجلد الـ plugins
const pluginsDir = path.join(__dirname, "plugin");

// نخلي public متاح
app.use(express.static(path.join(__dirname, "public")));

// نخزن الـ APIs المحملة
let loadedRoutes = [];

// دالة تحميل الـ plugins
async function loadPlugins() {
  // تفريغ القديم
  loadedRoutes.forEach(r => {
    app._router.stack = app._router.stack.filter(
      layer => !(layer.route && layer.route.path === r.path)
    );
  });
  loadedRoutes = [];

  const sections = fs.readdirSync(pluginsDir);

  for (const section of sections) {
    const sectionPath = path.join(pluginsDir, section);

    if (fs.statSync(sectionPath).isDirectory()) {
      const files = fs.readdirSync(sectionPath);

      for (const file of files) {
        if (file.endsWith(".js")) {
          const filePath = path.join(sectionPath, file);

          try {
            // import ESM مع كسر الكاش (query وهمية)
            const plugin = await import(
              pathToFileURL(filePath).href + "?update=" + Date.now()
            );

            if (typeof plugin.default === "function") {
              const routePath = `/api/${section}`;
              app.use(routePath, plugin.default(express));
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

// Endpoint يعرض قائمة الـ APIs
app.get("/api/list", async (req, res) => {
  await loadPlugins();
  res.json(loadedRoutes);
});

// أول تحميل
await loadPlugins();

// تشغيل السيرفر
app.listen(PORT, () => {
  console.log(`🚀 Server running: http://localhost:${PORT}`);
});
