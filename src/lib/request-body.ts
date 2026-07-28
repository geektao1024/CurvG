/** Error raised when an inbound request body exceeds its route-specific cap. */
export class RequestBodyTooLargeError extends Error {
  readonly maxBytes: number;

  constructor(maxBytes: number) {
    super('Request body is too large');
    this.name = 'RequestBodyTooLargeError';
    this.maxBytes = maxBytes;
  }
}

// Keep these intentionally small: these routes accept prompts, status updates,
// checkout selections, or provider events — never user-uploaded files.
export const REQUEST_BODY_LIMITS = {
  animationCreate: 32 * 1024,
  animationMessage: 32 * 1024,
  animationApprove: 4 * 1024,
  animationSpec: 96 * 1024,
  animationAction: 8 * 1024,
  renderCallback: 16 * 1024,
  paymentCheckout: 8 * 1024,
  subscriptionCancel: 4 * 1024,
  paymentWebhook: 1024 * 1024,
} as const;

export function isRequestBodyTooLargeError(
  error: unknown
): error is RequestBodyTooLargeError {
  return error instanceof RequestBodyTooLargeError;
}

function declaredLengthExceeds(request: Request, maxBytes: number): boolean {
  const value = request.headers.get('content-length');
  if (!value) return false;

  const length = Number(value);
  return Number.isSafeInteger(length) && length >= 0 && length > maxBytes;
}

/**
 * Reads the original request bytes while enforcing a hard cap. Content-Length
 * is only an early optimization: chunked and dishonest requests are checked as
 * their bytes arrive too. The returned bytes are suitable for webhook signing.
 */
export async function readRequestBodyCapped(
  request: Request,
  maxBytes: number
): Promise<Uint8Array> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
    throw new RangeError('maxBytes must be a non-negative safe integer');
  }
  if (declaredLengthExceeds(request, maxBytes)) {
    throw new RequestBodyTooLargeError(maxBytes);
  }
  if (!request.body) return new Uint8Array();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new RequestBodyTooLargeError(maxBytes);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function readJsonBodyCapped<T>(
  request: Request,
  maxBytes: number
): Promise<T> {
  const bytes = await readRequestBodyCapped(request, maxBytes);
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

/**
 * Rebuilds a Request after a capped byte read. This deliberately uses the
 * untouched bytes (rather than parsed/re-serialized JSON) so webhook
 * providers receive the exact signed payload.
 */
export function requestWithRawBody(
  request: Request,
  bytes: Uint8Array
): Request {
  const body = bytes.byteLength
    ? (bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength
      ) as ArrayBuffer)
    : undefined;
  return new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body,
    signal: request.signal,
  });
}
