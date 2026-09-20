import { parseTrustProxy, RATE_LIMIT } from './rate-limit.config.js';

describe('rate limit configuration', () => {
  it('uses the central 100 requests per minute policy', () => {
    expect(RATE_LIMIT).toEqual({ limit: 100, ttl: 60_000 });
  });

  it('disables proxy trust by default', () => {
    expect(parseTrustProxy(undefined)).toBe(false);
    expect(parseTrustProxy('false')).toBe(false);
  });

  it('accepts proxy hop counts and explicit address lists', () => {
    expect(parseTrustProxy('2')).toBe(2);
    expect(parseTrustProxy('loopback, 10.0.0.0/8')).toEqual([
      'loopback',
      '10.0.0.0/8',
    ]);
  });

  it.each(['true', '0', '10.0.0.0/99', 'not-a-proxy'])(
    'rejects unsafe values: %s',
    (value) => {
      expect(() => parseTrustProxy(value)).toThrow('TRUST_PROXY must');
    },
  );
});
