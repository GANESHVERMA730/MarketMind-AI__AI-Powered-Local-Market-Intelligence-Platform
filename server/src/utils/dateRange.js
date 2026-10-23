const { ApiError } = require('./ApiError');

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function parseDateInput(value, label) {
  if (!value) {
    return null;
  }

  const datePart = value.match(/^(\d{4}-\d{2}-\d{2})(?:T|$)/);
  if (datePart) {
    const calendarDate = new Date(`${datePart[1]}T00:00:00.000Z`);
    if (
      Number.isNaN(calendarDate.getTime()) ||
      calendarDate.toISOString().slice(0, 10) !== datePart[1]
    ) {
      throw new ApiError(400, `${label} is not a valid date`);
    }
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return parsed;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, `${label} is not a valid date`);
  }
  return parsed;
}

function resolveDateRange({ preset, from, to } = {}) {
  const today = startOfUtcDay(new Date());
  const tomorrow = addUtcDays(today, 1);
  const selected = preset || (from || to ? 'custom' : 'month');

  if (selected === 'day') {
    return { preset: 'day', from: today, to: tomorrow };
  }

  if (selected === 'week') {
    return { preset: 'week', from: addUtcDays(today, -6), to: tomorrow };
  }

  if (selected === 'month') {
    return { preset: 'month', from: addUtcDays(today, -29), to: tomorrow };
  }

  if (selected !== 'custom') {
    throw new ApiError(400, 'preset must be day, week, month, or custom');
  }

  const start = parseDateInput(from, 'from');
  const endInput = parseDateInput(to, 'to');
  if (!start || !endInput) {
    throw new ApiError(400, 'from and to are required when preset=custom');
  }

  const endExclusive = /^\d{4}-\d{2}-\d{2}$/.test(to) ? addUtcDays(startOfUtcDay(endInput), 1) : endInput;

  if (start >= endExclusive) {
    throw new ApiError(400, 'from must be earlier than to');
  }

  return { preset: 'custom', from: start, to: endExclusive };
}

function toDateKey(date) {
  return startOfUtcDay(date).toISOString().slice(0, 10);
}

module.exports = {
  resolveDateRange,
  toDateKey,
  startOfUtcDay,
  addUtcDays,
};
