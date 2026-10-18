/** Removes credentials and bearer tokens from anything the suite logs or attaches. */
const SECRET_KEYS = /^(password|password_confirmation|token|accessToken|refreshToken|plainTextToken|twoFactorToken|authorization|default_password)$/i;

export function redact<T>(value: T, depth = 0): T {
  if (depth > 12) return '[depth-limit]' as unknown as T;
  if (typeof value === 'string') {
    return value
      .replace(/Bearer\s+[A-Za-z0-9|._~+/=-]+/g, 'Bearer [REDACTED]')
      .replace(/\b\d+\|[A-Za-z0-9]{20,}\b/g, '[REDACTED_SANCTUM_TOKEN]') as unknown as T;
  }
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SECRET_KEYS.test(k) ? '[REDACTED]' : redact(v, depth + 1);
    }
    return out as T;
  }
  return value;
}
