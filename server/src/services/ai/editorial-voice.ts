import { db } from '../../database/db.js';
import * as schema from '../../database/schema.js';
import { eq, desc } from 'drizzle-orm';

export interface EditorialVoiceProfile {
  systemPrompt: string;
  styleDirectives: string;
  learnedTone: string;
  topThemes: string[];
  rssContext: string;
  recentTitles: string[];
  activeTopics: string[];
}

export async function getEditorialVoiceProfile(): Promise<EditorialVoiceProfile> {
  // 1. Fetch trained blogs
  let trainedBlogs: any[] = [];
  try {
    trainedBlogs = await db.query.trainingBlogs.findMany({
      where: eq(schema.trainingBlogs.status, 'trained'),
      orderBy: [desc(schema.trainingBlogs.updatedAt)],
      limit: 8,
    });
  } catch (err) {
    console.warn('[Editorial Voice] Error loading trained blogs:', err);
  }

  // 1b. Fetch persistent active training topics, keywords & instructions
  let savedTopics: any[] = [];
  try {
    savedTopics = await db.query.trainingTopics.findMany({
      where: eq(schema.trainingTopics.isActive, true),
      orderBy: [desc(schema.trainingTopics.createdAt)],
    });
  } catch (err) {
    console.warn('[Editorial Voice] Error loading training topics:', err);
  }

  const activeTopicEntries = savedTopics.map(t => t.text.trim()).filter(Boolean);

  // 2. Extract learned styles & vocabulary traits
  const tones: string[] = [];
  const themes: string[] = [];
  const vocabularyTraits: string[] = [];

  for (const blog of trainedBlogs) {
    const style = (blog.extractedStyle as any) || {};
    if (style.tone) tones.push(style.tone);
    if (style.vocabularyStyle) vocabularyTraits.push(style.vocabularyStyle);
    if (Array.isArray(style.keyThemes)) {
      themes.push(...style.keyThemes);
    } else if (blog.title) {
      themes.push(blog.title);
    }
  }

  const learnedTone = tones.length > 0
    ? tones.slice(0, 3).join(', ')
    : 'Authoritative, analytical, engaging, and rigorously technical';

  // 3. Fetch latest RSS items for current news context
  let rssItems: any[] = [];
  try {
    rssItems = await db.query.discoveredItems.findMany({
      orderBy: [desc(schema.discoveredItems.retrievedAt)],
      limit: 8,
    });
  } catch (err) {
    console.warn('[Editorial Voice] Error loading RSS items:', err);
  }

  const rssContext = rssItems.length > 0
    ? rssItems.slice(0, 6).map((item, idx) => `${idx + 1}. "${item.headline}"`).join('\n')
    : '';

  // 4. Fetch recent articles to exclude duplicate coverage
  let recentArticles: any[] = [];
  try {
    recentArticles = await db.query.articles.findMany({
      orderBy: [desc(schema.articles.createdAt)],
      limit: 16,
      columns: { title: true },
    });
  } catch (err) {
    console.warn('[Editorial Voice] Error loading recent articles:', err);
  }

  const recentTitles = recentArticles.map((a) => a.title.trim()).filter(Boolean);

  const topicGuidanceBlock = activeTopicEntries.length > 0
    ? `\n6. MANDATORY TOPIC, KEYWORD & THEMATIC DIRECTIVES:
The editorial team has configured specific target topics, keywords, and domain instructions that MUST guide research, subject selection, angle formulation, and writing depth whenever applicable:
${activeTopicEntries.map((t, idx) => `   - [Directive ${idx + 1}]: "${t}"`).join('\n')}
Incorporate and address these target subjects, keywords, and architectural themes proactively across article headlines, section breakdowns, and technical explanations.`
    : '';

  const styleDirectives = `
EDITORIAL VOICE & PUBLICATION STANDARDS (DailyBuild Tech):
1. Editorial Persona: You write as a Principal Systems Architect and Lead Editorial Journalist. The voice is ${learnedTone}.
2. Narrative Depth: Provide thorough, factual, deeply informative analysis with rich architectural explanations, clear trade-offs, and practical implications. Never generate placeholder text, generic outlines, or superficial commentary.
3. Headline Crafting: Derive inspiration and topical angles from industry developments and RSS feeds, but NEVER copy source headlines verbatim. Craft fresh, compelling, authoritative headlines with strong verbs and clear promises to the reader.
4. Semantic HTML Structure: Format full articles using clean semantic HTML:
   - <h2> for primary architectural sections
   - <h3> for technical deep-dives and sub-modules
   - <p> for crisp, well-structured analytical paragraphs
   - <ul> and <ol> with <li> for comparisons, specifications, and checklists
   - <blockquote> for core architectural takeaways and industry insights
   - Code Blocks Policy: Significantly decrease and minimize code blocks (<pre><code>). Prioritize deep analytical explanations, architectural concepts, trade-offs, and workflows in clear, engaging prose over lengthy or frequent code snippets. Use code blocks only sparingly for short, essential configuration or syntax snippets when strictly necessary.
5. Zero Placeholders: Strictly prohibit phrases like "Technical report under compilation by Daily Build Automated Desk", "Content coming soon", or "Lorem ipsum". Deliver 100% complete, publication-ready prose.${topicGuidanceBlock}
`.trim();

  const systemPrompt = `You are the Lead Editorial Director and Systems Architect for DailyBuild Tech (blogs.dailybuild.tech).
${styleDirectives}`;

  // Prepend active target topics to themes list
  const combinedThemes = Array.from(new Set([...activeTopicEntries, ...themes])).slice(0, 15);

  return {
    systemPrompt,
    styleDirectives,
    learnedTone,
    topThemes: combinedThemes,
    rssContext,
    recentTitles,
    activeTopics: activeTopicEntries,
  };
}
