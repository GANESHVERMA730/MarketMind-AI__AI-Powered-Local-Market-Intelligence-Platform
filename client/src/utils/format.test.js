import { describe, expect, it } from 'vitest';
import { formatCurrency, formatDate, formatDateTime } from './format';

describe('display formatters', () => {
  it('formats API money values in INR', () => {
    expect(formatCurrency(1234.5)).toContain('1,234.50');
    expect(formatCurrency(null)).toContain('0.00');
  });

  it('handles valid and invalid date values', () => {
    expect(formatDate('not-a-date')).toBe('—');
    expect(formatDateTime(null)).toBe('—');
    expect(formatDate('2026-01-05T00:00:00.000Z')).not.toBe('—');
  });
});
