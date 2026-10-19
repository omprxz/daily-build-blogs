import assert from 'assert';
import { hashPassword, comparePassword, encryptApiKey, decryptApiKey } from '../src/utils/security.js';
import { researchService } from '../src/services/research/rss.js';
import { seoService } from '../src/services/seo/seo-service.js';
import { providerRegistry } from '../src/services/ai/provider-registry.js';

async function runTests() {
  console.log('=== [DailyBuild Tech Test Suite] Starting unit & integration tests ===\n');

  // Test 1: Security Utilities
  console.log('Test 1: Password hashing and comparison...');
  const plain = 'SecretAdmin123!';
  const hash = await hashPassword(plain);
  assert(await comparePassword(plain, hash), 'Password comparison should succeed');
  assert(!(await comparePassword('WrongPassword', hash)), 'Invalid password must fail');
  console.log('✓ Password hashing passed.');

  console.log('\nTest 2: AES-256-GCM API Key encryption & decryption roundtrip...');
  const testKey = 'sk-proj-test1234567890abcdefghijklmnopqrstuvwxyz';
  const encrypted = encryptApiKey(testKey);
  assert(encrypted !== testKey, 'Encrypted key must differ from plain');
  const decrypted = decryptApiKey(encrypted);
  assert.strictEqual(decrypted, testKey, 'Decrypted key must match original');
  console.log('✓ API Key AES encryption roundtrip passed.');

  // Test 3: Duplicate Story Key Generation
  console.log('\nTest 3: Research deduplication key hash...');
  const key1 = researchService.generateDuplicateKey('Breaking: OpenAI Releases New Frontier Model', 'https://openai.com/news/123');
  const key2 = researchService.generateDuplicateKey('breaking openai releases new frontier model', 'https://openai.com/news/123?utm_source=rss');
  assert.strictEqual(key1, key2, 'Duplicate key must be normalized and identical across URL queries and casing');
  console.log('✓ Deduplication hashing passed.');

  // Test 4: SEO robots.txt
  console.log('\nTest 4: Robots.txt generation...');
  const robots = seoService.generateRobotsTxt();
  assert(robots.includes('Disallow: /admin'), 'Robots.txt must disallow /admin');
  assert(robots.includes('Sitemap:'), 'Robots.txt must reference sitemap.xml');
  console.log('✓ Robots.txt generation passed.');

  // Test 5: Dynamic Provider Adapters
  console.log('\nTest 5: AI Provider Adapters registered...');
  const adapters = providerRegistry.getAllAdapters();
  assert(adapters.length >= 7, 'Must have at least 7 adapters registered including TGPT');
  const gemini = providerRegistry.getAdapter('gemini');
  assert(gemini !== undefined, 'Gemini adapter must exist');
  console.log(`✓ Found ${adapters.length} registered AI adapters.`);

  // Test 6: OS Detection & TGPT Adapter
  console.log('\nTest 6: OS Detection and TGPT Adapter...');
  const { detectOperatingSystem, resolveTgptExecutable } = await import('../src/services/ai/tgpt.js');
  const osInfo = detectOperatingSystem();
  assert(['win32', 'linux', 'darwin'].includes(osInfo.platform), 'Platform must be recognized');
  assert(typeof osInfo.isWindows === 'boolean', 'isWindows must be boolean');
  assert(typeof osInfo.isLinux === 'boolean', 'isLinux must be boolean');
  // Test 7: Google Search Console Service
  console.log('\nTest 7: Google Search Console Service auth URL and status...');
  const { getGoogleAuthUrl, getSearchConsoleStatus, querySearchAnalytics } = await import('../src/services/google/search-console.js');
  const gscStatus = await getSearchConsoleStatus();
  assert(typeof gscStatus.isConnected === 'boolean', 'GSC isConnected must be boolean');
  assert(typeof gscStatus.isConfigured === 'boolean', 'GSC isConfigured must be boolean');
  assert(typeof gscStatus.redirectUri === 'string' && gscStatus.redirectUri.includes('/oauth-callback'), 'Redirect URI must be formatted correctly');
  
  // Test querySearchAnalytics with fallback benchmark dataset
  const benchmarkData = await querySearchAnalytics('sc-domain:blogs.dailybuild.tech', {
    startDate: '2026-09-01',
    endDate: '2026-09-28',
    compare: true,
  });
  assert(typeof benchmarkData.totalClicks === 'number', 'Total clicks must be a number');
  assert(typeof benchmarkData.totalImpressions === 'number', 'Total impressions must be a number');
  assert(Array.isArray(benchmarkData.topQueries), 'topQueries must be an array');
  assert(Array.isArray(benchmarkData.topPages), 'topPages must be an array');
  assert(Array.isArray(benchmarkData.timeSeries), 'timeSeries must be an array');
  console.log(`✓ GSC benchmark analytics verified (${benchmarkData.totalClicks} clicks, ${benchmarkData.topQueries.length} top queries).`);

  // Test 8: AI Insights Joint Analysis Generation
  console.log('\nTest 8: AI Insights joint audit report generation...');
  const { generateSiteAIInsights } = await import('../src/services/google/ai-insights.js');
  const sampleMobileAudit: any = {
    url: 'https://blogs.dailybuild.tech',
    strategy: 'mobile',
    performanceScore: 82,
    accessibilityScore: 94,
    bestPracticesScore: 96,
    seoScore: 98,
    coreWebVitals: {
      lcp: { displayValue: '2.4 s', value: 2.4, status: 'good' },
      cls: { displayValue: '0.04', value: 0.04, status: 'good' },
      tbt: { displayValue: '180 ms', value: 180, status: 'good' },
    },
    opportunities: [
      { id: 'render-blocking-resources', title: 'Eliminate render-blocking resources', savingsMs: 350 },
    ],
  };

  const aiReport = await generateSiteAIInsights({
    siteUrl: 'https://blogs.dailybuild.tech',
    mobileLighthouse: sampleMobileAudit,
    searchConsole: benchmarkData,
  });

  assert(['A+', 'A', 'B', 'C', 'D', 'F'].includes(aiReport.overallHealthGrade), 'Health grade must be valid letter grade');
  assert(typeof aiReport.executiveSummary === 'string' && aiReport.executiveSummary.length > 20, 'Executive summary must be present');
  assert(Array.isArray(aiReport.prioritizedRecommendations), 'Prioritized recommendations must be array');
  assert(aiReport.prioritizedRecommendations.length > 0, 'Must produce at least one recommendation');
  assert(aiReport.groundingNotice.includes('Lighthouse'), 'Grounding notice must reference data sources');
  console.log(`✓ AI Insights generation verified (Grade: ${aiReport.overallHealthGrade}, Recommendations: ${aiReport.prioritizedRecommendations.length}).`);

  // Drain database connection pool gracefully
  try {
    const { pool } = await import('../src/database/db.js');
    await pool.end();
  } catch {}

  console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
  return;
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});



