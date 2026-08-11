import { cookies } from "next/headers";
import { assertSameOrigin } from "@/lib/auth/origin";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { errorFromUnknown, jsonOk } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const jar = await cookies();
    jar.set(SESSION_COOKIE, "", { ...sessionCookieOptions(0), maxAge: 0 });
    return jsonOk({ ok: true });
  } catch (e) {
    return errorFromUnknown(e);
  }
}
