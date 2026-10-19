import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { config } from '../../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function findDailyBuildLogo(): string | null {
  const candidates = [
    path.resolve(process.cwd(), 'assets', 'logo.png'),
    path.resolve(process.cwd(), 'server', 'assets', 'logo.png'),
    path.resolve(process.cwd(), 'client', 'public', 'logo.png'),
    path.resolve(process.cwd(), '../client/public/logo.png'),
    path.resolve(__dirname, '../../../assets/logo.png'),
    path.resolve(__dirname, '../../assets/logo.png'),
    path.resolve(__dirname, '../../../../client/public/logo.png'),
    path.resolve('/var/www/dailybuild/client/public/logo.png'),
    path.resolve('/var/www/dailybuild/server/assets/logo.png'),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  return null;
}

export interface FeaturedWatermarkResult {
  publicUrl: string;
  diskPath: string;
  buffer: Buffer;
  format: 'webp';
  size: number;
}

/**
 * Featured Image Pipeline:
 * 1. Takes raw image buffer or temporary intermediate file.
 * 2. Adds the Daily Build logo as a subtle micro-size watermark in the bottom-right corner
 *    with proper padding and ~72% transparency.
 * 3. Converts to WebP at 85% quality.
 * 4. Verifies output integrity.
 * 5. Saves only the final verified WebP file in /uploads/.
 * 6. Deletes intermediate temporary files if requested.
 */
export async function processFeaturedImageWatermark(
  input: Buffer | string,
  options: {
    prefix?: string;
    filename?: string;
    deleteSource?: boolean;
  } = {}
): Promise<FeaturedWatermarkResult> {
  const uploadDir = config.storage.uploadDir;
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  let sourceBuffer: Buffer;
  let sourcePathToDelete: string | null = null;

  if (typeof input === 'string') {
    if (!fs.existsSync(input)) {
      throw new Error(`Input image file not found: ${input}`);
    }
    sourceBuffer = await fs.promises.readFile(input);
    if (options.deleteSource) {
      sourcePathToDelete = input;
    }
  } else {
    sourceBuffer = input;
  }

  const meta = await sharp(sourceBuffer).metadata();
  const width = meta.width || 1200;
  const height = meta.height || 630;

  let pipeline = sharp(sourceBuffer);

  const logoPath = findDailyBuildLogo();
  if (logoPath) {
    try {
      // Micro-size watermark: ~6-8% of width, constrained between 50px and 100px max
      const targetLogoWidth = Math.max(50, Math.min(100, Math.round(width * 0.07)));
      const padding = Math.max(12, Math.round(width * 0.015));

      // Resize logo and apply 72% opacity for subtle, non-intrusive watermark
      const logoBuffer = await sharp(logoPath)
        .resize({ width: targetLogoWidth, withoutEnlargement: true })
        .composite([
          {
            input: Buffer.from([255, 255, 255, Math.round(255 * 0.72)]),
            raw: { width: 1, height: 1, channels: 4 },
            tile: true,
            blend: 'dest-in',
          },
        ])
        .toBuffer();

      const logoMeta = await sharp(logoBuffer).metadata();
      const logoHeight = logoMeta.height || Math.round(targetLogoWidth / 4);

      const left = Math.max(0, width - targetLogoWidth - padding);
      const top = Math.max(0, height - logoHeight - padding);

      pipeline = pipeline.composite([
        {
          input: logoBuffer,
          left,
          top,
          blend: 'over',
        },
      ]);
    } catch (wmErr: any) {
      console.warn('[Featured Image Pipeline] Logo watermark warning (continuing with WebP conversion):', wmErr.message);
    }
  } else {
    console.warn('[Featured Image Pipeline] Notice: Daily Build logo not found on disk, converting to WebP without logo overlay.');
  }

  // Convert to WebP at 85% quality
  const webpBuffer = await pipeline
    .webp({ quality: 85, effort: 4 })
    .toBuffer();

  // Verify WebP integrity
  if (webpBuffer.length < 500) {
    throw new Error(`Generated WebP is too small or corrupt (${webpBuffer.length} bytes).`);
  }
  const magic = webpBuffer.slice(0, 12).toString('ascii');
  if (!magic.startsWith('RIFF') || !magic.includes('WEBP')) {
    throw new Error('Verification failed: output is not a valid WebP image.');
  }

  // Save ONLY the final verified WebP
  const finalFilename = options.filename
    ? (options.filename.endsWith('.webp') ? options.filename : `${path.parse(options.filename).name}.webp`)
    : `featured_${options.prefix || 'gen'}_${Date.now()}_${Math.random().toString(36).substring(7)}.webp`;

  const finalDiskPath = path.join(uploadDir, finalFilename);
  await fs.promises.writeFile(finalDiskPath, webpBuffer);

  // Clean up source file if requested and it is not the destination file
  if (sourcePathToDelete && sourcePathToDelete !== finalDiskPath) {
    try {
      if (fs.existsSync(sourcePathToDelete)) {
        await fs.promises.unlink(sourcePathToDelete);
      }
    } catch (cleanErr: any) {
      console.warn('[Featured Image Pipeline] Could not delete intermediate temporary file:', cleanErr.message);
    }
  }

  const publicUrl = `/uploads/${finalFilename}`;
  return {
    publicUrl,
    diskPath: finalDiskPath,
    buffer: webpBuffer,
    format: 'webp',
    size: webpBuffer.length,
  };
}
