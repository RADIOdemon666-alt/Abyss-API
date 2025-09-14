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
  // إزالة routes القديمة
  loadedRoutes.forEach(r => {
    app._router.stack = app._router.stack.filter(
      layer => !(layer.route && layer.route.path === r.path)
    );
  });
  loadedRoutes = [];

  if (!fs.existsSync(pluginsDir)) {
    console.warn(`⚠️ مجلد plugins غير موجود: ${pluginsDir}`);
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
            // منع الكاش عند إعادة الاستيراد
            const plugin = await import(pathToFileURL(filePath).href + `?update=${Date.now()}`);

            if (typeof plugin.default === "function") {
              const routePath = `/api/${section}`;
              const router = express.Router();
              plugin.default(router, express); // تمرير Router لكل بلوجن
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

// مراقبة البلوجنز لإعادة التحميل تلقائيًا
function watchPlugins() {
  if (!fs.existsSync(pluginsDir)) return;

  fs.watch(pluginsDir, { recursive: true }, (eventType, filename) => {
    if (filename && filename.endsWith(".js")) {
      console.log(`🔄 Detected change in plugin: ${filename}. Reloading plugins...`);
      loadPlugins();
    }
  });
}

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
