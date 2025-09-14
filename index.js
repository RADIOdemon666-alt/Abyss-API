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

// دالة تحميل البلوجنز وإنشاء الـ endpoints
function loadPlugins() {
  // إزالة الراوترات القديمة
  apiRouters.forEach(r => {
    app._router.stack = app._router.stack.filter(layer => layer !== r);
  });
  apiRouters = [];

  // قراءة كل مجلد داخل plugin
  fs.readdirSync(pluginsDir, { withFileTypes: true }).forEach(folder => {
    if (folder.isDirectory()) {
      const folderName = folder.name;
      const folderPath = path.join(pluginsDir, folderName);

      // قراءة كل ملف JS داخل المجلد
      fs.readdirSync(folderPath).forEach(file => {
        if (file.endsWith('.js')) {
          const fileName = file.replace('.js', '');
          const filePath = path.join(folderPath, file);
          try {
            delete require.cache[require.resolve(filePath)]; // مسح الكاش
            const routeHandler = require(filePath);

            // إنشاء endpoint ديناميكي
            const endpoint = `/api/${folderName}/${fileName}`;
            app.all(endpoint, (req, res) => {
              routeHandler(req, res, express);
            });

            apiRouters.push(endpoint);
            console.log(`✅ تم تحميل API: ${endpoint}`);
          } catch (err) {
            console.error(`❌ خطأ في تحميل: ${folderName}/${file}`, err);
          }
        }
      });
    }
  });
}

// تحميل البلوجنز أول مرة
loadPlugins();

// مراقبة أي تغييرات باستخدام chokidar
const watcher = chokidar.watch(pluginsDir, { ignoreInitial: true, persistent: true });

watcher.on('add', path => loadPlugins());
watcher.on('unlink', path => loadPlugins());
watcher.on('addDir', path => loadPlugins());
watcher.on('unlinkDir', path => loadPlugins());

// صفحة عرض الـ API
app.get('/api-view', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'page', 'api', 'api.html'));
});

app.listen(PORT, () => console.log(`🚀 السيرفر شغال على http://localhost:${PORT}`));
