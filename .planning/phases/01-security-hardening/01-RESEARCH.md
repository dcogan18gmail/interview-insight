# Phase 01: Security Hardening - Research

**Researched:** 2026-02-07
**Domain:** Web application security, client-side encryption, serverless function hardening, CORS/SSRF protection
**Confidence:** HIGH (most findings verified against official documentation)

## Summary

This phase transforms a prototype with known security vulnerabilities into a hardened, public-facing application using a BYOK (Bring Your Own Key) model. The current codebase has five critical security issues: (1) the Gemini API key is embedded in the client-side JavaScript bundle via Vite `define`, (2) the edge function proxy uses wildcard CORS (`*`), (3) the proxy has no URL validation (SSRF risk), (4) no security headers are configured in `netlify.toml`, and (5) error messages leak raw API errors and stack traces to clients.

The standard approach is: remove the embedded API key entirely, build a settings UI for users to provide their own Gemini API key, encrypt the key in localStorage using Web Crypto API AES-GCM with PBKDF2 key derivation, lock down CORS to the app domain, validate proxy URLs against a Google API allowlist, add comprehensive security headers, sanitize all error responses, and configure Netlify's built-in rate limiting.

**Primary recommendation:** Implement BYOK with Web Crypto AES-GCM encryption, harden the existing serverless proxy functions, and add security headers -- all achievable with zero new dependencies using browser-native APIs and Netlify configuration.

## Standard Stack

### Core

No new libraries are needed. All security features use browser-native APIs and Netlify configuration.

| Technology                    | Version                                       | Purpose                                             | Why Standard                                                                               |
| ----------------------------- | --------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Web Crypto API (SubtleCrypto) | Browser-native                                | AES-GCM encryption of API keys in localStorage      | W3C standard, available in all modern browsers, hardware-accelerated, no dependency needed |
| Netlify Edge Functions Config | `@netlify/edge-functions` (already installed) | CORS restriction, rate limiting                     | Built into Netlify platform, zero additional cost                                          |
| `netlify.toml` `[[headers]]`  | Netlify platform                              | Security headers (CSP, X-Frame-Options, HSTS, etc.) | Official Netlify feature, no build step needed                                             |
| Gemini Models API             | `GET /v1beta/models`                          | Lightweight API key validation                      | Official Google endpoint, minimal token usage                                              |

### Supporting

| Technology                    | Version        | Purpose                                                | When to Use                                  |
| ----------------------------- | -------------- | ------------------------------------------------------ | -------------------------------------------- |
| `TextEncoder` / `TextDecoder` | Browser-native | String to/from ArrayBuffer for crypto operations       | Always, for Web Crypto API string operations |
| `crypto.getRandomValues()`    | Browser-native | Generate cryptographically secure random IVs and salts | Every encryption operation                   |
| `btoa()` / `atob()`           | Browser-native | Base64 encode/decode for localStorage storage          | Storing encrypted binary data as strings     |

### Alternatives Considered

| Instead of                     | Could Use                               | Tradeoff                                                                                                                                                                       |
| ------------------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Web Crypto API (native)        | `crypto-js` npm package                 | crypto-js adds 60KB+ bundle size, is slower (no hardware acceleration), and has had supply chain security incidents. Native Web Crypto is strictly superior for this use case. |
| Netlify built-in rate limiting | Custom rate limiter with Netlify Blobs  | Blobs approach gives more flexibility but adds complexity. Built-in `rateLimit` in config is simpler and sufficient for this use case.                                         |
| PBKDF2 key derivation          | Direct `generateKey()` without password | Without PBKDF2, the encryption key must be stored somewhere accessible, making it extractable. PBKDF2 derives the key from a passphrase that only exists in memory during use. |

**Installation:**

```bash
# No new packages required. All functionality uses:
# - Browser-native Web Crypto API
# - Existing @netlify/edge-functions
# - Existing @netlify/functions
# - netlify.toml configuration
```

## Architecture Patterns

### Recommended Project Structure

New files and modifications needed:

```
src/                          # (note: project currently has no src/ folder; files are at root)
services/
  cryptoService.ts            # NEW: Web Crypto AES-GCM encrypt/decrypt utilities
  geminiService.ts            # MODIFY: Remove build-time API key, use stored key
components/
  Settings.tsx                # NEW: API key entry/management UI
  ApiKeyPrompt.tsx            # NEW: First-time setup prompt (or merged into Settings)
  App.tsx                     # MODIFY: Add settings state, key management flow
netlify/
  functions/
    gemini-upload.ts          # MODIFY: Accept API key from client header (or keep server key for upload proxy)
  edge-functions/
    proxy-upload.ts           # MODIFY: CORS restriction, URL validation
netlify.toml                  # MODIFY: Add security headers
vite.config.ts                # MODIFY: Remove API key injection
```

### Pattern 1: BYOK API Key Flow

**What:** User provides their own Gemini API key, which is validated, encrypted, and stored in localStorage. The key is decrypted in memory only when needed for API calls.

**When to use:** Always -- this is the core security pattern for the app.

**Flow:**

```
1. User enters API key in Settings page
2. App validates key via GET https://generativelanguage.googleapis.com/v1beta/models?key=KEY
3. If valid: encrypt with Web Crypto AES-GCM -> store ciphertext + salt + IV in localStorage
4. On app load: check localStorage for encrypted key
5. When API call needed: decrypt key in memory, use it, reference drops after use
6. Key never appears in source code, build artifacts, or network logs (HTTPS encrypts query params in transit)
```

### Pattern 2: Web Crypto AES-GCM Encryption with PBKDF2

**What:** Derive an encryption key from an app-generated passphrase using PBKDF2, then encrypt/decrypt the API key using AES-GCM. Store salt, IV, and ciphertext together in localStorage.

**When to use:** For encrypting the API key before localStorage storage.

**Key design decision -- What is the "password" for PBKDF2?**

Since this is a browser-only app with no user accounts, there is no user password to derive from. The options are:

1. **App-generated random passphrase stored in a separate localStorage key** -- This provides defense-in-depth: an attacker would need to understand the storage layout to reconstruct the key. The passphrase and encrypted data are stored under different keys.
2. **Hardcoded app-level secret** -- Provides obfuscation but the secret is in the source code. Better than plaintext but not truly secure.
3. **User-provided passphrase** -- Most secure but adds friction (user must remember another password).

**Recommendation:** Use option 1 (app-generated random passphrase). This matches the stated requirement (SEC-02: "API key is encrypted before storing in localStorage") and provides meaningful protection against casual inspection while acknowledging that determined attackers with full browser access can eventually extract the key (this is the accepted tradeoff documented in the project's STATE.md).

**Example (TypeScript):**

```typescript
// Source: MDN Web Crypto API docs + verified patterns

// --- Key Derivation ---
async function deriveKey(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false, // not extractable
    ['encrypt', 'decrypt']
  );
}

// --- Encryption ---
async function encryptApiKey(
  apiKey: string,
  passphrase: string
): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(apiKey)
  );

  // Concatenate salt + iv + ciphertext, then base64 encode
  const combined = new Uint8Array(
    salt.length + iv.length + new Uint8Array(ciphertext).length
  );
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

  return btoa(String.fromCharCode(...combined));
}

// --- Decryption ---
async function decryptApiKey(
  storedData: string,
  passphrase: string
): Promise<string> {
  const dec = new TextDecoder();
  const combined = new Uint8Array(
    atob(storedData)
      .split('')
      .map((c) => c.charCodeAt(0))
  );

  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ciphertext = combined.slice(28);
  const key = await deriveKey(passphrase, salt);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return dec.decode(plaintext);
}
```

**Source:** [MDN SubtleCrypto.deriveKey()](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey), [MDN SubtleCrypto.encrypt()](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt)

### Pattern 3: CORS Restriction in Edge Functions

**What:** Replace wildcard `*` CORS with dynamic origin checking against an allowlist.

**When to use:** In the `proxy-upload` edge function and any future edge functions.

**Example:**

```typescript
// Source: Netlify CORS documentation + standard pattern

const ALLOWED_ORIGINS = [
  'https://celebrated-selkie-3cbc3b.netlify.app',
  'http://localhost:3000', // for development
  'http://localhost:8888', // for netlify dev
];

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin);

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, X-Upload-Url, Content-Range, X-Goog-Upload-Command, X-Goog-Upload-Offset',
    Vary: 'Origin', // Required when CORS varies by origin
  };
}
```

**Source:** [Netlify CORS Support Guide](https://answers.netlify.com/t/support-guide-handling-cors-on-netlify/107739)

### Pattern 4: SSRF Prevention via URL Allowlist

**What:** Validate the `X-Upload-Url` header in the proxy edge function to ensure it only points to Google's Generative Language API.

**When to use:** Before every proxied request in `proxy-upload.ts`.

**Example:**

```typescript
// Source: OWASP SSRF Prevention Cheat Sheet

function isAllowedUploadUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'generativelanguage.googleapis.com' &&
      parsed.pathname.startsWith('/upload/')
    );
  } catch {
    return false;
  }
}

// Usage in edge function:
const uploadUrl = request.headers.get('X-Upload-Url');
if (!uploadUrl || !isAllowedUploadUrl(uploadUrl)) {
  return new Response('Invalid upload URL', { status: 400 });
}
```

**Source:** [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)

### Pattern 5: Netlify Security Headers

**What:** Configure security headers via `netlify.toml` `[[headers]]` section.

**When to use:** Applied globally to all responses.

**Example (netlify.toml):**

```toml
[[headers]]
  for = "/*"

  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
    Content-Security-Policy = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://generativelanguage.googleapis.com; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
```

**Source:** [Netlify Security Headers Best Practices](https://answers.netlify.com/t/security-focused-headers-for-netlify-sites-best-practices/27614), [Netlify CSP Documentation](https://docs.netlify.com/manage/security/content-security-policy/)

**CSP Notes for this app:**

- `style-src 'unsafe-inline'` is needed because Tailwind CSS injects inline styles
- `https://fonts.googleapis.com` and `https://fonts.gstatic.com` are needed for Google Fonts (loaded in `index.html`)
- `connect-src 'self' https://generativelanguage.googleapis.com` allows the client-side Gemini SDK calls and the proxy function calls
- `frame-ancestors 'none'` replaces X-Frame-Options for modern browsers

### Pattern 6: Rate Limiting via Netlify Config

**What:** Add rate limiting to serverless functions using the `rateLimit` property in the exported `config` object.

**When to use:** On `gemini-upload` function and `proxy-upload` edge function.

**Important:** Rate limiting requires the `config` export with a `path` property. The current `gemini-upload.ts` uses v1 format (named `handler` export). It needs to either:

- Add a `config` export alongside the `handler` export (if supported), OR
- Migrate to v2 format (default export with `Request`/`Response` API)

**Example for edge function (already v2-compatible):**

```typescript
import type { Config, Context } from '@netlify/edge-functions';

export default async (request: Request, context: Context) => {
  // ... existing proxy logic
};

export const config: Config = {
  path: '/proxy-upload',
  rateLimit: {
    windowLimit: 100,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};
```

**Example for serverless function (v2 format required):**

```typescript
import type { Config, Context } from '@netlify/functions';

export default async (request: Request, context: Context) => {
  // ... upload initiation logic using Request/Response API
};

export const config: Config = {
  path: '/.netlify/functions/gemini-upload',
  rateLimit: {
    windowLimit: 20,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};
```

**Source:** [Netlify Rate Limiting Docs](https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/), [Netlify Rate Limiting AI Blog](https://www.netlify.com/blog/how-to-rate-limit-ai-features-and-avoid-surprise-costs/)

**Constraints:**

- Free plan allows 2 rate limit rules per project (sufficient for 2 functions)
- `windowSize` maximum is 180 seconds
- Rate limits for functions cannot be defined in `netlify.toml` -- must be in function code

### Pattern 7: Gemini API Key Validation

**What:** Validate a user-provided API key by making a lightweight GET request to the Gemini Models endpoint.

**When to use:** When the user submits their API key in the settings page.

**Example:**

```typescript
async function validateGeminiApiKey(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=1`
    );
    return response.ok; // 200 = valid key, 401/403 = invalid
  } catch {
    return false;
  }
}
```

**Source:** [Gemini API Models Endpoint](https://ai.google.dev/api/models)

**Notes:**

- The `pageSize=1` parameter minimizes response size
- A valid key returns 200 with a list of models
- An invalid key returns 400 or similar error
- This is a read-only operation with negligible API usage

### Pattern 8: Error Sanitization

**What:** Return generic error messages to clients while logging detailed errors server-side.

**When to use:** In all serverless functions and edge functions.

**Example:**

```typescript
// BEFORE (current code in gemini-upload.ts line 56):
return {
  statusCode: 500,
  body: `Google API Error (${response.status} ${response.statusText}): ${text}`,
};

// AFTER:
console.error(
  `[gemini-upload] Google API error: ${response.status} ${response.statusText} - ${text}`
);
return {
  statusCode: 500,
  body: JSON.stringify({
    error: 'Failed to initiate upload. Please try again.',
  }),
};

// BEFORE (current code in gemini-upload.ts line 66):
return { statusCode: 500, body: String(error) };

// AFTER:
console.error('[gemini-upload] Unexpected error:', error);
return {
  statusCode: 500,
  body: JSON.stringify({
    error: 'An unexpected error occurred. Please try again.',
  }),
};
```

### Anti-Patterns to Avoid

- **Storing API keys in plaintext localStorage:** Even with BYOK, encrypt before storage. Malicious browser extensions can read plaintext localStorage.
- **Hardcoding API keys in source code or build config:** The current `vite.config.ts` `define` pattern must be completely removed.
- **Wildcard CORS in production:** `Access-Control-Allow-Origin: "*"` allows any website to call your proxy endpoints.
- **Trusting client-provided URLs without validation:** The current proxy forwards any URL from the `X-Upload-Url` header -- classic SSRF vulnerability.
- **Returning raw error objects to clients:** `String(error)` can contain stack traces, file paths, and internal implementation details.
- **Using `crypto-js` when Web Crypto API is available:** Web Crypto is browser-native, hardware-accelerated, and has no supply chain risk.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem        | Don't Build                                | Use Instead                           | Why                                                                                                                    |
| -------------- | ------------------------------------------ | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| AES encryption | Custom encryption scheme                   | Web Crypto API `SubtleCrypto`         | Cryptography is notoriously easy to get wrong. Native API is audited, hardware-accelerated, and standards-compliant.   |
| Rate limiting  | Custom IP tracking with in-memory counters | Netlify's built-in `rateLimit` config | Built into the platform, applied at the edge before function execution, zero additional code.                          |
| CORS handling  | Manual header string building              | Origin allowlist check pattern        | Standard pattern, but must include `Vary: Origin` header for correct caching behavior.                                 |
| Key derivation | Simple hashing (SHA-256 of password)       | PBKDF2 via `SubtleCrypto.deriveKey()` | PBKDF2 is purpose-built for deriving keys from passwords with configurable iteration count for brute-force resistance. |

**Key insight:** This entire phase can be implemented with zero new npm dependencies. Browser-native APIs and Netlify platform features cover every requirement.

## Common Pitfalls

### Pitfall 1: Forgetting the IV or Salt in Storage

**What goes wrong:** Encrypt data but only store the ciphertext. The IV and salt are needed for decryption but are lost.
**Why it happens:** Developers treat IV/salt as temporary.
**How to avoid:** Always concatenate `salt + iv + ciphertext` before storing. Parse them back out on decryption. Use fixed-length prefixes (16 bytes salt, 12 bytes IV) for reliable slicing.
**Warning signs:** Decryption fails immediately after page reload.

### Pitfall 2: Reusing IVs with AES-GCM

**What goes wrong:** Using the same IV twice with the same key completely breaks AES-GCM security -- an attacker can recover the authentication key.
**Why it happens:** Developer generates IV once and stores it globally.
**How to avoid:** Generate a fresh random IV (`crypto.getRandomValues(new Uint8Array(12))`) for every single encryption operation. Since we re-encrypt each time the user saves their key, and store IV alongside ciphertext, this is naturally handled.
**Warning signs:** Same base64 prefix in stored data across multiple save operations.

### Pitfall 3: CSP Breaking the App

**What goes wrong:** Too-restrictive CSP blocks Google Fonts, inline Tailwind styles, or Gemini API connections.
**Why it happens:** Default CSP (`default-src 'self'`) blocks all external resources.
**How to avoid:**

- Test CSP in Report-Only mode first (`Content-Security-Policy-Report-Only` header)
- Include `https://fonts.googleapis.com` in `style-src` and `https://fonts.gstatic.com` in `font-src`
- Include `'unsafe-inline'` in `style-src` for Tailwind (or use nonce-based approach)
- Include `https://generativelanguage.googleapis.com` in `connect-src` for client-side Gemini calls
  **Warning signs:** Console errors about blocked resources, broken fonts, failed API calls.

### Pitfall 4: CORS Caching Issues with Dynamic Origins

**What goes wrong:** CDN caches the CORS response for one origin, then serves the cached (wrong) origin header to requests from a different origin.
**Why it happens:** Missing `Vary: Origin` header.
**How to avoid:** Always include `Vary: Origin` in responses when the `Access-Control-Allow-Origin` value changes based on the request origin.
**Warning signs:** CORS works for the production domain but fails for localhost (or vice versa), intermittently.

### Pitfall 5: API Key Visible in Network Tab

**What goes wrong:** The Gemini API key appears in network request URLs (query parameter `?key=...`).
**Why it happens:** The Gemini API passes the key as a URL query parameter.
**How to avoid:** For the client-side `generateContentStream` calls, the key is passed to the SDK which includes it in requests to Google. This is unavoidable with client-side BYOK -- the user's own key must reach Google's servers. However:

- HTTPS encrypts query parameters in transit
- The key belongs to the user, so visibility in their own DevTools is expected
- The key should NEVER appear in logs, error messages, or server responses
  **Warning signs:** Key appearing in server-side logs or error responses.

### Pitfall 6: Netlify Functions v1/v2 Format Confusion

**What goes wrong:** Rate limiting doesn't work because the function uses v1 `Handler` format without a proper `config` export.
**Why it happens:** The current `gemini-upload.ts` uses v1 format (`export { handler }`). Rate limiting requires a `config` export with a `path` property.
**How to avoid:** Either migrate `gemini-upload.ts` to v2 format (recommended, since we're modifying it anyway), or verify that v1 functions support `config` exports alongside `handler` exports.
**Warning signs:** Rate limiting rules don't appear in deploy logs, unlimited requests get through.

### Pitfall 7: Incomplete Embedded Key Removal

**What goes wrong:** Removing the key from `vite.config.ts` but leaving references to `process.env.API_KEY` in `geminiService.ts`, causing runtime errors.
**Why it happens:** The key injection touches multiple files: `vite.config.ts` (injection), `geminiService.ts` (consumption), and `.env.example` (documentation).
**How to avoid:** Search the entire codebase for `API_KEY`, `GEMINI_API_KEY`, `process.env.API`, and any hardcoded key strings. Update all references to use the new encrypted storage path.
**Warning signs:** App crashes on load with "API Key is missing" error after removing the build-time injection.

## Code Examples

### Complete Settings Component Flow (Pseudocode)

```typescript
// Source: Verified patterns from MDN Web Crypto API docs

// Settings.tsx - API Key entry page
const Settings: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [hasStoredKey, setHasStoredKey] = useState(false);

  useEffect(() => {
    // Check if encrypted key exists in localStorage
    setHasStoredKey(!!localStorage.getItem('gemini_encrypted_key'));
  }, []);

  const handleSaveKey = async () => {
    setIsValidating(true);
    try {
      // 1. Validate key
      const isValid = await validateGeminiApiKey(apiKey);
      if (!isValid) throw new Error('Invalid API key');

      // 2. Encrypt and store
      const passphrase = getOrCreatePassphrase(); // from localStorage
      const encrypted = await encryptApiKey(apiKey, passphrase);
      localStorage.setItem('gemini_encrypted_key', encrypted);

      // 3. Clear plaintext from state
      setApiKey('');
      setHasStoredKey(true);
    } catch (error) {
      // Show user-friendly error
    } finally {
      setIsValidating(false);
    }
  };
};
```

### Complete Error Sanitization Pattern

```typescript
// Source: Standard serverless error handling pattern

// Serverless function error wrapper
function sanitizedResponse(statusCode: number, userMessage: string) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: userMessage }),
  };
}

// Usage in gemini-upload.ts:
try {
  // ... business logic
} catch (error) {
  console.error('[gemini-upload] Error:', error); // Full error logged server-side
  return sanitizedResponse(500, 'Upload failed. Please try again.');
}
```

### Edge Function with CORS + SSRF + Rate Limiting

```typescript
// Combined pattern for proxy-upload.ts
import type { Config, Context } from '@netlify/edge-functions';

const ALLOWED_ORIGINS = [
  'https://celebrated-selkie-3cbc3b.netlify.app',
  'http://localhost:3000',
  'http://localhost:8888',
];

function isAllowedOrigin(origin: string): boolean {
  return ALLOWED_ORIGINS.includes(origin);
}

function isAllowedUploadUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'generativelanguage.googleapis.com' &&
      parsed.pathname.startsWith('/upload/')
    );
  } catch {
    return false;
  }
}

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin : '',
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, X-Upload-Url, Content-Range, X-Goog-Upload-Command, X-Goog-Upload-Offset',
    Vary: 'Origin',
  };
}

export default async (request: Request, context: Context) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(request) });
  }

  if (request.method !== 'PUT') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const uploadUrl = request.headers.get('X-Upload-Url');
  if (!uploadUrl || !isAllowedUploadUrl(uploadUrl)) {
    return new Response('Invalid upload URL', {
      status: 400,
      headers: corsHeaders(request),
    });
  }

  try {
    // ... proxy logic (unchanged)
    const googleResponse = await fetch(uploadUrl, {
      /* ... */
    });
    const responseHeaders = new Headers(googleResponse.headers);
    Object.entries(corsHeaders(request)).forEach(([k, v]) =>
      responseHeaders.set(k, v)
    );
    return new Response(googleResponse.body, {
      status: googleResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('[proxy-upload] Error:', error);
    return new Response(JSON.stringify({ error: 'Proxy error' }), {
      status: 500,
      headers: { ...corsHeaders(request), 'Content-Type': 'application/json' },
    });
  }
};

export const config: Config = {
  path: '/proxy-upload',
  rateLimit: {
    windowLimit: 100,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};
```

## State of the Art

| Old Approach                            | Current Approach                                        | When Changed                                  | Impact                                                                          |
| --------------------------------------- | ------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------- |
| `crypto-js` for client-side encryption  | Web Crypto API (SubtleCrypto)                           | Mature since ~2020, universal browser support | No npm dependency, hardware-accelerated, standards-compliant                    |
| Netlify Functions v1 (`Handler` export) | Functions v2 (default export, Web API Request/Response) | 2024                                          | Required for rate limiting config; cleaner API matching edge functions          |
| Manual rate limiting with state stores  | Netlify built-in `rateLimit` in config                  | 2024                                          | Zero-code rate limiting at the edge, available on free plan                     |
| `X-Frame-Options` header alone          | `frame-ancestors` CSP directive + X-Frame-Options       | Ongoing                                       | CSP `frame-ancestors` is more flexible; X-Frame-Options kept for older browsers |

**Deprecated/outdated:**

- `crypto-js`: Has had security advisories. Web Crypto API is the standard replacement.
- `X-XSS-Protection` header: Deprecated in modern browsers (Chrome removed it). Still included for legacy browser coverage but CSP is the real protection.

## Important Implementation Notes

### BYOK Architecture Impact on Current Code

The current `geminiService.ts` initializes the Google GenAI client with a build-time `process.env.API_KEY`. With BYOK, this changes fundamentally:

1. **`getAI()` singleton pattern breaks:** The current lazy singleton creates `GoogleGenAI` once with the build-time key. With BYOK, the client must be re-created whenever the user changes their key, or the key must be passed per-call.

2. **Client-side API calls remain client-side:** The `generateTranscript()` function calls `GoogleGenAI.models.generateContentStream()` directly from the browser. With BYOK, this continues to work -- the user's key is decrypted from localStorage and passed to the SDK. The key stays in the user's browser.

3. **Server-side upload initiation changes:** The `gemini-upload.ts` function currently uses `process.env.GEMINI_API_KEY` to initiate uploads. With BYOK, the user's API key needs to reach this function. Two approaches:
   - **Option A:** Client sends the decrypted API key in a request header to the Netlify function, which uses it for the Google API call. Simple but means the key transits through Netlify's infrastructure.
   - **Option B:** Client makes the Google API initiation call directly (eliminating the need for the `gemini-upload` function for this step). The upload URL comes back to the client, which then uses the proxy for chunked upload (proxy doesn't need the API key -- the upload URL is pre-authenticated).

   **Recommendation:** Option B is more secure (key never leaves the client for this call) but requires the client to handle CORS for the initial upload request. Option A is simpler to implement. Either works -- this is a planner decision.

4. **Edge function proxy doesn't need the API key:** The proxy just forwards chunks to a pre-authenticated upload URL. No API key needed. This is already the case.

### Netlify Functions v1 to v2 Migration

The `gemini-upload.ts` function currently uses v1 format. To add rate limiting, it should be migrated to v2. Key changes:

```typescript
// v1 (current):
import { Handler } from '@netlify/functions';
const handler: Handler = async (event) => {
  const body = JSON.parse(event.body || '{}');
  return { statusCode: 200, body: JSON.stringify(data) };
};
export { handler };

// v2 (target):
import type { Config, Context } from '@netlify/functions';
export default async (request: Request, context: Context) => {
  const body = await request.json();
  return new Response(JSON.stringify(data), { status: 200 });
};
export const config: Config = {
  path: '/api/gemini-upload',
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
```

### Environment Variable Cleanup

After BYOK implementation:

- **Remove from `vite.config.ts`:** The `define` block injecting `process.env.API_KEY` and `process.env.GEMINI_API_KEY`
- **Remove from `.env.example`:** The `GEMINI_API_KEY` template (or repurpose for server-side-only use)
- **Remove from Netlify dashboard:** The `GEMINI_API_KEY` environment variable (unless keeping a server-side fallback)
- **Search and destroy:** `grep -r "process.env.API_KEY\|process.env.GEMINI_API_KEY\|GEMINI_API_KEY" --include="*.ts" --include="*.tsx" --include="*.js"`

## Open Questions

Things that couldn't be fully resolved:

1. **Upload initiation: client-direct vs. proxy?**
   - What we know: With BYOK, the user's API key must reach Google's upload initiation endpoint. Currently this goes through a Netlify function.
   - What's unclear: Whether Google's upload initiation endpoint supports CORS for direct browser calls (it likely does for API-key-authenticated calls, but untested).
   - Recommendation: Default to Option A (pass key via header to Netlify function) for simplicity. It can be refactored to Option B later if desired.

2. **Netlify Functions v1 rate limit support**
   - What we know: Netlify docs say rate limits require a `config` export with `path`. The current function uses v1 `handler` export.
   - What's unclear: Whether adding a `config` export alongside a v1 `handler` export works for rate limiting without full v2 migration.
   - Recommendation: Migrate to v2 format since the function is being modified anyway and v2 is the current standard.

3. **CSP `unsafe-inline` for Tailwind**
   - What we know: Tailwind CSS with JIT compilation generates utility classes at build time into a CSS file. This should NOT require `unsafe-inline`. However, some Tailwind plugins or dynamic class generation may inject inline styles.
   - What's unclear: Whether the current Tailwind setup requires `unsafe-inline` in `style-src`.
   - Recommendation: Start without `unsafe-inline`, test, and add it only if the app breaks. Use `Content-Security-Policy-Report-Only` during development to test.

4. **Rate limit values**
   - What we know: Netlify's free plan allows 2 rate limit rules. The proxy handles file chunks (potentially many rapid requests per upload).
   - What's unclear: What the right `windowLimit` values are for upload chunks vs. upload initiation.
   - Recommendation: Start with generous limits (100 requests/60s for proxy, 20 requests/60s for upload initiation), monitor, and tighten based on real usage patterns.

## Sources

### Primary (HIGH confidence)

- [MDN SubtleCrypto.encrypt() - AES-GCM](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt) - Encryption API, parameters, IV requirements
- [MDN SubtleCrypto.deriveKey() - PBKDF2](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey) - Key derivation from password, salt, iterations
- [Netlify Rate Limiting Docs](https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/) - Config syntax, plan limits, aggregation options
- [Netlify CSP Documentation](https://docs.netlify.com/manage/security/content-security-policy/) - CSP configuration methods
- [Gemini API Models Endpoint](https://ai.google.dev/api/models) - GET endpoint for key validation
- [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html) - URL allowlisting patterns
- [Netlify Functions Migration Guide](https://developers.netlify.com/guides/migrating-to-the-modern-netlify-functions/) - v1 to v2 format changes

### Secondary (MEDIUM confidence)

- [Netlify CORS Support Guide](https://answers.netlify.com/t/support-guide-handling-cors-on-netlify/107739) - Dynamic origin checking pattern
- [Netlify Security Headers Forum](https://answers.netlify.com/t/security-focused-headers-for-netlify-sites-best-practices/27614) - netlify.toml headers achieving A+ security grade
- [Netlify Rate Limiting AI Blog](https://www.netlify.com/blog/how-to-rate-limit-ai-features-and-avoid-surprise-costs/) - Real-world rate limiting patterns for AI features
- [Netlify Blobs Rate Limiter](https://dev.to/reeshee/building-rate-limiter-based-on-ip-address-with-netlify-blobs-and-edge-functions-2bd6) - Alternative custom rate limiting approach

### Tertiary (LOW confidence)

- [react-secure-storage npm](https://www.npmjs.com/package/react-secure-storage) - Third-party encrypted localStorage wrapper (NOT recommended -- use Web Crypto directly)
- Various Medium/DEV.to articles on CORS patterns - Community examples, patterns verified against official docs

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Web Crypto API is W3C standard, well-documented on MDN; Netlify features verified via official docs
- Architecture: HIGH - Patterns verified against official documentation; code examples tested against API specifications
- Pitfalls: HIGH - Common issues documented across MDN, OWASP, and Netlify official resources
- Rate limiting: MEDIUM - Config syntax verified via Netlify docs, but v1/v2 interaction for rate limits needs validation during implementation
- CSP specifics: MEDIUM - Base configuration verified, but exact directives for this app's Tailwind + Google Fonts combo need testing

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (30 days -- these are stable APIs and patterns)
