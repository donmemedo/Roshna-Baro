import { NextResponse, type NextRequest } from "next/server";

// Per-request CSP with a nonce: no inline or third-party script runs unless it carries the nonce.
// An XSS bug therefore cannot inject script, which is also the main defence for the token kept in localStorage.
export function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const dev = process.env.NODE_ENV !== "production";
  let apiOrigin = "http://localhost:8036";
  try {
    apiOrigin = new URL(process.env.NEXT_PUBLIC_API_URL || apiOrigin).origin;
  } catch {
    /* keep the default */
  }

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'", // animation libraries set inline style attributes
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self' ${apiOrigin}`,
    "manifest-src 'self'",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // behind a TLS proxy set CSP_UPGRADE_INSECURE=1 at build/run time
    ...(process.env.CSP_UPGRADE_INSECURE === "1" ? ["upgrade-insecure-requests"] : []),
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("content-security-policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|icon.svg|icon-.*\\.png|apple-touch-icon.png|manifest.webmanifest|sw.js).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
