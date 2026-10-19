import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../database/db.js';
import * as schema from '../database/schema.js';
import { config } from '../../src/config/index.js';
import { authenticate } from '../middleware/auth.js';
import { desc, eq } from 'drizzle-orm';

const router = Router();

// Ensure upload directory exists
if (!fs.existsSync(config.storage.uploadDir)) {
  fs.mkdirSync(config.storage.uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.storage.uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `media_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.storage.maxFileSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|avif|gif|svg/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (allowed.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpg, png, webp, avif, svg) are permitted.'));
    }
  },
});

// GET /api/media - List uploaded media assets
router.get('/', authenticate, async (req, res, next) => {
  try {
    const assets = await db.query.mediaAssets.findMany({
      orderBy: [desc(schema.mediaAssets.createdAt)],
      limit: 50,
    });
    res.json(assets);
  } catch (err) {
    next(err);
  }
});

// POST /api/media/upload - Upload single file
router.post('/upload', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'BadRequest', message: 'No file uploaded.' });
    }

    const publicUrl = `/uploads/${file.filename}`;

    const [asset] = await db.insert(schema.mediaAssets).values({
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      storagePath: file.path,
      publicUrl,
      altText: req.body.altText || file.originalname,
    }).returning();

    res.status(201).json(asset);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/media/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const asset = await db.query.mediaAssets.findFirst({
      where: eq(schema.mediaAssets.id, id),
    });

    if (asset) {
      if (fs.existsSync(asset.storagePath)) {
        fs.unlinkSync(asset.storagePath);
      }
      await db.delete(schema.mediaAssets).where(eq(schema.mediaAssets.id, id));
    }

    res.json({ message: 'Media asset deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

export default router;
