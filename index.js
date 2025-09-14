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
let apiList = {}; // لتخزين كل الأقسام وملفاتها

// دالة تحميل البلوجنز وإنشاء endpoints
function loadPlugins() {
  // إزالة الراوترات القديمة
  apiRouters.forEach(r => {
    app._router.stack = app._router.stack.filter(layer => layer !== r);
  });
  apiRouters = [];
  apiList = {};

  fs.readdirSync(pluginsDir, { withFileTypes: true }).forEach(folder => {
    if (folder.isDirectory()) {
      const folderName = folder.name;
      const folderPath = path.join(pluginsDir, folderName);

      apiList[folderName] = [];

      fs.readdirSync(folderPath).forEach(file => {
        if (file.endsWith('.js')) {
          const fileName = file.replace('.js', '');
          const filePath = path.join(folderPath, file);
          try {
            delete require.cache[require.resolve(filePath)];
            const routeHandler = require(filePath);

            const endpoint = `/api/${folderName}/${fileName}`;
            app.all(endpoint, (req, res) => {
              routeHandler(req, res, express);
            });

            apiRouters.push(endpoint);
            apiList[folderName].push({
              name: fileName,
              endpoint
            });

            console.log(`✅ تم تحميل API: ${endpoint}`);
          } catch (err) {
            console.error(`❌ خطأ في تحميل: ${folderName}/${file}`, err);
          }
        }
      });
    }
  });

  // حفظ JSON داخلي للاستخدام في api.html
  fs.writeFileSync(path.join(__dirname, 'public', 'page', 'api', 'api-list.json'), JSON.stringify(apiList, null, 2));
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
