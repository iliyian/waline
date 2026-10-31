const SAFE_FIELD = /^[A-Za-z0-9_$]+$/u;
const FORBIDDEN_FIELDS = new Set(['__proto__', 'constructor', 'prototype']);
const SPECIAL_WHERE_KEYS = new Set(['_complex', '_logic']);
const FORBIDDEN_WHERE_KEYS = new Set(['_string', '_query', '_multi']);
const ALLOWED_OPERATORS = new Set([
  'IN',
  'NOT IN',
  '>',
  '>=',
  '<',
  '<=',
  '!=',
  'LIKE',
  'NOT LIKE',
  'ILIKE',
  'NOT ILIKE',
]);

const invalid = (reason, field) => {
  const error = new Error(`INVALID_MODEL_INPUT: ${reason}`);

  error.field = field;
  throw error;
};

const isScalar = (value) =>
  value === null ||
  value === undefined ||
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean' ||
  value instanceof Date ||
  Buffer.isBuffer(value);

const assertScalar = (value, field) => {
  if (!isScalar(value)) invalid('expected a scalar value', field);
};

const assertFieldName = (field) => {
  if (typeof field !== 'string' || FORBIDDEN_FIELDS.has(field) || !SAFE_FIELD.test(field)) {
    invalid('invalid field name', field);
  }
};

const assertSafeWhereKey = (key) => {
  if (FORBIDDEN_WHERE_KEYS.has(key)) invalid('unsupported where key', key);
  if (SPECIAL_WHERE_KEYS.has(key)) return;

  assertFieldName(key);
};

const assertSafeWhereValue = (value, field) => {
  if (isScalar(value)) return;

  if (!Array.isArray(value)) invalid('expected a scalar or operator array', field);
  if (value.length === 0) return;

  const [operator, operand] = value;

  if (
    Array.isArray(operator) ||
    (operator !== null &&
      typeof operator === 'object' &&
      !(operator instanceof Date) &&
      !Buffer.isBuffer(operator))
  ) {
    invalid('nested condition values are not allowed', field);
  }

  if (typeof operator !== 'string') {
    // The ORM accepts a bare array of numbers/dates as an IN list.
    for (const item of value) assertScalar(item, field);
    return;
  }

  const normalized = operator.toUpperCase();

  if (/^exp$/iu.test(normalized)) invalid('raw expressions are not allowed', field);
  if (!ALLOWED_OPERATORS.has(normalized)) invalid('unsupported where operator', field);

  if (operand === undefined) invalid('missing where operand', field);

  if (Array.isArray(operand)) {
    for (const item of operand) assertScalar(item, field);
  } else {
    assertScalar(operand, field);
  }

  for (let index = 2; index < value.length; index += 1) {
    assertScalar(value[index], field);
  }
};

const assertSafeData = (data) => {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    invalid('expected an object');
  }

  for (const field of Object.keys(data)) {
    assertFieldName(field);
    assertScalar(data[field], field);
  }
};

module.exports = { assertSafeData, assertSafeWhereKey, assertSafeWhereValue };
