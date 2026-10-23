import { describe, expect, it } from 'vitest';
import { getApiError } from './http';

describe('API error messages', () => {
  it('uses validation details returned by Express', () => {
    expect(getApiError({
      response: { data: { errors: [{ message: 'Name is required' }, { message: 'SKU is invalid' }] } },
    })).toBe('Name is required. SKU is invalid');
  });

  it('uses the backend message or an explicit network message', () => {
    expect(getApiError({ response: { data: { message: 'Not enough stock' } } })).toBe('Not enough stock');
    expect(getApiError({ message: 'Network Error' })).toBe('Network Error');
  });
});
