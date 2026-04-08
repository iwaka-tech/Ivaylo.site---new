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
import { createClient } from '@libsql/client';
import multer from 'multer';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

const PORT = process.env.PORT || 3000;

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer setup for memory storage (we upload to Cloudinary from memory)
const upload = multer({ storage: multer.memoryStorage() });

// Database setup
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:database.sqlite',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

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

const app = express();
const server = http.createServer(app);

export default app;

async function initDb() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT NOT NULL,
      tag TEXT,
      media_url TEXT,
      media_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      article_id TEXT NOT NULL,
      parent_id TEXT,
      name TEXT,
      instagram TEXT,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
    );
  `);

  try {
    await db.execute('SELECT tag FROM articles LIMIT 1');
  } catch (e) {
    console.log('Adding tag column to articles table...');
    await db.execute('ALTER TABLE articles ADD COLUMN tag TEXT');
  }

  const initialUser = 'Iwog1322.';
  const initialPass = 'ivopower00';
  const hashedPass = bcrypt.hashSync(initialPass, 10);

  const existingUser = await db.execute({ sql: 'SELECT * FROM settings WHERE key = ?', args: ['admin_user'] });
  if (existingUser.rows.length === 0) {
    await db.execute({ sql: 'INSERT INTO settings (key, value) VALUES (?, ?)', args: ['admin_user', initialUser] });
    await db.execute({ sql: 'INSERT INTO settings (key, value) VALUES (?, ?)', args: ['admin_pass', hashedPass] });
  }
}

// Helper to upload buffer to Cloudinary
const uploadToCloudinary = (buffer: Buffer, resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto'): Promise<any> => {
  return new Promise((resolve, reject) => {
    const cld_upload_stream = cloudinary.uploader.upload_stream(
      { resource_type: resourceType, folder: 'ivaylo_blog' },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(cld_upload_stream);
  });
};

async function startServer() {
  await initDb();

  app.use(express.json());
  app.use(cookieParser());
  
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

    ws.send(JSON.stringify({
      type: 'init',
      id,
      color,
      players: Array.from(players.values()),
      forceFields: Array.from(forceFields.values())
    }));

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

  setInterval(() => {
    const now = Date.now();
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

  const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = req.cookies.admin_token;
    if (token === 'ivaylo_admin_session') {
      next();
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  };

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', players: players.size });
  });

  app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
      const adminUserRes = await db.execute({ sql: 'SELECT value FROM settings WHERE key = ?', args: ['admin_user'] });
      const adminPassRes = await db.execute({ sql: 'SELECT value FROM settings WHERE key = ?', args: ['admin_pass'] });

      if (adminUserRes.rows.length === 0 || adminPassRes.rows.length === 0) {
        return res.status(500).json({ error: 'Server configuration error' });
      }

      const adminUser = adminUserRes.rows[0].value as string;
      const adminPass = adminPassRes.rows[0].value as string;

      const isMatch = bcrypt.compareSync(password, adminPass);

      if (username === adminUser && isMatch) {
        res.cookie('admin_token', 'ivaylo_admin_session', { 
          httpOnly: true, 
          maxAge: 86400000,
          sameSite: 'none',
          secure: true
        });
        res.json({ success: true });
      } else {
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
    res.json({ authenticated });
  });

  app.get('/api/articles', async (req, res) => {
    const category = req.query.category;
    try {
      let articles;
      if (category) {
        articles = await db.execute({ sql: 'SELECT * FROM articles WHERE category = ? ORDER BY created_at DESC', args: [category as string] });
      } else {
        articles = await db.execute('SELECT * FROM articles ORDER BY created_at DESC');
      }
      res.json(articles.rows);
    } catch (e) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post('/api/articles', authMiddleware, upload.single('media'), async (req, res) => {
    const { title, content, category, tag } = req.body;
    const id = uuidv4();
    let media_url = null;
    let media_type = null;

    try {
      if (req.file) {
        const mimetype = req.file.mimetype;
        if (mimetype.startsWith('image/')) media_type = 'image';
        else if (mimetype.startsWith('audio/')) media_type = 'audio';
        else if (mimetype.startsWith('video/')) media_type = 'video';
        
        const result = await uploadToCloudinary(req.file.buffer, media_type === 'video' || media_type === 'audio' ? 'video' : 'image');
        media_url = result.secure_url;
      }

      await db.execute({
        sql: 'INSERT INTO articles (id, title, content, category, tag, media_url, media_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [id, title, content, category, tag || null, media_url, media_type]
      });

      res.json({ success: true, id });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Upload or database error' });
    }
  });

  app.post('/api/upload-media', authMiddleware, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      
      const mimetype = req.file.mimetype;
      let media_type = 'image';
      if (mimetype.startsWith('video/')) media_type = 'video';
      else if (mimetype.startsWith('audio/')) media_type = 'audio';
      
      const result = await uploadToCloudinary(
        req.file.buffer, 
        media_type === 'video' || media_type === 'audio' ? 'video' : 'image'
      );
      
      res.json({ url: result.secure_url, type: media_type });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Upload error' });
    }
  });

  app.put('/api/articles/:id', authMiddleware, upload.single('media'), async (req, res) => {
    const { title, content, category, tag } = req.body;
    const id = req.params.id;
    
    try {
      const existingRes = await db.execute({ sql: 'SELECT media_url, media_type FROM articles WHERE id = ?', args: [id] });
      if (existingRes.rows.length === 0) return res.status(404).json({ error: 'Not found' });

      const existing = existingRes.rows[0];
      let media_url = existing.media_url;
      let media_type = existing.media_type;

      if (req.file) {
        const mimetype = req.file.mimetype;
        if (mimetype.startsWith('image/')) media_type = 'image';
        else if (mimetype.startsWith('audio/')) media_type = 'audio';
        else if (mimetype.startsWith('video/')) media_type = 'video';
        
        const result = await uploadToCloudinary(req.file.buffer, media_type === 'video' || media_type === 'audio' ? 'video' : 'image');
        media_url = result.secure_url;
      }

      await db.execute({
        sql: 'UPDATE articles SET title = ?, content = ?, category = ?, tag = ?, media_url = ?, media_type = ? WHERE id = ?',
        args: [title, content, category, tag || null, media_url, media_type, id]
      });

      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Upload or database error' });
    }
  });

  app.delete('/api/articles/:id', authMiddleware, async (req, res) => {
    try {
      await db.execute({ sql: 'DELETE FROM articles WHERE id = ?', args: [req.params.id] });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post('/api/change-password', authMiddleware, async (req, res) => {
    const { newPassword } = req.body;
    const hashed = bcrypt.hashSync(newPassword, 10);
    try {
      await db.execute({ sql: 'UPDATE settings SET value = ? WHERE key = ?', args: [hashed, 'admin_pass'] });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.get('/api/articles/:id/comments', async (req, res) => {
    try {
      const comments = await db.execute({ sql: 'SELECT * FROM comments WHERE article_id = ? ORDER BY created_at ASC', args: [req.params.id] });
      res.json(comments.rows);
    } catch (e) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post('/api/articles/:id/comments', async (req, res) => {
    const { name, instagram, content, parent_id } = req.body;
    const id = uuidv4();
    const article_id = req.params.id;

    try {
      await db.execute({
        sql: 'INSERT INTO comments (id, article_id, parent_id, name, instagram, content) VALUES (?, ?, ?, ?, ?, ?)',
        args: [id, article_id, parent_id || null, name || 'Анонимен', instagram || null, content]
      });
      res.json({ success: true, id });
    } catch (e) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.delete('/api/comments/:id', authMiddleware, async (req, res) => {
    try {
      await db.execute({ sql: 'DELETE FROM comments WHERE id = ? OR parent_id = ?', args: [req.params.id, req.params.id] });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Database error' });
    }
  });

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

  if (process.env.VERCEL !== '1') {
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();
