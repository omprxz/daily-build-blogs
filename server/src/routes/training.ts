import { Router } from 'express';
import { z } from 'zod';
import { db } from '../database/db.js';
import * as schema from '../database/schema.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { eq, desc } from 'drizzle-orm';
import { providerRegistry } from '../services/ai/provider-registry.js';

const router = Router();

// Helper function to extract readable text and title from HTML
function parseHtmlContent(html: string): { title: string; text: string; wordCount: number } {
  // Extract <title>
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  let title = titleMatch ? titleMatch[1].trim() : 'Untitled Blog Post';

  // Remove scripts, styles, svg, and tags
  let clean = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  // If title has site name suffix like " | TechCrunch", clean it
  title = title.split(' | ')[0].split(' - ')[0].trim();

  const words = clean.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Limit raw text to 10,000 chars for prompt processing
  const text = clean.slice(0, 10000);

  return { title, text, wordCount };
}

// Background crawler and learner for a blog URL
async function trainOnBlogUrl(blogId: string, url: string): Promise<void> {
  try {
    // 1. Mark as fetching
    await db.update(schema.trainingBlogs)
      .set({ status: 'fetching', updatedAt: new Date() })
      .where(eq(schema.trainingBlogs.id, blogId));

    // 2. Fetch page HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(25000),
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const { title, text, wordCount } = parseHtmlContent(html);

    if (wordCount < 30) {
      throw new Error('Insufficient readable text extracted from page (protected by paywall or client-side rendering).');
    }

    // 3. Mark as training
    await db.update(schema.trainingBlogs)
      .set({
        title: title.slice(0, 255),
        wordCount,
        status: 'training',
        updatedAt: new Date(),
      })
      .where(eq(schema.trainingBlogs.id, blogId));

    // 4. Distill stylistic guidelines & learned knowledge using AI
    let summary = `Analyzed blog post containing ${wordCount} words.`;
    let extractedStyle: any = {
      tone: 'Conversational & Analytical',
      targetAudience: 'Technology enthusiasts & creators',
      keyThemes: [title],
      learnedPoints: [`Extracted from ${url}`],
    };

    try {
      const aiPrompt = `Analyze the following blog post text and distill its core knowledge and writing style so our AI blog writer can adopt its voice and insights:

Blog Title: "${title}"
Excerpt:
"${text.slice(0, 3000)}"

Respond in structured JSON format with:
{
  "summary": "2-3 sentence overview of the article's core thesis",
  "tone": "Description of the writing tone (e.g. authoritative, conversational, punchy)",
  "keyInsights": ["3-5 bullet points of unique insights or facts taught in this blog"],
  "vocabularyStyle": "Key stylistic traits, phrase choices, or structural patterns"
}`;

      const aiRes = await providerRegistry.generate('summary', {
        model: 'gemini-1.5-flash',
        prompt: aiPrompt,
        systemInstruction: 'You are an editorial learning and style distillation engine. Output valid JSON only.',
      });

      if (aiRes.content) {
        // Parse JSON or extract JSON block
        const jsonMatch = aiRes.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          summary = parsed.summary || summary;
          extractedStyle = {
            tone: parsed.tone || 'Analytical',
            keyInsights: parsed.keyInsights || [],
            vocabularyStyle: parsed.vocabularyStyle || '',
          };
        }
      }
    } catch (aiErr: any) {
      console.warn(`[Training AI Note]: Could not distill deep AI style for ${url}:`, aiErr.message);
    }

    // 5. Complete training
    await db.update(schema.trainingBlogs)
      .set({
        title: title.slice(0, 255),
        wordCount,
        summary,
        extractedStyle,
        rawContent: text.slice(0, 5000),
        status: 'trained',
        errorMessage: null,
        fetchedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.trainingBlogs.id, blogId));

    console.log(`[Training Success]: Successfully trained on blog: ${title} (${url})`);
  } catch (err: any) {
    console.error(`[Training Error] Failed to train on ${url}:`, err.message);
    await db.update(schema.trainingBlogs)
      .set({
        status: 'failed',
        errorMessage: err.message,
        updatedAt: new Date(),
      })
      .where(eq(schema.trainingBlogs.id, blogId));
  }
}

// GET /api/training/blogs - List all training blogs
router.get('/blogs', authenticate, async (req, res, next) => {
  try {
    const list = await db.query.trainingBlogs.findMany({
      orderBy: [desc(schema.trainingBlogs.createdAt)],
    });
    res.json(list);
  } catch (err) {
    next(err);
  }
});

// POST /api/training/blogs - Submit blog URL(s) for surfing & training
const submitSchema = z.object({
  url: z.string().optional(),
  urls: z.array(z.string()).optional(),
});

router.post('/blogs', authenticate, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const body = submitSchema.parse(req.body);
    const inputUrls: string[] = [];

    if (body.url && body.url.trim()) {
      inputUrls.push(body.url.trim());
    }
    if (Array.isArray(body.urls)) {
      body.urls.forEach(u => {
        if (u && u.trim() && !inputUrls.includes(u.trim())) {
          inputUrls.push(u.trim());
        }
      });
    }

    if (inputUrls.length === 0) {
      return res.status(400).json({ error: 'MissingUrl', message: 'Please provide at least one valid blog URL.' });
    }

    const createdRecords: any[] = [];

    for (const rawUrl of inputUrls) {
      let targetUrl = rawUrl;
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }

      // Insert record
      const [record] = await db.insert(schema.trainingBlogs)
        .values({
          url: targetUrl,
          title: 'Fetching...',
          status: 'pending',
        })
        .returning();

      createdRecords.push(record);

      // Trigger asynchronous training
      trainOnBlogUrl(record.id, targetUrl).catch(e => console.error(e));
    }

    res.status(201).json({
      success: true,
      message: `Submitted ${createdRecords.length} blog(s) for training. Web surfing in progress.`,
      items: createdRecords,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/training/blogs/:id/retrain - Re-train on a specific blog
router.post('/blogs/:id/retrain', authenticate, requireRole(['admin', 'editor']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const blog = await db.query.trainingBlogs.findFirst({
      where: eq(schema.trainingBlogs.id, id),
    });

    if (!blog) {
      return res.status(404).json({ error: 'NotFound', message: 'Training blog not found.' });
    }

    trainOnBlogUrl(blog.id, blog.url).catch(e => console.error(e));

    res.json({ success: true, message: 'Re-training triggered.' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/training/blogs/:id - Remove a blog from training corpus
router.delete('/blogs/:id', authenticate, requireRole(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    await db.delete(schema.trainingBlogs).where(eq(schema.trainingBlogs.id, id));
    res.json({ success: true, message: 'Removed from training corpus.' });
  } catch (err) {
    next(err);
  }
});

// GET /api/training/corpus - Get aggregated training intelligence
router.get('/corpus', authenticate, async (req, res, next) => {
  try {
    const trained = await db.query.trainingBlogs.findMany({
      where: eq(schema.trainingBlogs.status, 'trained'),
    });

    const totalWords = trained.reduce((acc, curr) => acc + (curr.wordCount || 0), 0);
    const learnedInsights = trained.flatMap(b => (b.extractedStyle as any)?.keyInsights || []);

    res.json({
      totalTrained: trained.length,
      totalWords,
      learnedInsights,
      trainedBlogs: trained.map(b => ({ id: b.id, title: b.title, url: b.url, fetchedAt: b.fetchedAt })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
