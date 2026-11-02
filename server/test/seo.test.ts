import assert from 'assert';
import { onPageOptimizerService } from '../src/services/seo/on-page-service.js';
import { schemaValidatorService } from '../src/services/seo/schema-validator-service.js';
import { duplicateContentService } from '../src/services/seo/duplicate-content-service.js';
import { indexingService } from '../src/services/seo/indexing-service.js';
import { publicationGateService } from '../src/services/seo/publication-gate-service.js';
import { aeoGeoAnalyzerService } from '../src/services/seo/aeo-geo-service.js';
import { contentQualityService } from '../src/services/seo/content-quality-service.js';
import { serpPreviewService } from '../src/services/seo/serp-preview-service.js';

export async function runSeoTests() {
  console.log('=== [DailyBuild SEO & AEO Suite] Starting Unit & Integration Tests ===\n');

  // Test 1: On-Page SEO Analysis & Readability Calculations
  console.log('Test 1: On-Page SEO Rule Calculations & Readability Analysis...');
  const sampleArticle = {
    title: 'Complete Guide to Full-Stack Web Development in 2026',
    slug: 'guide-full-stack-web-development-2026',
    metaDescription: 'A comprehensive, in-depth guide exploring modern frontend, backend, database architectures, and best practices for engineers building web applications in 2026.',
    content: `
      <p>Full-stack web development has evolved rapidly over recent years. In this comprehensive guide, we explore modern system design, web performance, and backend services.</p>
      <h2>Frontend Architecture Fundamentals</h2>
      <p>Modern frontend engineering relies heavily on component-driven development, type safety with TypeScript, and optimized bundle delivery for first-class user experience.</p>
      <img src="https://blogs.dailybuild.tech/images/architecture.png" alt="Full Stack Architecture Overview Diagram" />
      <h2>Backend Scalability and API Design</h2>
      <p>Reliable backends demand robust concurrency controls, database connection pooling, and structured error boundaries to maintain high availability under production traffic.</p>
      <h3>Database Integration and ORMs</h3>
      <p>Whether using PostgreSQL or NoSQL solutions, query execution plans and index strategy remain paramount for scalable throughput.</p>
    `,
    targetKeyword: 'full-stack web development',
  };

  const onPageResult = await onPageOptimizerService.analyzeArticle({
    title: sampleArticle.title,
    slug: sampleArticle.slug,
    metaDescription: sampleArticle.metaDescription,
    contentHtml: sampleArticle.content,
    targetKeyword: sampleArticle.targetKeyword,
  });

  assert(typeof onPageResult.overallScore === 'number', 'On-page score must be a number');
  assert(onPageResult.overallScore >= 50, `Expected score >= 50 for well-structured article, got ${onPageResult.overallScore}`);
  assert(onPageResult.wordCount > 50, 'Word count must be calculated');
  assert(typeof onPageResult.readabilityGrade === 'string', 'Readability grade must be present');
  assert(Array.isArray(onPageResult.checks), 'Checks must be an array');
  console.log(`✓ On-page SEO score: ${onPageResult.overallScore}/100, Words: ${onPageResult.wordCount}, Readability: ${onPageResult.readabilityGrade}`);

  // Test 2: Schema.org JSON-LD Generation and Validation
  console.log('\nTest 2: Schema.org JSON-LD Generation & Specification Validation...');
  const validSchema = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: 'Building Scalable APIs with Node.js and TypeScript',
    description: 'Learn how to architect resilient microservices and REST APIs.',
    image: ['https://blogs.dailybuild.tech/images/cover.jpg'],
    datePublished: '2026-03-15T08:00:00Z',
    dateModified: '2026-03-16T10:00:00Z',
    author: {
      '@type': 'Person',
      name: 'Alex Rivera',
      url: 'https://blogs.dailybuild.tech/authors/alex-rivera',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Daily Build Blogs',
      logo: {
        '@type': 'ImageObject',
        url: 'https://blogs.dailybuild.tech/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': 'https://blogs.dailybuild.tech/building-scalable-apis',
    },
  };

  const validationResult = schemaValidatorService.validateSchema(validSchema, {
    title: 'Building Scalable APIs with Node.js and TypeScript',
    author: 'Alex Rivera',
  });
  assert(validationResult.isValid === true, 'Valid TechArticle schema must pass validation');
  assert(validationResult.errors.length === 0, 'Valid schema must have 0 fatal errors');
  assert(validationResult.googleGuidelineCompliance.hasRequiredProperties === true, 'Required properties must pass');
  console.log('✓ Valid Schema.org TechArticle passed Google Search Central compliance checks.');

  // Test 2b: Invalid Schema Detection
  const invalidSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    // Missing headline, image, datePublished, author, publisher
  };
  const invalidResult = schemaValidatorService.validateSchema(invalidSchema);
  assert(invalidResult.isValid === false, 'Incomplete schema must fail validation');
  assert(invalidResult.errors.length >= 2, 'Must flag missing required properties');
  console.log(`✓ Invalid Schema correctly flagged with ${invalidResult.errors.length} fatal errors.`);

  // Test 3: Duplicate Content & Shingling Similarity Algorithm
  console.log('\nTest 3: Duplicate Content 4-Word Shingling & Jaccard Similarity...');
  const textA = 'Artificial intelligence and machine learning are fundamentally transforming modern software engineering workflows in 2026 and beyond.';
  const textB = 'Artificial intelligence and machine learning are fundamentally transforming modern software engineering workflows in 2026 and beyond.';
  const textC = 'Quantum computing leverages qubits and superposition to solve complex computational problems completely unrelated to web applications.';

  const identicalSimilarity = duplicateContentService.calculateTextSimilarity(textA, textB);
  assert.strictEqual(identicalSimilarity, 1.0, 'Identical text shingle similarity must equal 1.0 (100%)');

  const distinctSimilarity = duplicateContentService.calculateTextSimilarity(textA, textC);
  assert(distinctSimilarity < 0.2, `Completely different texts must have low similarity, got ${distinctSimilarity}`);
  console.log(`✓ Jaccard similarity: identical = ${(identicalSimilarity * 100).toFixed(0)}%, distinct = ${(distinctSimilarity * 100).toFixed(1)}%`);

  // Test 4: IndexNow Key Verification & URL Generation
  console.log('\nTest 4: IndexNow Key Generation, Validation & Verification URL...');
  const generatedKey = indexingService.generateIndexNowKey();
  assert(typeof generatedKey === 'string' && generatedKey.length === 32, 'IndexNow key must be a 32-character hexadecimal string');
  assert(indexingService.validateIndexNowKey(generatedKey), 'Generated key must be valid');
  assert(!indexingService.validateIndexNowKey(''), 'Empty key must be rejected');
  assert(!indexingService.validateIndexNowKey('short'), 'Short key must be rejected');
  console.log(`✓ IndexNow key verification: ${generatedKey} passed format validation.`);

  // Test 5: AEO / GEO Direct Answer Extractability & Answer Engine Readiness
  console.log('\nTest 5: AEO/GEO Answer Readiness & Direct Extractability Analysis...');
  const aeoContent = `
    <h1>What is Edge Computing?</h1>
    <p>Edge computing is a distributed computing paradigm that brings computation and data storage closer to the sources of data, reducing latency and bandwidth usage.</p>
    <h2>Key Advantages of Edge Computing</h2>
    <p>According to Cloudflare research from 2025, edge execution reduces round-trip times by up to 65% for mobile users.</p>
    <h2>Frequently Asked Questions</h2>
    <h3>How does edge computing differ from cloud computing?</h3>
    <p>Cloud computing centralizes data processing in massive regional data centers, whereas edge computing processes data locally at regional nodes or client devices.</p>
  `;

  const aeoResult = await aeoGeoAnalyzerService.analyzeArticle({
    title: 'What is Edge Computing? Architecture and Benefits',
    contentHtml: aeoContent,
  });
  assert(typeof aeoResult.overallReadinessScore === 'number', 'AEO score must be a number');
  assert(aeoResult.overallReadinessScore >= 60, `AEO score should be high for FAQ and definition content, got ${aeoResult.overallReadinessScore}`);
  assert(aeoResult.directAnswerCount >= 1, 'Should extract at least one direct answer candidate');
  assert(aeoResult.questionHeadingsCount >= 1, 'Should count question heading');
  console.log(`✓ AEO/GEO Readiness score: ${aeoResult.overallReadinessScore}/100 (Tier: ${aeoResult.readinessTier})`);

  // Test 6: Content Quality & Source Verification
  console.log('\nTest 6: Factual Claim & Source Verification...');
  const factualContent = `
    <p>In 2026, over 74% of enterprise web traffic is encrypted with TLS 1.3.</p>
    <p>The global database market expanded to $120 billion according to industry reports.</p>
    <p>Visit the official documentation at <a href="https://example.com/docs">example docs</a>.</p>
  `;

  const qualityReport = await contentQualityService.verifyArticleContent({
    title: 'State of Web Security 2026',
    contentHtml: factualContent,
  });
  assert(typeof qualityReport.overallQualityScore === 'number', 'Quality score must be a number');
  assert(qualityReport.totalClaimsExtracted >= 1, 'Should extract factual claims/stats');
  assert(qualityReport.totalSourcesChecked === 1, 'Should inspect 1 external link');
  console.log(`✓ Content Quality score: ${qualityReport.overallQualityScore}/100, Claims extracted: ${qualityReport.totalClaimsExtracted}, Sources checked: ${qualityReport.totalSourcesChecked}`);

  // Test 7: SERP Pixel Width Simulation
  console.log('\nTest 7: SERP Snippet Pixel Width Truncation Estimation...');
  const shortTitle = 'Daily Build Blogs';
  const longTitle = 'Super Incredibly Extra Extremely Long Blog Post Title That Definitely Exceeds The Maximum Pixel Width Boundary Allowed by Google Search Desktop Results in 2026';
  
  const shortWidth = serpPreviewService.calculatePixelWidth(shortTitle);
  const longWidth = serpPreviewService.calculatePixelWidth(longTitle);
  assert(shortWidth < 600, 'Short title should fit within 600px desktop SERP title boundary');
  assert(longWidth > 600, 'Long title should exceed 600px desktop SERP title boundary');
  console.log(`✓ SERP pixel widths: "${shortTitle}" = ${shortWidth}px, long title = ${longWidth}px (Truncated: ${longWidth > 595})`);

  // Test 8: Pre-Publication Gate Evaluation
  console.log('\nTest 8: Publication Gate Pre-Flight Evaluation Pipeline...');
  const gateEvaluation = await publicationGateService.evaluateArticleBeforePublication({
    title: sampleArticle.title,
    slug: sampleArticle.slug,
    excerpt: sampleArticle.metaDescription,
    contentHtml: sampleArticle.content,
    metaTitle: sampleArticle.title,
    metaDescription: sampleArticle.metaDescription,
    authorName: 'Alex Rivera',
    categoryName: 'Engineering',
  });

  assert(typeof gateEvaluation.canPublish === 'boolean', 'canPublish must be a boolean');
  assert(typeof gateEvaluation.overallScore === 'number', 'Gate overallScore must be a number');
  assert(Array.isArray(gateEvaluation.checks), 'Checks must be an array');
  assert(gateEvaluation.checks.length >= 4, 'Gate must execute on-page, quality, AEO, and schema checks');
  console.log(`✓ Publication gate evaluation: canPublish=${gateEvaluation.canPublish}, score=${gateEvaluation.overallScore}/100, checks executed=${gateEvaluation.checks.length}`);

  console.log('\n=== ALL SEO & AEO UNIT & INTEGRATION TESTS PASSED! ===\n');
}

// Execute standalone if run directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  runSeoTests().catch((err) => {
    console.error('SEO Test Suite Failed:', err);
    process.exit(1);
  });
}
