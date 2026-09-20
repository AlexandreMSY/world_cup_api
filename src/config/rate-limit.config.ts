import { isIP } from 'node:net';

export const RATE_LIMIT = {
  limit: 100,
  ttl: 60_000,
} as const;

const trustedProxyAliases = new Set(['loopback', 'linklocal', 'uniquelocal']);

function isTrustedAddress(value: string): boolean {
  if (trustedProxyAliases.has(value)) {
    return true;
  }

  const [address, prefix, extra] = value.split('/');
  const ipVersion = isIP(address);

  if (extra !== undefined || ipVersion === 0) {
    return false;
  }

  if (prefix === undefined) {
    return true;
  }

  if (!/^\d+$/.test(prefix)) {
    return false;
  }

  const prefixLength = Number(prefix);
  const maximumPrefixLength = ipVersion === 4 ? 32 : 128;

  return prefixLength <= maximumPrefixLength;
}

export function parseTrustProxy(
  value: string | undefined,
): false | number | string[] {
  const normalizedValue = value?.trim();

  if (!normalizedValue || normalizedValue.toLowerCase() === 'false') {
    return false;
  }

  if (/^\d+$/.test(normalizedValue)) {
    const hops = Number(normalizedValue);

    if (hops > 0) {
      return hops;
    }
  }

  const addresses = normalizedValue
    .split(',')
    .map((address) => address.trim())
    .filter(Boolean);

  if (
    addresses.length === 0 ||
    addresses.some((address) => !isTrustedAddress(address))
  ) {
    throw new Error(
      'TRUST_PROXY must be false, a positive hop count, or trusted IP/CIDR values',
    );
  }

  return addresses;
}
