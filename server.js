const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
const DATA_FILE = path.join(DATA_DIR, 'site.json');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'yirunxin';

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOAD_DIR));

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

function getDefaultData() {
  return {
    site: {
      title: '给润欣',
      subtitle: '一个关于我们的故事',
      girlName: '易润欣',
      boyName: '薛高',
      greeting: '有些话，想慢慢说给你听',
      ending: '我们的故事，才刚刚开始',
    },
    sections: [
      {
        id: 'reconnect',
        title: '四月的消息',
        date: '2026年4月底',
        content: '那天，手机屏幕亮起，是你的名字。\n多年以后，你突然联系了我。',
        image: '',
        order: 1,
        active: true,
      },
      {
        id: 'chatting',
        title: '慢慢靠近',
        date: '2026年4月 — 现在',
        content: '从第一条消息开始，我们聊了很多很多。\n生活、梦想、过去、未来……\n不知不觉，有些东西在悄悄改变。',
        image: '',
        order: 2,
        active: true,
      },
      {
        id: 'now',
        title: '此时此刻',
        date: '2026年6月',
        content: '我写下了这个页面。\n想告诉你一些，还没有说出口的话。',
        image: '',
        order: 3,
        active: true,
      },
    ],
    chats: [],
    settings: {
      enableMusic: false,
      musicUrl: '',
    }
  };
}

function migrateData(data) {
  let changed = false;
  (data.sections || []).forEach(s => {
    if (s.date && s.date.includes('2025')) {
      s.date = s.date.replace(/2025/g, '2026');
      changed = true;
    }
  });
  return changed;
}

function readData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      if (migrateData(data)) {
        writeData(data);
        console.log('数据已迁移：2025 → 2026');
      }
      return data;
    }
  } catch (e) { /* ignore */ }
  const d = getDefaultData();
  writeData(d);
  return d;
}

function writeData(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function authMiddleware(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (token === ADMIN_PASSWORD) return next();
  res.status(401).json({ error: '需要管理员密码' });
}

// --- 公开 API ---
app.get('/api/site', (req, res) => {
  const data = readData();
  res.json({
    site: data.site,
    sections: data.sections.filter(s => s.active).sort((a, b) => a.order - b.order),
    chats: data.chats,
    settings: data.settings,
  });
});

// --- 管理后台 API ---
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, token: ADMIN_PASSWORD });
  } else {
    res.status(403).json({ error: '密码错误' });
  }
});

app.get('/api/admin/data', authMiddleware, (req, res) => {
  res.json(readData());
});

app.put('/api/admin/site', authMiddleware, (req, res) => {
  const data = readData();
  Object.assign(data.site, req.body);
  writeData(data);
  res.json({ success: true, site: data.site });
});

app.put('/api/admin/sections/:id', authMiddleware, (req, res) => {
  const data = readData();
  const idx = data.sections.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '章节不存在' });
  Object.assign(data.sections[idx], req.body);
  writeData(data);
  res.json({ success: true, section: data.sections[idx] });
});

app.post('/api/admin/sections', authMiddleware, (req, res) => {
  const data = readData();
  const section = {
    id: uuidv4(),
    title: req.body.title || '新章节',
    date: req.body.date || '',
    content: req.body.content || '',
    image: req.body.image || '',
    order: data.sections.length + 1,
    active: true,
  };
  data.sections.push(section);
  writeData(data);
  res.json({ success: true, section });
});

app.delete('/api/admin/sections/:id', authMiddleware, (req, res) => {
  const data = readData();
  data.sections = data.sections.filter(s => s.id !== req.params.id);
  writeData(data);
  res.json({ success: true });
});

app.put('/api/admin/sections/reorder', authMiddleware, (req, res) => {
  const data = readData();
  const { ids } = req.body;
  ids.forEach((id, i) => {
    const s = data.sections.find(s => s.id === id);
    if (s) s.order = i + 1;
  });
  writeData(data);
  res.json({ success: true });
});

app.post('/api/admin/chats', authMiddleware, (req, res) => {
  const data = readData();
  const msg = {
    id: uuidv4(),
    sender: req.body.sender || 'her',
    content: req.body.content || '',
    timestamp: req.body.timestamp || new Date().toISOString(),
    note: req.body.note || '',
    image: req.body.image || '',
    favorite: false,
  };
  data.chats.push(msg);
  data.chats.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  writeData(data);
  res.json({ success: true, chat: msg });
});

app.put('/api/admin/chats/:id', authMiddleware, (req, res) => {
  const data = readData();
  const idx = data.chats.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: '消息不存在' });
  Object.assign(data.chats[idx], req.body);
  writeData(data);
  res.json({ success: true, chat: data.chats[idx] });
});

app.delete('/api/admin/chats/:id', authMiddleware, (req, res) => {
  const data = readData();
  data.chats = data.chats.filter(c => c.id !== req.params.id);
  writeData(data);
  res.json({ success: true });
});

app.post('/api/admin/chats/batch', authMiddleware, (req, res) => {
  const data = readData();
  const { messages } = req.body;
  if (!Array.isArray(messages)) return res.status(400).json({ error: 'messages 必须是数组' });
  messages.forEach(m => {
    data.chats.push({
      id: uuidv4(),
      sender: m.sender || 'her',
      content: m.content || '',
      timestamp: m.timestamp || new Date().toISOString(),
      note: m.note || '',
      image: m.image || '',
      favorite: false,
    });
  });
  data.chats.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  writeData(data);
  res.json({ success: true, count: messages.length });
});

app.put('/api/admin/settings', authMiddleware, (req, res) => {
  const data = readData();
  Object.assign(data.settings, req.body);
  writeData(data);
  res.json({ success: true, settings: data.settings });
});

app.post('/api/admin/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '没有上传文件' });
  res.json({ success: true, url: `/uploads/${req.file.filename}` });
});

app.post('/api/admin/change-password', authMiddleware, (req, res) => {
  res.json({ error: '请通过环境变量 ADMIN_PASSWORD 修改密码' });
});

// --- 管理后台页面 ---
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// --- SPA fallback ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Admin: http://localhost:${PORT}/admin`);
  console.log(`Admin password configured`);
});
