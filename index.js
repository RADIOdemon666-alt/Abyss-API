import express from 'express';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import path from 'path';

import tools_tr from './routes/tools-tr.js';

const app = express();
const port = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// الملفات الثابتة (static)
app.use(express.static(path.join(__dirname, 'public')));

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/page/api/index.html'));
});

// مسار API
app.use('/api/tr', tools_tr);

// تشغيل السيرفر
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
