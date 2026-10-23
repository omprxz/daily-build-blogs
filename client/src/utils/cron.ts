import cronstrue from 'cronstrue';

export interface CronValidationResult {
  isValid: boolean;
  error?: string;
  explanation?: string;
  nextOccurrences?: string[];
}

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
      error: 'Cron expression cannot be empty. Expects 5 fields: minute hour day-of-month month day-of-week.',
    };
  }

  const parts = trimmed.split(' ');
  if (parts.length !== 5) {
    return {
      isValid: false,
      error: `Expected 5 fields, but received ${parts.length}. Format: minute (0-59) hour (0-23) day (1-31) month (1-12) weekday (0-6).`,
    };
  }

  const [minPart, hourPart, domPart, monthPart, dowPart] = parts;

  const minValid = validateField(minPart, 0, 59);
  if (!minValid.valid) return { isValid: false, error: `Invalid minute '${minPart}': ${minValid.error}` };

  const hourValid = validateField(hourPart, 0, 23);
  if (!hourValid.valid) return { isValid: false, error: `Invalid hour '${hourPart}': ${hourValid.error}` };

  const domValid = validateField(domPart, 1, 31);
  if (!domValid.valid) return { isValid: false, error: `Invalid day-of-month '${domPart}': ${domValid.error}` };

  const monthValid = validateField(monthPart, 1, 12);
  if (!monthValid.valid) return { isValid: false, error: `Invalid month '${monthPart}': ${monthValid.error}` };

  const dowValid = validateField(dowPart, 0, 7);
  if (!dowValid.valid) return { isValid: false, error: `Invalid weekday '${dowPart}': ${dowValid.error}` };

  let explanation = '';
  try {
    explanation = `${cronstrue.toString(trimmed, { use24HourTimeFormat: false })} (${timeZone}).`;
  } catch {
    explanation = explainCronExpression(parts);
  }
  const nextOccurrences = getNextCronOccurrences(parts, timeZone, count);

  return {
    isValid: true,
    explanation,
    nextOccurrences,
  };
}

function validateField(part: string, min: number, max: number): { valid: boolean; error?: string } {
  if (part === '*') return { valid: true };

  if (part.startsWith('*/')) {
    const step = Number(part.slice(2));
    if (isNaN(step) || step < 1 || step > max) return { valid: false, error: `Step must be between 1 and ${max}` };
    return { valid: true };
  }

  const items = part.split(',');
  for (const item of items) {
    if (item.includes('-')) {
      const [rangeStr, stepStr] = item.split('/');
      const [startStr, endStr] = rangeStr.split('-');
      const start = Number(startStr);
      const end = Number(endStr);
      if (isNaN(start) || isNaN(end) || start < min || end > max || start > end) {
        return { valid: false, error: `Range ${item} outside valid bounds (${min}-${max})` };
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
  try {
    return `${cronstrue.toString(parts.join(' '), { use24HourTimeFormat: false })} (Asia/Kolkata).`;
  } catch {
    // fallback to custom parser below
  }

  const [min, hour, dom, month, dow] = parts;

  if (min === '*' && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    return 'Every minute, every day.';
  }

  if (min.startsWith('*/') && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    const step = min.slice(2);
    return `Every ${step} minutes.`;
  }

  if (!min.includes('*') && !min.includes('/') && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    return `Every hour at minute ${min}.`;
  }

  if (hour.startsWith('*/') && dom === '*' && month === '*' && dow === '*') {
    const step = hour.slice(2);
    const minuteText = min === '0' ? 'the hour mark' : `minute ${min}`;
    return `Every ${step} hours at ${minuteText}.`;
  }

  if (!min.includes('*') && !min.includes('/') && !hour.includes('*') && !hour.includes('/') && dom === '*' && month === '*' && dow === '*') {
    const h = Number(hour);
    const m = Number(min);
    if (!isNaN(h) && !isNaN(m)) {
      return `Every day at ${formatHourMinute(h, m)}.`;
    }
  }

  if (dow !== '*' && dom === '*' && month === '*') {
    const h = Number(hour);
    const m = Number(min);
    const timeText = !isNaN(h) && !isNaN(m) ? ` at ${formatHourMinute(h, m)}` : '';

    if (dow === '1-5') {
      return `Every weekday (Monday to Friday)${timeText}.`;
    }
    if (dow === '0,6' || dow === '6,0' || dow === '7,6' || dow === '6,7') {
      return `Every weekend (Saturday & Sunday)${timeText}.`;
    }

    const dows = dow.split(',').map((d) => {
      const idx = Number(d) % 7;
      return WEEKDAY_NAMES[idx] || d;
    });
    return `Every week on ${dows.join(', ')}${timeText}.`;
  }

  if (dom !== '*' && month === '*' && dow === '*') {
    const h = Number(hour);
    const m = Number(min);
    const timeText = !isNaN(h) && !isNaN(m) ? ` at ${formatHourMinute(h, m)}` : '';
    return `On day ${dom} of every month${timeText}.`;
  }

  let desc = '';
  if (min.startsWith('*/')) desc += `Every ${min.slice(2)} mins`;
  else if (min === '*') desc += 'Every min';
  else desc += `At min ${min}`;

  if (hour.startsWith('*/')) desc += `, every ${hour.slice(2)} hrs`;
  else if (hour !== '*') desc += `, at ${hour}:00`;

  if (dom !== '*') desc += `, on day ${dom}`;
  if (month !== '*') desc += `, in month ${month}`;
  if (dow !== '*') desc += `, on weekday ${dow}`;

  return `${desc} (Asia/Kolkata).`;
}

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

const IST_OUTPUT_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

export function getNextCronOccurrences(
  parts: string[],
  timeZone: string = 'Asia/Kolkata',
  count: number = 3
): string[] {
  const occurrences: string[] = [];
  const now = new Date();
  let currentMs = now.getTime() + 60000;
  currentMs = Math.floor(currentMs / 60000) * 60000;

  // Max 14 days of minute checks (20,160 minutes) - runs in ~0.2ms with pure integer math
  const maxChecks = 14 * 24 * 60;
  let checks = 0;

  while (occurrences.length < count && checks < maxChecks) {
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
      occurrences.push(`${IST_OUTPUT_FORMATTER.format(new Date(currentMs))} IST`);
    }

    currentMs += 60000;
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
