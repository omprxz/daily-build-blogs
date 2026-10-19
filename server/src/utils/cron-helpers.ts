/**
 * Cron Expression Utilities with Asia/Kolkata (IST) Support
 * Standard 5-field syntax: <minute> <hour> <day-of-month> <month> <day-of-week>
 */

export interface CronValidationResult {
  isValid: boolean;
  error?: string;
  explanation?: string;
  nextOccurrences?: string[];
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

export function validateAndExplainCron(
  expr: string,
  timeZone: string = 'Asia/Kolkata',
  count: number = 5
): CronValidationResult {
  const trimmed = (expr || '').trim().replace(/\s+/g, ' ');
  if (!trimmed) {
    return {
      isValid: false,
      error: 'Cron expression cannot be empty. Expects 5 fields: minute hour dom month dow.',
    };
  }

  const parts = trimmed.split(' ');
  if (parts.length !== 5) {
    return {
      isValid: false,
      error: `Expected 5 fields (minute hour day month weekday), but received ${parts.length}.`,
    };
  }

  const [minPart, hourPart, domPart, monthPart, dowPart] = parts;

  // Validate fields ranges
  const minValid = validateField(minPart, 0, 59);
  if (!minValid.valid) return { isValid: false, error: `Invalid minute field '${minPart}': ${minValid.error}` };

  const hourValid = validateField(hourPart, 0, 23);
  if (!hourValid.valid) return { isValid: false, error: `Invalid hour field '${hourPart}': ${hourValid.error}` };

  const domValid = validateField(domPart, 1, 31);
  if (!domValid.valid) return { isValid: false, error: `Invalid day-of-month field '${domPart}': ${domValid.error}` };

  const monthValid = validateField(monthPart, 1, 12);
  if (!monthValid.valid) return { isValid: false, error: `Invalid month field '${monthPart}': ${monthValid.error}` };

  const dowValid = validateField(dowPart, 0, 7);
  if (!dowValid.valid) return { isValid: false, error: `Invalid day-of-week field '${dowPart}': ${dowValid.error}` };

  const explanation = explainCronExpression(parts);
  const nextOccurrences = getNextCronOccurrences(parts, timeZone, count);

  return {
    isValid: true,
    explanation,
    nextOccurrences,
  };
}

function validateField(part: string, min: number, max: number): { valid: boolean; error?: string } {
  if (part === '*') return { valid: true };

  // Step expressions: */5 or 1-10/2
  if (part.startsWith('*/')) {
    const step = Number(part.slice(2));
    if (isNaN(step) || step < 1 || step > max) return { valid: false, error: `Step must be between 1 and ${max}` };
    return { valid: true };
  }

  // Comma-separated lists
  const items = part.split(',');
  for (const item of items) {
    // Range: 1-5 or 1-5/2
    if (item.includes('-')) {
      const [rangeStr, stepStr] = item.split('/');
      const [startStr, endStr] = rangeStr.split('-');
      const start = Number(startStr);
      const end = Number(endStr);
      if (isNaN(start) || isNaN(end) || start < min || end > max || start > end) {
        return { valid: false, error: `Invalid range ${item} (bounds: ${min}-${max})` };
      }
      if (stepStr) {
        const step = Number(stepStr);
        if (isNaN(step) || step < 1) return { valid: false, error: `Invalid step in ${item}` };
      }
    } else {
      const num = Number(item);
      if (isNaN(num) || num < min || num > max) {
        return { valid: false, error: `Value ${item} out of range (${min}-${max})` };
      }
    }
  }

  return { valid: true };
}

function formatHourMinute(hour: number, minute: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const displayMinute = minute < 10 ? `0${minute}` : `${minute}`;
  return `${displayHour}:${displayMinute} ${ampm}`;
}

export function explainCronExpression(parts: string[]): string {
  const [min, hour, dom, month, dow] = parts;

  // Case 1: Every minute
  if (min === '*' && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    return 'Every minute, every day.';
  }

  // Case 2: Every N minutes: */N * * * *
  if (min.startsWith('*/') && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    const step = min.slice(2);
    return `Every ${step} minutes, continuously.`;
  }

  // Case 3: Every hour at minute X: X * * * *
  if (!min.includes('*') && !min.includes('/') && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    return `Every hour at minute ${min}.`;
  }

  // Case 4: Every N hours: 0 */N * * *
  if (hour.startsWith('*/') && dom === '*' && month === '*' && dow === '*') {
    const step = hour.slice(2);
    const minuteText = min === '0' ? 'the start of the hour' : `minute ${min}`;
    return `Every ${step} hours at ${minuteText}.`;
  }

  // Case 5: Fixed daily time: M H * * *
  if (!min.includes('*') && !min.includes('/') && !hour.includes('*') && !hour.includes('/') && dom === '*' && month === '*' && dow === '*') {
    const h = Number(hour);
    const m = Number(min);
    if (!isNaN(h) && !isNaN(m)) {
      return `Every day at ${formatHourMinute(h, m)} (IST).`;
    }
  }

  // Case 6: Specific days of week: M H * * DOW
  if (dow !== '*' && dom === '*' && month === '*') {
    const h = Number(hour);
    const m = Number(min);
    const timeText = !isNaN(h) && !isNaN(m) ? ` at ${formatHourMinute(h, m)} (IST)` : '';

    if (dow === '1-5') {
      return `Every weekday (Monday through Friday)${timeText}.`;
    }
    if (dow === '0,6' || dow === '6,0' || dow === '7,6' || dow === '6,7') {
      return `Every weekend (Saturday and Sunday)${timeText}.`;
    }

    const dows = dow.split(',').map((d) => {
      const idx = Number(d) % 7;
      return WEEKDAY_NAMES[idx] || d;
    });
    return `Every week on ${dows.join(', ')}${timeText}.`;
  }

  // Case 7: Day of month: M H DOM * *
  if (dom !== '*' && month === '*' && dow === '*') {
    const h = Number(hour);
    const m = Number(min);
    const timeText = !isNaN(h) && !isNaN(m) ? ` at ${formatHourMinute(h, m)} (IST)` : '';
    return `On day ${dom} of every month${timeText}.`;
  }

  // General fallback construction
  let desc = '';
  if (min.startsWith('*/')) {
    desc += `Every ${min.slice(2)} minutes`;
  } else if (min === '*') {
    desc += 'Every minute';
  } else {
    desc += `At minute ${min}`;
  }

  if (hour.startsWith('*/')) {
    desc += `, every ${hour.slice(2)} hours`;
  } else if (hour !== '*') {
    desc += `, at hour ${hour}`;
  }

  if (dom !== '*') {
    desc += `, on day-of-month ${dom}`;
  }

  if (month !== '*') {
    desc += `, in month ${month}`;
  }

  if (dow !== '*') {
    desc += `, on weekday ${dow}`;
  }

  return desc + ' (Asia/Kolkata timezone).';
}

/**
 * Calculate upcoming execution occurrences strictly respecting Asia/Kolkata timezone
 */
export function getNextCronOccurrences(
  parts: string[],
  timeZone: string = 'Asia/Kolkata',
  count: number = 5
): string[] {
  const occurrences: string[] = [];
  const now = new Date();
  
  // Advance minute by minute to find matching timestamps
  const current = new Date(now.getTime() + 60000);
  current.setSeconds(0, 0);

  const maxChecks = 60 * 24 * 60; // search up to 60 days ahead
  let checks = 0;

  while (occurrences.length < count && checks < maxChecks) {
    checks++;
    
    // Parse current time in target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'narrow',
      hourCycle: 'h23',
    });

    const partsLocale = formatter.formatToParts(current);
    let lMin = 0;
    let lHour = 0;
    let lDay = 1;
    let lMonth = 1;

    for (const p of partsLocale) {
      if (p.type === 'minute') lMin = Number(p.value);
      if (p.type === 'hour') lHour = Number(p.value);
      if (p.type === 'day') lDay = Number(p.value);
      if (p.type === 'month') lMonth = Number(p.value);
    }
    // JS getDay() in target timezone
    const dowFormatter = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' });
    const weekdayStr = dowFormatter.format(current);
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const lDow = dayMap[weekdayStr] ?? current.getDay();

    if (
      matchesField(parts[0], lMin) &&
      matchesField(parts[1], lHour) &&
      matchesField(parts[2], lDay) &&
      matchesField(parts[3], lMonth) &&
      matchesDow(parts[4], lDow)
    ) {
      // Format human-readable string in Asia/Kolkata
      const displayStr = new Intl.DateTimeFormat('en-IN', {
        timeZone,
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(current);
      occurrences.push(`${displayStr} IST`);
    }

    current.setTime(current.getTime() + 60000);
  }

  return occurrences;
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
  // In cron 7 is also Sunday
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
