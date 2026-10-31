import { badRequest, capability } from '../error.js';

export const requiredString = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.length === 0) badRequest({ field, rule: 'required' });

  return value as string;
};

export const optionalString = (
  value: unknown,
  field: string,
  maxLength = 255,
): string | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') badRequest({ field, rule: 'string' });

  const result = value as string;

  if (result.length > maxLength) badRequest({ field, rule: 'maxLength', max: maxLength });

  return result;
};

export const optionalId = (value: unknown, field: string): string | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) {
    return String(value);
  }
  if (typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/u.test(value)) return value;

  badRequest({ field, rule: 'id' });
};

export const optionalStringArray = (value: unknown, field: string): string[] => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    badRequest({ field, rule: 'string' });
  }

  return value as string[];
};

export const counterType = (value: unknown): string => {
  const type = optionalString(value, 'type', 32) ?? 'time';

  if (!/^[A-Za-z][A-Za-z0-9_]*$/u.test(type)) badRequest({ field: 'type' });

  return type;
};

export const positiveInt = (
  value: unknown,
  fallback: number,
  max = Number.MAX_SAFE_INTEGER,
): number => {
  if (value === undefined) return fallback;

  const result = Number(value);

  if (!Number.isInteger(result) || result < 1 || result > max) {
    badRequest({ rule: 'int', max });
  }

  return result;
};

export const requiredCapability = <T>(value: T | undefined, name: string): T =>
  value ?? capability(name);

export const levelFor = (levels: number[], count?: number): number => {
  let result = 0;

  if (!count) {
    return result;
  }

  for (let index = 0; index < levels.length; index += 1) {
    if (levels[index] <= count) result = index;
  }

  return result;
};
