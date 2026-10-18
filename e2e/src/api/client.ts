import { randomUUID } from 'node:crypto';
import { request as pwRequest, type APIRequestContext } from '@playwright/test';
import { redact } from '../redact';

export interface ApiResult<T = any> {
  status: number;
  body: T;
  /** Normalised error code across the three envelopes the backend emits. */
  code?: string;
}

/**
 * The backend emits three error shapes (verified at 289fe09):
 *  - Admin AsabException:      { error: { code, message, messageAr } }
 *  - Legacy/handover services: { success:false, message, code, errors? }
 *  - Uncaught Symfony HTTP:    { message: "CODE" }
 */
export function errorCode(body: any): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  if (typeof body.error?.code === 'string') return body.error.code;
  if (typeof body.code === 'string') return body.code;
  if (typeof body.message === 'string' && /^[A-Z][A-Z0-9_]+$/.test(body.message)) return body.message;
  return undefined;
}

/** Flattened validation messages (for 422 assertions such as ALLOCATION_INCOMPLETE). */
export function validationMessages(body: any): string[] {
  const errs = body?.errors ?? body?.error?.details;
  if (!errs || typeof errs !== 'object') return [];
  return Object.values(errs).flat().map(String);
}

export class ApiClient {
  private constructor(private readonly ctx: APIRequestContext, private token?: string) {}

  static async create(apiOrigin: string): Promise<ApiClient> {
    const ctx = await pwRequest.newContext({
      baseURL: `${apiOrigin}/api/v1/`,
      extraHTTPHeaders: { Accept: 'application/json', 'Accept-Language': 'en' },
      ignoreHTTPSErrors: false,
    });
    return new ApiClient(ctx);
  }

  withToken(token: string): this {
    this.token = token;
    return this;
  }

  get hasToken(): boolean {
    return Boolean(this.token);
  }

  private headers(idempotency?: string | true): Record<string, string> {
    const h: Record<string, string> = {};
    if (this.token) h.Authorization = `Bearer ${this.token}`;
    if (idempotency) h['Idempotency-Key'] = idempotency === true ? randomUUID() : idempotency;
    return h;
  }

  async call<T = any>(method: 'GET' | 'POST' | 'PUT' | 'PATCH', path: string, opts: { data?: unknown; params?: Record<string, string | number>; idempotency?: string | true } = {}): Promise<ApiResult<T>> {
    const res = await this.ctx.fetch(path.replace(/^\//, ''), {
      method,
      headers: this.headers(opts.idempotency),
      data: opts.data,
      params: opts.params,
      failOnStatusCode: false,
      maxRedirects: 0,
    });
    const text = await res.text();
    let body: any = text;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      /* non-JSON body (e.g. HTML 500) is kept as text */
    }
    return { status: res.status(), body, code: res.ok() ? undefined : errorCode(body) };
  }

  get<T = any>(path: string, params?: Record<string, string | number>) {
    return this.call<T>('GET', path, { params });
  }

  post<T = any>(path: string, data?: unknown, idempotency?: string | true) {
    return this.call<T>('POST', path, { data: data ?? {}, idempotency });
  }

  async dispose(): Promise<void> {
    await this.ctx.dispose();
  }
}

/** Short, secret-free description of a response for assertion messages. */
export function describe(r: ApiResult): string {
  const body = typeof r.body === 'string' ? r.body.slice(0, 300) : JSON.stringify(redact(r.body))?.slice(0, 600);
  return `HTTP ${r.status}${r.code ? ` ${r.code}` : ''} ${body}`;
}
