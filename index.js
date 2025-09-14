import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import serverless from "serverless-http";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname,"public")));

// البلوجنز
const pluginsDir = path.join(__dirname,"plugin");
let loadedRoutes = [];
let logBuffer = [];

// دالة لكتابة اللوج
function log(msg){
  const time = new Date().toLocaleTimeString();
  const full = `[${time}] ${msg}`;
  console.log(full);
  logBuffer.push(full);
  if(logBuffer.length>1000) logBuffer.shift();
}

// تحميل البلوجنز
async function loadPlugins(){
  log("🔄 بدء تحميل البلوجنز...");
  // إزالة أي روت قديم
  loadedRoutes.forEach(r=>{
    app._router.stack = app._router.stack.filter(
      layer => !(layer.route && layer.route.path === r.path)
    );
  });
  loadedRoutes = [];

  if(!fs.existsSync(pluginsDir)){
    log(`⚠️ مجلد plugins غير موجود: ${pluginsDir}`);
    return;
  }

  const sections = fs.readdirSync(pluginsDir);
  log(`📂 الأقسام الموجودة: ${sections.join(", ")}`);

  for(const section of sections){
    const sectionPath = path.join(pluginsDir,section);
    if(fs.statSync(sectionPath).isDirectory()){
      const files = fs.readdirSync(sectionPath);
      log(`📁 قسم ${section} يحتوي على الملفات: ${files.join(", ")}`);
      for(const file of files){
        if(file.endsWith(".js")){
          const filePath = path.join(sectionPath,file);
          try{
            const plugin = await import(pathToFileURL(filePath).href+`?update=${Date.now()}`);
            if(typeof plugin.default === "function"){
              const routePath = `/api/${section}/${file.replace(".js","")}`;
              const router = express.Router();
              plugin.default(router, express);
              app.use(routePath, router);
              loadedRoutes.push({ section, file, path: routePath });
              log(`✅ Loaded: ${routePath}`);
            }
          }catch(err){
            log(`❌ خطأ في تحميل ${filePath}: ${err}`);
          }
        }
      }
    }
  }
  log(`✨ عدد البلوجنز المحملة: ${loadedRoutes.length}`);
}

// إعادة تحميل البلوجنز
app.get("/api/reload", async (req,res)=>{
  await loadPlugins();
  res.json({ loaded: loadedRoutes.length });
});

// قائمة البلوجنز
app.get("/api/list", async (req,res)=>{
  await loadPlugins();
  res.json(loadedRoutes);
});

// Dashboard للبلوجنز مع اللوج
app.get("/", async (req,res)=>{
  await loadPlugins();
  res.send(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>Abyss API Dashboard</title>
<style>
body{font-family:monospace;background:#0a0a0a;color:#0ff;margin:0;padding:20px;}
button{background:#000;color:#0ff;border:1px solid #0ff;padding:10px 20px;cursor:pointer;margin:5px;transition:0.2s;}
button:hover{box-shadow:0 0 10px #0ff;transform: scale(1.05);}
#logs{background:#111;padding:10px;height:300px;overflow:auto;margin-top:20px;border:1px solid #0ff;white-space: pre-wrap;font-size:14px;}
a{color:#8a2be2;text-decoration:none;}
a:hover{text-decoration:underline;}
</style>
</head>
<body>
<h1>Abyss API Dashboard</h1>
<p>عدد البلوجنز المحملة: <span id="plugin-count">${loadedRoutes.length}</span></p>
<button id="reload">🔄 إعادة تحميل البلوجنز</button>
<button id="copy">📋 نسخ كل الروابط</button>
<ul id="routes">
${loadedRoutes.map(r=>`<li><a href="${r.path}" target="_blank">${r.path}</a></li>`).join('')}
</ul>
<div id="logs">${logBuffer.join("\n")}</div>
<script>
function updateList(){
fetch('/api/list').then(r=>r.json()).then(data=>{
document.getElementById('plugin-count').textContent=data.length;
const ul=document.getElementById('routes'); ul.innerHTML='';
data.forEach(r=>{
const li=document.createElement('li');
const a=document.createElement('a'); a.href=r.path; a.textContent=r.path; a.target='_blank';
li.appendChild(a); ul.appendChild(li);
});
});
}
document.getElementById('reload').addEventListener('click',()=>{
fetch('/api/reload').then(r=>r.json()).then(data=>{
alert('✅ Reloaded: '+data.loaded+' plugins');
updateList();
});
});
document.getElementById('copy').addEventListener('click',()=>{
const links=Array.from(document.querySelectorAll('#routes a')).map(a=>a.href).join('\\n');
navigator.clipboard.writeText(links).then(()=>alert('✅ Links copied!'));
});
</script>
</body>
</html>
  `);
});

// صفحة الهوم (اختياري)
app.get("/home",(req,res)=>{
  res.sendFile(path.join(__dirname,"public/page/home/home.html"));
});

// تشغيل السيرفر محلي
if(!process.env.VERCEL){
  app.listen(3000,()=>console.log("🚀 Server running: http://localhost:3000"));
}

export default serverless(app);
