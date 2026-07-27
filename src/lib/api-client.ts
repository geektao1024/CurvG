// Typed client for the app's REST endpoints (src/routes/api/**).
// Unwraps the resp.ts envelope: { code: 0 | -1, message, data? }.

export class ApiError extends Error {
  constructor(
    public code: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface PageResult<T> {
  items: T[];
  total: number;
}

export interface PageParams {
  page: number;
  pageSize: number;
  search?: string;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  const json = await res
    .json()
    .catch(() => ({ code: -1, message: res.statusText || 'Request failed' }));
  if (json.code !== 0) {
    throw new ApiError(
      json.code ?? -1,
      json.message || 'Request failed',
      json.data
    );
  }
  // respOk() omits data entirely — callers expecting void get undefined.
  return json.data as T;
}

export const apiGet = <T>(url: string, init?: RequestInit) =>
  request<T>(url, init);

export async function apiGetBlob(
  url: string,
  init?: RequestInit
): Promise<Blob> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const json = await response
      .json()
      .catch(() => ({ code: -1, message: response.statusText }));
    throw new ApiError(
      json.code ?? -1,
      json.message || 'File request failed',
      json.data
    );
  }
  return response.blob();
}

export const apiPost = <T = void>(url: string, body?: unknown) =>
  request<T>(url, {
    method: 'POST',
    body: body == null ? undefined : JSON.stringify(body),
  });

export async function apiPostEventStream<T>(
  url: string,
  body: unknown,
  onEvent: (event: T) => void
): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || !contentType.includes('text/event-stream')) {
    const json = await response
      .json()
      .catch(() => ({ code: -1, message: response.statusText }));
    throw new ApiError(
      json.code ?? -1,
      json.message || 'Streaming request failed',
      json.data
    );
  }
  if (!response.body) throw new ApiError(-1, 'Streaming response is empty');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const consumeBlock = (block: string) => {
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n');
    if (!data) return;
    onEvent(JSON.parse(data) as T);
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    let boundary = buffer.match(/\r?\n\r?\n/);
    while (boundary?.index !== undefined) {
      consumeBlock(buffer.slice(0, boundary.index));
      buffer = buffer.slice(boundary.index + boundary[0].length);
      boundary = buffer.match(/\r?\n\r?\n/);
    }
    if (done) break;
  }
  if (buffer.trim()) consumeBlock(buffer);
}

export const apiPut = <T = void>(url: string, body?: unknown) =>
  request<T>(url, { method: 'PUT', body: JSON.stringify(body) });

export const apiPatch = <T = void>(url: string, body?: unknown) =>
  request<T>(url, { method: 'PATCH', body: JSON.stringify(body) });

export const apiDelete = <T = void>(url: string) =>
  request<T>(url, { method: 'DELETE' });

// Query-string builder for paginated list endpoints.
export function pageQuery(base: string, p: PageParams) {
  const params = new URLSearchParams({
    page: String(p.page),
    pageSize: String(p.pageSize),
  });
  if (p.search) params.set('search', p.search);
  return `${base}?${params}`;
}
