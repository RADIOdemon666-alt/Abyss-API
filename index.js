const express = require('express');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const pluginsDir = path.join(__dirname, 'plugin');
let apiRouters = [];
let apiList = {};

// دالة تحميل البلوجنز
function loadPlugins() {
  // إزالة الراوترات القديمة
  if (apiRouters.length > 0) {
    app._router.stack = app._router.stack.filter(layer => !apiRouters.includes(layer));
    apiRouters = [];
  }
  apiList = {};

  // قراءة مجلد البلوجنز
  fs.readdirSync(pluginsDir, { withFileTypes: true }).forEach(folder => {
    if (folder.isDirectory()) {
      const folderName = folder.name;
      const folderPath = path.join(pluginsDir, folderName);
      apiList[folderName] = [];

      fs.readdirSync(folderPath).forEach(file => {
        if (file.endsWith('.js')) {
          const filePath = path.join(folderPath, file);
          try {
            delete require.cache[require.resolve(filePath)];
            const plugin = require(filePath);

            // كل بلوجن لازم يكون عبارة عن دالة ترجع router وكمان endpoint اختياري
            const router = plugin.router ? plugin.router : plugin();
            const endpoint = plugin.endpoint || `/api/${folderName}/${file.replace('.js', '')}`;

            app.use(endpoint, router);

            // إضافة layer الخاص بالراوتر للمصفوفة
            const layer = app._router.stack[app._router.stack.length - 1];
            apiRouters.push(layer);

            apiList[folderName].push({ name: file.replace('.js', ''), endpoint });
            console.log(`✅ تم تحميل API: ${endpoint}`);
          } catch (err) {
            console.error(`❌ خطأ في تحميل البلوجن: ${folderName}/${file}`, err);
          }
        }
      });
    }
  });
}

// تحميل البلوجنز أول مرة
loadPlugins();

// مراقبة التغييرات باستخدام chokidar
const watcher = chokidar.watch(pluginsDir, { ignoreInitial: true, persistent: true });
watcher.on('all', () => loadPlugins());

// Endpoint لإظهار قائمة كل الـ APIs ديناميكيًا
app.get('/api-list', (req, res) => res.json(apiList));

// صفحة عرض الـ API
app.get('/api-view', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'page', 'api', 'api.html'));
});

app.listen(PORT, () => console.log(`🚀 السيرفر شغال على http://localhost:${PORT}`));
