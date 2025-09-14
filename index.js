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

// تحميل البلوجنز وتحويل كل ملف إلى endpoint
async function loadPlugins() {
  // إزالة routes القديمة
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
              const routePath = `/api/${section}/${file.replace(".js", "")}`;
              const router = express.Router();
              plugin.default(router, express); // تمرير Router لكل بلوجن
              app.use(routePath, router);
              loadedRoutes.push({ section, file, path: routePath });
              console.log(`✅ Loaded: ${routePath}`);
            }
          } catch (err) {
            console.error(`❌ Error loading ${filePath}:`, err);
          }
        }
      }
    }
  }
}

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

// الصفحة الرئيسية مع زر إعادة التحميل
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
      <ul style="margin-top:20px;" id="routes"></ul>

      <script>
        function updateList() {
          fetch('/api/list')
            .then(res => res.json())
            .then(data => {
              const ul = document.getElementById('routes');
              ul.innerHTML = '';
              data.forEach(r => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = r.path;
                a.target = '_blank';
                a.textContent = r.path;
                li.appendChild(a);
                ul.appendChild(li);
              });
            });
        }

        document.getElementById('reload').addEventListener('click', () => {
          fetch('/api/reload')
            .then(res => res.json())
            .then(data => {
              alert('✅ Reloaded: ' + data.loaded + ' plugins');
              updateList();
            })
            .catch(err => alert('❌ Error: ' + err));
        });

        updateList();
      </script>
    </body>
    </html>
  `);
});

// تشغيل السيرفر
loadPlugins().then(() => {
  app.listen(PORT, () => console.log(`🚀 Server running: http://localhost:${PORT}`));
});
