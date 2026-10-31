/* oxlint-disable vitest/max-expects, vitest/require-to-throw-message */
import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  assertSafeData,
  assertSafeWhereKey,
  assertSafeWhereValue,
} = require('../src/service/storage/guard.js');

describe('storage input guard', () => {
  it('accepts scalar values and supported where operators', () => {
    expect(() => assertSafeWhereValue('mail@example.com', 'mail')).not.toThrow();
    expect(() => assertSafeWhereValue(null, 'mail')).not.toThrow();
    expect(() => assertSafeWhereValue(undefined, 'mail')).not.toThrow();
    expect(() => assertSafeWhereValue(['IN', ['/a', '/b']], 'url')).not.toThrow();
    expect(() => assertSafeWhereValue(['NOT IN', ['waiting', 'spam']], 'status')).not.toThrow();
    expect(() => assertSafeWhereValue(['>', new Date()], 'insertedAt')).not.toThrow();
    expect(() => assertSafeWhereValue(['!=', 'u1'], 'objectId')).not.toThrow();
    expect(() => assertSafeWhereValue(['LIKE', '%keyword%'], 'comment')).not.toThrow();
    expect(() => assertSafeWhereValue([1, 2, 3], 'id')).not.toThrow();
    expect(() => assertSafeWhereValue(['IN', []], 'url')).not.toThrow();
  });

  it('rejects raw expressions and nested condition arrays', () => {
    expect(() => assertSafeWhereValue(['exp', '= (SELECT 1)'], 'mail')).toThrow(/raw expressions/u);
    expect(() => assertSafeWhereValue([['exp', '= (SELECT 1)']], 'mail')).toThrow(
      /nested condition/u,
    );
    expect(() => assertSafeWhereValue(['IN', ['a', ['exp', 'x']]], 'url')).toThrow();
    expect(() => assertSafeWhereValue(['IN', [{ nested: true }]], 'url')).toThrow();
    expect(() => assertSafeWhereValue({ gt: 1 }, 'id')).toThrow(/scalar or operator/u);
    expect(() => assertSafeWhereValue(['UNKNOWN', 1], 'id')).toThrow(/unsupported where/u);
    expect(() => assertSafeWhereValue(['IN'], 'id')).toThrow(/missing where operand/u);
  });

  it('rejects unsafe field names and raw where keys', () => {
    expect(() => assertSafeWhereKey('mail')).not.toThrow();
    expect(() => assertSafeWhereKey('_complex')).not.toThrow();
    expect(() => assertSafeWhereKey('_logic')).not.toThrow();
    expect(() => assertSafeWhereKey('2fa')).not.toThrow();
    expect(() => assertSafeWhereKey('_string')).toThrow(/unsupported where key/u);
    expect(() => assertSafeWhereKey('_query')).toThrow(/unsupported where key/u);
    expect(() => assertSafeWhereKey('_multi')).toThrow(/unsupported where key/u);
    expect(() => assertSafeWhereKey('mail; DROP TABLE wl_users')).toThrow(/invalid field/u);
    expect(() => assertSafeWhereKey('__proto__')).toThrow(/invalid field/u);
  });

  it('only accepts scalar model data with safe field names', () => {
    expect(() =>
      assertSafeData({
        mail: 'mail@example.com',
        like: 1,
        active: true,
        missing: undefined,
        createdAt: new Date(),
      }),
    ).not.toThrow();
    expect(() => assertSafeData({ mail: [['exp', '= (SELECT 1)']] })).toThrow();
    expect(() => assertSafeData({ nested: { value: 1 } })).toThrow(/scalar/u);
    expect(() => assertSafeData({ 'bad field': 'x' })).toThrow(/invalid field/u);
    expect(() => assertSafeData(JSON.parse('{"__proto__":"x"}'))).toThrow(/invalid field/u);
    expect(() => assertSafeData([])).toThrow(/expected an object/u);
  });
});
