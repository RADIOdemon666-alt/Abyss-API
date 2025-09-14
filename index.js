import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import session from "express-session";

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pluginsDir = path.join(__dirname, "plugin");
app.use(express.static(path.join(__dirname, "public")));

// تفعيل session
app.use(session({
  secret: 'abyss-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 30 * 60 * 1000 } // 30 دقيقة
}));

let loadedRoutes = [];
let logBuffer = [];

// بيانات الادمن
const ADMIN_NUMBER = "01500564191";
const ADMIN_PASSWORD = "N7D3AnaEedY";

// دالة لطباعة اللوجات
function log(message) {
  const time = new Date().toLocaleTimeString();
  const fullMsg = `[${time}] ${message}`;
  console.log(fullMsg);
  logBuffer.push(fullMsg);
  if (logBuffer.length > 1000) logBuffer.shift();
}

// تحميل البلوجنز
async function loadPlugins() {
  log("🔄 بدء تحميل البلوجنز...");

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
              plugin.default(router); // فقط router
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

// صفحة تسجيل الدخول للادمن
app.get("/login", (req, res) => {
  res.send(`
    <html>
    <head>
      <title>Login Admin</title>
      <style>
        body { background:#0a0a0a; color:#0ff; font-family:'Fira Code', monospace; display:flex; justify-content:center; align-items:center; height:100vh; }
        form { display:flex; flex-direction:column; width:300px; }
        input { margin:5px 0; padding:10px; border-radius:5px; border:1px solid #0ff; background:#111; color:#0ff; }
        button { padding:10px; margin-top:10px; cursor:pointer; border:2px solid #00faff; background:#000; color:#0ff; border-radius:5px; }
        button:hover { box-shadow:0 0 10px #00faff; }
      </style>
    </head>
    <body>
      <form method="POST" action="/login">
        <h2>Admin Login</h2>
        <input type="text" name="number" placeholder="رقم الادمن" required />
        <input type="password" name="password" placeholder="كلمة السر" required />
        <button>تسجيل الدخول</button>
      </form>
    </body>
    </html>
  `);
});

app.use(express.urlencoded({ extended: true }));

// معالجة تسجيل الدخول
app.post("/login", (req, res) => {
  const { number, password } = req.body;
  if (number === ADMIN_NUMBER && password === ADMIN_PASSWORD) {
    req.session.admin = true;
    res.redirect("/"); // الدخول للـ Dashboard
  } else {
    res.redirect("/home"); // خطأ → إعادة التوجيه للصفحة العامة
  }
});

// Middleware للتحقق من الادمن
function adminAuth(req, res, next) {
  if (req.session.admin) next();
  else res.redirect("/home");
}

// صفحة عامة للخطأ أو الوصول بدون تسجيل دخول
app.get("/home", (req, res) => {
  res.sendFile(path.join(__dirname, "public/page/home/home.html"));
});

// **Dashboard** محمي داخل نفس الملف
app.get("/", adminAuth, (req, res) => {
  res.send(`
  <html>
  <head>
    <title>Abyss API Dashboard</title>
    <style>
      body { margin:0; font-family:'Fira Code', monospace; background:#0a0a0a; color:#0ff; }
      h1 { text-align:center; margin-top:20px; color:#00faff; text-shadow:0 0 10px #00faff; }
      button { padding:10px 20px; margin:10px; cursor:pointer; border:2px solid #00faff; background:#000; color:#0ff; border-radius:5px; transition:0.3s; }
      button:hover { box-shadow:0 0 10px #00faff; transform:scale(1.05); }
      #logs { width:90%; height:300px; background:#111; color:#0ff; margin:20px auto; padding:10px; overflow:auto; border:1px solid #00faff; border-radius:5px; font-size:14px; white-space:pre-wrap; }
      ul { width:90%; margin:0 auto; padding:0; list-style:none; }
      li a { color:#0ff; text-decoration:none; }
      li a:hover { text-shadow:0 0 5px #00faff; }
    </style>
  </head>
  <body>
    <h1>Abyss API Dashboard</h1>
    <p style="text-align:center;">عدد البلوجنز المحملة: <span id="plugin-count">0</span></p>
    <div style="text-align:center;">
      <button id="reload">🔄 إعادة تحميل البلوجنز</button>
      <button id="copy">📋 نسخ كل اللوج</button>
    </div>
    <ul id="routes"></ul>
    <div id="logs"></div>

    <script>
      async function updateDashboard() {
        const res = await fetch('/api/list');
        const data = await res.json();
        document.getElementById('plugin-count').textContent = data.length;
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

        const logsRes = await fetch('/api/logs');
        const logsData = await logsRes.json();
        document.getElementById('logs').textContent = logsData.join("\\n");
      }

      document.getElementById('reload').addEventListener('click', async () => {
        const res = await fetch('/api/reload');
        const data = await res.json();
        alert('✅ Reloaded: ' + data.loaded + ' plugins');
        updateDashboard();
      });

      document.getElementById('copy').addEventListener('click', () => {
        const logs = document.getElementById('logs').textContent;
        navigator.clipboard.writeText(logs);
        alert('📋 تم نسخ كل اللوج!');
      });

      updateDashboard();
      setInterval(updateDashboard, 5000); // تحديث كل 5 ثواني
    </script>
  </body>
  </html>
  `);
});

// API لإعادة تحميل البلوجنز
app.get("/api/reload", adminAuth, async (req, res) => {
  await loadPlugins();
  res.json({ loaded: loadedRoutes.length });
});

// API لإرجاع اللوج
app.get("/api/logs", adminAuth, (req, res) => {
  res.json(logBuffer);
});

// تشغيل السيرفر
loadPlugins().then(() => {
  app.listen(PORT, () => log(`🚀 Server running: http://localhost:${PORT}`));
});
