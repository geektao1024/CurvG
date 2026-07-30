const encoder = new TextEncoder();
const idPattern = /^[A-Za-z0-9-]{1,80}$/;

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function payload(id: string, jobId: string, expires: number): string {
  if (!idPattern.test(id) || !idPattern.test(jobId)) {
    throw new Error('Invalid animation artifact identity');
  }
  if (!Number.isSafeInteger(expires) || expires <= 0) {
    throw new Error('Invalid animation artifact expiry');
  }
  return `curvg-review-artifact-v1\n${id}\n${jobId}\n${expires}`;
}

async function signature(
  secret: string,
  id: string,
  jobId: string,
  expires: number
): Promise<string> {
  if (secret.length < 16) throw new Error('Artifact signing secret is invalid');
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const digest = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload(id, jobId, expires))
  );
  return base64Url(new Uint8Array(digest));
}

export async function signAnimationReviewArtifact(params: {
  secret: string;
  id: string;
  jobId: string;
  expires: number;
}): Promise<string> {
  return signature(params.secret, params.id, params.jobId, params.expires);
}

export async function verifyAnimationReviewArtifact(params: {
  secret: string;
  id: string;
  jobId: string;
  expires: number;
  signature: string;
  now?: number;
  maxFutureMs?: number;
}): Promise<boolean> {
  const now = params.now ?? Date.now();
  const maxFutureMs = params.maxFutureMs ?? 10 * 60_000;
  if (
    !Number.isSafeInteger(params.expires) ||
    params.expires < now ||
    params.expires > now + maxFutureMs ||
    !/^[A-Za-z0-9_-]{43}$/.test(params.signature)
  ) {
    return false;
  }
  let expected: string;
  try {
    expected = await signature(
      params.secret,
      params.id,
      params.jobId,
      params.expires
    );
  } catch {
    return false;
  }
  let difference = expected.length ^ params.signature.length;
  const length = Math.max(expected.length, params.signature.length);
  for (let index = 0; index < length; index += 1) {
    difference |=
      (expected.charCodeAt(index) || 0) ^
      (params.signature.charCodeAt(index) || 0);
  }
  return difference === 0;
}
