import crypto from "crypto";

/**
 * Generate a cryptographically secure random string for PKCE
 */
export function generateRandomString(length: number = 43): string {
  const buffer = crypto.randomBytes(length);
  return base64URLEncode(buffer);
}

/**
 * Base64 URL encode without padding
 */
function base64URLEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate a code verifier for PKCE
 */
export function generateCodeVerifier(): string {
  return generateRandomString(43);
}

/**
 * Generate a code challenge from a code verifier for PKCE
 */
export function generateCodeChallenge(verifier: string): string {
  const hash = crypto
    .createHash('sha256')
    .update(verifier)
    .digest();
  return base64URLEncode(hash);
}

/**
 * Generate a state parameter for OAuth CSRF protection
 */
export function generateState(): string {
  return generateRandomString(32);
}
