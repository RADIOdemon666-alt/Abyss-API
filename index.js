const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// مسار الملفات الثابتة
app.use(express.static(path.join(__dirname, 'public')));

// استدعاء الـ API من plugin/download/api.js
const downloadApi = require('./plugin/download/api');
app.use('/api/download', downloadApi); // هذا الـ endpoint: /api/download/hello

// endpoint لعرض صفحة HTML
app.get('/api', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/page/api/api.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Download API endpoint: http://localhost:${PORT}/api/download/hello`);
  console.log(`API page: http://localhost:${PORT}/api`);
});
