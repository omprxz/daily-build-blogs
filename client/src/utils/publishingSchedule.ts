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
  cadenceChips: string[]; // e.g. ["9:00 AM", "1:00 PM", "5:00 PM", "9:00 PM"] or ["9:34 AM"]
  timeRemaining: string; // e.g. "in 4 hours 47 mins"
  autoPublish: boolean;
  previewUrl: string;
}

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

export function parseCadenceChips(
  cronExpr?: string,
  intervalMins?: number,
  explanation?: string
): string[] {
  function format12h(hour: number, minute: number): string {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h = hour % 12 === 0 ? 12 : hour % 12;
    const m = minute < 10 ? `0${minute}` : `${minute}`;
    return `${h}:${m} ${ampm}`;
  }

  // 1. Check interval
  if (intervalMins && intervalMins > 0) {
    if (intervalMins < 60) return [`Every ${intervalMins}m`];
    if (intervalMins % 60 === 0) return [`Every ${intervalMins / 60}h`];
    return [`Every ${intervalMins}m`];
  }

  // 2. Check explanation string if it matches "At min X, at H1,H2:00"
  if (explanation) {
    const match = explanation.match(/At min\s+(\d+),\s*at\s+([0-9,]+):00/i);
    if (match) {
      const minVal = Number(match[1]);
      const hourVals = match[2].split(',').map(Number).filter((n) => !isNaN(n));
      if (hourVals.length > 0 && !isNaN(minVal)) {
        return hourVals.sort((a, b) => a - b).map((h) => format12h(h, minVal));
      }
    }
  }

  // 3. Parse cron expression
  if (cronExpr) {
    const parts = cronExpr.trim().split(/\s+/);
    if (parts.length === 5) {
      const [minPart, hourPart] = parts;

      const expandField = (field: string, minLimit: number, maxLimit: number): number[] | null => {
        if (field === '*') return null;
        if (field.startsWith('*/')) {
          const step = Number(field.slice(2));
          if (isNaN(step) || step <= 0) return null;
          const nums: number[] = [];
          for (let i = minLimit; i <= maxLimit; i += step) nums.push(i);
          return nums;
        }
        const items = field.split(',');
        const nums: number[] = [];
        for (const item of items) {
          if (item.includes('-')) {
            const [start, end] = item.split('-').map(Number);
            if (isNaN(start) || isNaN(end)) return null;
            for (let i = start; i <= end; i++) nums.push(i);
          } else {
            const val = Number(item);
            if (isNaN(val)) return null;
            nums.push(val);
          }
        }
        return nums.sort((a, b) => a - b);
      };

      const parsedHours = expandField(hourPart, 0, 23);
      const parsedMins = expandField(minPart, 0, 59);

      if (parsedHours && parsedMins) {
        const chips: string[] = [];
        for (const h of parsedHours) {
          for (const m of parsedMins) {
            chips.push(format12h(h, m));
          }
        }
        if (chips.length > 0) return chips;
      }

      if (parsedHours && minPart === '*') {
        return parsedHours.map((h) => format12h(h, 0));
      }

      if (hourPart === '*' && parsedMins) {
        return parsedMins.map((m) => `:${m < 10 ? '0' + m : m}`);
      }

      if (hourPart.startsWith('*/')) {
        return [`Every ${hourPart.slice(2)}h`];
      }

      if (minPart.startsWith('*/')) {
        return [`Every ${minPart.slice(2)}m`];
      }
    }
  }

  return ['Regular cadence'];
}

export function formatConciseCountdown(targetMs: number, nowMs: number, isPaused: boolean): string {
  if (isPaused) {
    return 'Paused';
  }
  const diffSec = Math.floor((targetMs - nowMs) / 1000);
  if (diffSec <= 0) {
    return 'Due momentarily';
  }
  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  const seconds = diffSec % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

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
 * Returns information even if the flow is paused, marking isActive appropriately.
 */
export function deriveNextScheduledPublication(
  workflows: any[]
): NextScheduledPublication | null {
  if (!Array.isArray(workflows) || workflows.length === 0) {
    return null;
  }

  const nowMs = Date.now();
  const candidateResults: NextScheduledPublication[] = [];

  for (const wf of workflows) {
    if (!wf) continue;
    const isWfActive = Boolean(wf.isActive);
    const settings = (wf.settingsJson as any) || {};

    // If auto-publishing is explicitly disabled in settings, skip
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
    const cadenceChips = parseCadenceChips(
      settings.cronExpression || wf.cronExpression,
      settings.intervalMins,
      explanation
    );

    // Preview URL: live website or last published article
    const previewUrl = settings.lastGeneratedArticleId
      ? `/article/${settings.lastGeneratedArticleId}`
      : '/';

    candidateResults.push({
      workflowId: wf.id,
      workflowName: wf.name || 'Automated Publishing Pipeline',
      isActive: isWfActive,
      timingMode,
      cronExpression: settings.cronExpression || wf.cronExpression,
      intervalMins: settings.intervalMins,
      timezone,
      nextDate: nextRunDate,
      formattedDate,
      formattedTime,
      fullFormatted,
      explanation,
      cadenceChips,
      timeRemaining,
      autoPublish: true,
      previewUrl,
    });
  }

  if (candidateResults.length === 0) {
    return null;
  }

  // Prefer active workflows first
  const activeCandidates = candidateResults.filter((c) => c.isActive);
  if (activeCandidates.length > 0) {
    activeCandidates.sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime());
    return activeCandidates[0];
  }

  // If paused, sort by next publication date and return the first
  candidateResults.sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime());
  return candidateResults[0];
}
