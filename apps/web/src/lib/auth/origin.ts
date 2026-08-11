/**
 * CSRF mitigation for cookie-authenticated mutating routes:
 * In production, require Origin host to match request Host.
 * Localhost / missing Origin allowed in development for curl/tests.
 */
export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  const isProd = process.env.NODE_ENV === "production";

  if (!origin) {
    if (isProd) {
      throw Object.assign(new Error("Missing Origin header"), { status: 403 });
    }
    return;
  }

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw Object.assign(new Error("Invalid Origin"), { status: 403 });
  }

  if (!host) return;

  if (originHost === host) return;

  // Dev convenience: localhost ports may differ (Next 3000 vs tool)
  if (
    !isProd &&
    (originHost.includes("localhost") || originHost.includes("127.0.0.1")) &&
    (host.includes("localhost") || host.includes("127.0.0.1"))
  ) {
    return;
  }

  throw Object.assign(new Error("Origin/Host mismatch"), { status: 403 });
}
