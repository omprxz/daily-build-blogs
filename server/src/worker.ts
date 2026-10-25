import cron from 'node-cron';
import { researchService } from './services/research/rss.js';
import { db } from './database/db.js';
import * as schema from './database/schema.js';
import { config } from './config/index.js';
import { eq, and, lte, or } from 'drizzle-orm';
import { buildFeaturedImagePrompt } from './services/image/image-service.js';
import { executeMcpImageJob } from './routes/automation.js';

console.log('[DailyBuild Worker] Starting background job scheduler and feed poll daemon...');

// 1. Cron Task: Poll RSS Feeds every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  if (config.automation.emergencyKillSwitch) {
    console.log('[Worker] Kill switch active. Skipping RSS polling cycle.');
    return;
  }
  console.log('[Worker Cron] Triggering scheduled RSS feed poll cycle...');
  try {
    const result = await researchService.pollAllEnabledFeeds();
    console.log(`[Worker Cron] Poll complete. Discovered ${result.totalNewStories} new items across ${result.sourcesPolled} feeds.`);
  } catch (err: any) {
    console.error('[Worker Cron Error]:', err.message);
  }
});

// 2. Cron Task: Publish Scheduled Articles every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('[Worker Cron] Checking for scheduled articles ready to be published...');
  try {
    const now = new Date();
    const scheduled = await db.query.articles.findMany({
      where: and(
        eq(schema.articles.status, 'scheduled'),
        lte(schema.articles.scheduledAt, now)
      )
    });

    for (const art of scheduled) {
      await db.update(schema.articles)
        .set({
          status: 'published',
          publishedAt: now,
          updatedAt: now,
        })
        .where(eq(schema.articles.id, art.id));
      console.log(`[Worker Cron] Published scheduled article: "${art.title}"`);
    }
  } catch (err: any) {
    console.error('[Worker Cron Error]:', err.message);
  }
});

// 3. Centralized Workflow Scheduler: Evaluates active visual workflows every minute in Asia/Kolkata (IST)
cron.schedule('* * * * *', async () => {
  if (config.automation.emergencyKillSwitch) {
    return;
  }
  try {
    const activeWorkflows = await db.query.workflows.findMany({
      where: eq(schema.workflows.isActive, true),
    });

    // Obtain current time in Asia/Kolkata
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'short',
      hourCycle: 'h23',
    });

    const parts = formatter.formatToParts(now);
    let curMin = 0;
    let curHour = 0;
    let curDay = 1;
    let curMonth = 1;
    let weekdayStr = '';

    for (const p of parts) {
      if (p.type === 'minute') curMin = Number(p.value);
      if (p.type === 'hour') curHour = Number(p.value) % 24;
      if (p.type === 'day') curDay = Number(p.value);
      if (p.type === 'month') curMonth = Number(p.value);
      if (p.type === 'weekday') weekdayStr = p.value;
    }
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const curDow = dayMap[weekdayStr] ?? now.getDay();

    for (const wf of activeWorkflows) {
      const settings = (wf.settingsJson as any) || {};
      const timingMode = settings.timingMode || (wf.triggerType === 'webhook' ? 'webhook' : 'cron');
      
      // If timingMode is webhook or manual, skip automatic time-based schedule
      if (timingMode === 'webhook' || timingMode === 'manual') {
        continue;
      }

      // Check date bounds if start/end dates specified
      if (settings.startDate && new Date(settings.startDate).getTime() > now.getTime()) {
        continue;
      }
      if (settings.endDate && new Date(settings.endDate).getTime() < now.getTime()) {
        continue;
      }

      let isMatch = false;

      if (timingMode === 'interval') {
        const intervalMins = Number(settings.intervalMins || settings.minIntervalMins || 60);
        const lastExec = settings.lastCronExecutedAt ? new Date(settings.lastCronExecutedAt).getTime() : 0;
        const elapsedMinutes = (now.getTime() - lastExec) / (1000 * 60);
        if (elapsedMinutes >= intervalMins) {
          isMatch = true;
        }
      } else {
        const cronExpr = (settings.cronExpression || wf.cronExpression || '0 */2 * * *').trim();
        const cronParts = cronExpr.split(/\s+/);
        if (cronParts.length !== 5) continue;

        // Helper function to test cron field match
        const matches = (field: string, val: number) => {
          if (field === '*') return true;
          if (field.startsWith('*/')) {
            const step = Number(field.slice(2));
            return step > 0 && val % step === 0;
          }
          for (const item of field.split(',')) {
            if (item.includes('-')) {
              const [s, e] = item.split('-').map(Number);
              if (val >= s && val <= e) return true;
            } else if (Number(item) === val) {
              return true;
            }
          }
          return false;
        };

        const matchesDow = (field: string, dow: number) => {
          if (field === '*') return true;
          const norm = dow === 7 ? 0 : dow;
          for (const item of field.split(',')) {
            if (item.includes('-')) {
              const [s, e] = item.split('-').map(Number);
              if (norm >= s && norm <= e) return true;
            } else if (Number(item) % 7 === norm) {
              return true;
            }
          }
          return false;
        };

        isMatch =
          matches(cronParts[0], curMin) &&
          matches(cronParts[1], curHour) &&
          matches(cronParts[2], curDay) &&
          matches(cronParts[3], curMonth) &&
          matchesDow(cronParts[4], curDow);
      }

      if (!isMatch) continue;

      // Prevent executing twice in the exact same minute
      const lastCronTime = settings.lastCronExecutedAt ? new Date(settings.lastCronExecutedAt).getTime() : 0;
      if (now.getTime() - lastCronTime < 50 * 1000) {
        continue;
      }

      // Concurrency Guard: Check if this workflow is currently executing to prevent duplicate concurrent runs
      const activeExecution = await db.query.workflowExecutions.findFirst({
        where: and(
          eq(schema.workflowExecutions.workflowId, wf.id),
          eq(schema.workflowExecutions.status, 'running')
        ),
      });

      if (activeExecution) {
        const startedTime = new Date(activeExecution.startedAt).getTime();
        // If started less than 15 minutes ago, it's actively running
        if (now.getTime() - startedTime < 15 * 60 * 1000) {
          console.log(`[Worker Cron] Workflow "${wf.name}" is already executing (Execution #${activeExecution.id.slice(0, 8)}). Skipping trigger to avoid duplicate concurrent articles.`);
          continue;
        } else {
          console.warn(`[Worker Cron] Cleaning up stale execution #${activeExecution.id.slice(0, 8)} older than 15 minutes.`);
          await db.update(schema.workflowExecutions)
            .set({
              status: 'failed',
              errorMessage: 'Execution timed out after 15 minutes.',
              completedAt: now,
            })
            .where(eq(schema.workflowExecutions.id, activeExecution.id));
        }
      }

      // Record lastCronExecutedAt in settings to prevent double fire
      settings.lastCronExecutedAt = now.toISOString();
      await db.update(schema.workflows)
        .set({
          settingsJson: settings,
          updatedAt: new Date(),
        })
        .where(eq(schema.workflows.id, wf.id));

      console.log(`[Worker Cron IST] Triggering visual workflow "${wf.name}" at ${formatter.format(now)}...`);
      const { workflowEngine } = await import('./services/automation/workflow-engine.js');
      await workflowEngine.executeWorkflow(wf.id, 'scheduled_cron');
    }
  } catch (err: any) {
    console.warn('[Worker Workflow Cron Warning]:', err.message);
  }
});

// 4. Cron Task: Auto-trigger image generation for articles requiring featured images every 3 minutes
cron.schedule('*/3 * * * *', async () => {
  if (config.automation.emergencyKillSwitch) {
    return;
  }
  try {
    const configRecord = await db.query.applicationSettings.findFirst({
      where: eq(schema.applicationSettings.key, 'local_image_automation'),
    });
    const cfg = (configRecord?.valueJson as any) || {};
    if (cfg.isEnabled === false) return;

    // Find articles without featuredImage that are in draft or scheduled
    const allArticles = await db.query.articles.findMany({
      where: or(eq(schema.articles.status, 'draft'), eq(schema.articles.status, 'scheduled')),
      limit: 10,
      with: { category: true },
    });

    const needsImage = allArticles.filter(a => !a.featuredImage);

    for (const art of needsImage) {
      // Check if a job already exists for this article by articleId or articleTitle to prevent duplicate jobs
      const existingJob = await db.query.imageAutomationJobs.findFirst({
        where: and(
          or(
            eq(schema.imageAutomationJobs.articleId, art.id),
            eq(schema.imageAutomationJobs.articleTitle, art.title)
          ),
          or(
            eq(schema.imageAutomationJobs.status, 'pending'),
            eq(schema.imageAutomationJobs.status, 'claimed'),
            eq(schema.imageAutomationJobs.status, 'completed')
          )
        ),
      });

      if (existingJob) {
        // If job was created without articleId, link it now
        if (!existingJob.articleId) {
          await db.update(schema.imageAutomationJobs)
            .set({ articleId: art.id, updatedAt: new Date() })
            .where(eq(schema.imageAutomationJobs.id, existingJob.id));
        }
        continue;
      }
        console.log(`[Worker Cron] Queuing MCP image generation job for article: "${art.title}"`);
        const catName = (art.category as any)?.name || 'Technology';
        const composedPrompt = buildFeaturedImagePrompt(art.title, catName);

        const [job] = await db.insert(schema.imageAutomationJobs).values({
          articleId: art.id,
          status: 'pending',
          prompt: composedPrompt,
          articleTitle: art.title,
          categoryName: catName,
          aspectRatio: cfg.aspectRatio || '16:9',
          visualStyle: '16:9 Editorial illustration',
          autoPublishOnComplete: cfg.autoPublish !== false,
          logsJson: [`[${new Date().toLocaleTimeString()}] Auto-queued by scheduled cron worker.`],
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning();

        // Dispatch MCP generation directly to configured domain /mcp
        if (cfg.webhookUrl) {
          executeMcpImageJob(job.id, cfg.webhookUrl).catch((err) => {
            console.warn(`[Worker Cron MCP Execution Notice for ${job.id}]:`, err.message);
          });
        }
      }
    } catch (err: any) {
      console.warn('[Worker Image Cron Warning]:', err.message);
    }
  });

// Keep process active
process.on('SIGTERM', () => {
  console.log('[Worker] Stopping cron schedules gracefully...');
  process.exit(0);
});
