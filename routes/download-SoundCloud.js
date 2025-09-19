import express from 'express';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
// بدل هذا السطر:
// import { Client as SCClient } from 'soundcloud-scraper';

// استخدم هذا:
import pkg from 'soundcloud-scraper';
const { Client: SCClient } = pkg;

// دلوقتي ممكن تستخدم SCClient بشكل طبيعي:
const app = express();
const port = 3000;
const TEMP_DIR = './temp';
fs.mkdirSync(TEMP_DIR, { recursive: true });

const scClient = new SCClient();

// دالة بحث
async function searchSoundCloud(query, limit = 5) {
  const results = await scClient.search(query, 'track');
  if (!results) return [];
  return (Array.isArray(results) ? results : [results])
    .slice(0, limit)
    .map(track => ({
      title: track.title || 'Unknown',
      artist: track.artist?.name || 'Unknown',
      duration: track.duration || 0,
      url: track.url || ''
    }));
}

// دالة تحميل mp3 باستخدام yt-dlp
function downloadTrack(trackUrl, filename) {
  return new Promise((resolve, reject) => {
    const output = path.join(TEMP_DIR, filename + '.mp3');
    const yt = spawn('yt-dlp', [
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '--output', output,
      trackUrl
    ]);

    yt.on('close', code => {
      if (code === 0 && fs.existsSync(output)) {
        resolve(output);
      } else {
        reject(new Error('فشل تحميل الأغنية'));
      }
    });

    yt.on('error', err => reject(err));
  });
}

// Route للبحث + التحميل
app.get('/sc-search', async (req, res) => {
  const { query, download } = req.query;
  if (!query) return res.status(400).json({ status: false, message: 'أدخل اسم الأغنية' });

  try {
    const results = await searchSoundCloud(query);
    if (results.length === 0) return res.status(404).json({ status: false, message: 'لا توجد نتائج' });

    // لو طلب التحميل (download=1) نحمل أفضل نتيجة
    if (download === '1') {
      const track = results[0];
      const safeName = (track.artist + ' - ' + track.title).replace(/[\\/:*?"<>|]/g, '');
      const filePath = await downloadTrack(track.url, safeName);
      return res.download(filePath, safeName + '.mp3', err => {
        if (err) console.error(err);
        try { fs.unlinkSync(filePath); } catch(e){}
      });
    }

    // غير كده نرجع فقط نتائج البحث JSON
    res.json({ status: true, query, results });

  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, message: 'حدث خطأ' });
  }
});

app.listen(port, () => console.log(`API شغال على البورت ${port}`));
