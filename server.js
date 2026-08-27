import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const CONTENT_FILE = path.join(__dirname, 'data', 'site-content.json');
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'prestij2026';

const sessions = new Map();
const SESSION_MAX_AGE = 24 * 60 * 60 * 1000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

async function readContent() {
  const raw = await fs.readFile(CONTENT_FILE, 'utf-8');
  return JSON.parse(raw);
}

async function writeContent(data) {
  await fs.writeFile(CONTENT_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function createToken() {
  return crypto.randomBytes(32).toString('hex');
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Yetkisiz erişim. Lütfen giriş yapın.' });
  }

  const session = sessions.get(token);
  if (Date.now() - session.createdAt > SESSION_MAX_AGE) {
    sessions.delete(token);
    return res.status(401).json({ error: 'Oturum süresi doldu.' });
  }

  req.adminSession = session;
  next();
}

// Public API
app.get('/api/content', async (req, res) => {
  try {
    const content = await readContent();
    res.json(content);
  } catch (err) {
    res.status(500).json({ error: 'İçerik yüklenemedi.' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Prestij Makina AI Server Running' });
});

// Admin Auth
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = createToken();
    sessions.set(token, { username, createdAt: Date.now() });
    return res.json({ token, message: 'Giriş başarılı.' });
  }

  res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı.' });
});

app.post('/api/admin/logout', authMiddleware, (req, res) => {
  const token = req.headers.authorization?.slice(7);
  if (token) sessions.delete(token);
  res.json({ message: 'Çıkış yapıldı.' });
});

app.get('/api/admin/verify', authMiddleware, (req, res) => {
  res.json({ valid: true, username: req.adminSession.username });
});

// Admin Content CRUD
app.put('/api/admin/content', authMiddleware, async (req, res) => {
  try {
    await writeContent(req.body);
    res.json({ message: 'Tüm içerik başarıyla kaydedildi.', content: req.body });
  } catch (err) {
    res.status(500).json({ error: 'İçerik kaydedilemedi.' });
  }
});

app.patch('/api/admin/content/:section', authMiddleware, async (req, res) => {
  try {
    const { section } = req.params;
    const content = await readContent();

    content[section] = req.body;
    await writeContent(content);
    res.json({ message: `${section} bölümü başarıyla kaydedildi.`, section: req.body });
  } catch (err) {
    res.status(500).json({ error: 'Bölüm kaydedilemedi.' });
  }
});

// Admin panel static files
app.use('/admin', express.static(path.join(__dirname, 'admin')));
app.use('/upload', express.static(path.join(__dirname, 'assets', 'upload')));

// Public site static files (after API routes)
app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 Prestij Makina Yerel Sunucu Başlatıldı!`);
  console.log(`🌐 Web Adresi: http://localhost:${PORT}`);
  console.log(`🔧 Admin Panel: http://localhost:${PORT}/admin/`);
  console.log(`👤 Admin: ${ADMIN_USER} / ${ADMIN_PASS}`);
  console.log(`🤖 AI Asistanı Aktif ve Göreve Hazır!`);
  console.log(`==================================================`);
});
