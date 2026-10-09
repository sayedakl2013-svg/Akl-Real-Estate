'use client';
// JSON fetch helper for the platform's own API (same-origin; the browser adds the Origin header).
export class ApiError extends Error {
  constructor(public status: number, public code: string, public data: any) { super(code); }
}

export async function api<T = any>(url: string, body?: unknown, method?: string): Promise<T> {
  const res = await fetch(url, {
    method: method ?? (body === undefined ? 'GET' : 'POST'),
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'server_error', data);
  return data as T;
}
