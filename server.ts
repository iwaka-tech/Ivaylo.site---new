/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import express from 'express';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import http from 'http';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import multer from 'multer';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';

const PORT = process.env.PORT || 3000;

// Database setup
const dbPath = process.env.DATABASE_PATH || 'database.sqlite';
const db = new Database(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL, -- 'blog' or 'useful'
    tag TEXT, -- 'Преживявания', 'Мнения', etc.
    media_url TEXT,
    media_type TEXT, -- 'image', 'audio', 'video'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    article_id TEXT NOT NULL,
    parent_id TEXT, -- For replies
    name TEXT,
    instagram TEXT,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
  );
`);

// Migration: Add tag column if it doesn't exist
try {
  db.prepare('SELECT tag FROM articles LIMIT 1').get();
} catch (e) {
  console.log('Adding tag column to articles table...');
  db.exec('ALTER TABLE articles ADD COLUMN tag TEXT');
}

// Initial credentials
const initialUser = 'Iwog1322.';
const initialPass = 'ivopower00';
const hashedPass = bcrypt.hashSync(initialPass, 10);

const existingUser = db.prepare('SELECT * FROM settings WHERE key = ?').get('admin_user');
if (!existingUser) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('admin_user', initialUser);
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('admin_pass', hashedPass);
}

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({ storage });

// Types
type Vector3 = { x: number; y: number; z: number };

interface Player {
  id: string;
  color: string;
  position: Vector3 | null;
  lastUpdate: number;
}

interface ForceField {
  id: string;
  position: Vector3;
  type: 'attractor' | 'repulsor';
  ownerId: string;
  createdAt: number;
  color: string;
}

// State
const players = new Map<string, Player>();
const forceFields = new Map<string, ForceField>();
const clients = new Map<string, WebSocket>();

// Colors for players
const COLORS = [
  '#FF3366', '#33CCFF', '#FF9933', '#33FF99', 
  '#CC33FF', '#FFFF33', '#FF3333', '#3333FF'
];

function broadcast(data: any, excludeId?: string) {
  const message = JSON.stringify(data);
  for (const [id, ws] of clients.entries()) {
    if (id !== excludeId && ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  const server = http.createServer(app);
  
  // WebSocket Server
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    const id = uuidv4();
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    
    const player: Player = {
      id,
      color,
      position: null,
      lastUpdate: Date.now()
    };
    
    players.set(id, player);
    clients.set(id, ws);

    // Send initial state to the new client
    ws.send(JSON.stringify({
      type: 'init',
      id,
      color,
      players: Array.from(players.values()),
      forceFields: Array.from(forceFields.values())
    }));

    // Broadcast new player to others
    broadcast({
      type: 'player_joined',
      player
    }, id);

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'cursor') {
          const p = players.get(id);
          if (p) {
            p.position = data.position;
            p.lastUpdate = Date.now();
          }
        } else if (data.type === 'add_force') {
          const forceId = uuidv4();
          const force: ForceField = {
            id: forceId,
            position: data.position,
            type: data.forceType,
            ownerId: id,
            createdAt: Date.now(),
            color: data.color
          };
          forceFields.set(forceId, force);
          
          // Broadcast new force field immediately
          broadcast({
            type: 'force_added',
            force
          });
        }
      } catch (e) {
        console.error('Invalid message', e);
      }
    });

    ws.on('close', () => {
      players.delete(id);
      clients.delete(id);
      
      // Remove player's force fields
      for (const [forceId, force] of forceFields.entries()) {
        if (force.ownerId === id) {
          forceFields.delete(forceId);
        }
      }

      broadcast({
        type: 'player_left',
        id
      });
    });
  });

  // Broadcast loop (20Hz)
  setInterval(() => {
    const now = Date.now();
    
    // Clean up old force fields (e.g., after 10.5 seconds to allow client animation)
    let forcesChanged = false;
    for (const [id, force] of forceFields.entries()) {
      if (now - force.createdAt > 10500) {
        forceFields.delete(id);
        forcesChanged = true;
      }
    }

    const updateData = {
      type: 'sync',
      players: Array.from(players.values()).filter(p => p.position !== null),
      ...(forcesChanged ? { forceFields: Array.from(forceFields.values()) } : {})
    };

    broadcast(updateData);
  }, 50);

  // Auth Middleware
  const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = req.cookies.admin_token;
    if (token === 'ivaylo_admin_session') { // Simple token for now
      next();
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  };

  // API routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', players: players.size });
  });

  // Login
  app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    console.log(`Login attempt for user: ${username}`);

    try {
      const adminUser = db.prepare('SELECT value FROM settings WHERE key = ?').get('admin_user') as any;
      const adminPass = db.prepare('SELECT value FROM settings WHERE key = ?').get('admin_pass') as any;

      if (!adminUser || !adminPass) {
        console.error('Admin credentials not found in database');
        return res.status(500).json({ error: 'Server configuration error' });
      }

      const isMatch = bcrypt.compareSync(password, adminPass.value);
      console.log(`Password match: ${isMatch}`);

      if (username === adminUser.value && isMatch) {
        // Set cookie with settings that work better in iframes
        res.cookie('admin_token', 'ivaylo_admin_session', { 
          httpOnly: true, 
          maxAge: 86400000,
          sameSite: 'none',
          secure: true
        });
        console.log('Login successful, cookie set');
        res.json({ success: true });
      } else {
        console.log('Invalid credentials');
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/logout', (req, res) => {
    res.clearCookie('admin_token');
    res.json({ success: true });
  });

  app.get('/api/check-auth', (req, res) => {
    const token = req.cookies.admin_token;
    const authenticated = token === 'ivaylo_admin_session';
    console.log(`Auth check: ${authenticated ? 'Authenticated' : 'Not authenticated'}`);
    res.json({ authenticated });
  });

  // Articles
  app.get('/api/articles', (req, res) => {
    const category = req.query.category;
    let articles;
    if (category) {
      articles = db.prepare('SELECT * FROM articles WHERE category = ? ORDER BY created_at DESC').all(category);
    } else {
      articles = db.prepare('SELECT * FROM articles ORDER BY created_at DESC').all();
    }
    res.json(articles);
  });

  app.post('/api/articles', authMiddleware, upload.single('media'), (req, res) => {
    const { title, content, category, tag } = req.body;
    const id = uuidv4();
    let media_url = null;
    let media_type = null;

    if (req.file) {
      media_url = `/uploads/${req.file.filename}`;
      const mimetype = req.file.mimetype;
      if (mimetype.startsWith('image/')) media_type = 'image';
      else if (mimetype.startsWith('audio/')) media_type = 'audio';
      else if (mimetype.startsWith('video/')) media_type = 'video';
    }

    db.prepare('INSERT INTO articles (id, title, content, category, tag, media_url, media_type) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, title, content, category, tag || null, media_url, media_type);

    res.json({ success: true, id });
  });

  app.put('/api/articles/:id', authMiddleware, upload.single('media'), (req, res) => {
    const { title, content, category, tag } = req.body;
    const id = req.params.id;
    
    const existing = db.prepare('SELECT media_url, media_type FROM articles WHERE id = ?').get(id) as any;
    if (!existing) return res.status(404).json({ error: 'Not found' });

    let media_url = existing.media_url;
    let media_type = existing.media_type;

    if (req.file) {
      // Delete old file if exists
      if (existing.media_url) {
        const oldPath = path.join(process.cwd(), 'public', existing.media_url);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      media_url = `/uploads/${req.file.filename}`;
      const mimetype = req.file.mimetype;
      if (mimetype.startsWith('image/')) media_type = 'image';
      else if (mimetype.startsWith('audio/')) media_type = 'audio';
      else if (mimetype.startsWith('video/')) media_type = 'video';
    }

    db.prepare('UPDATE articles SET title = ?, content = ?, category = ?, tag = ?, media_url = ?, media_type = ? WHERE id = ?')
      .run(title, content, category, tag || null, media_url, media_type, id);

    res.json({ success: true });
  });

  app.delete('/api/articles/:id', authMiddleware, (req, res) => {
    const article = db.prepare('SELECT media_url FROM articles WHERE id = ?').get(req.params.id) as any;
    if (article && article.media_url) {
      const filePath = path.join(process.cwd(), 'public', article.media_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    db.prepare('DELETE FROM articles WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Change password
  app.post('/api/change-password', authMiddleware, (req, res) => {
    const { newPassword } = req.body;
    const hashed = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(hashed, 'admin_pass');
    res.json({ success: true });
  });

  // Comments API
  app.get('/api/articles/:id/comments', (req, res) => {
    const comments = db.prepare('SELECT * FROM comments WHERE article_id = ? ORDER BY created_at ASC').all(req.params.id);
    res.json(comments);
  });

  app.post('/api/articles/:id/comments', (req, res) => {
    const { name, instagram, content, parent_id } = req.body;
    const id = uuidv4();
    const article_id = req.params.id;

    db.prepare('INSERT INTO comments (id, article_id, parent_id, name, instagram, content) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, article_id, parent_id || null, name || 'Анонимен', instagram || null, content);

    res.json({ success: true, id });
  });

  app.delete('/api/comments/:id', authMiddleware, (req, res) => {
    // Also delete replies recursively (sqlite doesn't do this automatically with self-ref unless configured, but we can just delete the parent and the children will be orphaned or we can delete them manually)
    // For simplicity, we'll just delete the specific comment. If it's a parent, the replies will still exist but their parent_id will point to nothing.
    // Better: delete the comment and its immediate replies.
    db.prepare('DELETE FROM comments WHERE id = ? OR parent_id = ?').run(req.params.id, req.params.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
