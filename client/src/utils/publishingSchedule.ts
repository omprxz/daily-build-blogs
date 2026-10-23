import { validateAndExplainCron } from './cron.js';

export interface NextScheduledPublication {
  workflowId: string;
  workflowName: string;
  isActive: boolean;
  timingMode: 'cron' | 'interval' | 'webhook' | 'rss_discovery' | 'manual';
  cronExpression?: string;
  intervalMins?: number;
  timezone: string;
  nextDate: Date;
  formattedDate: string; // e.g. "Friday, Oct 23, 2026"
  formattedTime: string; // e.g. "10:43 PM IST"
  fullFormatted: string; // e.g. "Friday, Oct 23, 2026 at 10:43 PM IST"
  explanation: string; // e.g. "Every day at 10:43 PM (IST)"
  timeRemaining: string; // e.g. "in 4 hours 47 mins"
  autoPublish: boolean;
  previewUrl: string;
}

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

function formatTimeRemaining(targetDate: Date): string {
  const diffMs = targetDate.getTime() - Date.now();
  if (diffMs <= 0) return 'Due for publication momentarily';
  const totalMins = Math.round(diffMs / (1000 * 60));
  if (totalMins < 60) {
    return `in ${totalMins} minute${totalMins === 1 ? '' : 's'}`;
  }
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours < 24) {
    return mins > 0
      ? `in ${hours} hr${hours === 1 ? '' : 's'} ${mins} min${mins === 1 ? '' : 's'}`
      : `in ${hours} hour${hours === 1 ? '' : 's'}`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0
    ? `in ${days} day${days === 1 ? '' : 's'} ${remHours} hr${remHours === 1 ? '' : 's'}`
    : `in ${days} day${days === 1 ? '' : 's'}`;
}

function matchesField(field: string, val: number): boolean {
  if (field === '*') return true;
  if (field.startsWith('*/')) {
    const step = Number(field.slice(2));
    return val % step === 0;
  }
  const items = field.split(',');
  for (const item of items) {
    if (item.includes('-')) {
      const [start, end] = item.split('-').map(Number);
      if (val >= start && val <= end) return true;
    } else if (Number(item) === val) {
      return true;
    }
  }
  return false;
}

function matchesDow(field: string, dow: number): boolean {
  if (field === '*') return true;
  const normalizedDow = dow === 7 ? 0 : dow;
  const items = field.split(',');
  for (const item of items) {
    if (item.includes('-')) {
      const [start, end] = item.split('-').map(Number);
      if (normalizedDow >= start && normalizedDow <= end) return true;
    } else {
      const n = Number(item) % 7;
      if (n === normalizedDow) return true;
    }
  }
  return false;
}

function findNextCronDate(parts: string[], minDateMs: number = 0): Date | null {
  const now = new Date();
  let currentMs = Math.max(now.getTime() + 60000, minDateMs);
  currentMs = Math.floor(currentMs / 60000) * 60000;

  // Search up to 30 days ahead
  const maxChecks = 30 * 24 * 60;
  let checks = 0;

  while (checks < maxChecks) {
    checks++;
    const istDate = new Date(currentMs + IST_OFFSET_MS);
    const lMin = istDate.getUTCMinutes();
    const lHour = istDate.getUTCHours();
    const lDay = istDate.getUTCDate();
    const lMonth = istDate.getUTCMonth() + 1;
    const lDow = istDate.getUTCDay();

    if (
      matchesField(parts[0], lMin) &&
      matchesField(parts[1], lHour) &&
      matchesField(parts[2], lDay) &&
      matchesField(parts[3], lMonth) &&
      matchesDow(parts[4], lDow)
    ) {
      return new Date(currentMs);
    }

    currentMs += 60000;
  }

  return null;
}

/**
 * Derives the next scheduled article publication from configured publishing flows.
 * Returns null if no active flow is configured, or if the flow has no upcoming publication.
 */
export function deriveNextScheduledPublication(
  workflows: any[]
): NextScheduledPublication | null {
  if (!Array.isArray(workflows) || workflows.length === 0) {
    return null;
  }

  // Find active workflows
  const activeWorkflows = workflows.filter((w) => w && Boolean(w.isActive));
  if (activeWorkflows.length === 0) {
    return null;
  }

  const nowMs = Date.now();
  let candidateResults: NextScheduledPublication[] = [];

  for (const wf of activeWorkflows) {
    const settings = (wf.settingsJson as any) || {};

    // If auto-publishing is explicitly disabled, skip
    if (settings.autoPublishEnabled === false) {
      continue;
    }

    // Check date bounds
    if (settings.endDate && new Date(settings.endDate).getTime() < nowMs) {
      continue;
    }

    const timingMode: 'cron' | 'interval' | 'webhook' | 'rss_discovery' =
      settings.timingMode || (wf.triggerType === 'webhook' ? 'webhook' : 'cron');

    // Webhook and manual flows do not operate on a fixed publication schedule
    if (timingMode === 'webhook' || (timingMode as string) === 'manual') {
      continue;
    }

    const timezone = settings.timezone || 'Asia/Kolkata';
    const minStartMs = settings.startDate ? new Date(settings.startDate).getTime() : 0;
    const maxEndMs = settings.endDate ? new Date(settings.endDate).getTime() : Infinity;

    let nextRunDate: Date | null = null;
    let explanation = 'Scheduled automatic publishing';

    if (timingMode === 'interval') {
      const intervalMins = Number(settings.intervalMins || settings.minIntervalMins || 60);
      const lastExecStr = settings.lastCronExecutedAt || settings.lastExecutedAt;
      let targetMs = lastExecStr
        ? new Date(lastExecStr).getTime() + intervalMins * 60 * 1000
        : nowMs + intervalMins * 60 * 1000;

      if (targetMs <= nowMs) {
        // Next worker check triggers on upcoming minute
        targetMs = Math.ceil((nowMs + 1000) / 60000) * 60000;
      }
      if (targetMs < minStartMs) {
        targetMs = minStartMs;
      }

      if (targetMs <= maxEndMs) {
        nextRunDate = new Date(targetMs);
        explanation = `Every ${intervalMins} minute${intervalMins === 1 ? '' : 's'}`;
      }
    } else {
      // Default: Cron mode
      const cronExpr = (settings.cronExpression || wf.cronExpression || '0 */2 * * *').trim();
      const cronValidation = validateAndExplainCron(cronExpr, timezone, 3);

      if (cronValidation.isValid) {
        explanation = cronValidation.explanation || 'Cron publication schedule';
        const parts = cronExpr.split(/\s+/);
        if (parts.length === 5) {
          const calculatedDate = findNextCronDate(parts, minStartMs);
          if (calculatedDate && calculatedDate.getTime() <= maxEndMs) {
            nextRunDate = calculatedDate;
          }
        }
      }
    }

    if (!nextRunDate) {
      continue;
    }

    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    });

    const formattedDate = dateFormatter.format(nextRunDate);
    const formattedTime = timeFormatter.format(nextRunDate);
    const fullFormatted = `${formattedDate} at ${formattedTime}`;
    const timeRemaining = formatTimeRemaining(nextRunDate);

    // Preview URL: live website or last published article
    const previewUrl = settings.lastGeneratedArticleId
      ? `/article/${settings.lastGeneratedArticleId}`
      : '/';

    candidateResults.push({
      workflowId: wf.id,
      workflowName: wf.name || 'Automated Publishing Pipeline',
      isActive: true,
      timingMode,
      cronExpression: settings.cronExpression || wf.cronExpression,
      intervalMins: settings.intervalMins,
      timezone,
      nextDate: nextRunDate,
      formattedDate,
      formattedTime,
      fullFormatted,
      explanation,
      timeRemaining,
      autoPublish: true,
      previewUrl,
    });
  }

  if (candidateResults.length === 0) {
    return null;
  }

  // Sort by earliest next publication date
  candidateResults.sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime());
  return candidateResults[0];
}
