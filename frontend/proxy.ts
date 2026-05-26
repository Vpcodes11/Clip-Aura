import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard"];

/**
 * Build the Content-Security-Policy header value.
 *
 * - In development, `unsafe-eval` is allowed (required by Next.js HMR / Turbopack).
 * - In production, `unsafe-eval` is removed.
 * - `unsafe-inline` is kept in both modes because Next.js injects inline
 *   scripts for hydration and page data. Removing it requires a nonce-based
 *   CSP which is fragile across Next.js versions. This is a deliberate,
 *   documented trade-off.
 * - `connect-src` is built dynamically from `NEXT_PUBLIC_API_URL` so that
 *   localhost references do not leak into the production CSP.
 */
function buildCsp(): string {
  const isProd = process.env.NODE_ENV === "production";

  // Script source: allow unsafe-inline (Next.js requirement), drop unsafe-eval in prod
  const scriptSrc = isProd
    ? "'self' 'unsafe-inline'"
    : "'self' 'unsafe-inline' 'unsafe-eval'";

  // Style source: Next.js injects inline styles for layout shifts
  const styleSrc = "'self' 'unsafe-inline'";

  // Connect source: build from environment
  const connectSources = ["'self'", "https://*.supabase.co", "wss://*.supabase.co"];
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    connectSources.push(apiUrl);
    // Add WebSocket equivalent
    const wsUrl = apiUrl.replace(/^http/, "ws");
    connectSources.push(wsUrl);
  }
  if (!isProd) {
    // Allow localhost connections in development only
    connectSources.push(
      "http://localhost:8000",
      "ws://localhost:8000",
      "http://127.0.0.1:8000",
      "ws://127.0.0.1:8000"
    );
  }

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    `connect-src ${connectSources.join(" ")}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

/**
 * Build a strict CSP for Content-Security-Policy-Report-Only.
 * This header logs violations without breaking the page, letting you
 * monitor what would break if you tightened the policy further.
 */
function buildStrictCspReportOnly(): string {
  const connectSources = ["'self'", "https://*.supabase.co", "wss://*.supabase.co"];
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    connectSources.push(apiUrl);
    connectSources.push(apiUrl.replace(/^http/, "ws"));
  }

  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    `connect-src ${connectSources.join(" ")}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

/** Set all security headers on a response object. */
function setSecurityHeaders(response: NextResponse): void {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  response.headers.set("Content-Security-Policy", buildCsp());

  // Report-Only: monitor what a stricter policy would block (no unsafe-inline/eval)
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Content-Security-Policy-Report-Only",
      buildStrictCspReportOnly()
    );
  }
}

function hasValidAuth(request: NextRequest): boolean {
  const cookies = request.cookies.getAll();
  const hasSupabaseCookie = cookies.some(
    (cookie) => cookie.name.startsWith("sb-") && cookie.value.length > 0
  );
  const hasSessionHint = cookies.some(
    (cookie) => cookie.name === "clipaura_session_hint" && cookie.value === "1"
  );
  return hasSupabaseCookie && hasSessionHint;
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const devModeEnabled = process.env.NEXT_PUBLIC_DEV_MODE === "true";

  if (process.env.NODE_ENV === "production" && devModeEnabled) {
    return new NextResponse(
      "Production build cannot run with NEXT_PUBLIC_DEV_MODE=true.",
      { status: 500 }
    );
  }

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (!isProtected) {
    const response = NextResponse.next();
    setSecurityHeaders(response);
    return response;
  }

  if (!devModeEnabled && !hasValidAuth(request)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  setSecurityHeaders(response);
  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.ts|globals.css|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.ico).*)",
  ],
};
