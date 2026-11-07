/**
 * Default timestamp tolerance: 5 minutes (300,000 milliseconds)
 * Protects against replay attacks.
 */
export const DEFAULT_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000;

/**
 * Constant-time comparison of two hex strings to prevent timing attacks.
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Generates an HMAC-SHA256 signature for a webhook payload and timestamp using standard Web Crypto API.
 * Compatible with Convex runtime and Node.js environments without node:crypto dependencies.
 * Signed content format: `${timestamp}.${payload}`
 */
export async function generateWebhookSignature(
  payload: string,
  secret: string,
  timestamp: number
): Promise<string> {
  if (!secret) {
    throw new Error("HMAC Secret is required to generate webhook signature.");
  }
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const dataToSign = encoder.encode(`${timestamp}.${payload}`);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, dataToSign);
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Validates an incoming webhook request with HMAC-SHA256 and timestamp check.
 * - Enforces constant-time comparison (timingSafeEqualHex)
 * - Verifies timestamp within allowed tolerance window
 * - Rejects tampered payloads or expired timestamps
 */
export async function verifyWebhookSignature({
  payload,
  signatureHeader,
  timestampHeader,
  secret,
  toleranceMs = DEFAULT_TIMESTAMP_TOLERANCE_MS,
  currentTimestamp = Date.now(),
}: {
  payload: string;
  signatureHeader?: string | null;
  timestampHeader?: string | null;
  secret: string;
  toleranceMs?: number;
  currentTimestamp?: number;
}): Promise<{ isValid: boolean; error?: string }> {
  if (!secret) {
    return { isValid: false, error: "Missing webhook verification secret." };
  }

  if (!signatureHeader) {
    return { isValid: false, error: "Missing signature header (X-LendLoop-Signature)." };
  }

  if (!timestampHeader) {
    return { isValid: false, error: "Missing timestamp header (X-LendLoop-Timestamp)." };
  }

  const timestamp = parseInt(timestampHeader, 10);
  if (isNaN(timestamp)) {
    return { isValid: false, error: "Invalid timestamp header format." };
  }

  // Check timestamp freshness
  const age = Math.abs(currentTimestamp - timestamp);
  if (age > toleranceMs) {
    return {
      isValid: false,
      error: `Webhook timestamp expired or outside tolerance (${age}ms > ${toleranceMs}ms).`,
    };
  }

  // Normalize signature header (support "sha256=<hex>" or raw "<hex>")
  const receivedHex = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice(7).trim()
    : signatureHeader.trim();

  // Compute expected signature
  const expectedHex = await generateWebhookSignature(payload, secret, timestamp);

  if (!timingSafeEqualHex(receivedHex.toLowerCase(), expectedHex.toLowerCase())) {
    return { isValid: false, error: "Signature mismatch. Payload may have been modified." };
  }

  return { isValid: true };
}
